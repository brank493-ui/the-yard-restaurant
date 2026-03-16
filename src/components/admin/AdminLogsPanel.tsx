'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Activity, 
  User, 
  Package, 
  CreditCard, 
  Calendar, 
  FileText,
  Settings,
  Shield,
  Clock,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';

interface AdminLog {
  id: string;
  adminId: string;
  adminEmail?: string;
  action: string;
  targetId: string;
  targetType: 'order' | 'reservation' | 'event' | 'payment' | 'user' | 'invoice' | 'report' | 'system';
  details: string;
  metadata?: Record<string, unknown>;
  createdAt: Date | string;
}

interface AdminLogsPanelProps {
  adminId?: string;
  limit?: number;
}

const targetTypeIcons: Record<string, React.ReactNode> = {
  order: <Package className="h-4 w-4 text-amber-400" />,
  reservation: <Calendar className="h-4 w-4 text-blue-400" />,
  event: <Calendar className="h-4 w-4 text-purple-400" />,
  payment: <CreditCard className="h-4 w-4 text-green-400" />,
  user: <User className="h-4 w-4 text-cyan-400" />,
  invoice: <FileText className="h-4 w-4 text-orange-400" />,
  report: <FileText className="h-4 w-4 text-indigo-400" />,
  system: <Settings className="h-4 w-4 text-stone-400" />,
};

const actionColors: Record<string, string> = {
  CREATE: 'bg-green-500/20 text-green-400 border-green-500/30',
  UPDATE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
  CONFIRM: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  CANCEL: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  PAYMENT_CONFIRMED: 'bg-green-500/20 text-green-400 border-green-500/30',
  STATUS_UPDATE: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  LOGIN: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
  LOGOUT: 'bg-stone-500/20 text-stone-400 border-stone-500/30',
};

export default function AdminLogsPanel({ adminId, limit = 20 }: AdminLogsPanelProps) {
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('limit', String(limit));
      if (adminId) params.append('adminId', adminId);
      if (filter !== 'all') params.append('targetType', filter);

      const response = await fetch(`/api/admin/logs?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.logs || []);
      } else {
        // Demo data
        setLogs(generateDemoLogs());
      }
    } catch (error) {
      console.error('Error fetching admin logs:', error);
      setLogs(generateDemoLogs());
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [adminId, limit, filter]);

  const generateDemoLogs = (): AdminLog[] => {
    const actions = [
      { action: 'PAYMENT_CONFIRMED', targetType: 'payment' as const, details: 'Payment of 15,000 XAF confirmed via ORANGE_MONEY' },
      { action: 'STATUS_UPDATE', targetType: 'order' as const, details: 'Order status changed from PENDING to CONFIRMED' },
      { action: 'CREATE', targetType: 'reservation' as const, details: 'New reservation created for 4 guests' },
      { action: 'CONFIRM', targetType: 'event' as const, details: 'Event booking confirmed for Wedding Reception' },
      { action: 'UPDATE', targetType: 'user' as const, details: 'User profile updated' },
    ];

    return actions.map((a, i) => ({
      id: `log_${Date.now()}_${i}`,
      adminId: `admin_${i % 2}`,
      adminEmail: i % 2 === 0 ? 'admin@theyardrestaurant.com' : 'manager@theyardrestaurant.com',
      action: a.action,
      targetId: `target_${i}`,
      targetType: a.targetType,
      details: a.details,
      createdAt: new Date(Date.now() - i * 15 * 60000),
    }));
  };

  const formatDate = (date: Date | string) => {
    const d = new Date(date);
    return format(d, 'MMM dd, HH:mm');
  };

  return (
    <Card className="bg-stone-800 border-stone-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <Shield className="h-4 w-4 text-amber-400" />
            Admin Activity Log
          </CardTitle>
          <div className="flex items-center gap-2">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="bg-stone-700 border-stone-600 text-white w-28 h-8 text-xs">
                <SelectValue placeholder="Filter" />
              </SelectTrigger>
              <SelectContent className="bg-stone-700 border-stone-600">
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="order">Orders</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
                <SelectItem value="reservation">Reservations</SelectItem>
                <SelectItem value="event">Events</SelectItem>
                <SelectItem value="user">Users</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchLogs}
              disabled={isLoading}
              className="h-8 w-8 p-0 text-stone-400 hover:text-white"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-80">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full bg-stone-700" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-3/4 bg-stone-700 mb-1" />
                    <Skeleton className="h-3 w-1/2 bg-stone-700" />
                  </div>
                </div>
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-stone-500">
              <Activity className="h-12 w-12 mb-2 opacity-50" />
              <p className="text-sm">No activity logs found</p>
            </div>
          ) : (
            <div className="divide-y divide-stone-700">
              {logs.map((log) => (
                <div
                  key={log.id}
                  className="p-4 hover:bg-stone-700/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 p-2 rounded-lg bg-stone-700">
                      {targetTypeIcons[log.targetType] || <Activity className="h-4 w-4 text-stone-400" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <Badge 
                          className={`text-xs border ${
                            actionColors[log.action] || 'bg-stone-500/20 text-stone-400 border-stone-500/30'
                          }`}
                        >
                          {log.action.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-stone-500 text-xs capitalize">
                          {log.targetType}
                        </span>
                      </div>
                      <p className="text-white text-sm">
                        {log.details}
                      </p>
                      <div className="flex items-center gap-4 mt-2 text-xs text-stone-500">
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {log.adminEmail || log.adminId}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDistanceToNow(new Date(log.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                    <span className="font-mono text-stone-600 text-xs">
                      #{log.targetId.slice(-6)}
                    </span>
                  </div>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-2 pl-11 text-xs text-stone-600">
                      {log.metadata.amount && (
                        <span className="text-green-400 mr-3">
                          {Number(log.metadata.amount).toLocaleString()} XAF
                        </span>
                      )}
                      {log.metadata.paymentMethod && (
                        <span className="text-amber-400">
                          {String(log.metadata.paymentMethod)}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
