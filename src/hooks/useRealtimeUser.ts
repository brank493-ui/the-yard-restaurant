'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  where, 
  orderBy, 
  onSnapshot, 
  Unsubscribe
} from 'firebase/firestore';
import { subscribeToSyncEvent, SYNC_EVENTS } from '@/utils/syncEvents';

interface Order {
  id: string;
  customerName: string;
  phone: string;
  type: string;
  totalAmount: number;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  transactionReference?: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  createdAt: string | Date;
  userId?: string;
  email?: string;
}

interface Reservation {
  id: string;
  name: string;
  email: string;
  phone: string;
  date: string | Date;
  time: string;
  partySize: number;
  status: string;
  specialRequests?: string;
  createdAt?: string | Date;
}

interface Event {
  id: string;
  name: string;
  email: string;
  phone: string;
  eventType: string;
  guestCount: number;
  preferredDate: string | Date;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  totalAmount?: number;
  createdAt: string | Date;
}

interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  total: number;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string | Date;
  items: Array<{ name: string; quantity: number; price: number }>;
}

interface UserData {
  orders: Order[];
  reservations: Reservation[];
  events: Event[];
  invoices: Invoice[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

export function useRealtimeUser() {
  const { user } = useAuth();
  const [data, setData] = useState<UserData>({
    orders: [],
    reservations: [],
    events: [],
    invoices: [],
    loading: true,
    error: null,
    lastUpdated: null,
  });

  const unsubscribersRef = useRef<Unsubscribe[]>([]);

  // Fallback fetch function
  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      setData(prev => ({ ...prev, loading: true, error: null }));

      // Fetch orders
      const ordersRes = await fetch('/api/orders');
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        const userOrders = ordersData.filter((o: Order) => 
          o.userId === user.uid || o.email === user.email
        );
        setData(prev => ({ ...prev, orders: userOrders }));
      }

      // Fetch reservations
      const resRes = await fetch('/api/reservations');
      if (resRes.ok) {
        const resData = await resRes.json();
        const userRes = resData.filter((r: Reservation) => r.email === user.email);
        setData(prev => ({ ...prev, reservations: userRes }));
      }

      // Fetch events
      const eventsRes = await fetch('/api/events');
      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        const userEvents = eventsData.filter((e: Event) => e.email === user.email);
        setData(prev => ({ ...prev, events: userEvents }));
      }

      // Fetch invoices
      const invoicesRes = await fetch(`/api/invoices?userId=${user.uid}`);
      if (invoicesRes.ok) {
        const invoicesData = await invoicesRes.json();
        setData(prev => ({ ...prev, invoices: invoicesData }));
      }

