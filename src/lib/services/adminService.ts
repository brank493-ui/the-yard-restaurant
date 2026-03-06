/**
 * Admin Service
 * Handles admin dashboard operations including stats, user activities, and reports
 */

import { getAdminDb } from '@/lib/firebase-admin';
import { Order, Reservation, EventBooking, PaymentStatus, PaymentMethod, AdminLog, AdminDashboardStats } from '@/lib/types';

// Interfaces for admin data
export interface DailyStats {
  totalOrders: number;
  totalReservations: number;
  totalEvents: number;
  totalRevenue: number;
  pendingPayments: number;
  confirmedPayments: number;
  pendingOrders: number;
  completedOrders: number;
  newUsers: number;
  avgOrderValue: number;
}

export interface UserActivity {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  orders: Order[];
  reservations: Reservation[];
  events: EventBooking[];
  totalAmount: number;
  paymentStatus: 'PAID' | 'PENDING' | 'PARTIAL';
  paymentMethod?: PaymentMethod;
  lastActivity: Date;
}

export interface DailyReport {
  date: string;
  stats: DailyStats;
  topItems: Array<{ name: string; count: number; revenue: number }>;
  paymentBreakdown: Record<string, number>;
  hourlyDistribution: Array<{ hour: number; orders: number; revenue: number }>;
}

// Demo data storage
let demoOrders: Order[] = [];
let demoReservations: Reservation[] = [];
let demoEvents: EventBooking[] = [];
let demoUsers: Array<{ id: string; email: string; displayName?: string; phone?: string; role: string }> = [];

/**
 * Initialize demo data for testing
 */
function initDemoData() {
  if (demoOrders.length === 0) {
    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    
    // Generate demo orders
    demoOrders = Array.from({ length: 25 }, (_, i) => {
      const hour = Math.floor(Math.random() * 14) + 8; // 8 AM to 10 PM
      const orderDate = new Date(startOfDay);
      orderDate.setHours(hour, Math.floor(Math.random() * 60));
      
      return {
        id: `ord_${Date.now()}_${i}`,
        userId: `user_${i % 10}`,
        customerName: ['John Doe', 'Jane Smith', 'Paul Ngono', 'Marie Nkolo', 'Peter Mbah', 'Grace Fomba', 'David Nkwi', 'Rose Fotso', 'James Atangana', 'Catherine Ngu'][i % 10],
        phone: `+237 6${Math.floor(Math.random() * 90000000 + 10000000)}`,
        email: `user${i % 10}@example.com`,
        type: i % 3 === 0 ? 'delivery' : 'pickup',
        items: [
          { menuItemId: `item_${i}`, name: ['Grilled Fish', 'Jollof Rice', 'Suya Platter', 'Pepper Soup', 'Fried Plantains'][i % 5], quantity: Math.floor(Math.random() * 3) + 1, price: Math.floor(Math.random() * 5000) + 2000, subtotal: 0 },
        ],
        subtotal: Math.floor(Math.random() * 15000) + 3000,
        serviceCharge: 0,
        tax: 0,
        deliveryFee: i % 3 === 0 ? 1500 : 0,
        totalAmount: Math.floor(Math.random() * 20000) + 5000,
        status: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'][Math.floor(Math.random() * 5)] as Order['status'],
        paymentStatus: ['PENDING', 'PAID', 'PROCESSING'][Math.floor(Math.random() * 3)] as PaymentStatus,
        paymentMethod: ['CASH', 'ORANGE_MONEY', 'MTN_MONEY'][Math.floor(Math.random() * 3)] as PaymentMethod,
        createdAt: orderDate,
        updatedAt: orderDate,
      } as Order;
    });
    
    // Generate demo reservations
    demoReservations = Array.from({ length: 12 }, (_, i) => ({
      id: `res_${Date.now()}_${i}`,
      userId: `user_${i % 8}`,
      name: ['John Doe', 'Jane Smith', 'Paul Ngono', 'Marie Nkolo', 'Peter Mbah', 'Grace Fomba', 'David Nkwi', 'Rose Fotso'][i % 8],
      email: `user${i % 8}@example.com`,
      phone: `+237 6${Math.floor(Math.random() * 90000000 + 10000000)}`,
      date: today.toISOString().split('T')[0],
      time: ['12:00', '13:00', '14:00', '19:00', '20:00', '21:00'][i % 6],
      partySize: Math.floor(Math.random() * 8) + 2,
      status: ['PENDING', 'CONFIRMED', 'COMPLETED'][Math.floor(Math.random() * 3)] as Reservation['status'],
      specialRequests: i % 3 === 0 ? 'Birthday celebration' : undefined,
      createdAt: startOfDay,
    } as Reservation));
    
    // Generate demo events
    demoEvents = Array.from({ length: 5 }, (_, i) => ({
      id: `evt_${Date.now()}_${i}`,
      userId: `user_${i % 5}`,
      name: ['Corporate Meeting', 'Birthday Party', 'Wedding Reception', 'Anniversary Dinner', 'Business Lunch'][i],
      email: `user${i % 5}@example.com`,
      phone: `+237 6${Math.floor(Math.random() * 90000000 + 10000000)}`,
      eventType: ['CORPORATE', 'BIRTHDAY', 'WEDDING', 'ANNIVERSARY', 'BUSINESS'][i],
      guestCount: Math.floor(Math.random() * 50) + 10,
      totalAmount: Math.floor(Math.random() * 200000) + 50000,
      status: ['INQUIRY', 'QUOTED', 'CONFIRMED'][Math.floor(Math.random() * 3)] as EventBooking['status'],
      paymentStatus: ['PENDING', 'PAID'][Math.floor(Math.random() * 2)] as PaymentStatus,
      createdAt: startOfDay,
    } as EventBooking));
    
    // Generate demo users
    demoUsers = Array.from({ length: 10 }, (_, i) => ({
      id: `user_${i}`,
      email: `user${i}@example.com`,
      displayName: ['John Doe', 'Jane Smith', 'Paul Ngono', 'Marie Nkolo', 'Peter Mbah', 'Grace Fomba', 'David Nkwi', 'Rose Fotso', 'James Atangana', 'Catherine Ngu'][i],
      phone: `+237 6${Math.floor(Math.random() * 90000000 + 10000000)}`,
      role: i === 0 ? 'ADMIN' : 'CUSTOMER',
    }));
  }
}

