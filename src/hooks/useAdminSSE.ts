/**
 * Admin Real-time Data Hook
 * Provides real-time updates using Server-Sent Events (SSE)
 * Falls back to polling if SSE is not available
 */

'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { toast } from 'sonner';

export interface RealtimeNotification {
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  timestamp: string;
}

export interface RealtimeStats {
  orders: number;
  reservations: number;
  events: number;
  revenue: number;
  pendingPayments: number;
  confirmedPayments: number;
}

interface UseAdminRealtimeOptions {
  onNotification?: (notification: RealtimeNotification) => void;
  onStatsUpdate?: (stats: RealtimeStats) => void;
  enabled?: boolean;
  pollingInterval?: number;
}

export function useAdminRealtime(options: UseAdminRealtimeOptions = {}) {
  const {
    onNotification,
    onStatsUpdate,
    enabled = true,
    pollingInterval = 30000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [notifications, setNotifications] = useState<RealtimeNotification[]>([]);
  
  const eventSourceRef = useRef<EventSource | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);
  const maxReconnectAttempts = 5;
  const enabledRef = useRef(enabled);
  const onNotificationRef = useRef(onNotification);
  const onStatsUpdateRef = useRef(onStatsUpdate);
  const pollingIntervalRef = useRef(pollingInterval);

  // Keep refs updated
  useEffect(() => {
    enabledRef.current = enabled;
    onNotificationRef.current = onNotification;
    onStatsUpdateRef.current = onStatsUpdate;
    pollingIntervalRef.current = pollingInterval;
  }, [enabled, onNotification, onStatsUpdate, pollingInterval]);

  // Handle incoming notification
  const handleNotification = useCallback((notification: RealtimeNotification) => {
    setNotifications(prev => [notification, ...prev].slice(0, 50));
    setLastUpdate(new Date());
    
    const toastType = notification.type.toLowerCase();
    if (toastType === 'order') {
      toast.success(notification.title, { description: notification.message });
    } else if (toastType === 'payment') {
      toast.info(notification.title, { description: notification.message });
    } else if (toastType === 'reservation') {
      toast.message(notification.title, { description: notification.message });
    } else {
      toast(notification.title, { description: notification.message });
    }
    
    onNotificationRef.current?.(notification);
  }, []);

  // Manual refresh
  const refresh = useCallback(async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const stats = await response.json();
        onStatsUpdateRef.current?.(stats);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to refresh stats:', error);
    }
  }, []);

  // Clear notifications
  const clearNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Start polling as fallback
  const startPolling = useCallback(() => {
    if (pollingRef.current) return;

    const poll = async () => {
      try {
        const response = await fetch('/api/admin/stats');
        if (response.ok) {
          const stats = await response.json();
          onStatsUpdateRef.current?.(stats);
          setLastUpdate(new Date());
        }
      } catch (error) {
        console.error('[Polling] Failed to fetch stats:', error);
      }
    };

    poll();
    pollingRef.current = setInterval(poll, pollingIntervalRef.current);
  }, []);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  // Connect to SSE - defined as a regular function to avoid dependency issues
  useEffect(() => {
    if (!enabled) return;

    let reconnectTimeout: NodeJS.Timeout | null = null;

    const connectSSE = () => {
      if (!enabledRef.current || eventSourceRef.current) return;

      try {
        const eventSource = new EventSource('/api/admin/notifications/stream');
        eventSourceRef.current = eventSource;

        eventSource.onopen = () => {
          setIsConnected(true);
          reconnectAttempts.current = 0;
          console.log('[SSE] Connected to admin notification stream');
        };

        eventSource.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            if (data.type === 'CONNECTED') {
              console.log('[SSE] Connection confirmed:', data.message);
              return;
            }
            
            handleNotification(data as RealtimeNotification);
          } catch (error) {
            console.error('[SSE] Failed to parse message:', error);
          }
        };

        eventSource.onerror = () => {
          console.error('[SSE] Connection error');
          eventSource.close();
          eventSourceRef.current = null;
          setIsConnected(false);

          if (reconnectAttempts.current < maxReconnectAttempts) {
            reconnectAttempts.current++;
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
            console.log(`[SSE] Reconnecting in ${delay}ms (attempt ${reconnectAttempts.current})`);
            reconnectTimeout = setTimeout(connectSSE, delay);
          } else {
            console.log('[SSE] Max reconnection attempts reached, falling back to polling');
            startPolling();
          }
        };
      } catch (error) {
        console.error('[SSE] Failed to connect:', error);
        startPolling();
      }
    };

    connectSSE();

    return () => {
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      stopPolling();
    };
  }, [enabled, handleNotification, startPolling, stopPolling]);

  return {
    isConnected,
    lastUpdate,
    notifications,
    refresh,
    clearNotifications,
  };
}

export default useAdminRealtime;
