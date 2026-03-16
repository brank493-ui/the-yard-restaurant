/**
 * Daily Report Export API
 * Exports daily reports in various formats (CSV, JSON)
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminAccess, getClientIp } from '@/lib/admin-middleware';
import { logReportExport } from '@/lib/services/adminLogService';
import { format } from 'date-fns';

/**
 * GET /api/reports/export
 * Export daily report in specified format
 */
export async function GET(request: NextRequest) {
  try {
    // Verify admin access
    const auth = await verifyAdminAccess(request);
    
    const searchParams = request.nextUrl.searchParams;
    const dateStr = searchParams.get('date') || format(new Date(), 'yyyy-MM-dd');
    const format_type = searchParams.get('format') || 'json';
    
    // Get data from database
    const date = new Date(dateStr);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    
    const [orders, reservations, events, invoices] = await Promise.all([
      db.order.findMany({
        where: {
          createdAt: {
            gte: date,
            lt: nextDay
          }
        },
        include: { items: true }
      }),
      db.reservation.findMany({
        where: {
          date: dateStr
        }
      }),
      db.event.findMany({
        where: {
          createdAt: {
            gte: date,
            lt: nextDay
          }
        },
        include: { services: true }
      }),
      db.invoice.findMany({
        where: {
          createdAt: {
            gte: date,
            lt: nextDay
          }
        }
      })
    ]);
    
    // Calculate statistics
    const totalRevenue = orders
      .filter(o => o.paymentStatus === 'PAID')
      .reduce((sum, o) => sum + o.totalAmount, 0);
    
    const paymentsByMethod: Record<string, number> = {};
    orders.filter(o => o.paymentStatus === 'PAID').forEach(order => {
      const method = order.paymentMethod || 'CASH';
      paymentsByMethod[method] = (paymentsByMethod[method] || 0) + order.totalAmount;
    });
    
    // Item breakdown
    const itemBreakdown: Record<string, { count: number; revenue: number }> = {};
    orders.forEach(order => {
      order.items.forEach(item => {
        if (!itemBreakdown[item.name]) {
          itemBreakdown[item.name] = { count: 0, revenue: 0 };
        }
        itemBreakdown[item.name].count += item.quantity;
        itemBreakdown[item.name].revenue += item.subtotal;
      });
    });
    
    // Hourly distribution
    const hourlyData: Record<number, { orders: number; revenue: number }> = {};
    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      if (!hourlyData[hour]) {
        hourlyData[hour] = { orders: 0, revenue: 0 };
      }
      hourlyData[hour].orders += 1;
      hourlyData[hour].revenue += order.totalAmount;
    });
    
    const report = {
      date: dateStr,
      restaurant: {
        name: 'THE YARD RESTAURANT',
        address: '737 Rue Batibois, Douala, Cameroon',
        phone: '+237 671 490 733',
      },
      summary: {
        totalOrders: orders.length,
        totalReservations: reservations.length,
        totalEvents: events.length,
        totalRevenue,
        confirmedPayments: orders.filter(o => o.paymentStatus === 'PAID').length,
        pendingPayments: orders.filter(o => o.paymentStatus === 'PENDING').length,
      },
      orders: orders.map(o => ({
        id: o.id,
        customer: o.customerName,
        phone: o.phone,
        type: o.type,
        items: o.items.length,
        total: o.totalAmount,
        status: o.status,
        paymentStatus: o.paymentStatus,
        paymentMethod: o.paymentMethod,
        time: format(new Date(o.createdAt), 'HH:mm'),
      })),
      reservations: reservations.map(r => ({
        id: r.id,
        name: r.name,
        phone: r.phone,
        date: r.date,
        time: r.time,
        guests: r.partySize,
        status: r.status,
      })),
      events: events.map(e => ({
        id: e.id,
        name: e.name,
        type: e.eventType,
        guests: e.guestCount,
        amount: e.totalAmount,
        status: e.status,
      })),
      itemBreakdown: Object.entries(itemBreakdown)
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue),
      paymentsByMethod,
      hourlyDistribution: Object.entries(hourlyData)
        .map(([hour, data]) => ({ hour: parseInt(hour), ...data }))
        .sort((a, b) => a.hour - b.hour),
      generatedAt: new Date().toISOString(),
    };
    
    // Log export
    if (auth.success && auth.userId) {
      await logReportExport({
        adminId: auth.userId,
        adminEmail: auth.email,
        reportType: 'daily',
        dateRange: dateStr,
        ipAddress: getClientIp(request),
      });
    }
    
    if (format_type === 'csv') {
      // Generate CSV
      const csvLines = [
        'THE YARD RESTAURANT - DAILY REPORT',
        `Date: ${dateStr}`,
        '',
        'SUMMARY',
        `Total Orders,${report.summary.totalOrders}`,
        `Total Reservations,${report.summary.totalReservations}`,
        `Total Events,${report.summary.totalEvents}`,
        `Total Revenue,${report.summary.totalRevenue} XAF`,
        '',
        'ORDERS',
        'ID,Customer,Phone,Type,Items,Total,Status,Payment Status,Time',
        ...report.orders.map(o => 
          `${o.id},${o.customer},${o.phone},${o.type},${o.items},${o.total},${o.status},${o.paymentStatus},${o.time}`
        ),
        '',
        'TOP ITEMS',
        'Name,Count,Revenue',
        ...report.itemBreakdown.map(i => `${i.name},${i.count},${i.revenue}`),
      ];
      
      const csvContent = csvLines.join('\n');
      
      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="daily-report-${dateStr}.csv"`,
        },
      });
    }
    
    return NextResponse.json({
      success: true,
      report
    });
    
  } catch (error) {
    console.error('Error exporting report:', error);
    return NextResponse.json(
      { error: 'Failed to export report' },
      { status: 500 }
    );
  }
}
