'use client';

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, where, orderBy, limit, onSnapshot, Unsubscribe, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toast } from 'sonner';
import { format, startOfDay, endOfDay, isToday, subDays, startOfWeek, startOfMonth } from 'date-fns';
import { 
  Users, Package, Calendar as CalendarIcon, DollarSign, Clock, CheckCircle, 
  XCircle, AlertCircle, BarChart3, CreditCard, Loader2, Bell, BellRing,
  Home, LogOut, Menu, Star, Eye, Search, Filter, Download, RefreshCw,
  TrendingUp, TrendingDown, Activity, PieChart, FileText, Mail, Phone,
  ChevronLeft, ChevronRight, X, Settings, ChefHat, MessageSquare, Image,
  CalendarDays, Receipt, ArrowUpRight, ArrowDownRight, Shield, Gift
} from 'lucide-react';

// Import components
import DashboardStats from '@/components/admin/DashboardStats';
import UserActivityTable from '@/components/admin/UserActivityTable';
import UserDetailModal from '@/components/admin/UserDetailModal';
import NotificationsPanel from '@/components/admin/NotificationsPanel';
import AnalyticsSection from '@/components/admin/AnalyticsSection';
import DailyReportExport from '@/components/admin/DailyReportExport';
import AdminLogsPanel from '@/components/admin/AdminLogsPanel';
import ChefPicksManager from '@/components/admin/ChefPicksManager';
import MenuManager from '@/components/admin/MenuManager';
import GalleryManager from '@/components/admin/GalleryManager';
import OffersManager from '@/components/admin/OffersManager';
import NewsManager from '@/components/admin/NewsManager';
import { useAdminRealtime } from '@/hooks/useAdminSSE';
import { DailyStats } from '@/lib/services/adminService';

// ============== TYPES ==============
interface Order {
  id: string;
  customerName: string;
  phone: string;
  email?: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod?: string;
  transactionReference?: string;
  userId?: string;
  createdAt: Date | string | Timestamp;
  type?: string;
}

interface Reservation {
  id: string;
  name: string;
  email: string;
  phone: string;
  date: Date | string | Timestamp;
  time: string;
  partySize: number;
  status: string;
  specialRequests?: string;
  occasion?: string;
  userId?: string;
  createdAt: Date | string | Timestamp;
}

interface Event {
  id: string;
  name: string;
  email: string;
  phone?: string;
  eventType: string;
  guestCount?: number;
  budget?: string;
  details?: string;
  preferredDate?: Date | string | Timestamp;
  totalAmount?: number;
  status: string;
  paymentStatus?: string;
  paymentMethod?: string;
  userId?: string;
  createdAt: Date | string | Timestamp;
}

interface Review {
  id: string;
  name: string;
  email?: string;
  rating: number;
  text: string;
  date: string;
  avatar?: string;
  userId?: string;
  approved?: boolean;
}

interface User {
  id: string;
  email: string;
  name?: string;
  displayName?: string;
  phone?: string;
  role: string;
  createdAt?: Date | string | Timestamp;
  lastLogin?: Date | string | Timestamp;
}

interface UserActivity {
  user: User;
  orders: Order[];
  reservations: Reservation[];
  events: Event[];
  reviews: Review[];
  totalAmount: number;
}

// ============== NAVIGATION ITEMS ==============
const navItems = [
  { id: 'overview', label: 'Overview', icon: Home },
  { id: 'orders', label: 'Orders', icon: Package },
  { id: 'reservations', label: 'Reservations', icon: CalendarIcon },
  { id: 'events', label: 'Events', icon: Star },
  { id: 'payments', label: 'Payments', icon: CreditCard },
  { id: 'users', label: 'Users', icon: Users },
  { id: 'chefpicks', label: "Chef's Picks", icon: ChefHat },
  { id: 'offers', label: 'Special Offers', icon: Gift },
  { id: 'news', label: 'Latest News', icon: FileText },
  { id: 'menu', label: 'Menu', icon: Menu },
  { id: 'gallery', label: 'Gallery', icon: Image },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'logs', label: 'Activity Log', icon: Shield },
];

const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#ef4444', '#8b5cf6', '#ec4899'];

