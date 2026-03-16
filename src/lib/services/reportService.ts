/**
 * Report Service
 * Handles daily reports, date range reports, and report archiving for The Yard Restaurant
 */

import { getAdminDb } from '@/lib/firebase-admin';
import { DailyReport, Order, Reservation, EventBooking, PaymentStatus } from '@/lib/types';

// Demo storage for archived reports
let demoArchivedReports: DailyReport[] = [];

/**
 * Get the start and end of a day
 */
function getDayRange(date: Date): { startOfDay: Date; endOfDay: Date } {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  
  return { startOfDay, endOfDay };
}

/**
 * Get daily report for a specific date
 */
export async function getDailyReport(date?: Date): Promise<DailyReport> {
  const adminDb = getAdminDb();
  const targetDate = date || new Date();
  const dateStr = targetDate.toISOString().split('T')[0];
  const { startOfDay, endOfDay } = getDayRange(targetDate);
  
  // Check if report is already archived
  if (!adminDb) {
    const archivedReport = demoArchivedReports.find(r => r.date === dateStr);
    if (archivedReport) {
      return archivedReport;
    }
  } else {
    try {
      const archivedDoc = await adminDb.collection('daily_reports').doc(dateStr).get();
      if (archivedDoc.exists) {
        return archivedDoc.data() as DailyReport;
      }
    } catch (error) {
      console.error('Error checking archived report:', error);
    }
  }
  
  // Generate report from live data
  let orders: Order[] = [];
  let reservations: Reservation[] = [];
  let events: EventBooking[] = [];
  
  if (adminDb) {
    try {
      // Fetch orders
      const ordersSnapshot = await adminDb.collection('orders')
        .where('createdAt', '>=', startOfDay)
        .where('createdAt', '<=', endOfDay)
        .get();
      
      orders = ordersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      })) as Order[];
      
      // Fetch reservations
      const reservationsSnapshot = await adminDb.collection('reservations')
        .where('date', '==', dateStr)
        .get();
      
      reservations = reservationsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      })) as Reservation[];
      
      // Fetch events
      const eventsSnapshot = await adminDb.collection('events')
        .where('createdAt', '>=', startOfDay)
        .where('createdAt', '<=', endOfDay)
        .get();
      
      events = eventsSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
      })) as EventBooking[];
    } catch (error) {
      console.error('Error fetching data for daily report:', error);
    }
  } else {
    // Demo mode - generate sample data
    orders = generateDemoOrders(targetDate, 15);
    reservations = generateDemoReservations(targetDate, 8);
    events = generateDemoEvents(targetDate, 3);
  }
  
  // Calculate totals
  const paidOrders = orders.filter(o => o.paymentStatus === 'PAID');
  const pendingOrders = orders.filter(o => o.paymentStatus === 'PENDING' || o.paymentStatus === 'PROCESSING');
  const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  
  // Calculate top items
  const itemCounts = new Map<string, { count: number; revenue: number }>();
  orders.forEach(order => {
    order.items?.forEach(item => {
      const current = itemCounts.get(item.name) || { count: 0, revenue: 0 };
      current.count += item.quantity;
      current.revenue += (item.price * item.quantity);
      itemCounts.set(item.name, current);
    });
  });
  
  const topItems = Array.from(itemCounts.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  
  // Calculate hourly distribution
  const hourlyData = new Map<number, { orders: number; revenue: number }>();
  orders.forEach(order => {
    const hour = new Date(order.createdAt).getHours();
    const current = hourlyData.get(hour) || { orders: 0, revenue: 0 };
    current.orders += 1;
    current.revenue += order.totalAmount || 0;
    hourlyData.set(hour, current);
  });
  
  const hourlyDistribution = Array.from(hourlyData.entries())
    .map(([hour, data]) => ({ hour, ...data }))
    .sort((a, b) => a.hour - b.hour);
  
  const report: DailyReport = {
    id: `report_${dateStr}`,
    date: dateStr,
    orders,
    reservations,
    events,
    totalRevenue,
    paymentStats: {
      pending: pendingOrders.length,
      confirmed: paidOrders.length,
      total: orders.length,
    },
    topItems,
    hourlyDistribution,
    createdAt: new Date(),
  };
  
  return report;
}

/**
 * Get report for a date range
 */
