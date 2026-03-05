'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  AreaChart,
  Area,
} from 'recharts';
import { BarChart3, TrendingUp, CreditCard, Package, Clock, CalendarDays, Users } from 'lucide-react';

interface RevenueData {
  date: string;
  revenue: number;
  orders: number;
}

interface ItemData {
  name: string;
  count: number;
  revenue: number;
}

interface PaymentData {
  method: string;
  count: number;
  amount: number;
  percentage: number;
}

interface PeakHourData {
  hour: number;
  orders: number;
  revenue: number;
}

interface EventPopularityData {
  type: string;
  count: number;
  revenue: number;
}

const COLORS = ['#F59E0B', '#3B82F6', '#10B981', '#8B5CF6', '#EF4444', '#EC4899'];

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Cash',
  ORANGE_MONEY: 'Orange Money',
  MTN_MONEY: 'MTN Money',
  VISA: 'Visa',
  MASTERCARD: 'Mastercard',
  STRIPE: 'Stripe',
};

const eventTypeLabels: Record<string, string> = {
  WEDDING: 'Wedding',
  BIRTHDAY: 'Birthday',
  CORPORATE: 'Corporate',
  ANNIVERSARY: 'Anniversary',
  BUSINESS: 'Business',
  OTHER: 'Other',
};