// ============== HELPER FUNCTIONS ==============
const formatCurrency = (amount: number) => `${(amount || 0).toLocaleString()} XAF`;

const formatDate = (date: Date | string | Timestamp | null | undefined): string => {
  if (!date) return 'N/A';
  try {
    let d: Date;
    if (date instanceof Timestamp) {
      d = date.toDate();
    } else if (date instanceof Date) {
      d = date;
    } else if (typeof date === 'string' || typeof date === 'number') {
      d = new Date(date);
    } else {
      return 'N/A';
    }
    if (isNaN(d.getTime())) return 'N/A';
    return format(d, 'MMM dd, yyyy HH:mm');
  } catch {
    return 'N/A';
  }
};

const getDateFromTimestamp = (date: Date | string | Timestamp | null | undefined): Date | null => {
  if (!date) return null;
  try {
    if (date instanceof Timestamp) return date.toDate();
    if (date instanceof Date) return date;
    if (typeof date === 'string' || typeof date === 'number') return new Date(date);
    return null;
  } catch {
    return null;
  }
};

const getStatusColor = (status: string) => {
  const s = status?.toUpperCase();
  const colors: Record<string, string> = {
    'PENDING': 'bg-yellow-500',
    'PROCESSING': 'bg-blue-500',
    'CONFIRMED': 'bg-blue-500',
    'PREPARING': 'bg-blue-500',
    'READY': 'bg-green-500',
    'COMPLETED': 'bg-green-500',
    'PAID': 'bg-green-500',
    'DELIVERED': 'bg-stone-500',
    'CANCELLED': 'bg-red-500',
    'FAILED': 'bg-red-500',
  };
  return colors[s] || 'bg-stone-500';
};

const getPaymentStatusColor = (status: string) => {
  const s = status?.toUpperCase();
  const colors: Record<string, string> = {
    'PAID': 'text-green-400 bg-green-500/20',
    'PENDING': 'text-yellow-400 bg-yellow-500/20',
    'PROCESSING': 'text-blue-400 bg-blue-500/20',
    'FAILED': 'text-red-400 bg-red-500/20',
    'PARTIAL': 'text-orange-400 bg-orange-500/20',
  };
  return colors[s] || 'text-stone-400 bg-stone-500/20';
};