export async function getDateRangeReport(
  startDate: Date,
  endDate: Date
): Promise<{
  reports: DailyReport[];
  summary: {
    totalRevenue: number;
    totalOrders: number;
    totalReservations: number;
    totalEvents: number;
    averageDailyRevenue: number;
    paymentBreakdown: {
      pending: number;
      confirmed: number;
    };
  };
}> {
  const adminDb = getAdminDb();
  const reports: DailyReport[] = [];
  
  // Iterate through each day in the range
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  while (current <= end) {
    const report = await getDailyReport(new Date(current));
    reports.push(report);
    current.setDate(current.getDate() + 1);
  }
  
  // Calculate summary
  const summary = {
    totalRevenue: reports.reduce((sum, r) => sum + r.totalRevenue, 0),
    totalOrders: reports.reduce((sum, r) => sum + r.orders.length, 0),
    totalReservations: reports.reduce((sum, r) => sum + r.reservations.length, 0),
    totalEvents: reports.reduce((sum, r) => sum + r.events.length, 0),
    averageDailyRevenue: 0,
    paymentBreakdown: {
      pending: reports.reduce((sum, r) => sum + r.paymentStats.pending, 0),
      confirmed: reports.reduce((sum, r) => sum + r.paymentStats.confirmed, 0),
    },
  };
  
  summary.averageDailyRevenue = reports.length > 0 
    ? Math.round(summary.totalRevenue / reports.length) 
    : 0;
  
  return { reports, summary };
}

/**
 * Archive daily report to database
 */
export async function archiveDailyReport(date?: Date): Promise<{ success: boolean; report?: DailyReport; error?: string }> {
  const adminDb = getAdminDb();
  const targetDate = date || new Date();
  const dateStr = targetDate.toISOString().split('T')[0];
  
  // Don't archive today's report (it's still being updated)
  const today = new Date().toISOString().split('T')[0];
  if (dateStr === today) {
    return { success: false, error: 'Cannot archive today\'s report' };
  }
  
  try {
    const report = await getDailyReport(targetDate);
    
    if (!adminDb) {
      // Demo mode - store in memory
      const existingIndex = demoArchivedReports.findIndex(r => r.date === dateStr);
      if (existingIndex >= 0) {
        demoArchivedReports[existingIndex] = report;
      } else {
        demoArchivedReports.push(report);
      }
      return { success: true, report };
    }
    
    // Store in Firestore
    await adminDb.collection('daily_reports').doc(dateStr).set(report);
    
    return { success: true, report };
  } catch (error) {
    console.error('Error archiving daily report:', error);
    return { success: false, error: 'Failed to archive report' };
  }
}

/**
 * Export report as CSV
 */
export function exportReportCSV(report: DailyReport): string {
  let csv = 'Date,Type,ID,Customer,Amount,Status,Payment Status\n';
  
  // Add orders
  report.orders.forEach(order => {
    csv += `${report.date},Order,${order.id},${order.customerName},${order.totalAmount},${order.status},${order.paymentStatus}\n`;
  });
  
  // Add reservations
  report.reservations.forEach(reservation => {
    csv += `${report.date},Reservation,${reservation.id},${reservation.name},N/A,${reservation.status},N/A\n`;
  });
  
  // Add events
  report.events.forEach(event => {
    csv += `${report.date},Event,${event.id},${event.name},${event.totalAmount || 'N/A'},${event.status},${event.paymentStatus || 'N/A'}\n`;
  });
  
  return csv;
}

/**
 * Export report summary as CSV
 */
export function exportReportSummaryCSV(reports: DailyReport[]): string {
  let csv = 'Date,Orders,Reservations,Events,Revenue,Pending Payments,Confirmed Payments\n';
  
  reports.forEach(report => {
    csv += `${report.date},${report.orders.length},${report.reservations.length},${report.events.length},${report.totalRevenue},${report.paymentStats.pending},${report.paymentStats.confirmed}\n`;
  });
  
  return csv;
}

/**
 * Get archived reports list
 */
export async function getArchivedReports(
  limit: number = 30
): Promise<DailyReport[]> {
  const adminDb = getAdminDb();
  
  if (!adminDb) {
    return demoArchivedReports.slice(0, limit);
  }
  
  try {
    const snapshot = await adminDb.collection('daily_reports')
      .orderBy('date', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => doc.data() as DailyReport);
  } catch (error) {
    console.error('Error getting archived reports:', error);
    return [];
  }
}

/**
 * Get weekly summary
 */