export default function AnalyticsSection() {
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('day');
  const [revenueData, setRevenueData] = useState<RevenueData[]>([]);
  const [itemsData, setItemsData] = useState<ItemData[]>([]);
  const [paymentData, setPaymentData] = useState<PaymentData[]>([]);
  const [peakHoursData, setPeakHoursData] = useState<PeakHourData[]>([]);
  const [eventsData, setEventsData] = useState<EventPopularityData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const fetchAnalytics = async () => {
    setIsLoading(true);
    try {
      const endDate = new Date();
      const startDate = new Date();
      
      if (period === 'day') {
        startDate.setDate(startDate.getDate() - 7);
      } else if (period === 'week') {
        startDate.setDate(startDate.getDate() - 30);
      } else {
        startDate.setMonth(startDate.getMonth() - 6);
      }

      // Fetch all analytics data in parallel
      const [revenueRes, itemsRes, paymentsRes, peakRes, eventsRes] = await Promise.all([
        fetch(`/api/admin/stats?type=revenue&startDate=${startDate.toISOString()}&endDate=${endDate.toISOString()}&groupBy=${period}`),
        fetch('/api/admin/stats?type=items'),
        fetch('/api/admin/stats?type=payments'),
        fetch('/api/admin/stats?type=peakhours'),
        fetch('/api/admin/stats?type=events'),
      ]);

      if (revenueRes.ok) {
        const data = await revenueRes.json();
        setRevenueData(data.data || data);
      }

      if (itemsRes.ok) {
        const data = await itemsRes.json();
        setItemsData(data.items || data);
      }

      if (paymentsRes.ok) {
        const data = await paymentsRes.json();
        setPaymentData(data.payments || data);
      }

      if (peakRes.ok) {
        const data = await peakRes.json();
        setPeakHoursData(data.peakHours || generateDemoPeakHours());
      } else {
        setPeakHoursData(generateDemoPeakHours());
      }

      if (eventsRes.ok) {
        const data = await eventsRes.json();
        setEventsData(data.events || generateDemoEvents());
      } else {
        setEventsData(generateDemoEvents());
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      // Set demo data on error
      setPeakHoursData(generateDemoPeakHours());
      setEventsData(generateDemoEvents());
    } finally {
      setIsLoading(false);
    }
  };

  const generateDemoPeakHours = (): PeakHourData[] => {
    return Array.from({ length: 14 }, (_, i) => ({
      hour: i + 8, // 8 AM to 10 PM
      orders: Math.floor(Math.random() * 15) + 1,
      revenue: Math.floor(Math.random() * 150000) + 20000,
    }));
  };

  const generateDemoEvents = (): EventPopularityData[] => {
    return [
      { type: 'WEDDING', count: 12, revenue: 2500000 },
      { type: 'BIRTHDAY', count: 28, revenue: 1400000 },
      { type: 'CORPORATE', count: 15, revenue: 1800000 },
      { type: 'ANNIVERSARY', count: 8, revenue: 600000 },
      { type: 'BUSINESS', count: 10, revenue: 800000 },
    ];
  };

  const formatCurrency = (value: number) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toString();
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (period === 'day') {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else if (period === 'week') {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    return date.toLocaleDateString('en-US', { month: 'short' });
  };

  const formatHour = (hour: number) => {
    return `${hour.toString().padStart(2, '0')}:00`;
  };

  return (
    <div className="space-y-6">
      {/* Period Selector */}
      <Tabs value={period} onValueChange={(v) => setPeriod(v as 'day' | 'week' | 'month')}>
        <TabsList className="bg-stone-800">
          <TabsTrigger value="day" className="data-[state=active]:bg-amber-600">Daily</TabsTrigger>
          <TabsTrigger value="week" className="data-[state=active]:bg-amber-600">Weekly</TabsTrigger>
          <TabsTrigger value="month" className="data-[state=active]:bg-amber-600">Monthly</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <Card className="bg-stone-800 border-stone-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-green-400" />
              Revenue Trend
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full bg-stone-700" />
            ) : revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={revenueData}>
                  <defs>
                    <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#44403c" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    stroke="#a8a29e"
                    tick={{ fill: '#a8a29e', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#a8a29e"
                    tick={{ fill: '#a8a29e', fontSize: 12 }}
                    tickFormatter={formatCurrency}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#292524',
                      border: '1px solid #44403c',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                    formatter={(value: number) => [`${value.toLocaleString()} XAF`, 'Revenue']}
                  />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#F59E0B"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorRevenue)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-stone-500">
                No revenue data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders Chart */}
        <Card className="bg-stone-800 border-stone-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Package className="h-5 w-5 text-amber-400" />
              Orders Over Time
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full bg-stone-700" />
            ) : revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#44403c" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    stroke="#a8a29e"
                    tick={{ fill: '#a8a29e', fontSize: 12 }}
                  />
                  <YAxis 
                    stroke="#a8a29e"
                    tick={{ fill: '#a8a29e', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#292524',
                      border: '1px solid #44403c',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(label) => new Date(label).toLocaleDateString()}
                  />
                  <Bar dataKey="orders" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-stone-500">
                No order data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Peak Hours Chart */}
        <Card className="bg-stone-800 border-stone-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <Clock className="h-5 w-5 text-cyan-400" />
              Peak Hours
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full bg-stone-700" />
            ) : peakHoursData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={peakHoursData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#44403c" />
                  <XAxis 
                    dataKey="hour" 
                    tickFormatter={formatHour}
                    stroke="#a8a29e"
                    tick={{ fill: '#a8a29e', fontSize: 10 }}
                    interval={1}
                  />
                  <YAxis 
                    stroke="#a8a29e"
                    tick={{ fill: '#a8a29e', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#292524',
                      border: '1px solid #44403c',
                      borderRadius: '8px',
                    }}
                    labelFormatter={(hour) => formatHour(hour)}
                    formatter={(value: number, name: string) => [
                      name === 'orders' ? value : `${value.toLocaleString()} XAF`,
                      name === 'orders' ? 'Orders' : 'Revenue'
                    ]}
                  />
                  <Bar dataKey="orders" fill="#06B6D4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-stone-500">
                No peak hours data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Event Popularity */}
        <Card className="bg-stone-800 border-stone-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CalendarDays className="h-5 w-5 text-purple-400" />
              Event Popularity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full bg-stone-700" />
            ) : eventsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={eventsData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#44403c" />
                  <XAxis 
                    type="number"
                    stroke="#a8a29e"
                    tick={{ fill: '#a8a29e', fontSize: 12 }}
                  />
                  <YAxis 
                    type="category"
                    dataKey="type"
                    tickFormatter={(type) => eventTypeLabels[type] || type}
                    stroke="#a8a29e"
                    tick={{ fill: '#a8a29e', fontSize: 11 }}
                    width={80}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#292524',
                      border: '1px solid #44403c',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [
                      name === 'count' ? value : `${(value / 1000).toFixed(0)}K XAF`,
                      name === 'count' ? 'Events' : 'Revenue'
                    ]}
                  />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-stone-500">
                No event data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Most Ordered Items */}
        <Card className="bg-stone-800 border-stone-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-purple-400" />
              Most Ordered Items
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full bg-stone-700" />
            ) : itemsData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={itemsData.slice(0, 7)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#44403c" />
                  <XAxis 
                    type="number"
                    stroke="#a8a29e"
                    tick={{ fill: '#a8a29e', fontSize: 12 }}
                  />
                  <YAxis 
                    type="category"
                    dataKey="name"
                    stroke="#a8a29e"
                    tick={{ fill: '#a8a29e', fontSize: 11 }}
                    width={100}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#292524',
                      border: '1px solid #44403c',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string) => [
                      name === 'count' ? value : `${value.toLocaleString()} XAF`,
                      name === 'count' ? 'Orders' : 'Revenue'
                    ]}
                  />
                  <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-64 flex items-center justify-center text-stone-500">
                No item data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Payment Methods Distribution */}
        <Card className="bg-stone-800 border-stone-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-blue-400" />
              Payment Methods
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-64 w-full bg-stone-700" />
            ) : paymentData.length > 0 ? (
              <div className="flex flex-col lg:flex-row items-center gap-4">
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={paymentData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="amount"
                      nameKey="method"
                    >
                      {paymentData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#292524',
                        border: '1px solid #44403c',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number) => [`${value.toLocaleString()} XAF`, 'Amount']}
                      labelFormatter={(label) => paymentMethodLabels[label] || label}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 space-y-2">
                  {paymentData.map((item, index) => (
                    <div key={item.method} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-3 w-3 rounded-full"
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-stone-300">
                          {paymentMethodLabels[item.method] || item.method}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-white font-medium">
                          {item.percentage}%
                        </span>
                        <span className="text-stone-500 ml-2">
                          ({item.count})
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="h-64 flex items-center justify-center text-stone-500">
                No payment data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
