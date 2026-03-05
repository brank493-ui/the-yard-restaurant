/**
 * Daily Report API Route
 * Generates and retrieves daily reports for admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { db } from '@/lib/db';
import { format, startOfDay, endOfDay } from 'date-fns';

const VAT_RATE = 0.1925;
const SERVICE_CHARGE_RATE = 0.05;

/**
 * GET /api/admin/daily-report
 * Get comprehensive daily report data
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dateStr = searchParams.get('date');
    const targetDate = dateStr ? new Date(dateStr) : new Date();
    
    const dateFormatted = format(targetDate, 'yyyy-MM-dd');
    const start = startOfDay(targetDate);
    const end = endOfDay(targetDate);
    
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      // Demo mode - return sample data
      return NextResponse.json({
        date: dateFormatted,
        stats: {
          totalOrders: 15,
          totalReservations: 8,
          totalEvents: 3,
          totalRevenue: 285000,
          pendingPayments: 4,
          confirmedPayments: 11,
        },
        orders: generateDemoOrders(dateFormatted),
        reservations: generateDemoReservations(dateFormatted),
        events: generateDemoEvents(dateFormatted),
        topItems: [
          { name: 'Grilled Fish', count: 15, revenue: 75000 },
          { name: 'Jollof Rice', count: 12, revenue: 36000 },
          { name: 'Suya Platter', count: 10, revenue: 50000 },
          { name: 'Pepper Soup', count: 8, revenue: 32000 },
          { name: 'Fried Plantains', count: 20, revenue: 20000 },
        ],
        paymentMethods: {
          ORANGE_MONEY: 125000,
          MTN_MONEY: 85000,
          CASH: 48000,
          VISA: 27000,
        },
      });
    }
    
    // Fetch data from Firestore
    const [ordersSnapshot, reservationsSnapshot, eventsSnapshot] = await Promise.all([
      adminDb.collection('orders')
        .where('createdAt', '>=', start)
        .where('createdAt', '<=', end)
        .orderBy('createdAt', 'desc')
        .get(),
      adminDb.collection('reservations')
        .where('date', '==', dateFormatted)
        .get(),
      adminDb.collection('events')
        .where('createdAt', '>=', start)
        .where('createdAt', '<=', end)
        .orderBy('createdAt', 'desc')
        .get(),
    ]);
    
    // Process orders
    const orders = ordersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      };
    });
    
    // Process reservations
    const reservations = reservationsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      };
    });
    
    // Process events
    const events = eventsSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      };
    });
    
    // Calculate stats
    const paidOrders = orders.filter((o: any) => o.paymentStatus === 'PAID');
    const pendingOrders = orders.filter((o: any) => o.paymentStatus === 'PENDING' || o.paymentStatus === 'PROCESSING');
    const totalRevenue = paidOrders.reduce((sum: number, o: any) => sum + (o.totalAmount || 0), 0);
    
    // Calculate top items
    const itemCounts = new Map<string, { count: number; revenue: number }>();
    orders.forEach((order: any) => {
      order.items?.forEach((item: any) => {
        const current = itemCounts.get(item.name) || { count: 0, revenue: 0 };
        current.count += item.quantity;
        current.revenue += (item.price * item.quantity);
        itemCounts.set(item.name, current);
      });
    });
    
    const topItems = Array.from(itemCounts.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
    
    // Calculate payment methods breakdown
    const paymentMethods: Record<string, number> = {};
    paidOrders.forEach((order: any) => {
      const method = order.paymentMethod || 'CASH';
      paymentMethods[method] = (paymentMethods[method] || 0) + (order.totalAmount || 0);
    });
    
    const report = {
      date: dateFormatted,
      stats: {
        totalOrders: orders.length,
        totalReservations: reservations.length,
        totalEvents: events.length,
        totalRevenue,
        pendingPayments: pendingOrders.length,
        confirmedPayments: paidOrders.length,
      },
      orders: orders.map((o: any) => ({
        id: o.id,
        customerName: o.customerName,
        totalAmount: o.totalAmount,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        createdAt: o.createdAt,
      })),
      reservations,
      events,
      topItems,
      paymentMethods,
    };
    
    // Store/update daily report in database
    try {
      await db.dailyReport.upsert({
        where: { date: dateFormatted },
        create: {
          date: dateFormatted,
          totalOrders: report.stats.totalOrders,
          totalReservations: report.stats.totalReservations,
          totalEvents: report.stats.totalEvents,
          totalRevenue: report.stats.totalRevenue,
          paymentsConfirmed: report.stats.confirmedPayments,
          paymentsPending: report.stats.pendingPayments,
          topItems: JSON.stringify(topItems),
          paymentMethods: JSON.stringify(paymentMethods),
          reportGeneratedAt: new Date(),
        },
        update: {
          totalOrders: report.stats.totalOrders,
          totalReservations: report.stats.totalReservations,
          totalEvents: report.stats.totalEvents,
          totalRevenue: report.stats.totalRevenue,
          paymentsConfirmed: report.stats.confirmedPayments,
          paymentsPending: report.stats.pendingPayments,
          topItems: JSON.stringify(topItems),
          paymentMethods: JSON.stringify(paymentMethods),
          reportGeneratedAt: new Date(),
        },
      });
    } catch (dbError) {
      console.error('Error storing daily report:', dbError);
      // Continue even if storage fails
    }
    
    return NextResponse.json(report);
    
  } catch (error) {
    console.error('Error generating daily report:', error);
    return NextResponse.json(
      { error: 'Failed to generate daily report' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/daily-report
 * Archive daily report (mark as archived)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { date } = body;
    
    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }
    
    // Update daily report as archived
    try {
      await db.dailyReport.update({
        where: { date },
        data: {
          archivedAt: new Date(),
        },
      });
    } catch (dbError) {
      console.error('Error archiving daily report:', dbError);
    }
    
    return NextResponse.json({ success: true, message: 'Report archived' });
    
  } catch (error) {
    console.error('Error archiving daily report:', error);
    return NextResponse.json(
      { error: 'Failed to archive daily report' },
      { status: 500 }
    );
  }
}

// Demo data generators
function generateDemoOrders(date: string) {
  return Array.from({ length: 15 }, (_, i) => {
    const hour = Math.floor(Math.random() * 12) + 8;
    const orderDate = new Date(`${date}T${hour.toString().padStart(2, '0')}:${Math.floor(Math.random() * 60).toString().padStart(2, '0')}:00`);
    
    return {
      id: `ord_demo_${i}`,
      customerName: ['John Doe', 'Jane Smith', 'Paul Ngono', 'Marie Nkolo', 'Peter Mbah', 'Grace Fomba', 'David Nkwi', 'Rose Fotso'][i % 8],
      totalAmount: Math.floor(Math.random() * 20000) + 5000,
      paymentStatus: i < 11 ? 'PAID' : 'PENDING',
      paymentMethod: ['CASH', 'ORANGE_MONEY', 'MTN_MONEY', 'VISA'][i % 4],
      createdAt: orderDate,
    };
  });
}

function generateDemoReservations(date: string) {
  return Array.from({ length: 8 }, (_, i) => ({
    id: `res_demo_${i}`,
    name: ['John Doe', 'Jane Smith', 'Paul Ngono', 'Marie Nkolo', 'Peter Mbah', 'Grace Fomba', 'David Nkwi', 'Rose Fotso'][i % 8],
    partySize: Math.floor(Math.random() * 8) + 2,
    time: ['12:00', '13:00', '14:00', '19:00', '20:00', '21:00'][i % 6],
    status: i < 5 ? 'CONFIRMED' : 'PENDING',
  }));
}

function generateDemoEvents(date: string) {
  return Array.from({ length: 3 }, (_, i) => ({
    id: `evt_demo_${i}`,
    eventType: ['Corporate Meeting', 'Birthday Party', 'Wedding Reception'][i],
    guestCount: Math.floor(Math.random() * 50) + 10,
    totalAmount: Math.floor(Math.random() * 200000) + 50000,
    status: i === 0 ? 'CONFIRMED' : 'INQUIRY',
  }));
}
