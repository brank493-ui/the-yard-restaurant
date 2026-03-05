/**
 * Admin Stats API
 * Provides real-time statistics, daily/weekly/monthly breakdowns, and revenue calculations
 * for The Yard Restaurant Admin Dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { 
  getDailyStats, 
  getRevenueAnalytics, 
  getMostOrderedItems, 
  getPaymentMethodDistribution,
  getPeakHours,
  getEventPopularity,
  getAdminDashboardStats
} from '@/lib/services/adminService';
import { format, startOfDay, endOfDay, startOfWeek, startOfMonth, subDays, eachDayOfInterval } from 'date-fns';

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
 * GET /api/admin/stats
 * Get comprehensive admin dashboard statistics
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const admin = await verifyAdmin(request);
    
    if (!admin) {
      return NextResponse.json(
        { error: 'Unauthorized', success: false },
        { status: 401 }
      );
    }
    
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get('type') || 'dashboard';
    const dateStr = searchParams.get('date');
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');
    const groupBy = (searchParams.get('groupBy') || 'day') as 'day' | 'week' | 'month';
    
    const date = dateStr ? new Date(dateStr) : new Date();
    const startDate = startDateStr ? new Date(startDateStr) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    
    switch (type) {
      case 'dashboard':
        // Comprehensive dashboard stats
        const dashboardStats = await getAdminDashboardStats(date);
        return NextResponse.json({ 
          success: true, 
          stats: dashboardStats 
        });
        
      case 'daily':
        const dailyStats = await getDailyStats(date);
        return NextResponse.json({ 
          success: true, 
          stats: dailyStats 
        });
        
      case 'report':
        const report = await generateFullDailyReport(date);
        return NextResponse.json({ 
          success: true, 
          report 
        });
        
      case 'revenue':
        const revenueData = await getRevenueAnalytics(startDate, endDate, groupBy);
        
        // Calculate totals
        const totalRevenue = revenueData.reduce((sum, d) => sum + d.revenue, 0);
        const totalOrders = revenueData.reduce((sum, d) => sum + d.orders, 0);
        const avgDailyRevenue = revenueData.length > 0 ? Math.round(totalRevenue / revenueData.length) : 0;
        
        return NextResponse.json({ 
          success: true, 
          data: revenueData,
          summary: {
            totalRevenue,
            totalOrders,
            avgDailyRevenue,
            period: {
              start: format(startDate, 'yyyy-MM-dd'),
              end: format(endDate, 'yyyy-MM-dd'),
            }
          }
        });
        
      case 'items':
        const items = await getMostOrderedItems(startDate, endDate, 20);
        return NextResponse.json({ 
          success: true, 
          items 
        });
        
      case 'payments':
        const payments = await getPaymentMethodDistribution(startDate, endDate);
        return NextResponse.json({ 
          success: true, 
          payments 
        });
        
      case 'peakhours':
        const peakHours = await getPeakHours(startDate, endDate);
        return NextResponse.json({ 
          success: true, 
          peakHours 
        });
        
      case 'events':
        const eventPopularity = await getEventPopularity(startDate, endDate);
        return NextResponse.json({ 
          success: true, 
          events: eventPopularity 
        });
        
      case 'analytics':
        // Comprehensive analytics
        const [
          revenueAnalytics,
          topItems,
          paymentDistribution,
          hourlyAnalysis,
          eventAnalysis
        ] = await Promise.all([
          getRevenueAnalytics(startDate, endDate, groupBy),
          getMostOrderedItems(startDate, endDate, 10),
          getPaymentMethodDistribution(startDate, endDate),
          getPeakHours(startDate, endDate),
          getEventPopularity(startDate, endDate)
        ]);
        
        return NextResponse.json({ 
          success: true, 
          analytics: {
            revenueOverTime: revenueAnalytics,
            mostOrderedItems: topItems,
            paymentDistribution: paymentDistribution,
            peakHours: hourlyAnalysis,
            eventPopularity: eventAnalysis,
          }
        });
        
      case 'comparison':
        // Compare today vs yesterday, this week vs last week
        const today = new Date();
        const yesterday = subDays(today, 1);
        const lastWeekStart = subDays(startOfWeek(today), 7);
        const lastWeekEnd = subDays(startOfWeek(today), 1);
        const thisWeekStart = startOfWeek(today);
        
        const [todayStats, yesterdayStats, thisWeekStats, lastWeekStats] = await Promise.all([
          getDailyStats(today),
          getDailyStats(yesterday),
          getWeeklyStats(thisWeekStart, today),
          getWeeklyStats(lastWeekStart, lastWeekEnd)
        ]);
        
        const dayOverDay = {
          orders: todayStats.totalOrders - yesterdayStats.totalOrders,
          revenue: todayStats.totalRevenue - yesterdayStats.totalRevenue,
          ordersPercent: yesterdayStats.totalOrders > 0 
            ? Math.round(((todayStats.totalOrders - yesterdayStats.totalOrders) / yesterdayStats.totalOrders) * 100)
            : 0,
          revenuePercent: yesterdayStats.totalRevenue > 0 
            ? Math.round(((todayStats.totalRevenue - yesterdayStats.totalRevenue) / yesterdayStats.totalRevenue) * 100)
            : 0,
        };
        
        const weekOverWeek = {
          orders: thisWeekStats.totalOrders - lastWeekStats.totalOrders,
          revenue: thisWeekStats.totalRevenue - lastWeekStats.totalRevenue,
          ordersPercent: lastWeekStats.totalOrders > 0 
            ? Math.round(((thisWeekStats.totalOrders - lastWeekStats.totalOrders) / lastWeekStats.totalOrders) * 100)
            : 0,
          revenuePercent: lastWeekStats.totalRevenue > 0 
            ? Math.round(((thisWeekStats.totalRevenue - lastWeekStats.totalRevenue) / lastWeekStats.totalRevenue) * 100)
            : 0,
        };
        
        return NextResponse.json({ 
          success: true, 
          comparison: {
            today: todayStats,
            yesterday: yesterdayStats,
            thisWeek: thisWeekStats,
            lastWeek: lastWeekStats,
            dayOverDay,
            weekOverWeek,
          }
        });
        
      default:
        return NextResponse.json({ 
          error: 'Invalid type parameter',
          success: false,
          validTypes: ['dashboard', 'daily', 'report', 'revenue', 'items', 'payments', 'peakhours', 'events', 'analytics', 'comparison']
        }, { status: 400 });
    }
  } catch (error) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json({ 
      error: 'Failed to fetch stats',
      success: false,
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * Generate full daily report with all details
 */