/**
 * Get daily statistics for admin dashboard
 */
export async function getDailyStats(date?: Date): Promise<DailyStats> {
  const adminDb = getAdminDb();
  initDemoData();
  
  const targetDate = date || new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  if (!adminDb) {
    // Demo mode - calculate from in-memory data
    const todayOrders = demoOrders.filter(o => {
      const orderDate = new Date(o.createdAt);
      return orderDate >= startOfDay && orderDate <= endOfDay;
    });
    
    const todayReservations = demoReservations.filter(r => r.date === targetDate.toISOString().split('T')[0]);
    
    return {
      totalOrders: todayOrders.length,
      totalReservations: todayReservations.length,
      totalEvents: demoEvents.filter(e => {
        const eventDate = new Date(e.preferredDate || e.createdAt);
        return eventDate >= startOfDay && eventDate <= endOfDay;
      }).length,
      totalRevenue: todayOrders.filter(o => o.paymentStatus === 'PAID').reduce((sum, o) => sum + (o.totalAmount || 0), 0),
      pendingPayments: todayOrders.filter(o => o.paymentStatus === 'PENDING' || o.paymentStatus === 'PROCESSING').length,
      confirmedPayments: todayOrders.filter(o => o.paymentStatus === 'PAID').length,
      pendingOrders: todayOrders.filter(o => o.status === 'PENDING' || o.status === 'CONFIRMED').length,
      completedOrders: todayOrders.filter(o => o.status === 'COMPLETED').length,
      newUsers: Math.floor(Math.random() * 5) + 1,
      avgOrderValue: todayOrders.length > 0 
        ? Math.round(todayOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0) / todayOrders.length)
        : 0,
    };
  }
  
  try {
    // Fetch today's orders
    const ordersSnapshot = await adminDb.collection('orders')
      .where('createdAt', '>=', startOfDay)
      .where('createdAt', '<=', endOfDay)
      .get();
    
    const orders = ordersSnapshot.docs.map(doc => doc.data() as Order);
    
    // Fetch today's reservations
    const reservationsSnapshot = await adminDb.collection('reservations')
      .where('date', '==', targetDate.toISOString().split('T')[0])
      .get();
    
    // Fetch today's events
    const eventsSnapshot = await adminDb.collection('events')
      .where('createdAt', '>=', startOfDay)
      .where('createdAt', '<=', endOfDay)
      .get();
    
    // Calculate stats
    const paidOrders = orders.filter(o => o.paymentStatus === 'PAID');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    
    return {
      totalOrders: orders.length,
      totalReservations: reservationsSnapshot.size,
      totalEvents: eventsSnapshot.size,
      totalRevenue,
      pendingPayments: orders.filter(o => o.paymentStatus === 'PENDING' || o.paymentStatus === 'PROCESSING').length,
      confirmedPayments: paidOrders.length,
      pendingOrders: orders.filter(o => o.status === 'PENDING' || o.status === 'CONFIRMED').length,
      completedOrders: orders.filter(o => o.status === 'COMPLETED').length,
      newUsers: 0, // Would need to query users collection
      avgOrderValue: orders.length > 0 ? Math.round(totalRevenue / orders.length) : 0,
    };
  } catch (error) {
    console.error('Error getting daily stats:', error);
    return {
      totalOrders: 0,
      totalReservations: 0,
      totalEvents: 0,
      totalRevenue: 0,
      pendingPayments: 0,
      confirmedPayments: 0,
      pendingOrders: 0,
      completedOrders: 0,
      newUsers: 0,
      avgOrderValue: 0,
    };
  }
}

/**
 * Get users with their daily activities
 */
