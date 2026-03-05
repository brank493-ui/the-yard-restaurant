'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';
import { X, ArrowLeft, Plus, Pencil, Eye, EyeOff, Trash2, FileText, CreditCard, CheckCircle, Clock, Package, Calendar, Users, AlertCircle, DollarSign, Loader2 } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  categorySlug: string;
  image: string;
  isAvailable: boolean;
  isPopular: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

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
  createdAt: string;
}

interface Reservation {
  id: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  partySize: number;
  status: string;
}

interface NewsItem {
  id: string;
  title: string;
  description: string;
  image: string;
  createdAt: string;
  active: boolean;
}

interface User {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  name: string;
  phone: string;
  role: string;
  photoURL?: string | null;
  createdAt?: string;
  lastSignInTime?: string;
  emailVerified?: boolean;
}

interface AdminDashboardProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onClose?: () => void;
}

const categories = [
  { value: 'appetizer', label: 'Appetizers', icon: '🥗' },
  { value: 'main', label: 'Main Courses', icon: '🍽️' },
  { value: 'grilled', label: 'Grilled Specialties', icon: '🔥' },
  { value: 'seafood', label: 'Seafood', icon: '🦐' },
  { value: 'vegetarian', label: 'Vegetarian', icon: '🥬' },
  { value: 'dessert', label: 'Desserts', icon: '🍰' },
  { value: 'beverage', label: 'Beverages', icon: '🥤' },
  { value: 'cocktail', label: 'Cocktails', icon: '🍸' },
];

const paymentMethods = [
  { value: 'ORANGE_MONEY', label: 'Orange Money', icon: '🟠' },
  { value: 'MTN_MONEY', label: 'MTN Money', icon: '🟡' },
  { value: 'VISA', label: 'Visa', icon: '💳' },
  { value: 'MASTERCARD', label: 'Mastercard', icon: '💳' },
  { value: 'STRIPE', label: 'Stripe', icon: '💜' },
  { value: 'CASH', label: 'Cash', icon: '💵' },
];

const emptyMenuItem: Partial<MenuItem> = {
  name: '',
  description: '',
  price: 0,
  category: 'main',
  categorySlug: 'main',
  image: '',
  isAvailable: true,
  isPopular: false,
};

const emptyNewsItem: Partial<NewsItem> = {
  title: '',
  description: '',
  image: '',
  active: true,
};

