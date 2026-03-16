'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import {
  collection,
  query,
  where,
  orderBy,
  limit,
  onSnapshot,
  Unsubscribe,
  DocumentData,
  Timestamp,
  Firestore,
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';
import { format, startOfDay, endOfDay } from 'date-fns';

// Types
export interface Order {
  id: string;
  userId: string;
  customerName: string;
  email?: string;
  phone: string;
  type: string;
  address?: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  serviceCharge: number;
  tax: number;
  deliveryFee?: number;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  transactionReference?: string;
  notes?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Reservation {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  partySize: number;
  status: string;
  specialRequests?: string;
  occasion?: string;
  createdAt: Date;
}

export interface Event {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  eventType: string;
  guestCount?: number;
  totalAmount?: number;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  budget?: string;
  details?: string;
  createdAt: Date;
}

export interface Review {
  id: string;
  userId?: string;
  name: string;
  rating: number;
  text: string;
  approved: boolean;
  createdAt: Date;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  orderId?: string;
  amount?: number;
  createdAt: Date;
}

export interface DashboardStats {
  totalOrdersToday: number;
  totalReservationsToday: number;
  totalEventsToday: number;
  totalRevenueToday: number;
  pendingPayments: number;
  confirmedPayments: number;
  pendingPaymentsAmount: number;
  confirmedPaymentsAmount: number;
  activeUsers: number;
}

interface AdminRealtimeState {
  orders: Order[];
  reservations: Reservation[];
  events: Event[];
  reviews: Review[];
  notifications: Notification[];
  stats: DashboardStats;
  loading: boolean;
  error: string | null;
}

interface UseAdminRealtimeOptions {
  selectedDate?: Date;
  enabled?: boolean;
}

// Helper to convert Firestore timestamp
function convertTimestamp(timestamp: Timestamp | Date | undefined): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
}

// Helper to process document data
function processDoc<T>(doc: DocumentData): T {
  const data = doc.data();
  const processed: Record<string, unknown> = { id: doc.id, ...data };

  if (data.createdAt) processed.createdAt = convertTimestamp(data.createdAt);
  if (data.updatedAt) processed.updatedAt = convertTimestamp(data.updatedAt);
  if (data.date && typeof data.date !== 'string') {
    processed.date = format(convertTimestamp(data.date), 'yyyy-MM-dd');
  }

  return processed as T;
}

// Demo data generator
function generateDemoData(selectedDate: Date) {
  const todayStart = startOfDay(selectedDate);
  const dateStr = format(selectedDate, 'yyyy-MM-dd');

  const orders: Order[] = Array.from({ length: 15 }, (_, i) => {
    const hour = Math.floor(Math.random() * 12) + 8;
    const orderDate = new Date(todayStart);
    orderDate.setHours(hour, Math.floor(Math.random() * 60));

    return {
      id: `ord_demo_${i}`,
      userId: `user_${i % 8}`,
      customerName: ['John Doe', 'Jane Smith', 'Paul Ngono', 'Marie Nkolo', 'Peter Mbah', 'Grace Fomba', 'David Nkwi', 'Rose Fotso'][i % 8],
      email: `user${i % 8}@example.com`,
      phone: `+237 6${Math.floor(Math.random() * 90000000 + 10000000)}`,
      type: i % 3 === 0 ? 'delivery' : 'pickup',
      items: [
        { name: ['Grilled Fish', 'Jollof Rice', 'Suya Platter', 'Pepper Soup'][i % 4], quantity: Math.floor(Math.random() * 3) + 1, price: Math.floor(Math.random() * 5000) + 2000 },
      ],
      subtotal: Math.floor(Math.random() * 15000) + 3000,
      serviceCharge: 0,
      tax: 0,
      totalAmount: Math.floor(Math.random() * 20000) + 5000,
      status: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'][Math.floor(Math.random() * 5)],
      paymentStatus: ['PENDING', 'PAID', 'PROCESSING'][Math.floor(Math.random() * 3)],
      paymentMethod: ['CASH', 'ORANGE_MONEY', 'MTN_MONEY'][Math.floor(Math.random() * 3)],
      createdAt: orderDate,
    } as Order;
  });

  const reservations: Reservation[] = Array.from({ length: 8 }, (_, i) => ({
    id: `res_demo_${i}`,
    userId: `user_${i % 6}`,
    name: ['John Doe', 'Jane Smith', 'Paul Ngono', 'Marie Nkolo', 'Peter Mbah', 'Grace Fomba'][i % 6],
    email: `user${i % 6}@example.com`,
    phone: `+237 6${Math.floor(Math.random() * 90000000 + 10000000)}`,
    date: dateStr,
    time: ['12:00', '13:00', '19:00', '20:00', '21:00'][i % 5],
    partySize: Math.floor(Math.random() * 8) + 2,
    status: ['PENDING', 'CONFIRMED', 'COMPLETED'][Math.floor(Math.random() * 3)],
    createdAt: todayStart,
  } as Reservation));

  const events: Event[] = Array.from({ length: 3 }, (_, i) => ({
    id: `evt_demo_${i}`,
    userId: `user_${i}`,
    name: ['Corporate Meeting', 'Birthday Party', 'Wedding Reception'][i],
    email: `user${i}@example.com`,
    phone: `+237 6${Math.floor(Math.random() * 90000000 + 10000000)}`,
    eventType: ['CORPORATE', 'BIRTHDAY', 'WEDDING'][i],
    guestCount: Math.floor(Math.random() * 50) + 10,
    totalAmount: Math.floor(Math.random() * 200000) + 50000,
    status: ['INQUIRY', 'QUOTED', 'CONFIRMED'][Math.floor(Math.random() * 3)],
    paymentStatus: ['PENDING', 'PAID'][Math.floor(Math.random() * 2)],
    createdAt: todayStart,
  } as Event));

  const notifications: Notification[] = Array.from({ length: 5 }, (_, i) => ({
    id: `notif_demo_${i}`,
    type: ['ORDER', 'PAYMENT', 'RESERVATION'][i % 3],
    title: ['New Order', 'Payment Received', 'New Reservation'][i % 3],
    message: `Demo notification ${i + 1}`,
    read: i > 2,
    createdAt: new Date(todayStart.getTime() + i * 60000),
  } as Notification));

  return { orders, reservations, events, reviews: [], notifications };
}

