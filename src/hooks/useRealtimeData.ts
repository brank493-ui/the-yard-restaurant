'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  onSnapshot, 
  Unsubscribe,
  DocumentData,
  Timestamp
} from 'firebase/firestore';
import { db, isFirebaseConfigured } from '@/lib/firebase';

// Types
export interface CartItem {
  menuItemId: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  image?: string;
  notes?: string;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  serviceCharge: number;
  tax: number;
  totalAmount: number;
  status?: 'active' | 'checked_out';
  createdAt: Date;
  updatedAt: Date;
}

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  phone: string;
  type: string;
  address?: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  totalAmount: number;
  status: string;
  paymentStatus?: string;
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
  date: Date;
  time: string;
  partySize: number;
  status: string;
  specialRequests?: string;
  occasion?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Event {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  eventType: string;
  guestCount?: number;
  budget?: string;
  details?: string;
  preferredDate?: Date;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  totalAmount?: number;
  createdAt: Date;
  updatedAt?: Date;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  userId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  createdAt: Date;
  dueDate: Date;
}

export interface Notification {
  id: string;
  type: 'PAYMENT' | 'ORDER' | 'RESERVATION' | 'EVENT';
  title: string;
  message: string;
  orderId?: string;
  paymentMethod?: string;
  transactionReference?: string;
  amount?: number;
  read: boolean;
  createdAt: Date;
}

interface UseRealtimeDataOptions {
  userId?: string | null;
  isAdmin?: boolean;
  enabled?: boolean;
}

interface RealtimeDataState {
  cart: Cart | null;
  orders: Order[];
  reservations: Reservation[];
  events: Event[];
  invoices: Invoice[];
  notifications: Notification[];
  loading: boolean;
  error: string | null;
}

// Helper to convert Firestore timestamp to Date
function convertTimestamp(timestamp: Timestamp | Date | undefined): Date {
  if (!timestamp) return new Date();
  if (timestamp instanceof Date) return timestamp;
  return timestamp.toDate();
}

// Helper to process document data
function processDoc<T>(doc: DocumentData): T {
  const data = doc.data();
  const processed: Record<string, unknown> = { id: doc.id, ...data };
  
  // Convert timestamps
  if (data.createdAt) processed.createdAt = convertTimestamp(data.createdAt);
  if (data.updatedAt) processed.updatedAt = convertTimestamp(data.updatedAt);
  if (data.date) processed.date = convertTimestamp(data.date);
  if (data.preferredDate) processed.preferredDate = convertTimestamp(data.preferredDate);
  if (data.dueDate) processed.dueDate = convertTimestamp(data.dueDate);
  
  return processed as T;
}