export async function getUsersWithActivity(
  date?: Date,
  search?: string,
  paymentStatusFilter?: string,
  page: number = 1,
  pageSize: number = 10
): Promise<{ users: UserActivity[]; total: number }> {
  const adminDb = getAdminDb();
  initDemoData();
  
  const targetDate = date || new Date();
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  if (!adminDb) {
    // Demo mode - calculate from in-memory data
    const userMap = new Map<string, UserActivity>();
    
    // Group orders by user
    demoOrders.forEach(order => {
      const orderDate = new Date(order.createdAt);
      if (orderDate >= startOfDay && orderDate <= endOfDay) {
        if (!userMap.has(order.userId)) {
          const user = demoUsers.find(u => u.id === order.userId) || { id: order.userId, email: order.email || '', displayName: order.customerName, phone: order.phone, role: 'CUSTOMER' };
          userMap.set(order.userId, {
            id: user.id,
            userId: user.id,
            name: user.displayName || order.customerName,
            email: user.email || order.email || '',
            phone: user.phone || order.phone,
            orders: [],
            reservations: [],
            events: [],
            totalAmount: 0,
            paymentStatus: 'PENDING',
            lastActivity: order.createdAt,
          });
        }
        const userActivity = userMap.get(order.userId)!;
        userActivity.orders.push(order);
        userActivity.totalAmount += order.totalAmount || 0;
        if (order.createdAt > userActivity.lastActivity) {
          userActivity.lastActivity = order.createdAt;
        }
      }
    });
    
    // Group reservations by user
    demoReservations.forEach(reservation => {
      if (reservation.date === targetDate.toISOString().split('T')[0]) {
        if (!userMap.has(reservation.userId)) {
          const user = demoUsers.find(u => u.id === reservation.userId) || { id: reservation.userId, email: reservation.email, displayName: reservation.name, phone: reservation.phone, role: 'CUSTOMER' };
          userMap.set(reservation.userId, {
            id: user.id,
            userId: user.id,
            name: user.displayName || reservation.name,
            email: user.email,
            phone: user.phone,
            orders: [],
            reservations: [],
            events: [],
            totalAmount: 0,
            paymentStatus: 'PENDING',
            lastActivity: new Date(reservation.createdAt),
          });
        }
        const userActivity = userMap.get(reservation.userId)!;
        userActivity.reservations.push(reservation);
      }
    });
    
    // Group events by user
    demoEvents.forEach(event => {
      const eventDate = new Date(event.preferredDate || event.createdAt);
      if (eventDate >= startOfDay && eventDate <= endOfDay) {
        if (!userMap.has(event.userId)) {
          const user = demoUsers.find(u => u.id === event.userId) || { id: event.userId, email: event.email, displayName: event.name, phone: event.phone, role: 'CUSTOMER' };
          userMap.set(event.userId, {
            id: user.id,
            userId: user.id,
            name: user.displayName || event.name,
            email: user.email,
            phone: event.phone,
            orders: [],
            reservations: [],
            events: [],
            totalAmount: 0,
            paymentStatus: 'PENDING',
            lastActivity: new Date(event.createdAt),
          });
        }
        const userActivity = userMap.get(event.userId)!;
        userActivity.events.push(event);
        if (event.totalAmount) {
          userActivity.totalAmount += event.totalAmount;
        }
      }
    });
    
    // Calculate payment status for each user
    userMap.forEach(user => {
      const paidOrders = user.orders.filter(o => o.paymentStatus === 'PAID');
      if (paidOrders.length === user.orders.length && user.orders.length > 0) {
        user.paymentStatus = 'PAID';
      } else if (paidOrders.length > 0) {
        user.paymentStatus = 'PARTIAL';
      } else {
        user.paymentStatus = 'PENDING';
      }
      
      // Set payment method
      if (user.orders.length > 0) {
        user.paymentMethod = user.orders[0].paymentMethod;
      }
    });
    
    let users = Array.from(userMap.values());
    
    // Apply search filter
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(u => 
        u.name.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower)
      );
    }
    
    // Apply payment status filter
    if (paymentStatusFilter) {
      users = users.filter(u => u.paymentStatus === paymentStatusFilter);
    }
    
    // Sort by last activity
    users.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
    
    const total = users.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedUsers = users.slice(startIndex, startIndex + pageSize);
    
    return { users: paginatedUsers, total };
  }
  
  try {
    // Fetch today's orders
    const ordersSnapshot = await adminDb.collection('orders')
      .where('createdAt', '>=', startOfDay)
      .where('createdAt', '<=', endOfDay)
      .get();
    
    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
    })) as Order[];
    
    // Fetch today's reservations
    const reservationsSnapshot = await adminDb.collection('reservations')
      .where('date', '==', targetDate.toISOString().split('T')[0])
      .get();
    
    const reservations = reservationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
    })) as Reservation[];
    
    // Fetch today's events
    const eventsSnapshot = await adminDb.collection('events')
      .where('createdAt', '>=', startOfDay)
      .where('createdAt', '<=', endOfDay)
      .get();
    
    const events = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
    })) as EventBooking[];
    
    // Group by user
    const userMap = new Map<string, UserActivity>();
    
    orders.forEach(order => {
      if (!userMap.has(order.userId)) {
        userMap.set(order.userId, {
          id: order.userId,
          userId: order.userId,
          name: order.customerName,
          email: order.email || '',
          phone: order.phone,
          orders: [],
          reservations: [],
          events: [],
          totalAmount: 0,
          paymentStatus: 'PENDING',
          lastActivity: order.createdAt,
        });
      }
      const userActivity = userMap.get(order.userId)!;
      userActivity.orders.push(order);
      userActivity.totalAmount += order.totalAmount || 0;
    });
    
    reservations.forEach(reservation => {
      if (!userMap.has(reservation.userId)) {
        userMap.set(reservation.userId, {
          id: reservation.userId,
          userId: reservation.userId,
          name: reservation.name,
          email: reservation.email,
          phone: reservation.phone,
          orders: [],
          reservations: [],
          events: [],
          totalAmount: 0,
          paymentStatus: 'PENDING',
          lastActivity: new Date(reservation.createdAt),
        });
      }
      userMap.get(reservation.userId)!.reservations.push(reservation);
    });
    
    events.forEach(event => {
      if (!userMap.has(event.userId)) {
        userMap.set(event.userId, {
          id: event.userId,
          userId: event.userId,
          name: event.name,
          email: event.email,
          phone: event.phone || '',
          orders: [],
          reservations: [],
          events: [],
          totalAmount: 0,
          paymentStatus: 'PENDING',
          lastActivity: new Date(event.createdAt),
        });
      }
      const userActivity = userMap.get(event.userId)!;
      userActivity.events.push(event);
      if (event.totalAmount) {
        userActivity.totalAmount += event.totalAmount;
      }
    });
    
    // Calculate payment status
    userMap.forEach(user => {
      const paidOrders = user.orders.filter(o => o.paymentStatus === 'PAID');
      if (paidOrders.length === user.orders.length && user.orders.length > 0) {
        user.paymentStatus = 'PAID';
      } else if (paidOrders.length > 0) {
        user.paymentStatus = 'PARTIAL';
      }
      
      if (user.orders.length > 0) {
        user.paymentMethod = user.orders[0].paymentMethod;
      }
    });
    
    let users = Array.from(userMap.values());
    
    // Apply filters
    if (search) {
      const searchLower = search.toLowerCase();
      users = users.filter(u => 
        u.name.toLowerCase().includes(searchLower) ||
        u.email.toLowerCase().includes(searchLower)
      );
    }
    
    if (paymentStatusFilter) {
      users = users.filter(u => u.paymentStatus === paymentStatusFilter);
    }
    
    users.sort((a, b) => new Date(b.lastActivity).getTime() - new Date(a.lastActivity).getTime());
    
    const total = users.length;
    const startIndex = (page - 1) * pageSize;
    const paginatedUsers = users.slice(startIndex, startIndex + pageSize);
    
    return { users: paginatedUsers, total };
  } catch (error) {
    console.error('Error getting users with activity:', error);
    return { users: [], total: 0 };
  }
}

