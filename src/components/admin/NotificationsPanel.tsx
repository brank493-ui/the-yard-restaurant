'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Bell, BellRing, X, Check, Package, CreditCard, Calendar, CalendarDays, AlertCircle, Settings } from 'lucide-react';
import { RealtimeNotification } from '@/hooks/useAdminSSE';
import { formatDistanceToNow } from 'date-fns';

interface NotificationsPanelProps {
  notifications: RealtimeNotification[];
  isConnected: boolean;
  onClear: () => void;
  onMarkAsRead?: (id: string) => void;
}

const notificationIcons: Record<string, React.ReactNode> = {
  ORDER: <Package className="h-4 w-4 text-amber-400" />,
  PAYMENT: <CreditCard className="h-4 w-4 text-green-400" />,
  RESERVATION: <Calendar className="h-4 w-4 text-blue-400" />,
  EVENT: <CalendarDays className="h-4 w-4 text-purple-400" />,
  SYSTEM: <Settings className="h-4 w-4 text-stone-400" />,
  ERROR: <AlertCircle className="h-4 w-4 text-red-400" />,
  CONNECTED: <Check className="h-4 w-4 text-green-400" />,
};

const notificationColors: Record<string, string> = {
  ORDER: 'bg-amber-500/20 border-amber-500/30',
  PAYMENT: 'bg-green-500/20 border-green-500/30',
  RESERVATION: 'bg-blue-500/20 border-blue-500/30',
  EVENT: 'bg-purple-500/20 border-purple-500/30',
  SYSTEM: 'bg-stone-500/20 border-stone-500/30',
  ERROR: 'bg-red-500/20 border-red-500/30',
  CONNECTED: 'bg-green-500/20 border-green-500/30',
};

export default function NotificationsPanel({
  notifications,
  isConnected,
  onClear,
}: NotificationsPanelProps) {
  const [isOpen, setIsOpen] = useState(false);

  const unreadCount = notifications.length;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative text-stone-400 hover:text-white hover:bg-stone-700"
        >
          {unreadCount > 0 ? (
            <BellRing className="h-5 w-5" />
          ) : (
            <Bell className="h-5 w-5" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
          {isConnected && (
            <span className="absolute bottom-0 right-0 h-2 w-2 bg-green-500 rounded-full border border-stone-800" />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0 bg-stone-800 border-stone-700" align="end">
        <CardHeader className="p-4 border-b border-stone-700">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-amber-400" />
              Notifications
              {unreadCount > 0 && (
                <Badge className="bg-amber-500 text-black text-xs ml-2">
                  {unreadCount} new
                </Badge>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              {isConnected && (
                <span className="flex items-center gap-1 text-xs text-green-400">
                  <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                  Live
                </span>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClear}
                  className="text-stone-400 hover:text-white h-8"
                >
                  Clear all
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-80">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-stone-500">
                <Bell className="h-12 w-12 mb-2 opacity-50" />
                <p className="text-sm">No new notifications</p>
                <p className="text-xs text-stone-600 mt-1">
                  {isConnected ? 'Connected to real-time updates' : 'Connecting...'}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-stone-700">
                {notifications.map((notification, index) => (
                  <div
                    key={`${notification.timestamp}-${index}`}
                    className={`p-4 hover:bg-stone-700/50 transition-colors border-l-2 ${
                      notificationColors[notification.type] || 'border-stone-500'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {notificationIcons[notification.type] || <Bell className="h-4 w-4 text-stone-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-white font-medium text-sm">
                          {notification.title}
                        </p>
                        <p className="text-stone-400 text-xs mt-1 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-stone-500 text-xs mt-2">
                          {formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true })}
                        </p>
                      </div>
                      <Badge className="text-xs bg-stone-700 text-stone-300 border-stone-600">
                        {notification.type}
                      </Badge>
                    </div>
                    {notification.data && (
                      <div className="mt-2 pl-7 text-xs text-stone-500">
                        {notification.data.amount && (
                          <span className="text-green-400 font-medium">
                            {Number(notification.data.amount).toLocaleString()} XAF
                          </span>
                        )}
                        {notification.data.orderId && (
                          <span className="ml-2">
                            Order #{String(notification.data.orderId).slice(-6)}
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
      </PopoverContent>
    </Popover>
  );
}