      setData(prev => ({ 
        ...prev, 
        loading: false,
        lastUpdated: new Date(),
      }));

    } catch (error) {
      console.error('Error fetching user data:', error);
      setData(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to fetch data',
      }));
    }
  }, [user]);

  // Setup listeners when user is available
  useEffect(() => {
    if (!user) return;

    // Clean up any existing listeners
    unsubscribersRef.current.forEach(unsub => unsub());
    unsubscribersRef.current = [];

    if (db) {
      // Setup real-time listeners
      try {
        // Orders listener - real-time sync
        const ordersQuery = query(
          collection(db, 'orders'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        
        unsubscribersRef.current.push(
          onSnapshot(ordersQuery, 
            (snapshot) => {
              const orders = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
              })) as Order[];
              
              setData(prev => ({
                ...prev,
                orders,
                loading: false,
                lastUpdated: new Date(),
              }));
            },
            () => {
              // Fallback: try without orderBy
              const simpleQuery = query(
                collection(db, 'orders'),
                where('userId', '==', user.uid)
              );
              unsubscribersRef.current.push(
                onSnapshot(simpleQuery, (snapshot) => {
                  const orders = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
                  })) as Order[];
                  
                  setData(prev => ({
                    ...prev,
                    orders,
                    loading: false,
                    lastUpdated: new Date(),
                  }));
                })
              );
            }
          )
        );

        // Reservations listener - real-time sync
        const reservationsQuery = query(
          collection(db, 'reservations'),
          where('email', '==', user.email),
          orderBy('createdAt', 'desc')
        );
        
        unsubscribersRef.current.push(
          onSnapshot(reservationsQuery,
            (snapshot) => {
              const reservations = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                date: doc.data().date?.toDate?.()?.toISOString() || doc.data().date,
                createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
              })) as Reservation[];
              
              setData(prev => ({
                ...prev,
                reservations,
                lastUpdated: new Date(),
              }));
            },
            () => {
              // Fallback without orderBy
              const simpleQuery = query(
                collection(db, 'reservations'),
                where('email', '==', user.email)
              );
              unsubscribersRef.current.push(
                onSnapshot(simpleQuery, (snapshot) => {
                  const reservations = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                  })) as Reservation[];
                  
                  setData(prev => ({
                    ...prev,
                    reservations,
                    lastUpdated: new Date(),
                  }));
                })
              );
            }
          )
        );

        // Events listener - real-time sync
        const eventsQuery = query(
          collection(db, 'events'),
          where('email', '==', user.email),
          orderBy('createdAt', 'desc')
        );
        
        unsubscribersRef.current.push(
          onSnapshot(eventsQuery,
            (snapshot) => {
              const events = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                preferredDate: doc.data().preferredDate?.toDate?.()?.toISOString() || doc.data().preferredDate,
                createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
              })) as Event[];
              
              setData(prev => ({
                ...prev,
                events,
                lastUpdated: new Date(),
              }));
            },
            () => {
              // Fallback without orderBy
              const simpleQuery = query(
                collection(db, 'events'),
                where('email', '==', user.email)
              );
              unsubscribersRef.current.push(
                onSnapshot(simpleQuery, (snapshot) => {
                  const events = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                  })) as Event[];
                  
                  setData(prev => ({
                    ...prev,
                    events,
                    lastUpdated: new Date(),
                  }));
                })
              );
            }
          )
        );

        // Invoices listener
        const invoicesQuery = query(
          collection(db, 'invoices'),
          where('userId', '==', user.uid),
          orderBy('createdAt', 'desc')
        );
        
        unsubscribersRef.current.push(
          onSnapshot(invoicesQuery,
            (snapshot) => {
              const invoices = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || doc.data().createdAt,
              })) as Invoice[];
              
              setData(prev => ({
                ...prev,
                invoices,
                lastUpdated: new Date(),
              }));
            },
            () => {
              // Fallback - try fetching without orderBy
              const simpleQuery = query(
                collection(db, 'invoices'),
                where('userId', '==', user.uid)
              );
              unsubscribersRef.current.push(
                onSnapshot(simpleQuery, (snapshot) => {
                  const invoices = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                  })) as Invoice[];
                  
                  setData(prev => ({
                    ...prev,
                    invoices,
                    lastUpdated: new Date(),
                  }));
                })
              );
            }
          )
        );

      } catch (error) {
        console.error('Error setting up real-time listeners:', error);
      }
    } else {
      // Firebase not configured, use polling
      const doFetch = async () => {
        await fetchData();
      };
      doFetch();
      const interval = setInterval(doFetch, 15000);
      return () => clearInterval(interval);
    }

    return () => {
      unsubscribersRef.current.forEach(unsub => unsub());
      unsubscribersRef.current = [];
    };
  }, [user, db]);

  // Subscribe to sync events for manual refresh triggers
  useEffect(() => {
    if (!user) return;

    const unsubscribers: (() => void)[] = [];

    // Subscribe to all sync events to trigger refresh
    Object.values(SYNC_EVENTS).forEach(eventType => {
      const unsub = subscribeToSyncEvent(eventType, () => {
        // Trigger a manual refresh of data
        fetchData();
      });
      unsubscribers.push(unsub);
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [user, fetchData]);

  // Manual refresh function
  const refresh = useCallback(() => {
    fetchData();
  }, [fetchData]);

  return {
    ...data,
    refresh,
  };
}