// ============== MAIN COMPONENT ==============
export default function AdminDashboard() {
  const router = useRouter();
  const { user, userData, loading: authLoading, logOut } = useAuth();
  
  // UI State
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  // Data State
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  // Filter State
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState<'today' | 'week' | 'month' | 'all'>('today');
  
  // Modal State
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userDetailOpen, setUserDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [orderDetailOpen, setOrderDetailOpen] = useState(false);
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  // Real-time SSE notifications
  const { isConnected, notifications, clearNotifications, refresh: refreshNotifications } = useAdminRealtime({
    enabled: true,
    pollingInterval: 60000,
  });
  
  // Real-time listeners - use useRef to avoid lint issues
  const unsubscribersRef = useRef<Unsubscribe[]>([]);
  
  const isAdmin = userData?.role === 'ADMIN' || userData?.role === 'MANAGER';
  
  // ============== REAL-TIME DATA FETCHING ==============
  useEffect(() => {
    if (!user || !isAdmin || !db) {
      // Use setTimeout to defer setState outside of effect body
      const timer = setTimeout(() => {
        setLoading(false);
      }, 0);
      return () => clearTimeout(timer);
    }
    
    // Clean up previous listeners
    unsubscribersRef.current.forEach(unsub => unsub());
    unsubscribersRef.current = [];
    
    // Orders listener
    const ordersQuery = query(
      collection(db, 'orders'),
      orderBy('createdAt', 'desc'),
      limit(500)
    );
    unsubscribersRef.current.push(onSnapshot(ordersQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          createdAt: d.createdAt?.toDate?.() || d.createdAt,
        } as Order;
      });
      setOrders(data);
    }));
    
    // Reservations listener
    const resQuery = query(
      collection(db, 'reservations'),
      orderBy('createdAt', 'desc'),
      limit(500)
    );
    unsubscribersRef.current.push(onSnapshot(resQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          date: d.date?.toDate?.() || d.date,
          createdAt: d.createdAt?.toDate?.() || d.createdAt,
        } as Reservation;
      });
      setReservations(data);
    }));
    
    // Events listener
    const eventsQuery = query(
      collection(db, 'events'),
      orderBy('createdAt', 'desc'),
      limit(500)
    );
    unsubscribersRef.current.push(onSnapshot(eventsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          createdAt: d.createdAt?.toDate?.() || d.createdAt,
          preferredDate: d.preferredDate?.toDate?.() || d.preferredDate,
        } as Event;
      });
      setEvents(data);
      setLoading(false);
    }));
    
    // Reviews listener
    const reviewsQuery = query(
      collection(db, 'reviews'),
      orderBy('date', 'desc'),
      limit(200)
    );
    unsubscribersRef.current.push(onSnapshot(reviewsQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      })) as Review[];
      setReviews(data);
    }));
    
    // Users listener
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('createdAt', 'desc'),
      limit(500)
    );
    unsubscribersRef.current.push(onSnapshot(usersQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          ...d,
          createdAt: d.createdAt?.toDate?.() || d.createdAt,
          lastLogin: d.lastLogin?.toDate?.() || d.lastLogin,
        } as User;
      });
      setUsers(data);
    }));
    
    return () => {
      unsubscribersRef.current.forEach(unsub => unsub());
      unsubscribersRef.current = [];
    };
  }, [user, isAdmin]);
  
  // Redirect non-admin users
  useEffect(() => {
    if (!authLoading && (!user || !isAdmin)) {
      toast.error('Access denied. Admin privileges required.');
      router.push('/');
    }
  }, [user, isAdmin, authLoading, router]);
  
  // ============== COMPUTED STATISTICS ==============
  const stats = useMemo((): DailyStats => {
    const now = new Date();
    const todayStart = startOfDay(now);
    const todayEnd = endOfDay(now);
    
    // Filter by date range
    let filterStart: Date;
    switch (dateRange) {
      case 'today':
        filterStart = todayStart;
        break;
      case 'week':
        filterStart = startOfWeek(now);
        break;
      case 'month':
        filterStart = startOfMonth(now);
        break;
      default:
        filterStart = new Date(0); // All time
    }
    
    const filteredOrders = orders.filter(o => {
      const date = getDateFromTimestamp(o.createdAt);
      return date && date >= filterStart;
    });
    
    const filteredReservations = reservations.filter(r => {
      const date = getDateFromTimestamp(r.createdAt);
      return date && date >= filterStart;
    });
    
    const filteredEvents = events.filter(e => {
      const date = getDateFromTimestamp(e.createdAt);
      return date && date >= filterStart;
    });
    
    const todaysOrders = orders.filter(o => {
      const date = getDateFromTimestamp(o.createdAt);
      return date && isToday(date);
    });
    
    const todaysReservations = reservations.filter(r => {
      const date = getDateFromTimestamp(r.createdAt);
      return date && isToday(date);
    });
    
    const todaysEvents = events.filter(e => {
      const date = getDateFromTimestamp(e.createdAt);
      return date && isToday(date);
    });
    
    const totalRevenue = filteredOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const todaysRevenue = todaysOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    
    const pendingPayments = orders.filter(o => 
      o.paymentStatus === 'PENDING' || o.paymentStatus === 'PROCESSING' || !o.paymentStatus
    );
    
    const confirmedPayments = orders.filter(o => o.paymentStatus === 'PAID');
    
    const pendingAmount = pendingPayments.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const confirmedAmount = confirmedPayments.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    
    return {
      totalOrders: filteredOrders.length,
      totalReservations: filteredReservations.length,
      totalEvents: filteredEvents.length,
      totalRevenue,
      todaysOrders: todaysOrders.length,
      todaysReservations: todaysReservations.length,
      todaysEvents: todaysEvents.length,
      todaysRevenue,
      pendingPayments: pendingPayments.length,
      confirmedPayments: confirmedPayments.length,
      pendingAmount,
      confirmedAmount,
      avgOrderValue: filteredOrders.length > 0 ? totalRevenue / filteredOrders.length : 0,
      completedOrders: filteredOrders.filter(o => o.status === 'COMPLETED').length,
      newUsers: users.filter(u => {
        const date = getDateFromTimestamp(u.createdAt);
        return date && date >= filterStart;
      }).length,
    };
  }, [orders, reservations, events, users, dateRange]);
  
  // ============== USER ACTIVITY DATA ==============
  const userActivities = useMemo((): UserActivity[] => {
    const userMap = new Map<string, UserActivity>();
    
    // Process orders
    orders.forEach(order => {
      const userId = order.userId || 'guest';
      if (!userMap.has(userId)) {
        const foundUser = users.find(u => u.id === userId) || {
          id: userId,
          email: order.email || 'guest@guest.com',
          name: order.customerName,
          role: 'GUEST',
        };
        userMap.set(userId, { user: foundUser, orders: [], reservations: [], events: [], reviews: [], totalAmount: 0 });
      }
      const entry = userMap.get(userId)!;
      entry.orders.push(order);
      entry.totalAmount += order.totalAmount || 0;
    });
    
    // Process reservations
    reservations.forEach(res => {
      const userId = res.userId || 'guest';
      if (!userMap.has(userId)) {
        const foundUser = users.find(u => u.id === userId) || {
          id: userId,
          email: res.email,
          name: res.name,
          role: 'GUEST',
        };
        userMap.set(userId, { user: foundUser, orders: [], reservations: [], events: [], reviews: [], totalAmount: 0 });
      }
      userMap.get(userId)?.reservations.push(res);
    });
    
    // Process events
    events.forEach(event => {
      const userId = event.userId || 'guest';
      if (!userMap.has(userId)) {
        const foundUser = users.find(u => u.id === userId) || {
          id: userId,
          email: event.email,
          name: event.name,
          role: 'GUEST',
        };
        userMap.set(userId, { user: foundUser, orders: [], reservations: [], events: [], reviews: [], totalAmount: 0 });
      }
      userMap.get(userId)?.events.push(event);
    });
    
    return Array.from(userMap.values());
  }, [orders, reservations, events, users]);
  
  // ============== FILTERED DATA ==============
  const filteredUserActivities = useMemo(() => {
    let filtered = userActivities;
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(a => 
        a.user.name?.toLowerCase().includes(query) ||
        a.user.email?.toLowerCase().includes(query) ||
        a.user.phone?.toLowerCase().includes(query)
      );
    }
    
    if (statusFilter !== 'all') {
      filtered = filtered.filter(a => {
        const hasPending = a.orders.some(o => o.paymentStatus !== 'PAID');
        const hasPaid = a.orders.some(o => o.paymentStatus === 'PAID');
        
        if (statusFilter === 'paid') return hasPaid && !hasPending;
        if (statusFilter === 'pending') return hasPending;
        if (statusFilter === 'partial') return hasPaid && hasPending;
        return true;
      });
    }
    
    return filtered;
  }, [userActivities, searchQuery, statusFilter]);
  
  // Pagination
  const paginatedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUserActivities.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUserActivities, currentPage]);
  
  const totalPages = Math.ceil(filteredUserActivities.length / ITEMS_PER_PAGE);
  
  // ============== ACTIONS ==============
  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success('Order status updated');
      }
    } catch {
      toast.error('Failed to update order');
    }
  };
  
  const confirmPayment = async (orderId: string, paymentMethod: string) => {
    try {
      const res = await fetch('/api/admin/confirm-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId,
          paymentMethod,
          adminId: user?.uid,
        }),
      });
      
      if (res.ok) {
        toast.success('Payment confirmed! Invoice generated.');
      } else {
        toast.error('Failed to confirm payment');
      }
    } catch {
      toast.error('Failed to confirm payment');
    }
  };
  
  const handleLogout = async () => {
    try {
      await logOut();
      router.push('/');
    } catch {
      toast.error('Failed to logout');
    }
  };
  
  // ============== LOADING STATE ==============
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-amber-500 mx-auto" />
          <p className="mt-4 text-stone-400">Loading dashboard...</p>
        </div>
      </div>
    );
  }
  
  if (!user || !isAdmin) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <p className="mt-4 text-stone-400">Access Denied</p>
        </div>
      </div>
    );
  }
  
  // ============== RENDER ==============
  return (
    <div className="min-h-screen bg-stone-950 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50
        w-64 bg-stone-900 border-r border-stone-800
        transform transition-transform duration-300
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col h-screen
      `}>
        {/* Logo */}
        <div className="p-4 border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
              <span className="text-xl">🌿</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-amber-400 font-serif">The Yard</h1>
              <p className="text-xs text-stone-500">Admin Dashboard</p>
            </div>
          </div>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveSection(item.id);
                setSidebarOpen(false);
              }}
              className={`
                w-full flex items-center gap-2.5 px-3 py-2 rounded-lg
                transition-all duration-200 text-left
                ${activeSection === item.id 
                  ? 'bg-amber-500/20 text-amber-400 border-l-2 border-amber-500' 
                  : 'text-stone-400 hover:bg-stone-800 hover:text-white'
                }
              `}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              <span className="text-xs font-medium">{item.label}</span>
              {item.id === 'offers' && (
                <Badge className="ml-auto bg-green-600 text-[10px] px-1.5 py-0">New</Badge>
              )}
              {item.id === 'news' && (
                <Badge className="ml-auto bg-blue-600 text-[10px] px-1.5 py-0">New</Badge>
              )}
            </button>
          ))}
        </nav>
        
        {/* User Info */}
        <div className="p-4 border-t border-stone-800">
          <div className="flex items-center gap-3 mb-3">
            <Avatar className="h-9 w-9 border-2 border-amber-500">
              <AvatarFallback className="bg-stone-700 text-amber-400">
                {userData?.name?.charAt(0) || user?.email?.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{userData?.name || 'Admin'}</p>
              <p className="text-xs text-stone-500 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push('/')}
              className="flex-1 border-stone-700 text-stone-400 hover:bg-stone-800"
            >
              View Site
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="border-red-500/50 text-red-400 hover:bg-red-500/20"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Top Bar */}
        <header className="bg-stone-900 border-b border-stone-800 px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-stone-400"
            >
              <Menu className="w-5 h-5" />
            </Button>
            <div>
              <h2 className="text-lg font-semibold text-white capitalize">
                {navItems.find(n => n.id === activeSection)?.label || 'Dashboard'}
              </h2>
              <p className="text-xs text-stone-500">{format(new Date(), 'EEEE, MMMM dd, yyyy')}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Date Range Filter */}
            <Select value={dateRange} onValueChange={(v) => setDateRange(v as typeof dateRange)}>
              <SelectTrigger className="w-28 bg-stone-800 border-stone-700 text-white text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-stone-800">
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Notifications */}
            <NotificationsPanel
              notifications={notifications}
              isConnected={isConnected}
              onClear={clearNotifications}
            />
            
            <Badge className="bg-amber-600 text-white">{userData?.role}</Badge>
          </div>
        </header>
        
        {/* Main Content Area */}
        <main className="flex-1 p-4 md:p-6 overflow-auto">
          {/* ============== OVERVIEW SECTION ============== */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <DashboardStats stats={stats} isLoading={false} />
              
              {/* Quick Actions and Daily Report */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activity */}
                <Card className="lg:col-span-2 bg-stone-800 border-stone-700">
                  <CardHeader>
                    <CardTitle className="text-white flex items-center gap-2">
                      <Activity className="h-5 w-5 text-amber-400" />
                      Recent Activity
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ScrollArea className="h-80">
                      {orders.length === 0 && reservations.length === 0 && events.length === 0 ? (
                        <div className="text-center py-8 text-stone-500">
                          No recent activity
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {orders.slice(0, 5).map(order => (
                            <div key={order.id} className="flex items-center justify-between p-3 bg-stone-700/50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-amber-500/20">
                                  <Package className="h-4 w-4 text-amber-400" />
                                </div>
                                <div>
                                  <p className="text-white text-sm font-medium">{order.customerName}</p>
                                  <p className="text-stone-500 text-xs">Order • {order.items?.length || 0} items</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-amber-400 font-semibold">{formatCurrency(order.totalAmount)}</p>
                                <Badge className={`text-xs ${getStatusColor(order.status)}`}>
                                  {order.status}
                                </Badge>
                              </div>
                            </div>
                          ))}
                          
                          {reservations.slice(0, 3).map(res => (
                            <div key={res.id} className="flex items-center justify-between p-3 bg-stone-700/50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-blue-500/20">
                                  <CalendarIcon className="h-4 w-4 text-blue-400" />
                                </div>
                                <div>
                                  <p className="text-white text-sm font-medium">{res.name}</p>
                                  <p className="text-stone-500 text-xs">Reservation • {res.partySize} guests</p>
                                </div>
                              </div>
                              <Badge className={`text-xs ${getStatusColor(res.status)}`}>
                                {res.status}
                              </Badge>
                            </div>
                          ))}
                          
                          {events.slice(0, 2).map(evt => (
                            <div key={evt.id} className="flex items-center justify-between p-3 bg-stone-700/50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg bg-purple-500/20">
                                  <Star className="h-4 w-4 text-purple-400" />
                                </div>
                                <div>
                                  <p className="text-white text-sm font-medium">{evt.eventType}</p>
                                  <p className="text-stone-500 text-xs">Event • {evt.guestCount || 0} guests</p>
                                </div>
                              </div>
                              {evt.totalAmount && (
                                <p className="text-green-400 font-semibold">{formatCurrency(evt.totalAmount)}</p>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </ScrollArea>
                  </CardContent>
                </Card>
                
                {/* Daily Report Export */}
                <DailyReportExport
                  selectedDate={selectedDate}
                  onDateChange={setSelectedDate}
                  reportData={{
                    date: format(selectedDate, 'yyyy-MM-dd'),
                    stats: {
                      totalOrders: stats.todaysOrders,
                      totalReservations: stats.todaysReservations,
                      totalEvents: stats.todaysEvents,
                      totalRevenue: stats.todaysRevenue,
                      pendingPayments: stats.pendingPayments,
                      confirmedPayments: stats.confirmedPayments,
                    },
                    orders: orders.slice(0, 20),
                    reservations: reservations.slice(0, 20),
                    events: events.slice(0, 20),
                    topItems: [],
                    paymentMethods: {},
                  }}
                />
              </div>
              
              {/* User Activity Table */}
              <UserActivityTable
                users={paginatedUsers.map(a => ({
                  id: a.user.id,
                  userId: a.user.id,
                  name: a.user.name || a.user.displayName || 'Unknown',
                  email: a.user.email || '',
                  phone: a.user.phone,
                  orders: a.orders,
                  reservations: a.reservations,
                  events: a.events,
                  totalAmount: a.totalAmount,
                  paymentStatus: a.orders.some(o => o.paymentStatus !== 'PAID') ? 'PENDING' : 'PAID',
                  paymentMethod: a.orders[0]?.paymentMethod,
                  lastActivity: a.orders[0]?.createdAt || new Date(),
                }))}
                total={filteredUserActivities.length}
                page={currentPage}
                pageSize={ITEMS_PER_PAGE}
                isLoading={false}
                onPageChange={setCurrentPage}
                onSearch={setSearchQuery}
                onFilterChange={setStatusFilter}
                onViewDetails={(u) => {
                  const activity = userActivities.find(a => a.user.id === u.userId);
                  if (activity) {
                    setSelectedUser({
                      ...u,
                      orders: activity.orders,
                      reservations: activity.reservations,
                      events: activity.events,
                      reviews: activity.reviews,
                    } as any);
                    setUserDetailOpen(true);
                  }
                }}
                searchValue={searchQuery}
                filterValue={statusFilter}
              />
            </div>
          )}
          
          {/* ============== ORDERS SECTION ============== */}
          {activeSection === 'orders' && (
            <div className="space-y-6">
              <Card className="bg-stone-800 border-stone-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Package className="h-5 w-5 text-amber-400" />
                    Orders Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    {orders.length === 0 ? (
                      <div className="text-center py-12 text-stone-500">
                        <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No orders found</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {orders.map(order => (
                          <div key={order.id} className="p-4 bg-stone-700/50 rounded-lg">
                            <div className="flex justify-between items-start mb-3">
                              <div>
                                <p className="text-amber-400 font-mono">#{order.id.slice(-6).toUpperCase()}</p>
                                <p className="text-white font-medium">{order.customerName}</p>
                                <p className="text-stone-500 text-sm">{order.phone}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-green-400 font-bold">{formatCurrency(order.totalAmount)}</p>
                                <div className="flex gap-2 mt-1">
                                  <Badge className={`text-xs ${getStatusColor(order.status)}`}>
                                    {order.status}
                                  </Badge>
                                  <Badge className={`text-xs ${getPaymentStatusColor(order.paymentStatus)}`}>
                                    {order.paymentStatus || 'PENDING'}
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="flex flex-wrap gap-2 mt-3">
                              <Select
                                value={order.status}
                                onValueChange={(status) => updateOrderStatus(order.id, status)}
                              >
                                <SelectTrigger className="w-32 h-8 bg-stone-600 border-stone-500 text-white text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-stone-700">
                                  <SelectItem value="PENDING">Pending</SelectItem>
                                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                                  <SelectItem value="PREPARING">Preparing</SelectItem>
                                  <SelectItem value="READY">Ready</SelectItem>
                                  <SelectItem value="COMPLETED">Completed</SelectItem>
                                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                              {order.paymentStatus !== 'PAID' && (
                                <Button
                                  size="sm"
                                  onClick={() => confirmPayment(order.id, 'CASH')}
                                  className="bg-green-600 hover:bg-green-700 text-white h-8"
                                >
                                  Confirm Payment
                                </Button>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* ============== RESERVATIONS SECTION ============== */}
          {activeSection === 'reservations' && (
            <div className="space-y-6">
              <Card className="bg-stone-800 border-stone-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <CalendarIcon className="h-5 w-5 text-blue-400" />
                    Reservations Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    {reservations.length === 0 ? (
                      <div className="text-center py-12 text-stone-500">
                        <CalendarIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No reservations found</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {reservations.map(res => (
                          <div key={res.id} className="p-4 bg-stone-700/50 rounded-lg flex justify-between items-center">
                            <div>
                              <p className="text-white font-medium">{res.name}</p>
                              <p className="text-stone-400 text-sm">{res.partySize} guests • {res.time}</p>
                              <p className="text-stone-500 text-xs">{res.email}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge className={getStatusColor(res.status)}>
                                {res.status}
                              </Badge>
                              <Select
                                value={res.status}
                                onValueChange={async (status) => {
                                  try {
                                    await fetch(`/api/reservations/${res.id}`, {
                                      method: 'PATCH',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ status }),
                                    });
                                    toast.success('Reservation updated');
                                  } catch {
                                    toast.error('Failed to update reservation');
                                  }
                                }}
                              >
                                <SelectTrigger className="w-28 h-8 bg-stone-600 border-stone-500 text-white text-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-stone-700">
                                  <SelectItem value="PENDING">Pending</SelectItem>
                                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                                  <SelectItem value="COMPLETED">Completed</SelectItem>
                                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* ============== EVENTS SECTION ============== */}
          {activeSection === 'events' && (
            <div className="space-y-6">
              <Card className="bg-stone-800 border-stone-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Star className="h-5 w-5 text-purple-400" />
                    Events Management
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[600px]">
                    {events.length === 0 ? (
                      <div className="text-center py-12 text-stone-500">
                        <Star className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No events found</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {events.map(evt => (
                          <div key={evt.id} className="p-4 bg-stone-700/50 rounded-lg">
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-white font-medium">{evt.eventType}</p>
                                <p className="text-stone-400 text-sm">{evt.guestCount || 0} guests</p>
                                <p className="text-stone-500 text-xs">{evt.email}</p>
                              </div>
                              <div className="text-right">
                                {evt.totalAmount && (
                                  <p className="text-green-400 font-bold">{formatCurrency(evt.totalAmount)}</p>
                                )}
                                <Badge className={getStatusColor(evt.status)}>
                                  {evt.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* ============== PAYMENTS SECTION ============== */}
          {activeSection === 'payments' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-stone-800 border-stone-700">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-stone-400 text-sm">Pending Payments</p>
                        <p className="text-3xl font-bold text-yellow-400">{stats.pendingPayments}</p>
                        <p className="text-stone-500 text-sm">{formatCurrency(stats.pendingAmount)}</p>
                      </div>
                      <Clock className="h-10 w-10 text-yellow-400/50" />
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="bg-stone-800 border-stone-700">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-stone-400 text-sm">Confirmed Payments</p>
                        <p className="text-3xl font-bold text-green-400">{stats.confirmedPayments}</p>
                        <p className="text-stone-500 text-sm">{formatCurrency(stats.confirmedAmount)}</p>
                      </div>
                      <CheckCircle className="h-10 w-10 text-green-400/50" />
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <Card className="bg-stone-800 border-stone-700">
                <CardHeader>
                  <CardTitle className="text-white">Payment Management</CardTitle>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[400px]">
                    {orders.filter(o => o.paymentStatus !== 'PAID').length === 0 ? (
                      <div className="text-center py-12 text-stone-500">
                        <CheckCircle className="h-12 w-12 mx-auto mb-2 text-green-400" />
                        <p>All payments are confirmed!</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {orders.filter(o => o.paymentStatus !== 'PAID').map(order => (
                          <div key={order.id} className="p-4 bg-stone-700/50 rounded-lg flex justify-between items-center">
                            <div>
                              <p className="text-amber-400 font-mono">#{order.id.slice(-6).toUpperCase()}</p>
                              <p className="text-white font-medium">{order.customerName}</p>
                              <p className="text-yellow-400 font-semibold">{formatCurrency(order.totalAmount)}</p>
                            </div>
                            <Button
                              onClick={() => confirmPayment(order.id, 'CASH')}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              Confirm Payment
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* ============== USERS SECTION ============== */}
          {activeSection === 'users' && (
            <div className="space-y-6">
              <Card className="bg-stone-800 border-stone-700">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-400" />
                    Registered Users
                  </CardTitle>
                  <CardDescription className="text-stone-400">
                    All user registrations from the website
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="h-[500px]">
                    {users.length === 0 ? (
                      <div className="text-center py-12 text-stone-500">
                        <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p>No registered users yet</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {users.map(usr => (
                          <div key={usr.id} className="p-4 bg-stone-700/50 rounded-lg hover:bg-stone-700 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <Avatar className="h-10 w-10 border-2 border-amber-500">
                                  <AvatarFallback className="bg-stone-600 text-amber-400">
                                    {usr.name?.charAt(0) || usr.displayName?.charAt(0) || usr.email?.charAt(0).toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="text-white font-medium">{usr.name || usr.displayName || 'User'}</p>
                                  <p className="text-stone-400 text-sm">{usr.email}</p>
                                  {usr.phone && <p className="text-stone-500 text-xs">{usr.phone}</p>}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <Badge className={usr.role === 'ADMIN' ? 'bg-red-600' : usr.role === 'MANAGER' ? 'bg-purple-600' : 'bg-stone-600'}>
                                  {usr.role || 'CUSTOMER'}
                                </Badge>
                                <span className="text-stone-500 text-xs">
                                  {usr.createdAt ? formatDate(usr.createdAt) : 'N/A'}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* ============== ANALYTICS SECTION ============== */}
          {activeSection === 'analytics' && (
            <AnalyticsSection />
          )}
          
          {/* ============== CHEF PICKS SECTION ============== */}
          {activeSection === 'chefpicks' && (
            <ChefPicksManager />
          )}
          
          {/* ============== MENU SECTION ============== */}
          {activeSection === 'menu' && (
            <MenuManager />
          )}
          
          {/* ============== GALLERY SECTION ============== */}
          {activeSection === 'gallery' && (
            <GalleryManager />
          )}
          
          {/* ============== SPECIAL OFFERS SECTION ============== */}
          {activeSection === 'offers' && (
            <OffersManager />
          )}
          
          {/* ============== LATEST NEWS SECTION ============== */}
          {activeSection === 'news' && (
            <NewsManager />
          )}
          
          {/* ============== LOGS SECTION ============== */}
          {activeSection === 'logs' && (
            <div className="space-y-6">
              <AdminLogsPanel limit={30} />
            </div>
          )}
        </main>
      </div>
      
      {/* User Detail Modal */}
      <UserDetailModal
        user={selectedUser as any}
        open={userDetailOpen}
        onOpenChange={setUserDetailOpen}
        onConfirmPayment={confirmPayment}
      />
    </div>
  );
}
