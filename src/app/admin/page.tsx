'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { collection, query, orderBy, limit, onSnapshot, Unsubscribe } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { 
  Users, Package, Calendar, DollarSign, Clock, CheckCircle, AlertCircle, CreditCard, 
  Loader2, Search, ChevronLeft, ChevronRight, Download, Bell, BarChart3, Eye, 
  LogOut, Menu, Home, Utensils, MessageSquare, ArrowLeft, X, Image, Star, 
  Edit, Trash2, Plus, Save, ChefHat
} from 'lucide-react';
import { format, startOfDay, endOfDay } from 'date-fns';

// ============== TYPES ==============
interface Order { id: string; customerName: string; phone: string; items: Array<{ name: string; quantity: number; price: number }>; totalAmount: number; status: string; paymentStatus: string; paymentMethod?: string; createdAt: Date | string; }
interface Reservation { id: string; name: string; phone: string; date: Date | string; time: string; partySize: number; status: string; createdAt: Date | string; }
interface Event { id: string; name: string; email: string; phone?: string; eventType: string; guestCount?: number; totalAmount?: number; status: string; createdAt: Date | string; }
interface Review { id: string; name: string; rating: number; text: string; approved?: boolean; }
interface MenuItem { id: string; name: string; description: string; price: number; category: string; image: string; isAvailable: boolean; isPopular: boolean; }
interface GalleryImage { id: string; url: string; caption: string; category: string; order: number; }

