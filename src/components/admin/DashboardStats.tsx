'use client';

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { DailyStats } from '@/lib/services/adminService';
import {
  Package,
  Calendar,
  CalendarDays,
  DollarSign,
  Clock,
  CheckCircle,
  TrendingUp,
  Users,
  ShoppingCart,
  CreditCard,
} from 'lucide-react';

interface DashboardStatsProps {
  stats: DailyStats;
  isLoading?: boolean;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  trend?: { value: number; isPositive: boolean };
  subtitle?: string;
}

function StatCard({ title, value, icon, iconBg, iconColor, subtitle }: StatCardProps) {
  return (
    <Card className="bg-stone-800 border-stone-700 hover:border-amber-500/50 transition-all duration-300 hover:shadow-lg hover:shadow-amber-500/10">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-stone-400 text-xs font-medium uppercase tracking-wider mb-1">{title}</p>
            <p className="text-2xl font-bold text-white">{typeof value === 'number' ? value.toLocaleString() : value}</p>
            {subtitle && <p className="text-stone-500 text-xs mt-1">{subtitle}</p>}
          </div>
          <div className={`p-3 rounded-xl ${iconBg}`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function DashboardStats({ stats, isLoading }: DashboardStatsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="bg-stone-800 border-stone-700 animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-stone-700 rounded w-1/2 mb-2" />
              <div className="h-8 bg-stone-700 rounded w-3/4" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards: StatCardProps[] = [
    {
      title: 'Orders Today',
      value: stats.totalOrders,
      icon: <Package className="h-5 w-5" />,
      iconBg: 'bg-amber-500/20',
      iconColor: 'text-amber-400',
      subtitle: `${stats.pendingOrders} pending`,
    },
    {
      title: 'Reservations',
      value: stats.totalReservations,
      icon: <Calendar className="h-5 w-5" />,
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-400',
    },
    {
      title: 'Events',
      value: stats.totalEvents,
      icon: <CalendarDays className="h-5 w-5" />,
      iconBg: 'bg-purple-500/20',
      iconColor: 'text-purple-400',
    },
    {
      title: 'Revenue Today',
      value: `${stats.totalRevenue.toLocaleString()} XAF`,
      icon: <DollarSign className="h-5 w-5" />,
      iconBg: 'bg-green-500/20',
      iconColor: 'text-green-400',
      subtitle: `Avg: ${stats.avgOrderValue.toLocaleString()} XAF`,
    },
    {
      title: 'Pending Payments',
      value: stats.pendingPayments,
      icon: <Clock className="h-5 w-5" />,
      iconBg: 'bg-orange-500/20',
      iconColor: 'text-orange-400',
    },
    {
      title: 'Confirmed Payments',
      value: stats.confirmedPayments,
      icon: <CheckCircle className="h-5 w-5" />,
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-400',
    },
  ];

  return (
    <div className="space-y-4">
      {/* Main Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {statCards.map((stat, index) => (
          <StatCard
            key={index}
            title={stat.title}
            value={stat.value}
            icon={<span className={stat.iconColor}>{stat.icon}</span>}
            iconBg={stat.iconBg}
            iconColor={stat.iconColor}
            subtitle={stat.subtitle}
          />
        ))}
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-stone-800/50 border-stone-700">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <ShoppingCart className="h-4 w-4 text-amber-400" />
              <div>
                <p className="text-stone-400 text-xs">Completed Orders</p>
                <p className="text-white font-semibold">{stats.completedOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-stone-800/50 border-stone-700">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <TrendingUp className="h-4 w-4 text-green-400" />
              <div>
                <p className="text-stone-400 text-xs">Avg Order Value</p>
                <p className="text-white font-semibold">{stats.avgOrderValue.toLocaleString()} XAF</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-stone-800/50 border-stone-700">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <Users className="h-4 w-4 text-blue-400" />
              <div>
                <p className="text-stone-400 text-xs">New Users Today</p>
                <p className="text-white font-semibold">{stats.newUsers}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-stone-800/50 border-stone-700">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <CreditCard className="h-4 w-4 text-purple-400" />
              <div>
                <p className="text-stone-400 text-xs">Payment Rate</p>
                <p className="text-white font-semibold">
                  {stats.totalOrders > 0 
                    ? Math.round((stats.confirmedPayments / stats.totalOrders) * 100) 
                    : 0}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