export async function getWeeklySummary(date?: Date): Promise<{
  startOfWeek: string;
  endOfWeek: string;
  totalRevenue: number;
  totalOrders: number;
  totalReservations: number;
  totalEvents: number;
  dailyBreakdown: DailyReport[];
  topItems: Array<{ name: string; count: number; revenue: number }>;
}> {
  const targetDate = date || new Date();
  
  // Get start and end of week (Sunday to Saturday)
  const startOfWeek = new Date(targetDate);
  startOfWeek.setDate(targetDate.getDate() - targetDate.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);
  
  const { reports } = await getDateRangeReport(startOfWeek, endOfWeek);
  
  // Aggregate top items
  const itemCounts = new Map<string, { count: number; revenue: number }>();
  reports.forEach(report => {
    report.topItems.forEach(item => {
      const current = itemCounts.get(item.name) || { count: 0, revenue: 0 };
      current.count += item.count;
      current.revenue += item.revenue;
      itemCounts.set(item.name, current);
    });
  });
  
  const topItems = Array.from(itemCounts.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);
  
  return {
    startOfWeek: startOfWeek.toISOString().split('T')[0],
    endOfWeek: endOfWeek.toISOString().split('T')[0],
    totalRevenue: reports.reduce((sum, r) => sum + r.totalRevenue, 0),
    totalOrders: reports.reduce((sum, r) => sum + r.orders.length, 0),
    totalReservations: reports.reduce((sum, r) => sum + r.reservations.length, 0),
    totalEvents: reports.reduce((sum, r) => sum + r.events.length, 0),
    dailyBreakdown: reports,
    topItems,
  };
}

/**
 * Get monthly summary
 */
export async function getMonthlySummary(year: number, month: number): Promise<{
  month: string;
  totalRevenue: number;
  totalOrders: number;
  totalReservations: number;
  totalEvents: number;
  weeklyBreakdown: Array<{
    weekStart: string;
    weekEnd: string;
    revenue: number;
    orders: number;
  }>;
  topItems: Array<{ name: string; count: number; revenue: number }>;
  dailyAverage: number;
}> {
  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0); // Last day of month
  
  const { reports, summary } = await getDateRangeReport(startDate, endDate);
  
  // Group by weeks
  const weeklyData: Array<{ weekStart: string; weekEnd: string; revenue: number; orders: number }> = [];
  let currentWeek: { start: Date; end: Date; revenue: number; orders: number } | null = null;
  
  reports.forEach(report => {
    const reportDate = new Date(report.date);
    const dayOfWeek = reportDate.getDay();
    
    if (!currentWeek || dayOfWeek === 0) {
      // Start new week
      if (currentWeek) {
        weeklyData.push({
          weekStart: currentWeek.start.toISOString().split('T')[0],
          weekEnd: currentWeek.end.toISOString().split('T')[0],
          revenue: currentWeek.revenue,
          orders: currentWeek.orders,
        });
      }
      currentWeek = {
        start: reportDate,
        end: new Date(reportDate),
        revenue: 0,
        orders: 0,
      };
    }
    
    currentWeek.revenue += report.totalRevenue;
    currentWeek.orders += report.orders.length;
    currentWeek.end = reportDate;
  });
  
  // Add last week
  if (currentWeek) {
    weeklyData.push({
      weekStart: currentWeek.start.toISOString().split('T')[0],
      weekEnd: currentWeek.end.toISOString().split('T')[0],
      revenue: currentWeek.revenue,
      orders: currentWeek.orders,
    });
  }
  
  // Aggregate top items
  const itemCounts = new Map<string, { count: number; revenue: number }>();
  reports.forEach(report => {
    report.topItems.forEach(item => {
      const current = itemCounts.get(item.name) || { count: 0, revenue: 0 };
      current.count += item.count;
      current.revenue += item.revenue;
      itemCounts.set(item.name, current);
    });
  });
  
  const topItems = Array.from(itemCounts.entries())
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 10);
  
  return {
    month: `${year}-${String(month).padStart(2, '0')}`,
    totalRevenue: summary.totalRevenue,
    totalOrders: summary.totalOrders,
    totalReservations: summary.totalReservations,
    totalEvents: summary.totalEvents,
    weeklyBreakdown: weeklyData,
    topItems,
    dailyAverage: summary.averageDailyRevenue,
  };
}

