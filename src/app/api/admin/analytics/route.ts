import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { format, subDays, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';

// Demo data generators
function generateDemoAnalytics(period: string) {
  const now = new Date();
  let startDate: Date;
  let dataPoints: Date[];

  switch (period) {
    case 'week':
      startDate = subDays(now, 7);
      dataPoints = eachDayOfInterval({ start: startDate, end: now });
      break;
    case 'month':
      startDate = subDays(now, 30);
      dataPoints = eachDayOfInterval({ start: startDate, end: now });
      break;
    case 'year':
      startDate = new Date(now.getFullYear(), 0, 1);
      dataPoints = eachMonthOfInterval({ start: startDate, end: now });
      break;
    default:
      startDate = subDays(now, 7);
      dataPoints = eachDayOfInterval({ start: startDate, end: now });
  }

  // Revenue over time
  const revenueOverTime = dataPoints.map(date => ({
    date: format(date, period === 'year' ? 'MMM yyyy' : 'MMM dd'),
    revenue: Math.floor(Math.random() * 200000) + 50000,
    orders: Math.floor(Math.random() * 30) + 10,
  }));

  // Most ordered items
  const mostOrderedItems = [
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
  ];

  // Peak hours
  const peakHours = Array.from({ length: 14 }, (_, i) => ({
    hour: i + 8, // 8 AM to 10 PM
    orders: Math.floor(Math.random() * 15) + 5,
    revenue: Math.floor(Math.random() * 150000) + 30000,
  }));

  // Payment distribution
  const paymentDistribution = [
    { method: 'ORANGE_MONEY', count: 145, amount: 1250000, percentage: 38 },
    { method: 'MTN_MONEY', count: 98, amount: 850000, percentage: 26 },
    { method: 'CASH', count: 87, amount: 620000, percentage: 19 },
    { method: 'VISA', count: 23, amount: 380000, percentage: 12 },
    { method: 'MASTERCARD', count: 18, amount: 150000, percentage: 5 },
  ];

  return {
    revenueOverTime,
    mostOrderedItems,
    peakHours,
    paymentDistribution,
  };
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get('period') || 'week';
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    const adminDb = getAdminDb();

    if (!adminDb) {
      // Demo mode
      return NextResponse.json(generateDemoAnalytics(period));
    }

    // Determine date range
    const now = new Date();
    let startDate: Date;
    let endDate: Date;

    if (startDateStr && endDateStr) {
      startDate = new Date(startDateStr);
      endDate = new Date(endDateStr);
    } else {
      switch (period) {
        case 'week':
          startDate = subDays(now, 7);
          endDate = now;
          break;
        case 'month':
          startDate = subDays(now, 30);
          endDate = now;
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = now;
          break;
        default:
          startDate = subDays(now, 7);
          endDate = now;
      }
    }

    // Fetch orders
    const ordersSnapshot = await adminDb
      .collection('orders')
      .where('createdAt', '>=', startDate)
      .where('createdAt', '<=', endDate)
      .orderBy('createdAt', 'asc')
      .get();

    const orders = ordersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        ...data,
        id: doc.id,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      };
    });

    // Calculate revenue over time
    const revenueByDate = new Map<string, { revenue: number; orders: number }>();
    orders.forEach(order => {
      const date = new Date(order.createdAt);
      const key = format(date, period === 'year' ? 'MMM yyyy' : 'MMM dd');
      const current = revenueByDate.get(key) || { revenue: 0, orders: 0 };
      if (order.paymentStatus === 'PAID') {
        current.revenue += order.totalAmount || 0;
      }
      current.orders += 1;
      revenueByDate.set(key, current);
    });

    const revenueOverTime = Array.from(revenueByDate.entries()).map(([date, data]) => ({
      date,
      ...data,
    }));

    // Calculate most ordered items
    const itemCounts = new Map<string, { count: number; revenue: number }>();
    orders.forEach(order => {
      order.items?.forEach((item: { name: string; quantity: number; price: number }) => {
        const current = itemCounts.get(item.name) || { count: 0, revenue: 0 };
        current.count += item.quantity;
        current.revenue += item.price * item.quantity;
        itemCounts.set(item.name, current);
      });
    });

    const mostOrderedItems = Array.from(itemCounts.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate peak hours
    const hourlyData = new Map<number, { orders: number; revenue: number }>();
    orders.forEach(order => {
      const hour = new Date(order.createdAt).getHours();
      const current = hourlyData.get(hour) || { orders: 0, revenue: 0 };
      current.orders += 1;
      current.revenue += order.totalAmount || 0;
      hourlyData.set(hour, current);
    });

    const peakHours = Array.from(hourlyData.entries())
      .map(([hour, data]) => ({ hour, ...data }))
      .sort((a, b) => a.hour - b.hour);

    // Calculate payment distribution
    const paymentMethods = new Map<string, { count: number; amount: number }>();
    orders.filter(o => o.paymentStatus === 'PAID').forEach(order => {
      const method = order.paymentMethod || 'CASH';
      const current = paymentMethods.get(method) || { count: 0, amount: 0 };
      current.count += 1;
      current.amount += order.totalAmount || 0;
      paymentMethods.set(method, current);
    });

    const totalAmount = Array.from(paymentMethods.values()).reduce((sum, p) => sum + p.amount, 0);
    const paymentDistribution = Array.from(paymentMethods.entries())
      .map(([method, data]) => ({
        method,
        ...data,
        percentage: totalAmount > 0 ? Math.round((data.amount / totalAmount) * 100) : 0,
      }))
      .sort((a, b) => b.amount - a.amount);

    return NextResponse.json({
      revenueOverTime,
      mostOrderedItems,
      peakHours,
      paymentDistribution,
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