/**
 * Confirm payment and notify user
 */
export async function confirmPayment(
  orderId: string,
  paymentMethod: PaymentMethod,
  confirmedBy: string
): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  const adminDb = getAdminDb();
  
  if (!adminDb) {
    // Demo mode
    const order = demoOrders.find(o => o.id === orderId);
    if (order) {
      order.paymentStatus = 'PAID';
      order.paymentMethod = paymentMethod;
      return { success: true, invoiceId: `inv_${Date.now()}` };
    }
    return { success: false, error: 'Order not found' };
  }
  
  try {
    // Update order payment status
    await adminDb.collection('orders').doc(orderId).update({
      paymentStatus: 'PAID',
      paymentMethod,
      updatedAt: new Date(),
    });
    
    // Get order details
    const orderDoc = await adminDb.collection('orders').doc(orderId).get();
    const orderData = orderDoc.data();
    
    if (orderData) {
      // Create notification for user
      await adminDb.collection('notifications').add({
        type: 'PAYMENT',
        title: 'Payment Confirmed',
        message: `Your payment of ${orderData.totalAmount?.toLocaleString()} XAF has been confirmed. Thank you!`,
        userId: orderData.userId,
        orderId,
        amount: orderData.totalAmount,
        paymentMethod,
        read: false,
        createdAt: new Date(),
      });
      
      // Log admin action
      await adminDb.collection('admin_logs').add({
        action: 'PAYMENT_CONFIRMED',
        orderId,
        amount: orderData.totalAmount,
        paymentMethod,
        confirmedBy,
        timestamp: new Date(),
      });
      
      return { success: true, invoiceId: `inv_${orderId}` };
    }
    
    return { success: false, error: 'Order data not found' };
  } catch (error) {
    console.error('Error confirming payment:', error);
    return { success: false, error: 'Failed to confirm payment' };
  }
}

/**
 * Generate daily report
 */