export function AdminDashboard({ open, onOpenChange, onClose }: AdminDashboardProps) {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState({ 
    totalOrders: 0, 
    totalRevenue: 0, 
    pendingOrders: 0, 
    totalReservations: 0,
    pendingPayments: 0,
    totalUsers: 0
  });

  // Menu editing state
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState<Partial<MenuItem>>(emptyMenuItem);
  const [saving, setSaving] = useState(false);

  // News editing state
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [isAddingNews, setIsAddingNews] = useState(false);
  const [newsFormData, setNewsFormData] = useState<Partial<NewsItem>>(emptyNewsItem);
  const [savingNews, setSavingNews] = useState(false);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else if (onOpenChange) {
      onOpenChange(false);
    }
  };

  const fetchAdminData = useCallback(async () => {
    setLoading(true);
    try {
      const token = await user?.getIdToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Fetch orders
      const ordersRes = await fetch('/api/orders', { headers });
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData);
        const totalRevenue = ordersData.reduce((sum: number, o: Order) => sum + (o.totalAmount || 0), 0);
        const pendingOrders = ordersData.filter((o: Order) => o.status === 'PENDING').length;
        const pendingPayments = ordersData.filter((o: Order) => o.paymentStatus === 'PROCESSING').length;
        setStats(prev => ({ ...prev, totalOrders: ordersData.length, totalRevenue, pendingOrders, pendingPayments }));
      }

      // Fetch reservations
      const resRes = await fetch('/api/reservations', { headers });
      if (resRes.ok) {
        const resData = await resRes.json();
        setReservations(resData);
        setStats(prev => ({ ...prev, totalReservations: resData.length }));
      }

      // Fetch menu items
      const menuRes = await fetch('/api/menu?all=true');
      if (menuRes.ok) {
        const menuData = await menuRes.json();
        setMenuItems(menuData);
      }

      // Fetch news
      const newsRes = await fetch('/api/news');
      if (newsRes.ok) {
        const newsData = await newsRes.json();
        setNewsItems(newsData);
      }

      // Fetch users
      const usersRes = await fetch('/api/users', { headers });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
        setStats(prev => ({ ...prev, totalUsers: usersData.length }));
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (open && user) {
      fetchAdminData();
    }
  }, [open, user, fetchAdminData]);

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success('Order status updated');
        fetchAdminData();
      }
    } catch {
      toast.error('Failed to update order status');
    }
  };

  const updatePaymentStatus = async (orderId: string, paymentStatus: string, paymentMethod?: string) => {
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus, paymentMethod }),
      });
      if (res.ok) {
        toast.success('Payment confirmed!');
        fetchAdminData();
      }
    } catch {
      toast.error('Failed to update payment');
    }
  };

  const updateReservationStatus = async (resId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/reservations/${resId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success('Reservation status updated');
        fetchAdminData();
      }
    } catch {
      toast.error('Failed to update reservation status');
    }
  };

  // Update user role
  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      if (res.ok) {
        toast.success('User role updated');
        fetchAdminData();
      }
    } catch {
      toast.error('Failed to update user role');
    }
  };

  // Menu CRUD operations
  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setIsAddingNew(false);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price,
      category: item.category,
      categorySlug: item.categorySlug || item.category,
      image: item.image || '',
      isAvailable: item.isAvailable,
      isPopular: item.isPopular,
    });
  };

  const handleAddNew = () => {
    setIsAddingNew(true);
    setEditingItem(null);
    setFormData(emptyMenuItem);
  };

  const handleSaveItem = async () => {
    if (!formData.name || !formData.price) {
      toast.error('Name and price are required');
      return;
    }

    setSaving(true);
    try {
      const url = isAddingNew ? '/api/menu' : `/api/menu/${editingItem?.id}`;
      const method = isAddingNew ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          categorySlug: formData.category,
          price: Number(formData.price),
        }),
      });

      if (res.ok) {
        toast.success(isAddingNew ? 'Menu item added!' : 'Menu item updated!');
        setEditingItem(null);
        setIsAddingNew(false);
        setFormData(emptyMenuItem);
        fetchAdminData();
      } else {
        toast.error('Failed to save menu item');
      }
    } catch {
      toast.error('Failed to save menu item');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      const res = await fetch(`/api/menu/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Menu item deleted');
        fetchAdminData();
      }
    } catch {
      toast.error('Failed to delete menu item');
    }
  };

  const toggleAvailability = async (item: MenuItem) => {
    try {
      const res = await fetch(`/api/menu/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isAvailable: !item.isAvailable }),
      });
      if (res.ok) {
        toast.success(item.isAvailable ? 'Item hidden' : 'Item visible');
        fetchAdminData();
      }
    } catch {
      toast.error('Failed to update item');
    }
  };

  // News CRUD operations
  const handleAddNews = () => {
    setIsAddingNews(true);
    setEditingNews(null);
    setNewsFormData(emptyNewsItem);
  };

  const handleEditNews = (item: NewsItem) => {
    setEditingNews(item);
    setIsAddingNews(false);
    setNewsFormData({
      title: item.title,
      description: item.description,
      image: item.image,
      active: item.active,
    });
  };

  const handleSaveNews = async () => {
    if (!newsFormData.title || !newsFormData.description) {
      toast.error('Title and description are required');
      return;
    }

    setSavingNews(true);
    try {
      const res = await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newsFormData),
      });

      if (res.ok) {
        toast.success('News item saved!');
        setIsAddingNews(false);
        setEditingNews(null);
        setNewsFormData(emptyNewsItem);
        fetchAdminData();
      } else {
        toast.error('Failed to save news item');
      }
    } catch {
      toast.error('Failed to save news item');
    } finally {
      setSavingNews(false);
    }
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm('Are you sure you want to delete this news item?')) return;

    try {
      const res = await fetch(`/api/news?id=${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('News item deleted');
        fetchAdminData();
      }
    } catch {
      toast.error('Failed to delete news item');
    }
  };

  // Generate invoice
  const generateInvoice = async (order: Order) => {
    try {
      const res = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.id,
          orderData: {
            ...order,
            email: order.customerName + '@guest.com',
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        toast.success(`Invoice ${data.invoice.invoiceNumber} generated!`);
        
        const invoiceText = `
========================================
           THE YARD RESTAURANT
           INVOICE
========================================

Invoice #: ${data.invoice.invoiceNumber}
Date: ${new Date(data.invoice.createdAt).toLocaleDateString()}
Due Date: ${new Date(data.invoice.dueDate).toLocaleDateString()}

CUSTOMER: ${order.customerName}
Phone: ${order.phone}
Type: ${order.type}

----------------------------------------
ITEMS:
----------------------------------------
${order.items.map(item => `${item.name} x${item.quantity} - ${(item.price * item.quantity).toLocaleString()} XAF`).join('\n')}

----------------------------------------
TOTAL: ${order.totalAmount.toLocaleString()} XAF
----------------------------------------

Payment Method: ${order.paymentMethod || 'CASH'}
Payment Status: ${order.paymentStatus || 'PENDING'}
${order.transactionReference ? `Transaction Ref: ${order.transactionReference}` : ''}

Thank you for dining with us!
The Yard Restaurant
737 Rue Batibois, Douala
+237 671 490 733
========================================
        `;
        
        const blob = new Blob([invoiceText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `invoice-${data.invoice.invoiceNumber}.txt`;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        toast.error('Failed to generate invoice');
      }
    } catch {
      toast.error('Failed to generate invoice');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PENDING': return 'bg-yellow-500';
      case 'CONFIRMED':
      case 'PREPARING': return 'bg-blue-500';
      case 'READY': return 'bg-green-500';
      case 'DELIVERED':
      case 'COMPLETED': return 'bg-stone-500';
      case 'CANCELLED': return 'bg-red-500';
      default: return 'bg-stone-500';
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PAID': return 'text-green-400';
      case 'PROCESSING': return 'text-blue-400';
      case 'PENDING': return 'text-yellow-400';
      case 'FAILED': return 'text-red-400';
      default: return 'text-stone-400';
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    const pm = paymentMethods.find(p => p.value === method);
    return pm ? `${pm.icon} ${pm.label}` : '💵 Cash';
  };

  const getCategoryIcon = (category: string) => {
    return categories.find(c => c.value === category)?.icon || '🍽️';
  };

  // Don't render if not open
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[100] bg-stone-900 flex flex-col">
      {/* Header */}
      <header className="bg-stone-800 border-b border-amber-500/30 px-6 py-4 flex justify-between items-center shrink-0">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="text-stone-400 hover:text-white hover:bg-stone-700"
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Back to Site
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-amber-400 font-serif">Admin Dashboard</h1>
            <p className="text-stone-400 text-sm">Manage orders, payments, menu & news</p>
          </div>
        </div>
        <Button variant="ghost" onClick={handleClose} className="text-stone-400 hover:text-white">
          <X className="h-6 w-6" />
        </Button>
      </header>

      {/* Main Content */}
      <div className="flex-1 overflow-hidden p-6">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin w-12 h-12 border-4 border-amber-400 border-t-transparent rounded-full mx-auto" />
              <p className="mt-4 text-stone-400">Loading dashboard...</p>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col min-h-0">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6 shrink-0">
              <Card className="bg-stone-800 border-stone-700">
                <CardContent className="p-4 text-center">
                  <Package className="h-6 w-6 mx-auto text-amber-400 mb-1" />
                  <p className="text-2xl font-bold text-white">{stats.totalOrders}</p>
                  <p className="text-stone-400 text-xs">Orders</p>
                </CardContent>
              </Card>
              <Card className="bg-stone-800 border-stone-700">
                <CardContent className="p-4 text-center">
                  <DollarSign className="h-6 w-6 mx-auto text-green-400 mb-1" />
                  <p className="text-2xl font-bold text-white">{stats.totalRevenue.toLocaleString()}</p>
                  <p className="text-stone-400 text-xs">Revenue (XAF)</p>
                </CardContent>
              </Card>
              <Card className="bg-stone-800 border-stone-700">
                <CardContent className="p-4 text-center">
                  <Clock className="h-6 w-6 mx-auto text-yellow-400 mb-1" />
                  <p className="text-2xl font-bold text-white">{stats.pendingOrders}</p>
                  <p className="text-stone-400 text-xs">Pending</p>
                </CardContent>
              </Card>
              <Card className="bg-stone-800 border-stone-700">
                <CardContent className="p-4 text-center">
                  <CreditCard className="h-6 w-6 mx-auto text-orange-400 mb-1" />
                  <p className="text-2xl font-bold text-white">{stats.pendingPayments}</p>
                  <p className="text-stone-400 text-xs">Payments</p>
                </CardContent>
              </Card>
              <Card className="bg-stone-800 border-stone-700">
                <CardContent className="p-4 text-center">
                  <Calendar className="h-6 w-6 mx-auto text-blue-400 mb-1" />
                  <p className="text-2xl font-bold text-white">{stats.totalReservations}</p>
                  <p className="text-stone-400 text-xs">Reservations</p>
                </CardContent>
              </Card>
              <Card className="bg-stone-800 border-stone-700">
                <CardContent className="p-4 text-center">
                  <Users className="h-6 w-6 mx-auto text-purple-400 mb-1" />
                  <p className="text-2xl font-bold text-white">{stats.totalUsers}</p>
                  <p className="text-stone-400 text-xs">Users</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="orders" className="flex-1 flex flex-col overflow-hidden min-h-0">
              <TabsList className="bg-stone-800 w-full flex-wrap h-auto gap-1 p-1 shrink-0">
                <TabsTrigger value="orders" className="data-[state=active]:bg-amber-600 px-3 py-2 text-sm">
                  📦 Orders ({orders.length})
                </TabsTrigger>
                <TabsTrigger value="payments" className="data-[state=active]:bg-amber-600 px-3 py-2 text-sm">
                  💳 Payments ({stats.pendingPayments})
                </TabsTrigger>
                <TabsTrigger value="reservations" className="data-[state=active]:bg-amber-600 px-3 py-2 text-sm">
                  📅 Reservations ({reservations.length})
                </TabsTrigger>
                <TabsTrigger value="menu" className="data-[state=active]:bg-amber-600 px-3 py-2 text-sm">
                  🍽️ Menu ({menuItems.length})
                </TabsTrigger>
                <TabsTrigger value="news" className="data-[state=active]:bg-amber-600 px-3 py-2 text-sm">
                  📰 News ({newsItems.length})
                </TabsTrigger>
                <TabsTrigger value="users" className="data-[state=active]:bg-amber-600 px-3 py-2 text-sm">
                  👥 Users ({users.length})
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4">
                {/* Orders Tab */}
                <TabsContent value="orders" className="mt-0">
                  <div className="space-y-3 pr-4">
                    {orders.length === 0 ? (
                      <p className="text-center text-stone-400 py-12">No orders yet</p>
                    ) : (
                      orders.map((order) => (
                        <Card key={order.id} className="bg-stone-800 border-stone-700">
                          <CardContent className="p-4">
                            <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono text-amber-400">#{order.id.slice(-6).toUpperCase()}</span>
                                  <Badge className={`${getStatusColor(order.status)} text-white text-xs`}>{order.status}</Badge>
                                  <span className={`text-xs ${getPaymentStatusColor(order.paymentStatus || 'PENDING')}`}>
                                    💳 {order.paymentStatus || 'PENDING'}
                                  </span>
                                  {order.paymentMethod && (
                                    <Badge variant="outline" className="border-stone-600 text-stone-300 text-xs">
                                      {getPaymentMethodLabel(order.paymentMethod)}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-white font-medium mt-1">{order.customerName}</p>
                                <p className="text-stone-400 text-xs">{order.phone} • {order.type}</p>
                                {order.transactionReference && (
                                  <p className="text-orange-400 text-xs mt-1 font-mono">Ref: {order.transactionReference}</p>
                                )}
                                <div className="mt-2 text-sm text-stone-300">
                                  {order.items?.slice(0, 3).map((item, i) => (
                                    <span key={i}>{item.name} x{item.quantity}{i < Math.min(order.items.length - 1, 2) ? ', ' : ''}</span>
                                  ))}
                                  {order.items?.length > 3 && <span className="text-stone-500">...</span>}
                                </div>
                              </div>
                              <div className="text-right flex flex-col gap-2 min-w-[200px]">
                                <p className="font-bold text-white text-lg">{order.totalAmount?.toLocaleString()} XAF</p>
                                <p className="text-xs text-stone-400">{new Date(order.createdAt).toLocaleDateString()}</p>
                                <div className="flex gap-2 flex-wrap justify-end">
                                  <Select onValueChange={(value) => updateOrderStatus(order.id, value)}>
                                    <SelectTrigger className="w-28 bg-stone-700 border-stone-600 text-white text-xs h-8">
                                      <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-stone-700">
                                      <SelectItem value="CONFIRMED">Confirm</SelectItem>
                                      <SelectItem value="PREPARING">Preparing</SelectItem>
                                      <SelectItem value="READY">Ready</SelectItem>
                                      <SelectItem value="DELIVERED">Delivered</SelectItem>
                                      <SelectItem value="CANCELLED">Cancel</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  {order.paymentStatus !== 'PAID' && (
                                    <Select onValueChange={(value) => updatePaymentStatus(order.id, 'PAID', value)}>
                                      <SelectTrigger className="w-32 bg-green-600 border-green-500 text-white text-xs h-8">
                                        <SelectValue placeholder="Mark Paid" />
                                      </SelectTrigger>
                                      <SelectContent className="bg-stone-700">
                                        {paymentMethods.map(pm => (
                                          <SelectItem key={pm.value} value={pm.value}>
                                            {pm.icon} {pm.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => generateInvoice(order)}
                                    className="border-stone-600 text-amber-400 hover:bg-stone-700 h-8"
                                  >
                                    <FileText className="h-3 w-3 mr-1" />
                                    Invoice
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* Payments Tab */}
                <TabsContent value="payments" className="mt-0">
                  <div className="pr-4">
                    {/* Payment Account Info */}
                    <Card className="bg-stone-800 border-amber-500/30 mb-4">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-amber-400 text-sm flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Payment Account Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
                            <p className="text-orange-400 font-medium text-sm">🟠 Orange Money</p>
                            <p className="text-white text-lg font-bold">+237 671 490 733</p>
                            <p className="text-stone-400 text-xs">Account: The Yard Restaurant</p>
                          </div>
                          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
                            <p className="text-yellow-400 font-medium text-sm">🟡 MTN Mobile Money</p>
                            <p className="text-white text-lg font-bold">+237 671 490 733</p>
                            <p className="text-stone-400 text-xs">Account: The Yard Restaurant</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Pending Payments */}
                    <h3 className="text-lg font-bold text-amber-400 mb-3">Pending Payments Awaiting Confirmation</h3>
                    <div className="space-y-3">
                      {orders.filter(o => o.paymentStatus === 'PROCESSING').length === 0 ? (
                        <p className="text-center text-stone-400 py-12">No pending payments</p>
                      ) : (
                        orders.filter(o => o.paymentStatus === 'PROCESSING').map((order) => (
                          <Card key={order.id} className="bg-stone-800 border-orange-500/50">
                            <CardContent className="p-4">
                              <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="font-mono text-amber-400">#{order.id.slice(-6).toUpperCase()}</span>
                                    <Badge className="bg-blue-500 text-white text-xs">
                                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                      Processing
                                    </Badge>
                                    <Badge variant="outline" className="border-stone-600 text-stone-300 text-xs">
                                      {getPaymentMethodLabel(order.paymentMethod || 'CASH')}
                                    </Badge>
                                  </div>
                                  <p className="text-white font-medium mt-1">{order.customerName}</p>
                                  <p className="text-stone-400 text-xs">{order.phone}</p>
                                  {order.transactionReference && (
                                    <p className="text-orange-400 text-sm mt-1 font-mono">
                                      Ref: {order.transactionReference}
                                    </p>
                                  )}
                                  <div className="mt-2 text-sm text-stone-300">
                                    {order.items?.slice(0, 3).map((item, i) => (
                                      <span key={i}>{item.name} x{item.quantity}{i < Math.min(order.items.length - 1, 2) ? ', ' : ''}</span>
                                    ))}
                                  </div>
                                </div>
                                <div className="text-right flex flex-col gap-2">
                                  <p className="font-bold text-white text-lg">{order.totalAmount?.toLocaleString()} XAF</p>
                                  <div className="flex gap-2">
                                    <Button
                                      size="sm"
                                      onClick={() => updatePaymentStatus(order.id, 'PAID', order.paymentMethod)}
                                      className="bg-green-600 hover:bg-green-500 text-white h-8"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Confirm Payment
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => updatePaymentStatus(order.id, 'FAILED')}
                                      className="border-red-500 text-red-400 hover:bg-red-500/20 h-8"
                                    >
                                      <XIcon className="h-4 w-4 mr-1" />
                                      Reject
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </div>
                  </div>
                </TabsContent>

                {/* Reservations Tab */}
                <TabsContent value="reservations" className="mt-0">
                  <div className="space-y-3 pr-4">
                    {reservations.length === 0 ? (
                      <p className="text-center text-stone-400 py-12">No reservations yet</p>
                    ) : (
                      reservations.map((res) => (
                        <Card key={res.id} className="bg-stone-800 border-stone-700">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-white font-medium">{res.name}</span>
                                  <Badge className={`${getStatusColor(res.status)} text-white text-xs`}>{res.status}</Badge>
                                </div>
                                <p className="text-amber-400 text-sm">{new Date(res.date).toLocaleDateString()} at {res.time}</p>
                                <p className="text-stone-400 text-xs">{res.partySize} guests • {res.phone}</p>
                              </div>
                              <Select onValueChange={(value) => updateReservationStatus(res.id, value)}>
                                <SelectTrigger className="w-28 bg-stone-700 border-stone-600 text-white text-xs h-8">
                                  <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent className="bg-stone-700">
                                  <SelectItem value="CONFIRMED">Confirm</SelectItem>
                                  <SelectItem value="COMPLETED">Completed</SelectItem>
                                  <SelectItem value="CANCELLED">Cancel</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* Menu Tab */}
                <TabsContent value="menu" className="mt-0">
                  <div className="pr-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-amber-400">Menu Items</h3>
                      <Button onClick={handleAddNew} className="bg-amber-600 hover:bg-amber-500">
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Item
                      </Button>
                    </div>

                    {/* Add/Edit Form */}
                    {(isAddingNew || editingItem) && (
                      <Card className="bg-stone-800 border-amber-500/50 mb-4">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-amber-400 text-base">
                            {isAddingNew ? 'Add New Item' : `Edit: ${editingItem?.name}`}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-stone-300 text-xs">Name *</Label>
                              <Input
                                value={formData.name || ''}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="bg-stone-700 border-stone-600 text-white"
                              />
                            </div>
                            <div>
                              <Label className="text-stone-300 text-xs">Price (XAF) *</Label>
                              <Input
                                type="number"
                                value={formData.price || ''}
                                onChange={e => setFormData({ ...formData, price: Number(e.target.value) })}
                                className="bg-stone-700 border-stone-600 text-white"
                              />
                            </div>
                          </div>
                          <div>
                            <Label className="text-stone-300 text-xs">Description</Label>
                            <Textarea
                              value={formData.description || ''}
                              onChange={e => setFormData({ ...formData, description: e.target.value })}
                              className="bg-stone-700 border-stone-600 text-white"
                              rows={2}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-stone-300 text-xs">Category</Label>
                              <Select
                                value={formData.category || 'main'}
                                onValueChange={v => setFormData({ ...formData, category: v, categorySlug: v })}
                              >
                                <SelectTrigger className="bg-stone-700 border-stone-600 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-stone-700">
                                  {categories.map(cat => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                      {cat.icon} {cat.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label className="text-stone-300 text-xs">Image URL</Label>
                              <Input
                                value={formData.image || ''}
                                onChange={e => setFormData({ ...formData, image: e.target.value })}
                                placeholder="/item-name.png"
                                className="bg-stone-700 border-stone-600 text-white"
                              />
                            </div>
                          </div>
                          <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={formData.isAvailable ?? true}
                                onCheckedChange={v => setFormData({ ...formData, isAvailable: v })}
                              />
                              <Label className="text-stone-300 text-xs">Available</Label>
                            </div>
                            <div className="flex items-center gap-2">
                              <Switch
                                checked={formData.isPopular ?? false}
                                onCheckedChange={v => setFormData({ ...formData, isPopular: v })}
                              />
                              <Label className="text-stone-300 text-xs">Featured</Label>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleSaveItem} disabled={saving} className="bg-amber-600 hover:bg-amber-500">
                              {saving ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => { setEditingItem(null); setIsAddingNew(false); setFormData(emptyMenuItem); }}
                              className="border-stone-600"
                            >
                              Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Menu Items List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {menuItems.map((item) => (
                        <Card
                          key={item.id}
                          className={`bg-stone-800 border-stone-700 ${!item.isAvailable ? 'opacity-50' : ''}`}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start gap-3">
                              <div className="text-2xl">{getCategoryIcon(item.category)}</div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-white font-medium truncate">{item.name}</span>
                                  {item.isPopular && <Badge className="bg-amber-600 text-xs">Featured</Badge>}
                                  {!item.isAvailable && <Badge className="bg-red-500 text-xs">Hidden</Badge>}
                                </div>
                                <p className="text-amber-400 font-bold">{item.price?.toLocaleString()} XAF</p>
                                <p className="text-stone-400 text-xs truncate">{item.description}</p>
                              </div>
                            </div>
                            <div className="flex gap-1 mt-3 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditItem(item)}
                                className="text-blue-400 hover:bg-stone-700"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => toggleAvailability(item)}
                                className={item.isAvailable ? 'text-yellow-400 hover:bg-stone-700' : 'text-green-400 hover:bg-stone-700'}
                              >
                                {item.isAvailable ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteItem(item.id)}
                                className="text-red-400 hover:bg-stone-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* News Tab */}
                <TabsContent value="news" className="mt-0">
                  <div className="pr-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-amber-400">News & Announcements</h3>
                      <Button onClick={handleAddNews} className="bg-amber-600 hover:bg-amber-500">
                        <Plus className="h-4 w-4 mr-2" />
                        Add News
                      </Button>
                    </div>

                    {/* Add/Edit News Form */}
                    {(isAddingNews || editingNews) && (
                      <Card className="bg-stone-800 border-amber-500/50 mb-4">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-amber-400 text-base">
                            {isAddingNews ? 'Add News Item' : `Edit: ${editingNews?.title}`}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <Label className="text-stone-300 text-xs">Title *</Label>
                            <Input
                              value={newsFormData.title || ''}
                              onChange={e => setNewsFormData({ ...newsFormData, title: e.target.value })}
                              className="bg-stone-700 border-stone-600 text-white"
                              placeholder="News title..."
                            />
                          </div>
                          <div>
                            <Label className="text-stone-300 text-xs">Description *</Label>
                            <Textarea
                              value={newsFormData.description || ''}
                              onChange={e => setNewsFormData({ ...newsFormData, description: e.target.value })}
                              className="bg-stone-700 border-stone-600 text-white"
                              rows={3}
                              placeholder="News description..."
                            />
                          </div>
                          <div>
                            <Label className="text-stone-300 text-xs">Image URL</Label>
                            <Input
                              value={newsFormData.image || ''}
                              onChange={e => setNewsFormData({ ...newsFormData, image: e.target.value })}
                              className="bg-stone-700 border-stone-600 text-white"
                              placeholder="/news-image.png"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleSaveNews} disabled={savingNews} className="bg-amber-600 hover:bg-amber-500">
                              {savingNews ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => { setIsAddingNews(false); setEditingNews(null); setNewsFormData(emptyNewsItem); }}
                              className="border-stone-600"
                            >
                              Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* News Items List */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {newsItems.map((item) => (
                        <Card key={item.id} className={`bg-stone-800 border-stone-700 overflow-hidden ${!item.active ? 'opacity-50' : ''}`}>
                          {item.image && (
                            <div className="h-32 bg-stone-700 overflow-hidden">
                              <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                            </div>
                          )}
                          <CardContent className="p-4">
                            <h4 className="text-white font-medium mb-1">{item.title}</h4>
                            <p className="text-stone-400 text-sm line-clamp-2">{item.description}</p>
                            <p className="text-stone-500 text-xs mt-2">{new Date(item.createdAt).toLocaleDateString()}</p>
                            <div className="flex gap-1 mt-3 justify-end">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditNews(item)}
                                className="text-blue-400 hover:bg-stone-700"
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteNews(item.id)}
                                className="text-red-400 hover:bg-stone-700"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                </TabsContent>

                {/* Users Tab */}
                <TabsContent value="users" className="mt-0">
                  <div className="pr-4">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-bold text-amber-400">Registered Users</h3>
                    </div>

                    {users.length === 0 ? (
                      <p className="text-center text-stone-400 py-12">No registered users yet</p>
                    ) : (
                      <div className="space-y-3">
                        {users.map((user) => (
                          <Card key={user.id} className="bg-stone-800 border-stone-700">
                            <CardContent className="p-4">
                              <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                  <div className="h-10 w-10 rounded-full bg-amber-600 flex items-center justify-center text-white font-bold">
                                    {user.displayName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || 'U'}
                                  </div>
                                  <div>
                                    <p className="text-white font-medium">{user.displayName || user.name || 'Unknown'}</p>
                                    <p className="text-stone-400 text-sm">{user.email}</p>
                                    {user.phone && <p className="text-stone-500 text-xs">{user.phone}</p>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <Badge className={`${
                                      user.role === 'ADMIN' ? 'bg-red-500' :
                                      user.role === 'STAFF' ? 'bg-blue-500' :
                                      'bg-green-500'
                                    } text-white`}>
                                      {user.role || 'CUSTOMER'}
                                    </Badge>
                                    {user.createdAt && (
                                      <p className="text-stone-500 text-xs mt-1">
                                        Joined {new Date(user.createdAt).toLocaleDateString()}
                                      </p>
                                    )}
                                  </div>
                                  <Select onValueChange={(value) => updateUserRole(user.uid, value)}>
                                    <SelectTrigger className="w-32 bg-stone-700 border-stone-600 text-white text-xs h-8">
                                      <SelectValue placeholder="Change Role" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-stone-700">
                                      <SelectItem value="CUSTOMER">Customer</SelectItem>
                                      <SelectItem value="STAFF">Staff</SelectItem>
                                      <SelectItem value="ADMIN">Admin</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </div>
                </TabsContent>
              </ScrollArea>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}