async function generateFullDailyReport(date: Date) {
  const adminDb = getAdminDb();
  
  const dateStr = format(date, 'yyyy-MM-dd');
  const start = startOfDay(date);
  const end = endOfDay(date);
  
  // Basic stats
  const stats = await getDailyStats(date);
  
  if (!adminDb) {
    return {
      date: dateStr,
      stats,
      orders: [],
      reservations: [],
      events: [],
      topItems: [],
      paymentMethods: {},
      hourlyDistribution: [],
    };
  }
  
  try {
    // Fetch detailed data
    const [ordersSnapshot, reservationsSnapshot, eventsSnapshot] = await Promise.all([
      adminDb.collection('orders')
        .where('createdAt', '>=', start)
        .where('createdAt', '<=', end)
        .orderBy('createdAt', 'desc')
        .get(),
      adminDb.collection('reservations')
        .where('createdAt', '>=', start)
        .where('createdAt', '<=', end)
        .orderBy('createdAt', 'desc')
        .get(),
      adminDb.collection('events')
        .where('createdAt', '>=', start)
        .where('createdAt', '<=', end)
        .orderBy('createdAt', 'desc')
        .get()
    ]);
    
    const orders = ordersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
    }));
    
    const reservations = reservationsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
    }));
    
    const events = eventsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
    }));
    
    // Calculate item breakdown
    const itemBreakdown = new Map<string, { count: number; revenue: number }>();
    orders.forEach((order: any) => {
      order.items?.forEach((item: any) => {
        const current = itemBreakdown.get(item.name) || { count: 0, revenue: 0 };
        current.count += item.quantity || 1;
        current.revenue += (item.price || 0) * (item.quantity || 1);
        itemBreakdown.set(item.name, current);
      });
    });
    
    const topItems = Array.from(itemBreakdown.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    
    // Payment method breakdown
    const paymentMethods: Record<string, number> = {};
    orders.forEach((order: any) => {
      if (order.paymentStatus === 'PAID') {
        const method = order.paymentMethod || 'CASH';
        paymentMethods[method] = (paymentMethods[method] || 0) + (order.totalAmount || 0);
      }
    });
    
    // Hourly distribution
    const hourlyDistribution = Array.from({ length: 24 }, (_, hour) => {
      const hourOrders = orders.filter((o: any) => {
        const orderHour = new Date(o.createdAt).getHours();
        return orderHour === hour;
      });
      
      return {
        hour,
        orders: hourOrders.length,
        revenue: hourOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0),
      };
    });
    
    return {
      date: dateStr,
      stats,
      orders,
      reservations,
      events,
      topItems,
      paymentMethods,
      hourlyDistribution,
    };
  } catch (error) {
    console.error('Error generating full report:', error);
    return {
      date: dateStr,
      stats,
      orders: [],
      reservations: [],
      events: [],
      topItems: [],
      paymentMethods: {},
      hourlyDistribution: [],
    };
  }
}