export function useRealtimeData(options: UseRealtimeDataOptions = {}) {
  const { userId, isAdmin = false, enabled = true } = options;
  
  const [state, setState] = useState<RealtimeDataState>({
    cart: null,
    orders: [],
    reservations: [],
    events: [],
    invoices: [],
    notifications: [],
    loading: true,
    error: null,
  });

  const unsubscribersRef = useRef<Unsubscribe[]>([]);
  const previousDataRef = useRef<{
    cart: Cart | null;
    orders: Order[];
    reservations: Reservation[];
    events: Event[];
    notifications: Notification[];
  }>({
    cart: null,
    orders: [],
    reservations: [],
    events: [],
    notifications: [],
  });

  // Setup real-time listeners
  useEffect(() => {
    // Skip if not enabled or Firebase not configured
    if (!enabled || !isFirebaseConfigured || !db) {
      // Use setTimeout to defer setState outside of effect body
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, loading: false }));
      }, 0);
      return () => clearTimeout(timer);
    }

    // Cleanup previous subscriptions
    unsubscribersRef.current.forEach(unsub => unsub());
    unsubscribersRef.current = [];

    try {
      // Cart listener (only for logged-in users)
      if (userId && !isAdmin) {
        const cartQuery = query(
          collection(db, 'carts'),
          where('userId', '==', userId),
          limit(1)
        );

        const unsubCart = onSnapshot(cartQuery, (snapshot) => {
          if (!snapshot.empty) {
            const cart = processDoc<Cart>(snapshot.docs[0]);
            previousDataRef.current.cart = cart;
            setState(prev => ({ ...prev, cart }));
          } else {
            setState(prev => ({ ...prev, cart: null }));
          }
        }, (error) => {
          console.error('Cart listener error:', error);
        });

        unsubscribersRef.current.push(unsubCart);
      }

      // Orders listener
      let ordersQuery = query(
        collection(db, 'orders'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      
      if (userId && !isAdmin) {
        ordersQuery = query(
          collection(db, 'orders'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
      }

      const unsubOrders = onSnapshot(ordersQuery, (snapshot) => {
        const orders = snapshot.docs.map(doc => processDoc<Order>(doc));
        
        // Detect changes for notifications
        const prevOrders = previousDataRef.current.orders;
        const newOrders = orders.filter(o => !prevOrders.find(p => p.id === o.id));
        const changedOrders = orders.filter(o => {
          const prev = prevOrders.find(p => p.id === o.id);
          return prev && (prev.status !== o.status || prev.paymentStatus !== o.paymentStatus);
        });

        previousDataRef.current.orders = orders;
        
        setState(prev => ({ ...prev, orders, loading: false }));
      }, (error) => {
        console.error('Orders listener error:', error);
        setState(prev => ({ ...prev, error: 'Failed to listen to orders' }));
      });

      unsubscribersRef.current.push(unsubOrders);

      // Reservations listener
      let reservationsQuery = query(
        collection(db, 'reservations'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      
      if (userId && !isAdmin) {
        reservationsQuery = query(
          collection(db, 'reservations'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
      }

      const unsubReservations = onSnapshot(reservationsQuery, (snapshot) => {
        const reservations = snapshot.docs.map(doc => processDoc<Reservation>(doc));
        previousDataRef.current.reservations = reservations;
        setState(prev => ({ ...prev, reservations }));
      }, (error) => {
        console.error('Reservations listener error:', error);
      });

      unsubscribersRef.current.push(unsubReservations);

      // Events listener
      let eventsQuery = query(
        collection(db, 'events'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      
      if (userId && !isAdmin) {
        eventsQuery = query(
          collection(db, 'events'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
      }

      const unsubEvents = onSnapshot(eventsQuery, (snapshot) => {
        const events = snapshot.docs.map(doc => processDoc<Event>(doc));
        previousDataRef.current.events = events;
        setState(prev => ({ ...prev, events }));
      }, (error) => {
        console.error('Events listener error:', error);
      });

      unsubscribersRef.current.push(unsubEvents);

      // Invoices listener
      let invoicesQuery = query(
        collection(db, 'invoices'),
        orderBy('createdAt', 'desc'),
        limit(100)
      );
      
      if (userId && !isAdmin) {
        invoicesQuery = query(
          collection(db, 'invoices'),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
      }

      const unsubInvoices = onSnapshot(invoicesQuery, (snapshot) => {
        const invoices = snapshot.docs.map(doc => processDoc<Invoice>(doc));
        setState(prev => ({ ...prev, invoices }));
      }, (error) => {
        console.error('Invoices listener error:', error);
      });

      unsubscribersRef.current.push(unsubInvoices);

      // Notifications listener (admin only)
      if (isAdmin) {
        const notificationsQuery = query(
          collection(db, 'notifications'),
          orderBy('createdAt', 'desc'),
          limit(50)
        );

        const unsubNotifications = onSnapshot(notificationsQuery, (snapshot) => {
          const notifications = snapshot.docs.map(doc => processDoc<Notification>(doc));
          previousDataRef.current.notifications = notifications;
          setState(prev => ({ ...prev, notifications }));
        }, (error) => {
          console.error('Notifications listener error:', error);
        });

        unsubscribersRef.current.push(unsubNotifications);
      }

    } catch (error) {
      console.error('Error setting up real-time listeners:', error);
      // Use setTimeout to defer setState outside of effect body
      setTimeout(() => {
        setState(prev => ({ ...prev, error: 'Failed to setup real-time updates', loading: false }));
      }, 0);
    }

    // Cleanup on unmount
    return () => {
      unsubscribersRef.current.forEach(unsub => unsub());
      unsubscribersRef.current = [];
    };
  }, [userId, isAdmin, enabled]);

  // Fetch data via API (fallback for non-realtime or demo mode)
  const fetchData = useCallback(async () => {
    if (!enabled) return;
    
    setState(prev => ({ ...prev, loading: true }));
    
    try {
      const headers: Record<string, string> = {};
      
      // Fetch all data in parallel
      const [cartRes, ordersRes, reservationsRes, eventsRes, invoicesRes, notificationsRes] = await Promise.all([
        userId ? fetch(`/api/cart?userId=${userId}`, { headers }) : Promise.resolve(null),
        fetch('/api/orders', { headers }),
        fetch('/api/reservations', { headers }),
        fetch('/api/events', { headers }),
        fetch(`/api/invoices?userId=${userId || 'guest'}`, { headers }),
        isAdmin ? fetch('/api/notifications', { headers }) : Promise.resolve(null),
      ]);

      const [cartData, orders, reservations, events, invoices, notifications] = await Promise.all([
        cartRes?.ok ? cartRes.json() : null,
        ordersRes.ok ? ordersRes.json() : [],
        reservationsRes.ok ? reservationsRes.json() : [],
        eventsRes.ok ? eventsRes.json() : [],
        invoicesRes.ok ? invoicesRes.json() : [],
        notificationsRes?.ok ? notificationsRes.json() : [],
      ]);

      setState({
        cart: cartData?.cart || null,
        orders: Array.isArray(orders) ? orders : [],
        reservations: Array.isArray(reservations) ? reservations : [],
        events: Array.isArray(events) ? events : [],
        invoices: Array.isArray(invoices) ? invoices : [],
        notifications: Array.isArray(notifications) ? notifications : [],
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching data:', error);
      setState(prev => ({ 
        ...prev, 
        loading: false, 
        error: 'Failed to fetch data' 
      }));
    }
  }, [userId, isAdmin, enabled]);

  // Return both real-time data and manual fetch function
  return {
    ...state,
    refetch: fetchData,
    hasNewData: (type: 'cart' | 'orders' | 'reservations' | 'events' | 'notifications') => {
      // This can be used to detect new items
      return false;
    },
  };
}

// Hook for detecting changes and triggering callbacks
export function useRealtimeChanges(
  data: RealtimeDataState,
  onNewOrder?: (order: Order) => void,
  onOrderStatusChange?: (order: Order, previousStatus: string) => void,
  onNewReservation?: (reservation: Reservation) => void,
  onNewNotification?: (notification: Notification) => void
) {
  const prevOrdersRef = useRef<Order[]>([]);
  const prevReservationsRef = useRef<Reservation[]>([]);
  const prevNotificationsRef = useRef<Notification[]>([]);

  useEffect(() => {
    if (!data.orders.length && !prevOrdersRef.current.length) {
      prevOrdersRef.current = data.orders;
      return;
    }

    // Detect new orders
    const newOrders = data.orders.filter(
      o => !prevOrdersRef.current.find(p => p.id === o.id)
    );
    newOrders.forEach(order => onNewOrder?.(order));

    // Detect status changes
    data.orders.forEach(order => {
      const prev = prevOrdersRef.current.find(p => p.id === order.id);
      if (prev && prev.status !== order.status) {
        onOrderStatusChange?.(order, prev.status);
      }
    });

    prevOrdersRef.current = data.orders;
  }, [data.orders, onNewOrder, onOrderStatusChange]);

  useEffect(() => {
    if (!data.reservations.length && !prevReservationsRef.current.length) {
      prevReservationsRef.current = data.reservations;
      return;
    }

    const newReservations = data.reservations.filter(
      r => !prevReservationsRef.current.find(p => p.id === r.id)
    );
    newReservations.forEach(reservation => onNewReservation?.(reservation));

    prevReservationsRef.current = data.reservations;
  }, [data.reservations, onNewReservation]);

  useEffect(() => {
    if (!data.notifications.length && !prevNotificationsRef.current.length) {
      prevNotificationsRef.current = data.notifications;
      return;
    }

    const newNotifications = data.notifications.filter(
      n => !prevNotificationsRef.current.find(p => p.id === n.id) && !n.read
    );
    newNotifications.forEach(notification => onNewNotification?.(notification));

    prevNotificationsRef.current = data.notifications;
  }, [data.notifications, onNewNotification]);
}

export default useRealtimeData;