// ============== HELPERS ==============
const formatCurrency = (amount: number) => `${amount?.toLocaleString() || 0} XAF`;
const formatDate = (date: Date | string | { toDate?: () => Date } | null | undefined) => {
  if (!date) return 'N/A';
  try {
    let d: Date;
    if (date instanceof Date) {
      d = date;
    } else if (typeof date === 'object' && 'toDate' in date && typeof date.toDate === 'function') {
      d = date.toDate();
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
const getStatusBadge = (status: string) => { const s = status?.toUpperCase(); const colors: Record<string, string> = { 'PENDING': 'bg-yellow-500/20 text-yellow-400', 'CONFIRMED': 'bg-blue-500/20 text-blue-400', 'PREPARING': 'bg-blue-500/20 text-blue-400', 'READY': 'bg-green-500/20 text-green-400', 'COMPLETED': 'bg-green-500/20 text-green-400', 'PAID': 'bg-green-500/20 text-green-400', 'CANCELLED': 'bg-red-500/20 text-red-400' }; return colors[s] || 'bg-gray-500/20 text-gray-400'; };

// ============== MAIN COMPONENT ==============
export default function AdminDashboard() {
  const router = useRouter();
  const { user, userData, loading: authLoading, logOut } = useAuth();
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [events, setEvents] = useState<Event[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);
  const [showGalleryModal, setShowGalleryModal] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [editingGallery, setEditingGallery] = useState<GalleryImage | null>(null);
  const [saving, setSaving] = useState(false);
  
  const unsubscribersRef = useRef<Unsubscribe[]>([]);
  const isAdmin = userData?.role === 'ADMIN' || userData?.role === 'MANAGER';
  
  // Real-time data
  useEffect(() => {
    if (!user || !isAdmin || !db) { const t = setTimeout(() => setLoading(false), 0); return () => clearTimeout(t); }
    unsubscribersRef.current.forEach(u => u()); unsubscribersRef.current = [];
    
    const orderQ = query(collection(db, 'orders'), orderBy('createdAt', 'desc'), limit(100));
    unsubscribersRef.current.push(onSnapshot(orderQ, snap => setOrders(snap.docs.map(d => ({ id: d.id, ...d.data(), createdAt: d.data()?.createdAt?.toDate?.() || new Date() } as Order)))));
    
    const resQ = query(collection(db, 'reservations'), orderBy('createdAt', 'desc'), limit(100));
    unsubscribersRef.current.push(onSnapshot(resQ, snap => setReservations(snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        date: data.date?.toDate?.() || data.date || new Date(),
        createdAt: data.createdAt?.toDate?.() || new Date()
      } as Reservation;
    }))));
    
    const eventQ = query(collection(db, 'events'), orderBy('createdAt', 'desc'), limit(100));
    unsubscribersRef.current.push(onSnapshot(eventQ, snap => setEvents(snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || new Date()
      } as Event;
    }))));
    
    // Fetch other data
    const fetchData = async () => {
      try {
        const [reviewsRes, menuRes] = await Promise.all([
          fetch('/api/reviews'),
          fetch('/api/menu?all=true')
        ]);
        if (reviewsRes.ok) setReviews(await reviewsRes.json());
        if (menuRes.ok) setMenuItems(await menuRes.json());
        
        // Fetch users safely
        try {
          const usersRes = await fetch('/api/admin/users');
          if (usersRes.ok) {
            const usersData = await usersRes.json();
            setUsers(Array.isArray(usersData) ? usersData : (usersData.users || []));
          }
        } catch { setUsers([]); }
        
        // Gallery - use sample data for now
        setGalleryImages([
          { id: '1', url: '/restaurant-hero.png', caption: 'Restaurant Interior', category: 'interior', order: 1 },
          { id: '2', url: '/food-main.png', caption: 'Signature Dishes', category: 'food', order: 2 },
          { id: '3', url: '/food-grilled.png', caption: 'Grilled Specialties', category: 'food', order: 3 },
        ]);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
    
    return () => { unsubscribersRef.current.forEach(u => u()); };
  }, [user, isAdmin]);
  
  useEffect(() => { if (!authLoading && (!user || !isAdmin)) router.push('/'); }, [user, isAdmin, authLoading, router]);
  
  // Computed
  const todayStart = startOfDay(new Date()), todayEnd = endOfDay(new Date());
  const todayOrders = orders.filter(o => { const d = o.createdAt instanceof Date ? o.createdAt : new Date(o.createdAt); return d >= todayStart && d <= todayEnd; });
  const todayRes = reservations.filter(r => { const d = r.createdAt instanceof Date ? r.createdAt : new Date(r.createdAt); return d >= todayStart && d <= todayEnd; });
  
  const stats = useMemo(() => ({ 
    ordersToday: todayOrders.length, 
    resToday: todayRes.length, 
    revenueToday: todayOrders.reduce((s, o) => s + (o.totalAmount || 0), 0), 
    pending: orders.filter(o => o.paymentStatus === 'PENDING' || o.paymentStatus === 'PROCESSING').length, 
    totalOrders: orders.length, 
    totalRevenue: orders.reduce((s, o) => s + (o.totalAmount || 0), 0), 
    totalUsers: users.length,
    menuItems: menuItems.length,
    featuredItems: menuItems.filter(m => m.isPopular).length
  }), [todayOrders, todayRes, orders, users, menuItems]);
  
  const filteredOrders = orders.filter(o => { if (searchQuery) { const q = searchQuery.toLowerCase(); if (!o.customerName?.toLowerCase().includes(q) && !o.phone?.includes(q)) return false; } if (statusFilter !== 'all' && o.status !== statusFilter && o.paymentStatus !== statusFilter) return false; return true; });
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  
  // Handlers
  const handleLogout = async () => { await logOut(); router.push('/'); };
  const handleConfirmPay = async (orderId: string, method: string) => { await fetch('/api/admin/confirm-payment', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId, paymentMethod: method, adminId: user?.uid }) }); toast.success('Payment confirmed!'); };
  const handleUpdateRes = async (id: string, status: string) => { await fetch(`/api/reservations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); toast.success('Updated'); };
  const handleExport = () => { const csv = [['ID', 'Customer', 'Phone', 'Amount', 'Status', 'Payment', 'Date'], ...orders.map(o => [o.id.slice(-6), o.customerName, o.phone, o.totalAmount, o.status, o.paymentStatus, formatDate(o.createdAt)])].map(r => r.join(',')).join('\n'); const blob = new Blob([csv], { type: 'text/csv' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `orders-${format(new Date(), 'yyyy-MM-dd')}.csv`; a.click(); toast.success('Downloaded'); };
  
  // Menu handlers
  const handleSaveMenuItem = async (item: Partial<MenuItem>) => {
    setSaving(true);
    try {
      const url = item.id ? `/api/menu/${item.id}` : '/api/menu';
      const method = item.id ? 'PUT' : 'POST';
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item) });
      if (res.ok) {
        toast.success(item.id ? 'Menu item updated!' : 'Menu item added!');
        setShowMenuModal(false);
        setEditingItem(null);
        const menuRes = await fetch('/api/menu?all=true');
        if (menuRes.ok) setMenuItems(await menuRes.json());
      } else {
        toast.error('Failed to save menu item');
      }
    } catch { toast.error('Failed to save menu item'); }
    finally { setSaving(false); }
  };
  
  const handleDeleteMenuItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      const res = await fetch(`/api/menu/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Menu item deleted');
        setMenuItems(prev => prev.filter(m => m.id !== id));
      }
    } catch { toast.error('Failed to delete'); }
  };
  
  const handleToggleFeatured = async (item: MenuItem) => {
    try {
      const res = await fetch(`/api/menu/${item.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...item, isPopular: !item.isPopular }) });
      if (res.ok) {
        toast.success(item.isPopular ? 'Removed from Chef\'s Recommendations' : 'Added to Chef\'s Recommendations');
        setMenuItems(prev => prev.map(m => m.id === item.id ? { ...m, isPopular: !m.isPopular } : m));
      }
    } catch { toast.error('Failed to update'); }
  };
  
  // Loading
  if (authLoading || loading) return <div className="h-screen bg-gray-950 flex items-center justify-center"><Loader2 className="w-12 h-12 animate-spin text-amber-500" /></div>;
  if (!user || !isAdmin) return <div className="h-screen bg-gray-950 flex items-center justify-center"><div className="text-center"><AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" /><p className="text-white text-lg">Access Denied</p></div></div>;
  
  const navItems = [
    { id: 'overview', icon: Home, label: 'Overview' },
    { id: 'orders', icon: Package, label: 'Orders' },
    { id: 'reservations', icon: Calendar, label: 'Reservations' },
    { id: 'events', icon: Utensils, label: 'Events' },
    { id: 'payments', icon: CreditCard, label: 'Payments' },
    { id: 'users', icon: Users, label: 'Users' },
    { id: 'reviews', icon: MessageSquare, label: 'Reviews' },
    { id: 'menu', icon: Utensils, label: 'Menu' },
    { id: 'recommendations', icon: ChefHat, label: 'Chef\'s Picks' },
    { id: 'gallery', icon: Image, label: 'Gallery' },
    { id: 'analytics', icon: BarChart3, label: 'Analytics' },
  ];
  
  // Render
  return (
    <div className="h-screen bg-gray-950 flex overflow-hidden">
      {/* Mobile Overlay */}
      {sidebarOpen && <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />}
      
      {/* SIDEBAR */}
      <aside className={`fixed lg:relative inset-y-0 left-0 z-50 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'} w-64 bg-gray-900 border-r border-gray-800 flex flex-col transition-transform duration-300 h-full lg:translate-x-0`}>
        <div className="p-4 border-b border-gray-800 flex items-center justify-between flex-shrink-0">
          <h1 className="text-lg font-bold text-amber-500">The Yard Admin</h1>
          <button onClick={() => setSidebarOpen(false)} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 lg:hidden"><X className="w-5 h-5" /></button>
        </div>
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
          {navItems.map(item => (
            <button key={item.id} onClick={() => { setActiveSection(item.id); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${activeSection === item.id ? 'bg-amber-500/20 text-amber-500' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}`}><item.icon className="w-5 h-5 flex-shrink-0" /><span className="text-sm">{item.label}</span></button>
          ))}
        </nav>
        <div className="p-4 border-t border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold">{userData?.displayName?.[0] || user?.email?.[0].toUpperCase()}</div>
            <div className="flex-1 min-w-0"><p className="text-white text-sm truncate">{userData?.displayName || 'Admin'}</p><p className="text-gray-500 text-xs truncate">{user?.email}</p></div>
          </div>
          <button onClick={handleLogout} className="w-full mt-3 flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg"><LogOut className="w-4 h-4" /><span className="text-sm">Logout</span></button>
        </div>
      </aside>
      
      {/* MAIN */}
      <div className="flex-1 flex flex-col min-w-0 h-full">
        {/* Header */}
        <header className="bg-gray-900 border-b border-gray-800 px-4 lg:px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 lg:hidden"><Menu className="w-5 h-5" /></button>
            <button onClick={() => router.push('/')} className="flex items-center gap-2 text-gray-400 hover:text-white hidden sm:flex"><ArrowLeft className="w-4 h-4" /><span className="text-sm">Back</span></button>
            <div><h2 className="text-lg lg:text-xl font-bold text-white capitalize">{activeSection}</h2><p className="text-gray-500 text-xs lg:text-sm hidden sm:block">{format(new Date(), 'EEE, MMM dd')}</p></div>
          </div>
          <div className="flex items-center gap-2 lg:gap-3">
            <button className="p-2 rounded-lg hover:bg-gray-800 text-gray-400"><Bell className="w-5 h-5" /></button>
            <Badge className="bg-amber-500 text-xs">{userData?.role}</Badge>
          </div>
        </header>
        
        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-6">
          {/* OVERVIEW */}
          {activeSection === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
                {[{ label: 'Orders Today', value: stats.ordersToday, icon: Package }, { label: 'Reservations', value: stats.resToday, icon: Calendar }, { label: 'Revenue', value: formatCurrency(stats.revenueToday), icon: DollarSign }, { label: 'Pending', value: stats.pending, icon: Clock }, { label: 'Users', value: stats.totalUsers, icon: Users }].map((s, i) => (
                  <Card key={i} className="bg-gray-900 border-gray-800"><CardContent className="p-3 lg:p-4"><div className="flex items-center gap-2 lg:gap-3"><s.icon className="w-4 h-4 lg:w-5 lg:h-5 text-amber-500" /><div><p className="text-lg lg:text-xl font-bold text-white">{s.value}</p><p className="text-gray-500 text-xs">{s.label}</p></div></div></CardContent></Card>
                ))}
              </div>
              <Card className="bg-gray-900 border-gray-800"><CardHeader><CardTitle className="text-white text-sm lg:text-base">Quick Actions</CardTitle></CardHeader><CardContent className="flex flex-wrap gap-2"><Button onClick={handleExport} size="sm" className="bg-amber-500 hover:bg-amber-600"><Download className="w-4 h-4 mr-2" />Export</Button><Button onClick={() => { setEditingItem(null); setShowMenuModal(true); }} size="sm" variant="outline" className="border-gray-700 text-white"><Plus className="w-4 h-4 mr-2" />Add Menu</Button></CardContent></Card>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
                <Card className="bg-gray-900 border-gray-800"><CardHeader><CardTitle className="text-white text-sm">Recent Orders</CardTitle></CardHeader><CardContent><div className="space-y-2">{todayOrders.slice(0, 5).map(o => (<div key={o.id} onClick={() => { setSelectedOrder(o); setShowOrderModal(true); }} className="flex justify-between p-2 lg:p-3 bg-gray-800/50 rounded-lg cursor-pointer hover:bg-gray-800"><div><p className="text-white text-sm font-medium">#{o.id.slice(-6)}</p><p className="text-gray-400 text-xs">{o.customerName}</p></div><div className="text-right"><p className="text-white text-sm font-bold">{formatCurrency(o.totalAmount)}</p><Badge className={getStatusBadge(o.status)}>{o.status}</Badge></div></div>))}{todayOrders.length === 0 && <p className="text-center text-gray-500 py-6 text-sm">No orders today</p>}</div></CardContent></Card>
                <Card className="bg-gray-900 border-gray-800"><CardHeader><CardTitle className="text-white text-sm">Today's Reservations</CardTitle></CardHeader><CardContent><div className="space-y-2">{todayRes.slice(0, 5).map(r => (<div key={r.id} className="flex justify-between p-2 lg:p-3 bg-gray-800/50 rounded-lg"><div><p className="text-white text-sm font-medium">{r.name}</p><p className="text-gray-400 text-xs">{r.partySize} guests • {r.time}</p></div><Badge className={getStatusBadge(r.status)}>{r.status}</Badge></div>))}{todayRes.length === 0 && <p className="text-center text-gray-500 py-6 text-sm">No reservations</p>}</div></CardContent></Card>
              </div>
            </div>
          )}
          
          {/* ORDERS */}
          {activeSection === 'orders' && (
            <div className="space-y-4">
              <Card className="bg-gray-900 border-gray-800"><CardContent className="p-3 lg:p-4"><div className="flex flex-wrap gap-2 lg:gap-3"><div className="relative flex-1 min-w-[150px]"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" /><Input placeholder="Search..." value={searchQuery} onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }} className="pl-10 bg-gray-800 border-gray-700 text-white h-9" /></div><Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setCurrentPage(1); }}><SelectTrigger className="w-28 lg:w-36 bg-gray-800 border-gray-700 text-white h-9"><SelectValue placeholder="Filter" /></SelectTrigger><SelectContent className="bg-gray-800"><SelectItem value="all">All</SelectItem><SelectItem value="PENDING">Pending</SelectItem><SelectItem value="PAID">Paid</SelectItem></SelectContent></Select><Button onClick={handleExport} size="sm" className="bg-amber-500 hover:bg-amber-600"><Download className="w-4 h-4 lg:mr-2" /><span className="hidden lg:inline">Export</span></Button></div></CardContent></Card>
              <Card className="bg-gray-900 border-gray-800"><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[600px]"><thead><tr className="border-b border-gray-800 text-gray-400 text-xs lg:text-sm"><th className="text-left py-2 lg:py-3 px-3 lg:px-4">Order</th><th className="text-left py-2 lg:py-3 px-3 lg:px-4">Customer</th><th className="text-right py-2 lg:py-3 px-3 lg:px-4">Amount</th><th className="text-center py-2 lg:py-3 px-3 lg:px-4">Status</th><th className="text-center py-2 lg:py-3 px-3 lg:px-4">Payment</th><th className="text-center py-2 lg:py-3 px-3 lg:px-4">Actions</th></tr></thead><tbody>{paginatedOrders.map(o => (<tr key={o.id} className="border-b border-gray-800/50 hover:bg-gray-800/30"><td className="py-2 lg:py-3 px-3 lg:px-4"><p className="text-amber-500 font-mono text-xs lg:text-sm">#{o.id.slice(-6)}</p></td><td className="py-2 lg:py-3 px-3 lg:px-4"><p className="text-white text-xs lg:text-sm">{o.customerName}</p><p className="text-gray-400 text-xs">{o.phone}</p></td><td className="py-2 lg:py-3 px-3 lg:px-4 text-right text-white text-xs lg:text-sm font-bold">{formatCurrency(o.totalAmount)}</td><td className="py-2 lg:py-3 px-3 lg:px-4 text-center"><Badge className={`${getStatusBadge(o.status)} text-xs`}>{o.status}</Badge></td><td className="py-2 lg:py-3 px-3 lg:px-4 text-center"><Badge className={`${getStatusBadge(o.paymentStatus)} text-xs`}>{o.paymentStatus}</Badge></td><td className="py-2 lg:py-3 px-3 lg:px-4 text-center"><div className="flex justify-center gap-1 lg:gap-2"><Button size="sm" variant="outline" onClick={() => { setSelectedOrder(o); setShowOrderModal(true); }} className="border-gray-700 text-white h-7 w-7 p-0"><Eye className="w-3 h-3" /></Button>{o.paymentStatus !== 'PAID' && <Select onValueChange={v => handleConfirmPay(o.id, v)}><SelectTrigger className="bg-green-600 border-green-500 text-white h-7 w-20 lg:w-24 text-xs"><SelectValue placeholder="Pay" /></SelectTrigger><SelectContent className="bg-gray-800"><SelectItem value="ORANGE_MONEY">🟠 Orange</SelectItem><SelectItem value="MTN_MONEY">🟡 MTN</SelectItem><SelectItem value="CASH">💵 Cash</SelectItem></SelectContent></Select>}</div></td></tr>))}</tbody></table></div>{totalPages > 1 && <div className="flex items-center justify-between p-3 lg:p-4 border-t border-gray-800"><p className="text-gray-500 text-xs">{((currentPage-1)*ITEMS_PER_PAGE)+1}-{Math.min(currentPage*ITEMS_PER_PAGE, filteredOrders.length)} of {filteredOrders.length}</p><div className="flex gap-1"><Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.max(1, p-1))} disabled={currentPage===1} className="border-gray-700 text-gray-400 h-7 w-7 p-0"><ChevronLeft className="w-3 h-3" /></Button><span className="text-gray-400 text-xs px-2 py-1">{currentPage}/{totalPages}</span><Button size="sm" variant="outline" onClick={() => setCurrentPage(p => Math.min(totalPages, p+1))} disabled={currentPage===totalPages} className="border-gray-700 text-gray-400 h-7 w-7 p-0"><ChevronRight className="w-3 h-3" /></Button></div></div>}{filteredOrders.length === 0 && <p className="text-center text-gray-500 py-8 text-sm">No orders found</p>}</CardContent></Card>
            </div>
          )}
          
          {/* RESERVATIONS */}
          {activeSection === 'reservations' && <Card className="bg-gray-900 border-gray-800"><CardHeader><CardTitle className="text-white text-sm lg:text-base">Reservations ({reservations.length})</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[500px]"><thead><tr className="border-b border-gray-800 text-gray-400 text-xs lg:text-sm"><th className="text-left py-2 lg:py-3 px-3 lg:px-4">Customer</th><th className="text-left py-2 lg:py-3 px-3 lg:px-4">Date & Time</th><th className="text-center py-2 lg:py-3 px-3 lg:px-4">Guests</th><th className="text-center py-2 lg:py-3 px-3 lg:px-4">Status</th><th className="text-center py-2 lg:py-3 px-3 lg:px-4">Actions</th></tr></thead><tbody>{reservations.map(r => (<tr key={r.id} className="border-b border-gray-800/50 hover:bg-gray-800/30"><td className="py-2 lg:py-3 px-3 lg:px-4"><p className="text-white text-sm">{r.name}</p><p className="text-gray-400 text-xs">{r.phone}</p></td><td className="py-2 lg:py-3 px-3 lg:px-4"><p className="text-white text-sm">{formatDate(r.date)}</p><p className="text-gray-400 text-xs">{r.time}</p></td><td className="py-2 lg:py-3 px-3 lg:px-4 text-center"><Badge variant="outline" className="border-blue-500/30 text-blue-400 text-xs">{r.partySize}</Badge></td><td className="py-2 lg:py-3 px-3 lg:px-4 text-center"><Badge className={`${getStatusBadge(r.status)} text-xs`}>{r.status}</Badge></td><td className="py-2 lg:py-3 px-3 lg:px-4 text-center"><Select onValueChange={v => handleUpdateRes(r.id, v)}><SelectTrigger className="bg-gray-700 border-gray-600 text-white h-8 w-24 lg:w-28 text-xs"><SelectValue placeholder="Update" /></SelectTrigger><SelectContent className="bg-gray-800"><SelectItem value="CONFIRMED">Confirm</SelectItem><SelectItem value="CANCELLED">Cancel</SelectItem></SelectContent></Select></td></tr>))}</tbody></table>{reservations.length === 0 && <p className="text-center text-gray-500 py-8 text-sm">No reservations</p>}</div></CardContent></Card>}
          
          {/* EVENTS */}
          {activeSection === 'events' && <Card className="bg-gray-900 border-gray-800"><CardHeader><CardTitle className="text-white text-sm lg:text-base">Events ({events.length})</CardTitle></CardHeader><CardContent><div className="space-y-2 lg:space-y-3">{events.map(e => (<div key={e.id} className="p-3 lg:p-4 bg-gray-800/50 rounded-lg flex flex-col sm:flex-row justify-between gap-2"><div><p className="text-amber-500 text-sm lg:text-base font-medium">{e.eventType}</p><p className="text-white text-sm">{e.name}</p><p className="text-gray-400 text-xs">{e.email} • {e.phone}</p></div><div className="text-left sm:text-right">{e.totalAmount && <p className="text-white font-bold text-sm lg:text-base">{formatCurrency(e.totalAmount)}</p>}<Badge className={`${getStatusBadge(e.status)} text-xs`}>{e.status}</Badge></div></div>))}{events.length === 0 && <p className="text-center text-gray-500 py-8 text-sm">No events</p>}</div></CardContent></Card>}
          
          {/* PAYMENTS */}
          {activeSection === 'payments' && (<div className="space-y-4 lg:space-y-6"><div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">{[{ icon: Clock, label: 'Pending', value: stats.pending, color: 'orange' }, { icon: CheckCircle, label: 'Confirmed', value: orders.filter(o=>o.paymentStatus==='PAID').length, color: 'green' }, { icon: DollarSign, label: 'Revenue', value: formatCurrency(stats.totalRevenue), color: 'amber' }].map((s, i) => (<Card key={i} className="bg-gray-900 border-gray-800"><CardContent className="p-4 lg:p-5"><div className="flex items-center gap-3"><s.icon className={`w-5 h-5 lg:w-6 lg:h-6 text-${s.color}-500`} /><div><p className="text-xl lg:text-2xl font-bold text-white">{s.value}</p><p className="text-gray-500 text-xs lg:text-sm">{s.label}</p></div></div></CardContent></Card>))}</div><Card className="bg-gray-900 border-gray-800"><CardHeader><CardTitle className="text-white text-sm lg:text-base">Pending Payments</CardTitle></CardHeader><CardContent><div className="space-y-2 lg:space-y-3">{orders.filter(o => o.paymentStatus === 'PENDING' || o.paymentStatus === 'PROCESSING').map(o => (<div key={o.id} className="p-3 lg:p-4 bg-gray-800/50 rounded-lg border border-orange-500/20 flex flex-col sm:flex-row justify-between gap-2"><div><p className="text-white text-sm">#{o.id.slice(-6)} - {o.customerName}</p><p className="text-gray-400 text-xs">{o.items?.length || 0} items</p></div><div className="flex items-center gap-2 lg:gap-4"><p className="text-lg lg:text-xl font-bold text-white">{formatCurrency(o.totalAmount)}</p><Select onValueChange={v => handleConfirmPay(o.id, v)}><SelectTrigger className="bg-green-600 border-green-500 text-white h-8 w-28 text-xs"><SelectValue placeholder="Confirm" /></SelectTrigger><SelectContent className="bg-gray-800"><SelectItem value="ORANGE_MONEY">🟠 Orange</SelectItem><SelectItem value="MTN_MONEY">🟡 MTN</SelectItem><SelectItem value="CASH">💵 Cash</SelectItem></SelectContent></Select></div></div>))}{orders.filter(o => o.paymentStatus === 'PENDING' || o.paymentStatus === 'PROCESSING').length === 0 && <p className="text-center text-gray-500 py-6 text-sm">No pending payments</p>}</div></CardContent></Card></div>)}
          
          {/* USERS - Fixed */}
          {activeSection === 'users' && <Card className="bg-gray-900 border-gray-800"><CardHeader><CardTitle className="text-white text-sm lg:text-base">Registered Users ({users.length})</CardTitle></CardHeader><CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full min-w-[400px]"><thead><tr className="border-b border-gray-800 text-gray-400 text-xs lg:text-sm"><th className="text-left py-2 lg:py-3 px-3 lg:px-4">User</th><th className="text-left py-2 lg:py-3 px-3 lg:px-4">Email</th><th className="text-center py-2 lg:py-3 px-3 lg:px-4">Role</th></tr></thead><tbody>{users.map(u => (<tr key={u.id || u.email} className="border-b border-gray-800/50 hover:bg-gray-800/30"><td className="py-2 lg:py-3 px-3 lg:px-4 flex items-center gap-2"><div className="w-7 h-7 lg:w-8 lg:h-8 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 font-bold text-xs">{(u.displayName?.[0] || u.email?.[0] || '?').toUpperCase()}</div><span className="text-white text-sm">{u.displayName || 'No name'}</span></td><td className="py-2 lg:py-3 px-3 lg:px-4 text-gray-400 text-xs lg:text-sm">{u.email}</td><td className="py-2 lg:py-3 px-3 lg:px-4 text-center"><Badge className={`${u.role==='ADMIN' ? 'bg-amber-500' : 'bg-gray-600'} text-xs`}>{u.role || 'CUSTOMER'}</Badge></td></tr>))}</tbody></table>{users.length === 0 && <p className="text-center text-gray-500 py-8 text-sm">No registered users</p>}</div></CardContent></Card>}
          
          {/* REVIEWS */}
          {activeSection === 'reviews' && <Card className="bg-gray-900 border-gray-800"><CardHeader><CardTitle className="text-white text-sm lg:text-base">Reviews ({reviews.length})</CardTitle></CardHeader><CardContent><div className="space-y-2 lg:space-y-3">{reviews.map(r => (<div key={r.id} className="p-3 lg:p-4 bg-gray-800/50 rounded-lg flex flex-col sm:flex-row justify-between gap-2"><div><div className="flex items-center gap-2"><p className="text-white text-sm font-medium">{r.name}</p><div className="flex">{[...Array(5)].map((_, i) => <span key={i} className={`text-xs ${i<r.rating ? 'text-amber-500' : 'text-gray-600'}`}>★</span>)}</div></div><p className="text-gray-300 text-xs lg:text-sm mt-1">{r.text}</p></div><Badge className={`${r.approved ? 'bg-green-500' : 'bg-yellow-500'} text-xs w-fit`}>{r.approved ? 'Approved' : 'Pending'}</Badge></div>))}{reviews.length === 0 && <p className="text-center text-gray-500 py-8 text-sm">No reviews</p>}</div></CardContent></Card>}
          
          {/* MENU MANAGEMENT */}
          {activeSection === 'menu' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-white font-medium">All Menu Items ({menuItems.length})</h3>
                <Button onClick={() => { setEditingItem(null); setShowMenuModal(true); }} size="sm" className="bg-amber-500 hover:bg-amber-600"><Plus className="w-4 h-4 mr-2" />Add Item</Button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {menuItems.map(item => (
                  <Card key={item.id} className="bg-gray-900 border-gray-800 overflow-hidden">
                    <div className="h-32 bg-gray-800 relative">
                      <img src={item.image || `/food-${item.category}.png`} alt={item.name} className="w-full h-full object-cover" />
                      {item.isPopular && <Badge className="absolute top-2 left-2 bg-amber-500 text-xs"><Star className="w-3 h-3 mr-1" />Featured</Badge>}
                      {!item.isAvailable && <div className="absolute inset-0 bg-black/50 flex items-center justify-center"><span className="text-white text-sm">Unavailable</span></div>}
                    </div>
                    <CardContent className="p-3">
                      <p className="text-white font-medium text-sm truncate">{item.name}</p>
                      <p className="text-gray-400 text-xs truncate">{item.description}</p>
                      <p className="text-amber-500 font-bold text-sm mt-1">{formatCurrency(item.price)}</p>
                      <div className="flex gap-1 mt-2">
                        <Button size="sm" variant="outline" onClick={() => { setEditingItem(item); setShowMenuModal(true); }} className="flex-1 border-gray-700 text-white h-7 text-xs"><Edit className="w-3 h-3 mr-1" />Edit</Button>
                        <Button size="sm" variant="outline" onClick={() => handleToggleFeatured(item)} className={`flex-1 h-7 text-xs ${item.isPopular ? 'border-amber-500 text-amber-400' : 'border-gray-700 text-white'}`}><Star className="w-3 h-3 mr-1" />{item.isPopular ? 'Unfeature' : 'Feature'}</Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {menuItems.length === 0 && <p className="text-center text-gray-500 py-8">No menu items</p>}
            </div>
          )}
          
          {/* CHEF'S RECOMMENDATIONS */}
          {activeSection === 'recommendations' && (
            <div className="space-y-4">
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader><CardTitle className="text-white text-sm lg:text-base flex items-center gap-2"><ChefHat className="w-5 h-5 text-amber-500" />Chef's Recommendations</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm mb-4">Manage featured items that appear in the Chef's Recommendations section on the homepage.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {menuItems.filter(m => m.isPopular).map(item => (
                      <Card key={item.id} className="bg-gray-800 border-amber-500/30">
                        <div className="h-28 bg-gray-700 relative">
                          <img src={item.image || `/food-${item.category}.png`} alt={item.name} className="w-full h-full object-cover" />
                          <Badge className="absolute top-2 left-2 bg-amber-500 text-xs"><Star className="w-3 h-3 mr-1" />Featured</Badge>
                        </div>
                        <CardContent className="p-3">
                          <p className="text-white font-medium text-sm">{item.name}</p>
                          <p className="text-amber-500 font-bold text-sm">{formatCurrency(item.price)}</p>
                          <div className="flex gap-1 mt-2">
                            <Button size="sm" variant="outline" onClick={() => { setEditingItem(item); setShowMenuModal(true); }} className="flex-1 border-gray-700 text-white h-7 text-xs"><Edit className="w-3 h-3 mr-1" />Edit</Button>
                            <Button size="sm" variant="outline" onClick={() => handleToggleFeatured(item)} className="flex-1 border-red-500/50 text-red-400 h-7 text-xs"><X className="w-3 h-3 mr-1" />Remove</Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                  {menuItems.filter(m => m.isPopular).length === 0 && <p className="text-center text-gray-500 py-6 text-sm">No featured items. Go to Menu and click the star icon to feature items.</p>}
                </CardContent>
              </Card>
              <Card className="bg-gray-900 border-gray-800">
                <CardHeader><CardTitle className="text-white text-sm">Add to Recommendations</CardTitle></CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-xs mb-3">Click the star to add items to Chef's Recommendations</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
                    {menuItems.filter(m => !m.isPopular).map(item => (
                      <div key={item.id} className="p-2 bg-gray-800/50 rounded-lg flex items-center gap-2">
                        <img src={item.image || `/food-${item.category}.png`} alt={item.name} className="w-10 h-10 rounded object-cover" />
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs truncate">{item.name}</p>
                          <p className="text-amber-500 text-xs">{formatCurrency(item.price)}</p>
                        </div>
                        <Button size="sm" onClick={() => handleToggleFeatured(item)} className="h-6 w-6 p-0 bg-gray-700 hover:bg-amber-500"><Star className="w-3 h-3" /></Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          {/* GALLERY */}
          {activeSection === 'gallery' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-white font-medium">Gallery Images</h3>
                <Button onClick={() => { setEditingGallery(null); setShowGalleryModal(true); }} size="sm" className="bg-amber-500 hover:bg-amber-600"><Plus className="w-4 h-4 mr-2" />Add Image</Button>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {galleryImages.map(img => (
                  <Card key={img.id} className="bg-gray-900 border-gray-800 overflow-hidden group">
                    <div className="aspect-square bg-gray-800 relative">
                      <img src={img.url} alt={img.caption} className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => { setEditingGallery(img); setShowGalleryModal(true); }} className="border-white text-white h-8"><Edit className="w-4 h-4" /></Button>
                        <Button size="sm" variant="outline" className="border-red-500 text-red-400 h-8"><Trash2 className="w-4 h-4" /></Button>
                      </div>
                    </div>
                    <CardContent className="p-2">
                      <p className="text-white text-xs truncate">{img.caption}</p>
                      <Badge variant="outline" className="border-gray-700 text-gray-400 text-xs mt-1">{img.category}</Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
          
          {/* ANALYTICS */}
          {activeSection === 'analytics' && (<div className="space-y-4 lg:space-y-6"><div className="grid grid-cols-2 md:grid-cols-4 gap-3 lg:gap-4">{[{ label: 'Total Revenue', value: formatCurrency(stats.totalRevenue) }, { label: 'Today', value: formatCurrency(stats.revenueToday) }, { label: 'Orders', value: stats.totalOrders }, { label: 'Avg Order', value: formatCurrency(stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0) }].map((s, i) => (<Card key={i} className="bg-gray-900 border-gray-800"><CardContent className="p-4 lg:p-5"><p className="text-gray-500 text-xs">{s.label}</p><p className="text-lg lg:text-2xl font-bold text-white">{s.value}</p></CardContent></Card>))}</div><Card className="bg-gray-900 border-gray-800"><CardHeader><CardTitle className="text-white text-sm lg:text-base">Order Status</CardTitle></CardHeader><CardContent><div className="grid grid-cols-5 gap-2 lg:gap-4">{['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'COMPLETED'].map(s => { const count = orders.filter(o => o.status === s).length; const pct = orders.length > 0 ? ((count / orders.length) * 100).toFixed(0) : 0; return <div key={s} className="p-2 lg:p-4 bg-gray-800/50 rounded-lg text-center"><p className="text-lg lg:text-2xl font-bold text-white">{count}</p><p className="text-gray-400 text-xs">{s}</p><p className="text-gray-600 text-xs">{pct}%</p></div>; })}</div></CardContent></Card></div>)}
        </div>
      </div>
      
      {/* ORDER MODAL */}
      <Dialog open={showOrderModal} onOpenChange={setShowOrderModal}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg mx-4"><DialogHeader><DialogTitle className="text-amber-500 text-sm lg:text-base">Order #{selectedOrder?.id?.slice(-6)}</DialogTitle></DialogHeader>{selectedOrder && <div className="space-y-3"><div className="grid grid-cols-2 gap-3 text-xs lg:text-sm"><div><p className="text-gray-500">Customer</p><p className="text-white">{selectedOrder.customerName}</p></div><div><p className="text-gray-500">Phone</p><p className="text-white">{selectedOrder.phone}</p></div></div><div className="border-t border-gray-800 pt-3"><p className="text-gray-500 text-xs mb-2">Items</p>{selectedOrder.items?.map((item, i) => <div key={i} className="flex justify-between text-white text-xs lg:text-sm py-1"><span>{item.name} x{item.quantity}</span><span>{formatCurrency(item.price * item.quantity)}</span></div>)}</div><div className="border-t border-gray-800 pt-3 flex justify-between text-base lg:text-lg font-bold"><span className="text-white">Total</span><span className="text-amber-500">{formatCurrency(selectedOrder.totalAmount)}</span></div>{selectedOrder.paymentStatus !== 'PAID' && <Select onValueChange={v => { handleConfirmPay(selectedOrder.id, v); setShowOrderModal(false); }}><SelectTrigger className="bg-green-600 border-green-500 text-white text-sm"><SelectValue placeholder="Confirm Payment" /></SelectTrigger><SelectContent className="bg-gray-800"><SelectItem value="ORANGE_MONEY">🟠 Orange Money</SelectItem><SelectItem value="MTN_MONEY">🟡 MTN Money</SelectItem><SelectItem value="CASH">💵 Cash</SelectItem></SelectContent></Select>}</div>}</DialogContent>
      </Dialog>
      
      {/* MENU MODAL */}
      <Dialog open={showMenuModal} onOpenChange={setShowMenuModal}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-amber-500 text-sm lg:text-base">{editingItem ? 'Edit Menu Item' : 'Add Menu Item'}</DialogTitle></DialogHeader>
          <MenuForm item={editingItem} onSave={handleSaveMenuItem} onCancel={() => setShowMenuModal(false)} saving={saving} />
        </DialogContent>
      </Dialog>
      
      {/* GALLERY MODAL */}
      <Dialog open={showGalleryModal} onOpenChange={setShowGalleryModal}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-md mx-4">
          <DialogHeader><DialogTitle className="text-amber-500 text-sm lg:text-base">{editingGallery ? 'Edit Image' : 'Add Image'}</DialogTitle></DialogHeader>
          <div className="text-center py-8 text-gray-400 text-sm">
            <p>Gallery image upload coming soon!</p>
            <p className="mt-2 text-xs">For now, images are managed through the main gallery configuration.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Menu Form Component
function MenuForm({ item, onSave, onCancel, saving }: { item: MenuItem | null; onSave: (data: Partial<MenuItem>) => void; onCancel: () => void; saving: boolean }) {
  const [formData, setFormData] = useState<Partial<MenuItem>>({
    name: item?.name || '',
    description: item?.description || '',
    price: item?.price || 0,
    category: item?.category || 'main',
    image: item?.image || '',
    isAvailable: item?.isAvailable ?? true,
    isPopular: item?.isPopular ?? false,
  });
  
  const categories = [
    { value: 'appetizer', label: 'Appetizers' },
    { value: 'main', label: 'Main Courses' },
    { value: 'grilled', label: 'Grilled' },
    { value: 'seafood', label: 'Seafood' },
    { value: 'dessert', label: 'Desserts' },
    { value: 'beverage', label: 'Beverages' },
    { value: 'cocktail', label: 'Cocktails' },
  ];
  
  return (
    <div className="space-y-3">
      <div>
        <label className="text-gray-400 text-xs">Name *</label>
        <Input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="bg-gray-800 border-gray-700 text-white h-9" />
      </div>
      <div>
        <label className="text-gray-400 text-xs">Description</label>
        <Textarea value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} className="bg-gray-800 border-gray-700 text-white min-h-[60px]" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-gray-400 text-xs">Price (XAF) *</label>
          <Input type="number" value={formData.price} onChange={e => setFormData({ ...formData, price: Number(e.target.value) })} className="bg-gray-800 border-gray-700 text-white h-9" />
        </div>
        <div>
          <label className="text-gray-400 text-xs">Category</label>
          <Select value={formData.category} onValueChange={v => setFormData({ ...formData, category: v })}>
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white h-9"><SelectValue /></SelectTrigger>
            <SelectContent className="bg-gray-800">{categories.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <label className="text-gray-400 text-xs">Image URL</label>
        <Input value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} placeholder="https://..." className="bg-gray-800 border-gray-700 text-white h-9" />
      </div>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer">
          <input type="checkbox" checked={formData.isAvailable} onChange={e => setFormData({ ...formData, isAvailable: e.target.checked })} className="accent-amber-500" />
          Available
        </label>
        <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer">
          <input type="checkbox" checked={formData.isPopular} onChange={e => setFormData({ ...formData, isPopular: e.target.checked })} className="accent-amber-500" />
          Chef's Pick
        </label>
      </div>
      <div className="flex gap-2 pt-2">
        <Button onClick={onCancel} variant="outline" className="flex-1 border-gray-700 text-white">Cancel</Button>
        <Button onClick={() => onSave({ ...formData, id: item?.id })} disabled={saving || !formData.name || !formData.price} className="flex-1 bg-amber-500 hover:bg-amber-600">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
          {saving ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