export async function generateDailyReport(date?: Date): Promise<DailyReport> {
  const adminDb = getAdminDb();
  initDemoData();
  
  const targetDate = date || new Date();
  const dateStr = targetDate.toISOString().split('T')[0];
  const startOfDay = new Date(targetDate);
  startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(targetDate);
  endOfDay.setHours(23, 59, 59, 999);
  
  // Get stats
  const stats = await getDailyStats(targetDate);
  
  if (!adminDb) {
    // Demo mode - generate sample data
    const topItems = [
      { name: 'Grilled Fish', count: 15, revenue: 75000 },
      { name: 'Jollof Rice', count: 12, revenue: 36000 },
      { name: 'Suya Platter', count: 10, revenue: 50000 },
      { name: 'Pepper Soup', count: 8, revenue: 32000 },
      { name: 'Fried Plantains', count: 20, revenue: 20000 },
    ];
    
    const paymentBreakdown: Record<string, number> = {
      'ORANGE_MONEY': 85000,
      'MTN_MONEY': 62000,
      'CASH': 48000,
    };
    
    const hourlyDistribution = Array.from({ length: 14 }, (_, i) => ({
      hour: i + 8, // 8 AM to 10 PM
      orders: Math.floor(Math.random() * 5) + 1,
      revenue: Math.floor(Math.random() * 50000) + 10000,
    }));
    
    return {
      date: dateStr,
      stats,
      topItems,
      paymentBreakdown,
      hourlyDistribution,
    };
  }
  
  try {
    // Fetch orders for the day
    const ordersSnapshot = await adminDb.collection('orders')
      .where('createdAt', '>=', startOfDay)
      .where('createdAt', '<=', endOfDay)
      .get();
    
    const orders = ordersSnapshot.docs.map(doc => doc.data() as Order);
    
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
    
    // Calculate payment breakdown
    const paymentBreakdown: Record<string, number> = {};
    orders.filter(o => o.paymentStatus === 'PAID').forEach(order => {
      const method = order.paymentMethod || 'CASH';
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + (order.totalAmount || 0);
    });
    
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
    
    return {
      date: dateStr,
      stats,
      topItems,
      paymentBreakdown,
      hourlyDistribution,
    };
  } catch (error) {
    console.error('Error generating daily report:', error);
    return {
      date: dateStr,
      stats,
      topItems: [],
      paymentBreakdown: {},
      hourlyDistribution: [],
    };
  }
}

/**
 * Get revenue analytics
 */