/**
 * Get weekly aggregated stats
 */
async function getWeeklyStats(startDate: Date, endDate: Date) {
  const adminDb = getAdminDb();
  const days = eachDayOfInterval({ start: startDate, end: endDate });
  
  if (!adminDb) {
    // Demo mode - generate sample data
    let totalOrders = 0;
    let totalRevenue = 0;
    let totalReservations = 0;
    
    for (const day of days) {
      const dailyStats = await getDailyStats(day);
      totalOrders += dailyStats.totalOrders;
      totalRevenue += dailyStats.totalRevenue;
      totalReservations += dailyStats.totalReservations;
    }
    
    return {
      totalOrders,
      totalRevenue,
      totalReservations,
      avgDailyRevenue: Math.round(totalRevenue / days.length),
    };
  }
  
  try {
    let totalOrders = 0;
    let totalRevenue = 0;
    let totalReservations = 0;
    let paymentsConfirmed = 0;
    let paymentsPending = 0;
    
    const ordersSnapshot = await adminDb.collection('orders')
      .where('createdAt', '>=', startOfDay(startDate))
      .where('createdAt', '<=', endOfDay(endDate))
      .get();
    
    ordersSnapshot.forEach((doc) => {
      const data = doc.data();
      totalOrders++;
      totalRevenue += data.totalAmount || 0;
      
      if (data.paymentStatus === 'PAID') {
        paymentsConfirmed++;
      } else {
        paymentsPending++;
      }
    });
    
    const reservationsSnapshot = await adminDb.collection('reservations')
      .where('createdAt', '>=', startOfDay(startDate))
      .where('createdAt', '<=', endOfDay(endDate))
      .get();
    
    totalReservations = reservationsSnapshot.size;
    
    return {
      totalOrders,
      totalRevenue,
      totalReservations,
      paymentsConfirmed,
      paymentsPending,
      avgDailyRevenue: Math.round(totalRevenue / days.length),
    };
  } catch (error) {
    console.error('Error getting weekly stats:', error);
    return {
      totalOrders: 0,
      totalRevenue: 0,
      totalReservations: 0,
      avgDailyRevenue: 0,
    };
  }
}