export function useAdminRealtime(options: UseAdminRealtimeOptions = {}) {
  const { selectedDate = new Date(), enabled = true } = options;

  const [state, setState] = useState<AdminRealtimeState>({
    orders: [],
    reservations: [],
    events: [],
    reviews: [],
    notifications: [],
    stats: {
      totalOrdersToday: 0,
      totalReservationsToday: 0,
      totalEventsToday: 0,
      totalRevenueToday: 0,
      pendingPayments: 0,
      confirmedPayments: 0,
      pendingPaymentsAmount: 0,
      confirmedPaymentsAmount: 0,
      activeUsers: 0,
    },
    loading: true,
    error: null,
  });

  const unsubscribersRef = useRef<Unsubscribe[]>([]);
  const previousOrdersRef = useRef<Order[]>([]);

  // Calculate stats from current data
  const calculateStats = useCallback((orders: Order[], reservations: Reservation[], events: Event[], date: Date): DashboardStats => {
    const todayStart = startOfDay(date);
    const todayEnd = endOfDay(date);
    const dateStr = format(date, 'yyyy-MM-dd');

    const todayOrders = orders.filter(o => {
      const orderDate = new Date(o.createdAt);
      return orderDate >= todayStart && orderDate <= todayEnd;
    });

    const todayReservations = reservations.filter(r => r.date === dateStr);
    const todayEvents = events.filter(e => {
      const eventDate = new Date(e.createdAt);
      return eventDate >= todayStart && eventDate <= todayEnd;
    });

    const paidOrders = todayOrders.filter(o => o.paymentStatus === 'PAID');
    const pendingOrders = todayOrders.filter(o => o.paymentStatus === 'PENDING' || o.paymentStatus === 'PROCESSING');

    const totalRevenue = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const pendingAmount = pendingOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const confirmedAmount = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

    return {
      totalOrdersToday: todayOrders.length,
      totalReservationsToday: todayReservations.length,
      totalEventsToday: todayEvents.length,
      totalRevenueToday: totalRevenue,
      pendingPayments: pendingOrders.length,
      confirmedPayments: paidOrders.length,
      pendingPaymentsAmount: pendingAmount,
      confirmedPaymentsAmount: confirmedAmount,
      activeUsers: new Set(todayOrders.map(o => o.userId)).size,
    };
  }, []);

  // Setup real-time listeners
  useEffect(() => {
    if (!enabled) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, loading: false }));
      }, 0);
      return () => clearTimeout(timer);
    }

    // Cleanup previous subscriptions
    unsubscribersRef.current.forEach(unsub => unsub());
    unsubscribersRef.current = [];

    if (!isFirebaseConfigured || !db) {
      // Demo mode
      const demoData = generateDemoData(selectedDate);
      const stats = calculateStats(demoData.orders, demoData.reservations, demoData.events, selectedDate);

      setState({
        ...demoData,
        stats,
        loading: false,
        error: null,
      });
      return;
    }

    try {
      // Orders listener
      const ordersQuery = query(
        collection(db as Firestore, 'orders'),
        orderBy('createdAt', 'desc'),
        limit(200)
      );

      const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
        const orders = snapshot.docs.map(doc => processDoc<Order>(doc));
        previousOrdersRef.current = orders;

        setState(prev => {
          const stats = calculateStats(orders, prev.reservations, prev.events, selectedDate);
          return { ...prev, orders, stats, loading: false };
        });
      }, (error) => {
        console.error('Orders listener error:', error);
        setState(prev => ({ ...prev, error: 'Failed to load orders', loading: false }));
      });
      unsubscribersRef.current.push(unsubOrders);

      // Reservations listener
      const reservationsQuery = query(
        collection(db as Firestore, 'reservations'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const unsubReservations = onSnapshot(reservationsQuery, (snapshot) => {
        const reservations = snapshot.docs.map(doc => processDoc<Reservation>(doc));
        setState(prev => {
          const stats = calculateStats(prev.orders, reservations, prev.events, selectedDate);
          return { ...prev, reservations, stats };
        });
      }, (error) => {
        console.error('Reservations listener error:', error);
      });
      unsubscribersRef.current.push(unsubReservations);

      // Events listener
      const eventsQuery = query(
        collection(db as Firestore, 'events'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );

      const unsubEvents = onSnapshot(eventsQuery, (snapshot) => {
        const events = snapshot.docs.map(doc => processDoc<Event>(doc));
        setState(prev => {
          const stats = calculateStats(prev.orders, prev.reservations, events, selectedDate);
          return { ...prev, events, stats };
        });
      }, (error) => {
        console.error('Events listener error:', error);
      });
      unsubscribersRef.current.push(unsubEvents);

      // Notifications listener
      const notificationsQuery = query(
        collection(db as Firestore, 'notifications'),
        orderBy('createdAt', 'desc'),
        limit(50)
      );

      const unsubNotifications = onSnapshot(notificationsQuery, (snapshot) => {
        const notifications = snapshot.docs.map(doc => processDoc<Notification>(doc));
        setState(prev => ({ ...prev, notifications }));
      }, (error) => {
        console.error('Notifications listener error:', error);
      });
      unsubscribersRef.current.push(unsubNotifications);

    } catch (error) {
      console.error('Error setting up listeners:', error);
      setState(prev => ({ ...prev, error: 'Failed to setup real-time updates', loading: false }));
    }

    return () => {
      unsubscribersRef.current.forEach(unsub => unsub());
      unsubscribersRef.current = [];
    };
  }, [enabled, selectedDate, calculateStats]);

  // Refetch function (for manual refresh)
  const refetch = useCallback(async () => {
    setState(prev => ({ ...prev, loading: true }));

    try {
      const [ordersRes, reservationsRes, eventsRes] = await Promise.all([
        fetch('/api/orders'),
        fetch('/api/reservations'),
        fetch('/api/events'),
      ]);

      const orders = ordersRes.ok ? await ordersRes.json() : [];
      const reservations = reservationsRes.ok ? await reservationsRes.json() : [];
      const events = eventsRes.ok ? await eventsRes.json() : [];

      const stats = calculateStats(orders, reservations, events, selectedDate);

      setState(prev => ({
        ...prev,
        orders: Array.isArray(orders) ? orders : [],
        reservations: Array.isArray(reservations) ? reservations : [],
        events: Array.isArray(events) ? events : [],
        stats,
        loading: false,
        error: null,
      }));
    } catch (error) {
      console.error('Error refetching:', error);
      setState(prev => ({ ...prev, loading: false, error: 'Failed to refresh data' }));
    }
  }, [selectedDate, calculateStats]);

  // Mark notification as read
  const markNotificationRead = useCallback(async (notificationId: string) => {
    setState(prev => ({
      ...prev,
      notifications: prev.notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ),
    }));

    // Update in Firebase if available
    if (db) {
      try {
        const { doc, updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'notifications', notificationId), { read: true });
      } catch (error) {
        console.error('Error marking notification as read:', error);
      }
    }
  }, []);

  return {
    ...state,
    refetch,
    markNotificationRead,
    unreadNotifications: state.notifications.filter(n => !n.read),
  };
}

export default useAdminRealtime;