// Demo data generators
function generateDemoOrders(date: Date, count: number): Order[] {
  const orders: Order[] = [];
  const names = ['John Doe', 'Jane Smith', 'Paul Ngono', 'Marie Nkolo', 'Peter Mbah', 'Grace Fomba'];
  const items = ['Grilled Fish', 'Jollof Rice', 'Suya Platter', 'Pepper Soup', 'Fried Plantains'];
  
  for (let i = 0; i < count; i++) {
    const hour = Math.floor(Math.random() * 12) + 10; // 10 AM to 10 PM
    const orderDate = new Date(date);
    orderDate.setHours(hour, Math.floor(Math.random() * 60));
    
    const orderItems = Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, j) => ({
      menuItemId: `item_${j}`,
      name: items[Math.floor(Math.random() * items.length)],
      quantity: Math.floor(Math.random() * 3) + 1,
      price: Math.floor(Math.random() * 5000) + 2000,
      subtotal: 0,
    }));
    
    const subtotal = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    orders.push({
      id: `ord_${Date.now()}_${i}`,
      userId: `user_${Math.floor(Math.random() * 6)}`,
      customerName: names[Math.floor(Math.random() * names.length)],
      phone: `+237 6${Math.floor(Math.random() * 90000000 + 10000000)}`,
      email: `user${i}@example.com`,
      type: Math.random() > 0.5 ? 'delivery' : 'pickup',
      items: orderItems,
      subtotal,
      serviceCharge: Math.round(subtotal * 0.05),
      tax: Math.round(subtotal * 0.1925),
      deliveryFee: Math.random() > 0.5 ? 1500 : 0,
      totalAmount: subtotal + Math.round(subtotal * 0.2425) + (Math.random() > 0.5 ? 1500 : 0),
      status: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'][Math.floor(Math.random() * 5)] as Order['status'],
      paymentStatus: ['PENDING', 'PAID', 'PROCESSING'][Math.floor(Math.random() * 3)] as PaymentStatus,
      paymentMethod: ['CASH', 'ORANGE_MONEY', 'MTN_MONEY'][Math.floor(Math.random() * 3)] as Order['paymentMethod'],
      createdAt: orderDate,
      updatedAt: orderDate,
    } as Order);
  }
  
  return orders;
}

function generateDemoReservations(date: Date, count: number): Reservation[] {
  const reservations: Reservation[] = [];
  const names = ['John Doe', 'Jane Smith', 'Paul Ngono', 'Marie Nkolo', 'Peter Mbah'];
  const times = ['12:00', '13:00', '14:00', '19:00', '20:00', '21:00'];
  
  for (let i = 0; i < count; i++) {
    reservations.push({
      id: `res_${Date.now()}_${i}`,
      userId: `user_${Math.floor(Math.random() * 5)}`,
      name: names[Math.floor(Math.random() * names.length)],
      email: `user${i}@example.com`,
      phone: `+237 6${Math.floor(Math.random() * 90000000 + 10000000)}`,
      date: date.toISOString().split('T')[0],
      time: times[Math.floor(Math.random() * times.length)],
      partySize: Math.floor(Math.random() * 8) + 2,
      status: ['PENDING', 'CONFIRMED', 'COMPLETED'][Math.floor(Math.random() * 3)] as Reservation['status'],
      createdAt: date,
    } as Reservation);
  }
  
  return reservations;
}

function generateDemoEvents(date: Date, count: number): EventBooking[] {
  const events: EventBooking[] = [];
  const names = ['Corporate Meeting', 'Birthday Party', 'Wedding Reception'];
  const types = ['CORPORATE', 'BIRTHDAY', 'WEDDING'];
  
  for (let i = 0; i < count; i++) {
    events.push({
      id: `evt_${Date.now()}_${i}`,
      userId: `user_${Math.floor(Math.random() * 3)}`,
      name: names[i % names.length],
      email: `user${i}@example.com`,
      phone: `+237 6${Math.floor(Math.random() * 90000000 + 10000000)}`,
      eventType: types[i % types.length],
      guestCount: Math.floor(Math.random() * 50) + 10,
      totalAmount: Math.floor(Math.random() * 200000) + 50000,
      status: ['INQUIRY', 'QUOTED', 'CONFIRMED'][Math.floor(Math.random() * 3)] as EventBooking['status'],
      paymentStatus: ['PENDING', 'PAID'][Math.floor(Math.random() * 2)] as PaymentStatus,
      createdAt: date,
    } as EventBooking);
  }
  
  return events;
}

const reportService = {
  getDailyReport,
  getDateRangeReport,
  archiveDailyReport,
  exportReportCSV,
  exportReportSummaryCSV,
  getArchivedReports,
  getWeeklySummary,
  getMonthlySummary,
};

export default reportService;
