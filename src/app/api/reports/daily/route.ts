/**
 * Daily Reports API
 * Handles daily report generation, archival, and exports
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { format, startOfDay, endOfDay, subDays, eachDayOfInterval } from 'date-fns';

interface DailyReport {
  id: string;
  date: string;
  orders: number;
  reservations: number;
  events: number;
  totalRevenue: number;
  paymentsConfirmed: number;
  paymentsPending: number;
  items: Record<string, number>; // Most ordered items
  paymentMethods: Record<string, number>; // Payment method distribution
  peakHours: Record<string, number>; // Hourly distribution
  createdAt: Date;
  updatedAt?: Date;
}

/**
 * Verify admin access
 */
async function verifyAdmin(request: NextRequest): Promise<{ uid: string; role: string } | null> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  const adminAuth = getAdminAuth();
  
  if (!adminAuth) {
    return null;
  }
  
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const adminDb = getAdminDb();
    
    if (adminDb) {
      const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
      const userData = userDoc.data();
      
      if (userData?.role === 'ADMIN' || userData?.role === 'MANAGER') {
        return { uid: decodedToken.uid, role: userData.role };
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Generate daily report from raw data
 */
async function generateDailyReport(
  adminDb: FirebaseFirestore.Firestore,
  date: Date
): Promise<DailyReport> {
  const dateStr = format(date, 'yyyy-MM-dd');
  const start = startOfDay(date);
  const end = endOfDay(date);
  
  // Fetch orders for the date
  const ordersSnapshot = await adminDb.collection('orders')
    .where('createdAt', '>=', start)
    .where('createdAt', '<=', end)
    .get();
  
  // Fetch reservations for the date
  const reservationsSnapshot = await adminDb.collection('reservations')
    .where('createdAt', '>=', start)
    .where('createdAt', '<=', end)
    .get();
  
  // Fetch events for the date
  const eventsSnapshot = await adminDb.collection('events')
    .where('createdAt', '>=', start)
    .where('createdAt', '<=', end)
    .get();
  
  // Calculate statistics
  let totalRevenue = 0;
  let paymentsConfirmed = 0;
  let paymentsPending = 0;
  const items: Record<string, number> = {};
  const paymentMethods: Record<string, number> = {};
  const peakHours: Record<string, number> = {};
  
  ordersSnapshot.forEach((doc) => {
    const data = doc.data();
    totalRevenue += data.totalAmount || 0;
    
    // Payment status
    if (data.paymentStatus === 'PAID') {
      paymentsConfirmed++;
    } else {
      paymentsPending++;
    }
    
    // Payment methods
    const method = data.paymentMethod || 'CASH';
    paymentMethods[method] = (paymentMethods[method] || 0) + 1;
    
    // Items
    if (data.items && Array.isArray(data.items)) {
      data.items.forEach((item: { name: string; quantity: number }) => {
        items[item.name] = (items[item.name] || 0) + (item.quantity || 1);
      });
    }
    
    // Peak hours
    const createdAt = data.createdAt?.toDate?.() || new Date(data.createdAt);
    const hour = format(createdAt, 'HH:00');
    peakHours[hour] = (peakHours[hour] || 0) + 1;
  });
  
  // Add events revenue
  eventsSnapshot.forEach((doc) => {
    const data = doc.data();
    totalRevenue += data.totalAmount || 0;
    
    if (data.paymentStatus === 'PAID') {
      paymentsConfirmed++;
    } else {
      paymentsPending++;
    }
  });
  
  const report: DailyReport = {
    id: dateStr,
    date: dateStr,
    orders: ordersSnapshot.size,
    reservations: reservationsSnapshot.size,
    events: eventsSnapshot.size,
    totalRevenue,
    paymentsConfirmed,
    paymentsPending,
    items,
    paymentMethods,
    peakHours,
    createdAt: new Date(),
  };
  
  // Save to daily_reports collection
  await adminDb.collection('daily_reports').doc(dateStr).set(report, { merge: true });
  
  return report;
}

/**
 * Export report as CSV
 */
function generateCSV(report: DailyReport, orders: any[]): string {
  const rows = [
    ['THE YARD RESTAURANT - DAILY REPORT'],
    [`Date: ${report.date}`],
    [],
    ['SUMMARY'],
    ['Metric', 'Value'],
    ['Total Orders', report.orders.toString()],
    ['Total Reservations', report.reservations.toString()],
    ['Total Events', report.events.toString()],
    ['Total Revenue (XAF)', report.totalRevenue.toString()],
    ['Payments Confirmed', report.paymentsConfirmed.toString()],
    ['Payments Pending', report.paymentsPending.toString()],
    [],
    ['PAYMENT METHOD DISTRIBUTION'],
    ['Method', 'Count'],
    ...Object.entries(report.paymentMethods).map(([method, count]) => [method, count.toString()]),
    [],
    ['MOST ORDERED ITEMS'],
    ['Item', 'Quantity'],
    ...Object.entries(report.items)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([item, qty]) => [item, qty.toString()]),
    [],
    ['PEAK HOURS'],
    ['Hour', 'Orders'],
    ...Object.entries(report.peakHours)
      .sort((a, b) => b[1] - a[1])
      .map(([hour, count]) => [hour, count.toString()]),
  ];
  
  return rows.map(row => row.join(',')).join('\n');
}

/**
 * GET /api/reports/daily
 * Get daily report with optional filters
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const admin = await verifyAdmin(request);
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 503 }
      );
    }
    
    const { searchParams } = new URL(request.url);
    const dateStr = searchParams.get('date');
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const exportCSV = searchParams.get('export') === 'true';
    
    // Single date report
    if (dateStr) {
      const date = new Date(dateStr);
      const report = await generateDailyReport(adminDb, date);
      
      if (exportCSV) {
        // Get orders for CSV
        const start = startOfDay(date);
        const end = endOfDay(date);
        const ordersSnapshot = await adminDb.collection('orders')
          .where('createdAt', '>=', start)
          .where('createdAt', '<=', end)
          .get();
        
        const orders = ordersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const csv = generateCSV(report, orders);
        
        return new NextResponse(csv, {
          headers: {
            'Content-Type': 'text/csv',
            'Content-Disposition': `attachment; filename="the-yard-report-${dateStr}.csv"`,
          },
        });
      }
      
      return NextResponse.json({ success: true, report });
    }
    
    // Date range report
    if (startDateStr && endDateStr) {
      const startDate = new Date(startDateStr);
      const endDate = new Date(endDateStr);
      const days = eachDayOfInterval({ start: startDate, end: endDate });
      
      const reports: DailyReport[] = [];
      
      for (const day of days) {
        const report = await generateDailyReport(adminDb, day);
        reports.push(report);
      }
      
      // Calculate totals
      const summary = {
        totalOrders: reports.reduce((sum, r) => sum + r.orders, 0),
        totalReservations: reports.reduce((sum, r) => sum + r.reservations, 0),
        totalEvents: reports.reduce((sum, r) => sum + r.events, 0),
        totalRevenue: reports.reduce((sum, r) => sum + r.totalRevenue, 0),
        totalPaymentsConfirmed: reports.reduce((sum, r) => sum + r.paymentsConfirmed, 0),
        totalPaymentsPending: reports.reduce((sum, r) => sum + r.paymentsPending, 0),
      };
      
      return NextResponse.json({
        success: true,
        reports,
        summary,
      });
    }
    
    // Default: Get last 7 days
    const today = new Date();
    const last7Days = eachDayOfInterval({
      start: subDays(today, 6),
      end: today,
    });
    
    const reports: DailyReport[] = [];
    
    for (const day of last7Days) {
      const report = await generateDailyReport(adminDb, day);
      reports.push(report);
    }
    
    return NextResponse.json({
      success: true,
      reports,
      summary: {
        totalOrders: reports.reduce((sum, r) => sum + r.orders, 0),
        totalRevenue: reports.reduce((sum, r) => sum + r.totalRevenue, 0),
        averageDaily: Math.round(reports.reduce((sum, r) => sum + r.totalRevenue, 0) / 7),
      },
    });
    
  } catch (error) {
    console.error('Error generating report:', error);
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/reports/daily
 * Archive today's report manually
 */
export async function POST(request: NextRequest) {
  try {
    const admin = await verifyAdmin(request);
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 503 }
      );
    }
    
    const body = await request.json();
    const { date } = body;
    
    const targetDate = date ? new Date(date) : new Date();
    const report = await generateDailyReport(adminDb, targetDate);
    
    // Log action
    await adminDb.collection('admin_logs').add({
      adminId: admin.uid,
      action: 'ARCHIVE_REPORT',
      targetType: 'report',
      targetId: report.id,
      details: `Archived daily report for ${report.date}`,
      timestamp: new Date(),
    });
    
    return NextResponse.json({
      success: true,
      message: 'Report archived successfully',
      report,
    });
    
  } catch (error) {
    console.error('Error archiving report:', error);
    return NextResponse.json(
      { error: 'Failed to archive report' },
      { status: 500 }
    );
  }
}