export async function getRevenueAnalytics(
  startDate: Date,
  endDate: Date,
  groupBy: 'day' | 'week' | 'month' = 'day'
): Promise<Array<{ date: string; revenue: number; orders: number }>> {
  const adminDb = getAdminDb();
  initDemoData();
  
  if (!adminDb) {
    // Demo mode - generate sample data
    const data: Array<{ date: string; revenue: number; orders: number }> = [];
    const current = new Date(startDate);
    
    while (current <= endDate) {
      data.push({
        date: current.toISOString().split('T')[0],
        revenue: Math.floor(Math.random() * 200000) + 50000,
        orders: Math.floor(Math.random() * 30) + 10,
      });
      current.setDate(current.getDate() + (groupBy === 'day' ? 1 : groupBy === 'week' ? 7 : 30));
    }
    
    return data;
  }
  
  try {
    const ordersSnapshot = await adminDb.collection('orders')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .where('paymentStatus', '==', 'PAID')
      .get();
    
    const orders = ordersSnapshot.docs.map(doc => doc.data() as Order);
    
    // Group by date
    const groupedData = new Map<string, { revenue: number; orders: number }>();
    
    orders.forEach(order => {
      let dateKey: string;
      const orderDate = new Date(order.createdAt);
      
      if (groupBy === 'month') {
        dateKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`;
      } else if (groupBy === 'week') {
        const weekStart = new Date(orderDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        dateKey = weekStart.toISOString().split('T')[0];
      } else {
        dateKey = orderDate.toISOString().split('T')[0];
      }
      
      const current = groupedData.get(dateKey) || { revenue: 0, orders: 0 };
      current.revenue += order.totalAmount || 0;
      current.orders += 1;
      groupedData.set(dateKey, current);
    });
    
    return Array.from(groupedData.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error('Error getting revenue analytics:', error);
    return [];
  }
}

/**
 * Get most ordered items
 */
export async function getMostOrderedItems(
  startDate?: Date,
  endDate?: Date,
  limit: number = 10
): Promise<Array<{ name: string; count: number; revenue: number }>> {
  const adminDb = getAdminDb();
  initDemoData();
  
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Last 30 days
  const end = endDate || new Date();
  
  if (!adminDb) {
    // Demo mode
    return [
      { name: 'Grilled Fish', count: 156, revenue: 780000 },
      { name: 'Jollof Rice', count: 142, revenue: 426000 },
      { name: 'Suya Platter', count: 98, revenue: 490000 },
      { name: 'Pepper Soup', count: 87, revenue: 348000 },
      { name: 'Fried Plantains', count: 76, revenue: 152000 },
      { name: 'Eru & Water Fufu', count: 65, revenue: 325000 },
      { name: 'Ndolé', count: 58, revenue: 290000 },
      { name: 'Kilishi', count: 45, revenue: 180000 },
      { name: 'Achu Soup', count: 42, revenue: 210000 },
      { name: 'Poulet DG', count: 38, revenue: 266000 },
    ].slice(0, limit);
  }
  
  try {
    const ordersSnapshot = await adminDb.collection('orders')
      .where('createdAt', '>=', start)
      .where('createdAt', '<=', end)
      .get();
    
    const itemCounts = new Map<string, { count: number; revenue: number }>();
    
    ordersSnapshot.docs.forEach(doc => {
      const order = doc.data() as Order;
      order.items?.forEach(item => {
        const current = itemCounts.get(item.name) || { count: 0, revenue: 0 };
        current.count += item.quantity;
        current.revenue += (item.price * item.quantity);
        itemCounts.set(item.name, current);
      });
    });
    
    return Array.from(itemCounts.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
  } catch (error) {
    console.error('Error getting most ordered items:', error);
    return [];
  }
}

/**
 * Get payment method distribution
 */
export async function getPaymentMethodDistribution(
  startDate?: Date,
  endDate?: Date
): Promise<Array<{ method: string; count: number; amount: number; percentage: number }>> {
  const adminDb = getAdminDb();
  initDemoData();
  
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();
  
  if (!adminDb) {
    // Demo mode
    const data = [
      { method: 'ORANGE_MONEY', count: 145, amount: 1250000 },
      { method: 'MTN_MONEY', count: 98, amount: 850000 },
      { method: 'CASH', count: 87, amount: 620000 },
      { method: 'VISA', count: 23, amount: 380000 },
      { method: 'MASTERCARD', count: 18, amount: 290000 },
    ];
    
    const total = data.reduce((sum, d) => sum + d.amount, 0);
    return data.map(d => ({
      ...d,
      percentage: Math.round((d.amount / total) * 100),
    }));
  }
  
  try {
    const ordersSnapshot = await adminDb.collection('orders')
      .where('createdAt', '>=', start)
      .where('createdAt', '<=', end)
      .where('paymentStatus', '==', 'PAID')
      .get();
    
    const methodCounts = new Map<string, { count: number; amount: number }>();
    
    ordersSnapshot.docs.forEach(doc => {
      const order = doc.data() as Order;
      const method = order.paymentMethod || 'CASH';
      const current = methodCounts.get(method) || { count: 0, amount: 0 };
      current.count += 1;
      current.amount += order.totalAmount || 0;
      methodCounts.set(method, current);
    });
    
    const total = Array.from(methodCounts.values()).reduce((sum, d) => sum + d.amount, 0);
    
    return Array.from(methodCounts.entries())
      .map(([method, data]) => ({
        method,
        ...data,
        percentage: Math.round((data.amount / total) * 100),
      }))
      .sort((a, b) => b.amount - a.amount);
  } catch (error) {
    console.error('Error getting payment method distribution:', error);
    return [];
  }
}

// Demo storage for admin logs
let demoAdminLogs: AdminLog[] = [];

/**
 * Log admin action for audit trail
 */
export async function logAdminAction(
  adminId: string,
  adminEmail: string,
  action: string,
  targetId: string,
  targetType: AdminLog['targetType'],
  details: string,
  metadata?: Record<string, unknown>
): Promise<{ success: boolean; logId?: string; error?: string }> {
  const adminDb = getAdminDb();
  
  const log: AdminLog = {
    id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    adminId,
    adminEmail,
    action,
    targetId,
    targetType,
    details,
    metadata,
    createdAt: new Date(),
  };
  
  if (!adminDb) {
    // Demo mode - store in memory
    demoAdminLogs.unshift(log);
    if (demoAdminLogs.length > 100) {
      demoAdminLogs = demoAdminLogs.slice(0, 100);
    }
    return { success: true, logId: log.id };
  }
  
  try {
    await adminDb.collection('admin_logs').doc(log.id).set({
      ...log,
      createdAt: new Date(),
    });
    
    return { success: true, logId: log.id };
  } catch (error) {
    console.error('Error logging admin action:', error);
    return { success: false, error: 'Failed to log action' };
  }
}

/**
 * Get admin action logs
 */
export async function getAdminLogs(
  limit: number = 50,
  offset: number = 0,
  adminId?: string,
  targetType?: AdminLog['targetType']
): Promise<{ logs: AdminLog[]; total: number }> {
  const adminDb = getAdminDb();
  
  if (!adminDb) {
    // Demo mode
    let filteredLogs = [...demoAdminLogs];
    
    if (adminId) {
      filteredLogs = filteredLogs.filter(log => log.adminId === adminId);
    }
    
    if (targetType) {
      filteredLogs = filteredLogs.filter(log => log.targetType === targetType);
    }
    
    const total = filteredLogs.length;
    const logs = filteredLogs.slice(offset, offset + limit);
    
    return { logs, total };
  }
  
  try {
    let query = adminDb.collection('admin_logs')
      .orderBy('createdAt', 'desc');
    
    if (adminId) {
      query = query.where('adminId', '==', adminId);
    }
    
    if (targetType) {
      query = query.where('targetType', '==', targetType);
    }
    
    const snapshot = await query.limit(limit).get();
    
    const logs = snapshot.docs.map(doc => doc.data() as AdminLog);
    
    // Get total count (approximate)
    const totalSnapshot = await adminDb.collection('admin_logs').get();
    const total = totalSnapshot.size;
    
    return { logs, total };
  } catch (error) {
    console.error('Error getting admin logs:', error);
    return { logs: [], total: 0 };
  }
}

/**
 * Confirm payment with transaction (atomic operation)
 */
export async function confirmPaymentWithTransaction(
  orderId: string,
  paymentMethod: PaymentMethod,
  paymentReference: string,
  confirmedBy: string,
  confirmedByEmail: string
): Promise<{ success: boolean; invoiceId?: string; error?: string }> {
  const adminDb = getAdminDb();
  
  if (!adminDb) {
    // Demo mode
    const order = demoOrders.find(o => o.id === orderId);
    if (order) {
      order.paymentStatus = 'PAID';
      order.paymentMethod = paymentMethod;
      order.transactionReference = paymentReference;
      order.status = 'CONFIRMED';
      
      // Log the action
      await logAdminAction(
        confirmedBy,
        confirmedByEmail,
        'PAYMENT_CONFIRMED',
        orderId,
        'payment',
        `Payment of ${order.totalAmount?.toLocaleString()} XAF confirmed via ${paymentMethod}`,
        { amount: order.totalAmount, paymentMethod, paymentReference }
      );
      
      return { success: true, invoiceId: `inv_${Date.now()}` };
    }
    return { success: false, error: 'Order not found' };
  }
  
  try {
    // Use Firestore transaction for atomicity
    const orderRef = adminDb.collection('orders').doc(orderId);
    
    await adminDb.runTransaction(async (transaction) => {
      const orderDoc = await transaction.get(orderRef);
      
      if (!orderDoc.exists) {
        throw new Error('Order not found');
      }
      
      const orderData = orderDoc.data();
      
      // Update order
      transaction.update(orderRef, {
        paymentStatus: 'PAID',
        paymentMethod,
        transactionReference: paymentReference,
        status: 'CONFIRMED',
        updatedAt: new Date(),
        paidAt: new Date(),
      });
      
      // Create notification for user
      const notificationRef = adminDb.collection('notifications').doc();
      transaction.set(notificationRef, {
        type: 'PAYMENT',
        title: 'Payment Confirmed',
        message: `Your payment of ${orderData?.totalAmount?.toLocaleString()} XAF has been confirmed. Thank you!`,
        userId: orderData?.userId,
        orderId,
        amount: orderData?.totalAmount,
        paymentMethod,
        paymentReference,
        read: false,
        createdAt: new Date(),
      });
      
      // Create invoice
      const invoiceRef = adminDb.collection('invoices').doc();
      const invoiceNumber = `INV-${Date.now().toString().slice(-10)}`;
      transaction.set(invoiceRef, {
        id: invoiceRef.id,
        invoiceNumber,
        orderId,
        userId: orderData?.userId,
        customerName: orderData?.customerName,
        customerEmail: orderData?.email,
        customerPhone: orderData?.phone,
        items: orderData?.items,
        subtotal: orderData?.subtotal,
        serviceCharge: orderData?.serviceCharge,
        vat: orderData?.tax,
        total: orderData?.totalAmount,
        paymentMethod,
        paymentStatus: 'PAID',
        status: 'PAID',
        paymentReference,
        paidAt: new Date(),
        createdAt: new Date(),
        dueDate: new Date(),
      });
      
      // Log admin action
      const logRef = adminDb.collection('admin_logs').doc();
      transaction.set(logRef, {
        id: logRef.id,
        adminId: confirmedBy,
        adminEmail: confirmedByEmail,
        action: 'PAYMENT_CONFIRMED',
        targetId: orderId,
        targetType: 'payment',
        details: `Payment of ${orderData?.totalAmount?.toLocaleString()} XAF confirmed via ${paymentMethod}`,
        metadata: {
          amount: orderData?.totalAmount,
          paymentMethod,
          paymentReference,
          invoiceId: invoiceRef.id,
        },
        createdAt: new Date(),
      });
    });
    
    return { success: true, invoiceId: `inv_${orderId}` };
  } catch (error) {
    console.error('Error confirming payment:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Failed to confirm payment' };
  }
}

/**
 * Get comprehensive admin dashboard stats
 */
export async function getAdminDashboardStats(date?: Date): Promise<AdminDashboardStats> {
  const dailyStats = await getDailyStats(date);
  
  return {
    totalOrdersToday: dailyStats.totalOrders,
    totalReservationsToday: dailyStats.totalReservations,
    totalEventsToday: dailyStats.totalEvents,
    totalRevenueToday: dailyStats.totalRevenue,
    pendingPayments: dailyStats.pendingPayments,
    confirmedPayments: dailyStats.confirmedPayments,
    activeUsers: dailyStats.newUsers, // Using newUsers as proxy for active users
    pendingOrders: dailyStats.pendingOrders,
    completedOrders: dailyStats.completedOrders,
    avgOrderValue: dailyStats.avgOrderValue,
    newUsersToday: dailyStats.newUsers,
  };
}

/**
 * Get peak hours analysis
 */
export async function getPeakHours(
  startDate?: Date,
  endDate?: Date
): Promise<Array<{ hour: number; orders: number; revenue: number }>> {
  const adminDb = getAdminDb();
  initDemoData();
  
  const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
  const end = endDate || new Date();
  
  if (!adminDb) {
    // Demo mode - generate sample data
    return Array.from({ length: 14 }, (_, i) => ({
      hour: i + 8, // 8 AM to 10 PM
      orders: Math.floor(Math.random() * 10) + 1,
      revenue: Math.floor(Math.random() * 100000) + 20000,
    }));
  }
  
  try {
    const ordersSnapshot = await adminDb.collection('orders')
      .where('createdAt', '>=', start)
      .where('createdAt', '<=', end)
      .get();
    
    const hourlyData = new Map<number, { orders: number; revenue: number }>();
    
    ordersSnapshot.docs.forEach(doc => {
      const order = doc.data();
      const hour = new Date(order.createdAt?.toDate?.() || order.createdAt).getHours();
      const current = hourlyData.get(hour) || { orders: 0, revenue: 0 };
      current.orders += 1;
      current.revenue += order.totalAmount || 0;
      hourlyData.set(hour, current);
    });
    
    return Array.from(hourlyData.entries())
      .map(([hour, data]) => ({ hour, ...data }))
      .sort((a, b) => b.orders - a.orders);
  } catch (error) {
    console.error('Error getting peak hours:', error);
    return [];
  }
}

/**
 * Get event popularity analysis
 */
export async function getEventPopularity(
  startDate?: Date,
  endDate?: Date
): Promise<Array<{ type: string; count: number; revenue: number }>> {
  const adminDb = getAdminDb();
  
  const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();
  
  if (!adminDb) {
    // Demo mode
    return [
      { type: 'CORPORATE', count: 12, revenue: 2400000 },
      { type: 'BIRTHDAY', count: 25, revenue: 1250000 },
      { type: 'WEDDING', count: 5, revenue: 5000000 },
      { type: 'ANNIVERSARY', count: 8, revenue: 800000 },
      { type: 'BUSINESS', count: 15, revenue: 1500000 },
    ];
  }
  
  try {
    const eventsSnapshot = await adminDb.collection('events')
      .where('createdAt', '>=', start)
      .where('createdAt', '<=', end)
      .get();
    
    const typeData = new Map<string, { count: number; revenue: number }>();
    
    eventsSnapshot.docs.forEach(doc => {
      const event = doc.data();
      const type = event.eventType || 'OTHER';
      const current = typeData.get(type) || { count: 0, revenue: 0 };
      current.count += 1;
      current.revenue += event.totalAmount || 0;
      typeData.set(type, current);
    });
    
    return Array.from(typeData.entries())
      .map(([type, data]) => ({ type, ...data }))
      .sort((a, b) => b.revenue - a.revenue);
  } catch (error) {
    console.error('Error getting event popularity:', error);
    return [];
  }
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string,
  status: Order['status'],
  adminId: string,
  adminEmail: string
): Promise<{ success: boolean; error?: string }> {
  const adminDb = getAdminDb();
  
  if (!adminDb) {
    // Demo mode
    const order = demoOrders.find(o => o.id === orderId);
    if (order) {
      order.status = status;
      return { success: true };
    }
    return { success: false, error: 'Order not found' };
  }
  
  try {
    await adminDb.collection('orders').doc(orderId).update({
      status,
      updatedAt: new Date(),
    });
    
    // Log the action
    await logAdminAction(
      adminId,
      adminEmail,
      'ORDER_STATUS_UPDATED',
      orderId,
      'order',
      `Order status updated to ${status}`,
      { status }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error updating order status:', error);
    return { success: false, error: 'Failed to update order status' };
  }
}

/**
 * Update reservation status
 */
export async function updateReservationStatus(
  reservationId: string,
  status: Reservation['status'],
  adminId: string,
  adminEmail: string
): Promise<{ success: boolean; error?: string }> {
  const adminDb = getAdminDb();
  
  if (!adminDb) {
    // Demo mode
    const reservation = demoReservations.find(r => r.id === reservationId);
    if (reservation) {
      reservation.status = status;
      return { success: true };
    }
    return { success: false, error: 'Reservation not found' };
  }
  
  try {
    await adminDb.collection('reservations').doc(reservationId).update({
      status,
      updatedAt: new Date(),
    });
    
    // Log the action
    await logAdminAction(
      adminId,
      adminEmail,
      'RESERVATION_STATUS_UPDATED',
      reservationId,
      'reservation',
      `Reservation status updated to ${status}`,
      { status }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error updating reservation status:', error);
    return { success: false, error: 'Failed to update reservation status' };
  }
}

/**
 * Update event status
 */
export async function updateEventStatus(
  eventId: string,
  status: EventBooking['status'],
  adminId: string,
  adminEmail: string
): Promise<{ success: boolean; error?: string }> {
  const adminDb = getAdminDb();
  
  if (!adminDb) {
    // Demo mode
    const event = demoEvents.find(e => e.id === eventId);
    if (event) {
      event.status = status;
      return { success: true };
    }
    return { success: false, error: 'Event not found' };
  }
  
  try {
    await adminDb.collection('events').doc(eventId).update({
      status,
      updatedAt: new Date(),
    });
    
    // Log the action
    await logAdminAction(
      adminId,
      adminEmail,
      'EVENT_STATUS_UPDATED',
      eventId,
      'event',
      `Event status updated to ${status}`,
      { status }
    );
    
    return { success: true };
  } catch (error) {
    console.error('Error updating event status:', error);
    return { success: false, error: 'Failed to update event status' };
  }
}
