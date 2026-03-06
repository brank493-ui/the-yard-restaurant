'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useMenu, MenuItem as MenuItemType } from '@/contexts/MenuContext';
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
import { db } from '@/lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  Unsubscribe
} from 'firebase/firestore';
import { 
  X, ArrowLeft, Plus, Pencil, Eye, EyeOff, Trash2, FileText, CreditCard, 
  CheckCircle, Clock, Package, Calendar, Users, DollarSign, Loader2, 
  Zap, ArrowUp, ArrowDown, ChefHat, Star, Image as ImageIcon
} from 'lucide-react';

// Local MenuItem interface for admin operations
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
  featured: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Helper to normalize menu item data
function normalizeMenuItem(item: Record<string, unknown>): MenuItem {
  const featured = item.featured === true || item.isPopular === true;
  return {
    id: String(item.id || ''),
    name: String(item.name || ''),
    description: String(item.description || ''),
    price: Number(item.price) || 0,
    category: String(item.category || ''),
    categorySlug: String(item.categorySlug || item.category || ''),
    image: String(item.image || ''),
    isAvailable: item.isAvailable !== false,
    featured,
    isPopular: featured,
  };
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
  userId?: string;
  email?: string;
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

interface GalleryImage {
  id: string;
  url: string;
  title: string;
  category: string;
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

const galleryCategories = [
  { value: 'interior', label: 'Interior', icon: '🏠' },
  { value: 'outdoor', label: 'Outdoor', icon: '🌳' },
  { value: 'food', label: 'Food', icon: '🍽️' },
  { value: 'kitchen', label: 'Kitchen', icon: '👨‍🍳' },
  { value: 'private', label: 'Private Events', icon: '🎉' },
];

const paymentMethods = [
  { value: 'ORANGE_MONEY', label: 'Orange Money', icon: '🟠' },
  { value: 'MTN_MONEY', label: 'MTN Money', icon: '🟡' },
  { value: 'VISA', label: 'Visa', icon: '💳' },
  { value: 'MASTERCARD', label: 'Mastercard', icon: '💳' },
  { value: 'STRIPE', label: 'Stripe', icon: '💜' },
  { value: 'CASH', label: 'Cash', icon: '💵' },
];

export function AdminDashboard({ open, onOpenChange, onClose }: AdminDashboardProps) {
  const { user } = useAuth();
  
  // Shared menu context - syncs with main website in real-time
  const { 
    menuItems: allMenuItems, 
    featuredItems,
    visibleMenuItems,
    hiddenMenuItems,
    addToFeatured, 
    removeFromFeatured,
    setAvailability
  } = useMenu();
  
  // State for all data
  const [orders, setOrders] = useState<Order[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [newsItems, setNewsItems] = useState<NewsItem[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Stats with detailed breakdown
  const [stats, setStats] = useState({ 
    totalOrders: 0, 
    totalRevenue: 0, 
    confirmedRevenue: 0,
    pendingRevenue: 0,
    pendingOrders: 0, 
    confirmedOrders: 0,
    totalReservations: 0,
    pendingPayments: 0,
    totalUsers: 0
  });

  // Real-time listeners reference
  const unsubscribersRef = useRef<Unsubscribe[]>([]);

  // Menu editing state
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState<Partial<MenuItem>>({
    name: '',
    description: '',
    price: 0,
    category: 'main',
    categorySlug: 'main',
    image: '',
    isAvailable: true,
    isPopular: false,
  });
  const [saving, setSaving] = useState(false);

  // News editing state
  const [editingNews, setEditingNews] = useState<NewsItem | null>(null);
  const [isAddingNews, setIsAddingNews] = useState(false);
  const [newsFormData, setNewsFormData] = useState<Partial<NewsItem>>({
    title: '',
    description: '',
    image: '',
    active: true,
  });
  const [savingNews, setSavingNews] = useState(false);

  // Gallery editing state
  const [editingGallery, setEditingGallery] = useState<GalleryImage | null>(null);
  const [isAddingGallery, setIsAddingGallery] = useState(false);
  const [galleryFormData, setGalleryFormData] = useState<Partial<GalleryImage>>({
    url: '',
    title: '',
    category: 'food',
  });
  const [savingGallery, setSavingGallery] = useState(false);

  // Featured menu items (chef's picks)
  const [featuredMenuItems, setFeaturedMenuItems] = useState<Set<string>>(new Set());

  // Setup real-time listeners
  useEffect(() => {
    if (!open) return;
    
    // Clean up previous listeners
    unsubscribersRef.current.forEach(unsub => unsub());
    unsubscribersRef.current = [];

    if (!db) {
      // Fallback to API fetch if Firebase not configured
      fetchAdminData();
      return;
    }

    setLoading(true);

    // Orders listener with real-time updates
    const ordersQuery = query(collection(db, 'orders'), orderBy('createdAt', 'desc'));
    unsubscribersRef.current.push(
      onSnapshot(ordersQuery, (snapshot) => {
        const ordersData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        })) as Order[];
        setOrders(ordersData);
        updateStatsFromOrders(ordersData);
        setLoading(false);
      }, (error) => {
        console.error('Orders listener error:', error);
        fetchAdminData();
      })
    );

    // Reservations listener
    const resQuery = query(collection(db, 'reservations'), orderBy('createdAt', 'desc'));
    unsubscribersRef.current.push(
      onSnapshot(resQuery, (snapshot) => {
        const resData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as Reservation[];
        setReservations(resData);
        setStats(prev => ({ ...prev, totalReservations: resData.length }));
      })
    );

    // Menu items listener
    const menuQuery = query(collection(db, 'menuItems'), orderBy('createdAt', 'desc'));
    unsubscribersRef.current.push(
      onSnapshot(menuQuery, (snapshot) => {
        const menuData = snapshot.docs.map(doc => {
          const data = doc.data();
          return normalizeMenuItem({
            id: doc.id,
            ...data,
          });
        });
        setMenuItems(menuData);
        
        // Update featured items set
        const featured = new Set(menuData.filter(item => item.featured).map(item => item.id));
        setFeaturedMenuItems(featured);
      }, (error) => {
        console.error('Menu listener error:', error);
        fetchAdminData();
      })
    );

    // News listener
    const newsQuery = query(collection(db, 'news'), orderBy('createdAt', 'desc'));
    unsubscribersRef.current.push(
      onSnapshot(newsQuery, (snapshot) => {
        const newsData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
        })) as NewsItem[];
        setNewsItems(newsData);
      })
    );

    // Gallery listener
    const galleryQuery = query(collection(db, 'gallery'), orderBy('createdAt', 'desc'));
    unsubscribersRef.current.push(
      onSnapshot(galleryQuery, (snapshot) => {
        const galleryData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        })) as GalleryImage[];
        setGalleryImages(galleryData);
      })
    );

    // Users listener
    const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
    unsubscribersRef.current.push(
      onSnapshot(usersQuery, (snapshot) => {
        const usersData = snapshot.docs.map(doc => ({
          id: doc.id,
          uid: doc.id,
          ...doc.data(),
        })) as User[];
        setUsers(usersData);
        setStats(prev => ({ ...prev, totalUsers: usersData.length }));
      }, () => {
        fetchUsers();
      })
    );

    return () => {
      unsubscribersRef.current.forEach(unsub => unsub());
      unsubscribersRef.current = [];
    };
  }, [open]);

  // Update stats from orders
  const updateStatsFromOrders = (ordersData: Order[]) => {
    const totalRevenue = ordersData.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const confirmedRevenue = ordersData
      .filter(o => o.paymentStatus === 'PAID')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const pendingRevenue = ordersData
      .filter(o => o.paymentStatus !== 'PAID' && o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    const pendingOrders = ordersData.filter(o => o.status === 'PENDING').length;
    const confirmedOrders = ordersData.filter(o => o.paymentStatus === 'PAID').length;
    const pendingPayments = ordersData.filter(o => o.paymentStatus === 'PROCESSING').length;
    
    setStats(prev => ({ 
      ...prev, 
      totalOrders: ordersData.length, 
      totalRevenue,
      confirmedRevenue,
      pendingRevenue,
      pendingOrders, 
      confirmedOrders,
      pendingPayments 
    }));
  };

  // Fallback fetch functions
  const fetchAdminData = async () => {
    try {
      const token = await user?.getIdToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [ordersRes, resRes, menuRes, newsRes, galleryRes] = await Promise.all([
        fetch('/api/orders', { headers }),
        fetch('/api/reservations', { headers }),
        fetch('/api/menu?all=true'),
        fetch('/api/news'),
        fetch('/api/gallery'),
      ]);

      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setOrders(ordersData);
        updateStatsFromOrders(ordersData);
      }
      if (resRes.ok) {
        const resData = await resRes.json();
        setReservations(resData);
        setStats(prev => ({ ...prev, totalReservations: resData.length }));
      }
      if (menuRes.ok) {
        const menuData = await menuRes.json();
        const normalizedData = menuData.map((item: Record<string, unknown>) => normalizeMenuItem(item));
        setMenuItems(normalizedData);
        const featured = new Set(normalizedData.filter((item: MenuItem) => item.featured).map((item: MenuItem) => item.id));
        setFeaturedMenuItems(featured);
      }
      if (newsRes.ok) {
        const newsData = await newsRes.json();
        setNewsItems(newsData);
      }
      if (galleryRes.ok) {
        const galleryData = await galleryRes.json();
        setGalleryImages(galleryData);
      }
    } catch (error) {
      console.error('Error fetching admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = await user?.getIdToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const usersRes = await fetch('/api/users', { headers });
      if (usersRes.ok) {
        const usersData = await usersRes.json();
        setUsers(usersData);
        setStats(prev => ({ ...prev, totalUsers: usersData.length }));
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    }
  };

  // Update order status
  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success('Order status updated');
    } catch {
      toast.error('Failed to update order status');
    }
  };

  // Confirm payment with stats update and invoice generation
  const confirmPayment = async (order: Order, paymentMethod?: string) => {
    try {
      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          paymentStatus: 'PAID', 
          paymentMethod: paymentMethod || order.paymentMethod || 'CASH' 
        }),
      });

      if (res.ok) {
        await generateInvoice(order);
        toast.success('Payment confirmed! Invoice generated.');
      }
    } catch {
      toast.error('Failed to confirm payment');
    }
  };

  // Reject payment
  const rejectPayment = async (orderId: string) => {
    try {
      await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: 'FAILED' }),
      });
      toast.success('Payment rejected');
    } catch {
      toast.error('Failed to reject payment');
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
            email: order.email || order.customerName + '@guest.com',
            userId: order.userId,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        downloadInvoiceText(data.invoice, order);
        return data.invoice;
      }
    } catch (error) {
      console.error('Error generating invoice:', error);
    }
  };

  // Download invoice as text file
  const downloadInvoiceText = (invoice: any, order: Order) => {
    const invoiceText = `
========================================
           THE YARD RESTAURANT
           INVOICE
========================================

Invoice #: ${invoice.invoiceNumber}
Date: ${new Date(invoice.createdAt).toLocaleDateString()}
Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}

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
Payment Status: PAID
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
    a.download = `invoice-${invoice.invoiceNumber}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Update reservation status
  const updateReservationStatus = async (resId: string, newStatus: string) => {
    try {
      await fetch(`/api/reservations/${resId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      toast.success('Reservation status updated');
    } catch {
      toast.error('Failed to update reservation status');
    }
  };

  // Update user role
  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, role: newRole }),
      });
      toast.success('User role updated');
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
    setFormData({
      name: '',
      description: '',
      price: 0,
      category: 'main',
      categorySlug: 'main',
      image: '',
      isAvailable: true,
      isPopular: false,
    });
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

      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          categorySlug: formData.category,
          price: Number(formData.price),
        }),
      });

      toast.success(isAddingNew ? 'Menu item added!' : 'Menu item updated!');
      setEditingItem(null);
      setIsAddingNew(false);
      setFormData({
        name: '',
        description: '',
        price: 0,
        category: 'main',
        categorySlug: 'main',
        image: '',
        isAvailable: true,
        isPopular: false,
      });
    } catch {
      toast.error('Failed to save menu item');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await fetch(`/api/menu/${id}`, { method: 'DELETE' });
      toast.success('Menu item deleted');
    } catch {
      toast.error('Failed to delete menu item');
    }
  };

  // Move item to Upper Board (make visible on website menu)
  const moveToUpperBoard = async (item: MenuItem) => {
    try {
      await setAvailability(item.id, true);
      toast.success(`${item.name} is now visible on the website menu`);
    } catch {
      toast.error('Failed to update item');
    }
  };

  // Move item to Lower Board (hide from website menu)
  const moveToLowerBoard = async (item: MenuItem) => {
    try {
      await setAvailability(item.id, false);
      toast.success(`${item.name} is now hidden from the website menu`);
    } catch {
      toast.error('Failed to update item');
    }
  };

  // Add to featured (Chef's Picks) - uses shared context
  const handleAddToFeatured = async (item: MenuItem) => {
    try {
      await addToFeatured(item.id);
      toast.success(`${item.name} added to Chef's Picks`);
    } catch {
      toast.error('Failed to add to featured');
    }
  };

  // Remove from featured - uses shared context
  const handleRemoveFromFeatured = async (item: MenuItem) => {
    try {
      await removeFromFeatured(item.id);
      toast.success(`${item.name} removed from Chef's Picks`);
    } catch {
      toast.error('Failed to remove from featured');
    }
  };

  // News CRUD operations
  const handleAddNews = () => {
    setIsAddingNews(true);
    setEditingNews(null);
    setNewsFormData({ title: '', description: '', image: '', active: true });
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
      await fetch('/api/news', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newsFormData),
      });

      toast.success('News item saved!');
      setIsAddingNews(false);
      setEditingNews(null);
      setNewsFormData({ title: '', description: '', image: '', active: true });
    } catch {
      toast.error('Failed to save news item');
    } finally {
      setSavingNews(false);
    }
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm('Are you sure you want to delete this news item?')) return;
    try {
      await fetch(`/api/news?id=${id}`, { method: 'DELETE' });
      toast.success('News item deleted');
    } catch {
      toast.error('Failed to delete news item');
    }
  };

  // Fetch gallery data
  const fetchGalleryData = useCallback(async () => {
    try {
      const res = await fetch('/api/gallery');
      if (res.ok) {
        const data = await res.json();
        setGalleryImages(data);
      }
    } catch (error) {
      console.error('Error fetching gallery:', error);
    }
  }, []);

  // Gallery CRUD operations
  const handleAddGallery = () => {
    setIsAddingGallery(true);
    setEditingGallery(null);
    setGalleryFormData({ url: '', title: '', category: 'food' });
  };

  const handleEditGallery = (item: GalleryImage) => {
    setEditingGallery(item);
    setIsAddingGallery(false);
    setGalleryFormData({
      url: item.url,
      title: item.title,
      category: item.category,
    });
  };

  const handleSaveGallery = async () => {
    if (!galleryFormData.url || !galleryFormData.title) {
      toast.error('Image URL and title are required');
      return;
    }

    setSavingGallery(true);
    try {
      const url = isAddingGallery ? '/api/gallery' : `/api/gallery/${editingGallery?.id}`;
      const method = isAddingGallery ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(galleryFormData),
      });

      if (res.ok) {
        toast.success(isAddingGallery ? 'Gallery image added!' : 'Gallery image updated!');
        setIsAddingGallery(false);
        setEditingGallery(null);
        setGalleryFormData({ url: '', title: '', category: 'food' });
        // Refresh gallery data
        await fetchGalleryData();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to save gallery image');
      }
    } catch {
      toast.error('Failed to save gallery image');
    } finally {
      setSavingGallery(false);
    }
  };

  const handleDeleteGallery = async (id: string) => {
    if (!confirm('Are you sure you want to delete this image?')) return;
    try {
      const res = await fetch(`/api/gallery/${id}`, { method: 'DELETE' });
      if (res.ok) {
        toast.success('Gallery image deleted');
        // Refresh gallery data
        await fetchGalleryData();
      } else {
        toast.error('Failed to delete gallery image');
      }
    } catch {
      toast.error('Failed to delete gallery image');
    }
  };

  const handleClose = () => {
    if (onClose) onClose();
    else if (onOpenChange) onOpenChange(false);
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

  // Separate local menu items by availability for Menu section (local admin state)
  const localVisibleMenuItems = menuItems.filter(item => item.isAvailable);
  const localHiddenMenuItems = menuItems.filter(item => !item.isAvailable);

  // Regular items for Chef's Picks are those NOT featured (from shared context)
  const regularItems = allMenuItems.filter(item => item.featured !== true && item.isAvailable);

  if (!open) return null;

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
            <p className="text-stone-400 text-sm flex items-center gap-2">
              <Zap className="h-3 w-3 text-green-400" />
              Real-time sync enabled
            </p>
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
                  <p className="text-2xl font-bold text-green-400">{stats.confirmedRevenue.toLocaleString()}</p>
                  <p className="text-stone-400 text-xs">Confirmed (XAF)</p>
                </CardContent>
              </Card>
              <Card className="bg-stone-800 border-stone-700">
                <CardContent className="p-4 text-center">
                  <Clock className="h-6 w-6 mx-auto text-yellow-400 mb-1" />
                  <p className="text-2xl font-bold text-yellow-400">{stats.pendingRevenue.toLocaleString()}</p>
                  <p className="text-stone-400 text-xs">Pending (XAF)</p>
                </CardContent>
              </Card>
              <Card className="bg-stone-800 border-stone-700">
                <CardContent className="p-4 text-center">
                  <CreditCard className="h-6 w-6 mx-auto text-orange-400 mb-1" />
                  <p className="text-2xl font-bold text-white">{stats.pendingPayments}</p>
                  <p className="text-stone-400 text-xs">Awaiting</p>
                </CardContent>
              </Card>
              <Card className="bg-stone-800 border-stone-700">
                <CardContent className="p-4 text-center">
                  <CheckCircle className="h-6 w-6 mx-auto text-green-400 mb-1" />
                  <p className="text-2xl font-bold text-white">{stats.confirmedOrders}</p>
                  <p className="text-stone-400 text-xs">Paid</p>
                </CardContent>
              </Card>
            </div>

            {/* Main Tabs */}
            <Tabs defaultValue="payments" className="flex-1 flex flex-col overflow-hidden min-h-0">
              <TabsList className="bg-stone-800 w-full flex-wrap h-auto gap-1 p-1 shrink-0">
                <TabsTrigger value="payments" className="data-[state=active]:bg-amber-600 px-3 py-2 text-sm">
                  💳 Payments ({stats.pendingPayments})
                </TabsTrigger>
                <TabsTrigger value="orders" className="data-[state=active]:bg-amber-600 px-3 py-2 text-sm">
                  📦 Orders ({orders.length})
                </TabsTrigger>
                <TabsTrigger value="menu" className="data-[state=active]:bg-amber-600 px-3 py-2 text-sm">
                  🍽️ Menu ({menuItems.length})
                </TabsTrigger>
                <TabsTrigger value="chefs-picks" className="data-[state=active]:bg-amber-600 px-3 py-2 text-sm">
                  👨‍🍳 Chef's Picks ({featuredItems.length})
                </TabsTrigger>
                <TabsTrigger value="gallery" className="data-[state=active]:bg-amber-600 px-3 py-2 text-sm">
                  🖼️ Gallery ({galleryImages.length})
                </TabsTrigger>
                <TabsTrigger value="reservations" className="data-[state=active]:bg-amber-600 px-3 py-2 text-sm">
                  📅 Reservations ({reservations.length})
                </TabsTrigger>
                <TabsTrigger value="news" className="data-[state=active]:bg-amber-600 px-3 py-2 text-sm">
                  📰 News ({newsItems.length})
                </TabsTrigger>
              </TabsList>

              <ScrollArea className="flex-1 mt-4">
                {/* Payments Tab */}
                <TabsContent value="payments" className="mt-0">
                  <div className="pr-4">
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

                    <div className="grid grid-cols-2 gap-4 mb-4">
                      <Card className="bg-green-900/30 border-green-500/30">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-8 w-8 text-green-400" />
                            <div>
                              <p className="text-stone-400 text-sm">Confirmed Payments</p>
                              <p className="text-2xl font-bold text-green-400">{stats.confirmedOrders}</p>
                              <p className="text-green-400 text-sm">{stats.confirmedRevenue.toLocaleString()} XAF</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                      <Card className="bg-orange-900/30 border-orange-500/30">
                        <CardContent className="p-4">
                          <div className="flex items-center gap-3">
                            <Clock className="h-8 w-8 text-orange-400" />
                            <div>
                              <p className="text-stone-400 text-sm">Pending Payments</p>
                              <p className="text-2xl font-bold text-orange-400">{stats.pendingPayments}</p>
                              <p className="text-orange-400 text-sm">{stats.pendingRevenue.toLocaleString()} XAF</p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>

                    <h3 className="text-lg font-bold text-amber-400 mb-3">Awaiting Confirmation</h3>
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
                                      onClick={() => confirmPayment(order, order.paymentMethod)}
                                      className="bg-green-600 hover:bg-green-500 text-white h-9"
                                    >
                                      <CheckCircle className="h-4 w-4 mr-1" />
                                      Confirm & Invoice
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      onClick={() => rejectPayment(order.id)}
                                      className="border-red-500 text-red-400 hover:bg-red-500/20 h-9"
                                    >
                                      <X className="h-4 w-4" />
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
                                </div>
                                <p className="text-white font-medium mt-1">{order.customerName}</p>
                                <p className="text-stone-400 text-xs">{order.phone} • {order.type}</p>
                                <div className="mt-2 text-sm text-stone-300">
                                  {order.items?.slice(0, 3).map((item, i) => (
                                    <span key={i}>{item.name} x{item.quantity}{i < Math.min(order.items.length - 1, 2) ? ', ' : ''}</span>
                                  ))}
                                </div>
                              </div>
                              <div className="text-right flex flex-col gap-2 min-w-[200px]">
                                <p className="font-bold text-white text-lg">{order.totalAmount?.toLocaleString()} XAF</p>
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
                                    <Select onValueChange={(value) => confirmPayment(order, value)}>
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
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </TabsContent>

                {/* Menu Tab - Upper/Lower Board Layout */}
                <TabsContent value="menu" className="mt-0">
                  <div className="pr-4 space-y-6">
                    {/* Add/Edit Form */}
                    {(isAddingNew || editingItem) && (
                      <Card className="bg-stone-800 border-amber-500/50">
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
                              <Label className="text-stone-300 text-xs">Visible on Website</Label>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleSaveItem} disabled={saving} className="bg-amber-600 hover:bg-amber-500">
                              {saving ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => { setEditingItem(null); setIsAddingNew(false); }}
                              className="border-stone-600"
                            >
                              Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                          <Eye className="h-5 w-5" />
                          Menu Visibility Management
                        </h3>
                        <p className="text-stone-400 text-sm">Control which items appear on the website menu</p>
                      </div>
                      <Button onClick={handleAddNew} className="bg-amber-600 hover:bg-amber-500">
                        <Plus className="h-4 w-4 mr-2" />
                        Add New Item
                      </Button>
                    </div>

                    {/* Upper Board - Visible Items (Currently on Website) */}
                    <Card className="bg-gradient-to-r from-green-900/30 via-green-800/20 to-stone-800 border-green-500/50 shadow-lg shadow-green-500/10">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-green-400 flex items-center gap-2">
                          <Eye className="h-5 w-5" />
                          Upper Board - Visible on Website Menu
                        </CardTitle>
                        <p className="text-stone-400 text-xs">These items are shown in the Menu section on the main website. Click "Hide" to remove from website.</p>
                      </CardHeader>
                      <CardContent>
                        <Badge className="bg-green-600 text-white mb-4">{visibleMenuItems.length} Items Visible</Badge>
                        {visibleMenuItems.length === 0 ? (
                          <div className="text-center py-12 border-2 border-dashed border-stone-600 rounded-lg">
                            <Package className="h-12 w-12 text-stone-500 mx-auto mb-3" />
                            <p className="text-stone-400">No visible items</p>
                            <p className="text-stone-500 text-sm">Add items or move from Lower Board</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                            {visibleMenuItems.map((item) => (
                              <div
                                key={item.id}
                                className="bg-stone-800/80 border border-green-500/30 rounded-lg p-3 hover:border-green-400 transition-all"
                              >
                                <div className="flex items-start gap-2">
                                  <div className="text-2xl">{getCategoryIcon(item.category)}</div>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-white font-medium truncate">{item.name}</span>
                                      {item.featured && <Star className="h-4 w-4 text-amber-400 fill-amber-400" />}
                                    </div>
                                    <p className="text-amber-400 font-bold text-sm">{item.price?.toLocaleString()} XAF</p>
                                    <p className="text-stone-400 text-xs truncate">{item.description}</p>
                                  </div>
                                </div>
                                <div className="flex gap-1 mt-3 justify-end">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditItem(item)}
                                    className="text-blue-400 hover:bg-stone-700 h-7 w-7 p-0"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => moveToLowerBoard(item)}
                                    className="text-orange-400 hover:bg-stone-700 h-7 px-2"
                                    title="Move to Lower Board (hide from website)"
                                  >
                                    <ArrowDown className="h-3 w-3 mr-1" />
                                    Hide
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="text-red-400 hover:bg-stone-700 h-7 w-7 p-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Lower Board - Hidden Items */}
                    <Card className="bg-stone-800/50 border-stone-600">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-stone-300 flex items-center gap-2">
                          <EyeOff className="h-5 w-5" />
                          Lower Board - Hidden from Website
                        </CardTitle>
                        <p className="text-stone-400 text-xs">These items are NOT shown on the website menu. Click "Show" to make visible.</p>
                      </CardHeader>
                      <CardContent>
                        <Badge className="bg-stone-600 text-white mb-4">{hiddenMenuItems.length} Items Hidden</Badge>
                        {hiddenMenuItems.length === 0 ? (
                          <div className="text-center py-8 text-stone-400">
                            No hidden items - all menu items are visible
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            {hiddenMenuItems.map((item) => (
                              <div
                                key={item.id}
                                className="bg-stone-700/50 border border-stone-600 rounded-lg p-3 opacity-70 hover:opacity-100 hover:border-amber-500/50 transition-all"
                              >
                                <div className="flex items-start gap-2">
                                  <div className="text-xl">{getCategoryIcon(item.category)}</div>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-white font-medium text-sm truncate block">{item.name}</span>
                                    <p className="text-amber-400 font-bold text-sm">{item.price?.toLocaleString()} XAF</p>
                                  </div>
                                </div>
                                <div className="flex gap-1 mt-3 justify-end">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleEditItem(item)}
                                    className="text-blue-400 hover:bg-stone-700 h-7 w-7 p-0"
                                  >
                                    <Pencil className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    onClick={() => moveToUpperBoard(item)}
                                    className="bg-green-600 hover:bg-green-500 text-white h-7 px-2"
                                    title="Move to Upper Board (show on website)"
                                  >
                                    <ArrowUp className="h-3 w-3 mr-1" />
                                    Show
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleDeleteItem(item.id)}
                                    className="text-red-400 hover:bg-stone-700 h-7 w-7 p-0"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Chef's Picks Tab - Two Board Layout */}
                <TabsContent value="chefs-picks" className="mt-0">
                  <div className="pr-4 space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                          <ChefHat className="h-5 w-5" />
                          Chef's Picks Management
                        </h3>
                        <p className="text-stone-400 text-sm flex items-center gap-2">
                          Manage featured items shown on the website
                          <span className="flex items-center gap-1 text-green-400 text-xs">
                            <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                            Live sync
                          </span>
                        </p>
                      </div>
                      <Badge className="bg-amber-600 text-white px-3 py-1">
                        {featuredItems.length} Featured
                      </Badge>
                    </div>

                    {/* Upper Board - Featured Items (Currently on Website) */}
                    <Card className="bg-gradient-to-r from-amber-900/30 via-amber-800/20 to-stone-800 border-amber-500/50 shadow-lg shadow-amber-500/10">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-amber-400 flex items-center gap-2">
                          <Star className="h-5 w-5 fill-amber-400" />
                          Currently on Website (Chef's Recommendations)
                        </CardTitle>
                        <p className="text-stone-400 text-xs">These items are displayed in the Chef's Recommendations section on the main page</p>
                      </CardHeader>
                      <CardContent>
                        {featuredItems.length === 0 ? (
                          <div className="text-center py-12 border-2 border-dashed border-stone-600 rounded-lg">
                            <ChefHat className="h-12 w-12 text-stone-500 mx-auto mb-3" />
                            <p className="text-stone-400">No featured items yet</p>
                            <p className="text-stone-500 text-sm">Click "Add" on items below to feature them</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {featuredItems.map((item) => (
                              <div
                                key={item.id}
                                className="bg-stone-800/80 border border-amber-500/50 rounded-lg overflow-hidden hover:border-amber-400 transition-all group"
                              >
                                {item.image ? (
                                  <div className="h-24 bg-stone-700 overflow-hidden">
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                  </div>
                                ) : (
                                  <div className="h-24 bg-gradient-to-br from-amber-900/50 to-stone-700 flex items-center justify-center">
                                    <span className="text-4xl">{getCategoryIcon(item.category)}</span>
                                  </div>
                                )}
                                <div className="p-3">
                                  <div className="flex items-start justify-between gap-2">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2">
                                        <span className="text-white font-medium truncate">{item.name}</span>
                                        <Star className="h-4 w-4 text-amber-400 fill-amber-400 shrink-0" />
                                      </div>
                                      <p className="text-amber-400 font-bold text-sm">{item.price?.toLocaleString()} XAF</p>
                                      <p className="text-stone-500 text-xs truncate">{item.description || 'No description'}</p>
                                    </div>
                                  </div>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => handleRemoveFromFeatured(item)}
                                    className="w-full mt-3 bg-red-600/80 hover:bg-red-500 text-white"
                                  >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    Remove from Featured
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>

                    {/* Lower Board - Available Items to Add */}
                    <Card className="bg-stone-800/50 border-stone-600">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-stone-200 flex items-center gap-2">
                          <Package className="h-5 w-5" />
                          Available Menu Items
                        </CardTitle>
                        <p className="text-stone-400 text-xs">Click "Add" to feature an item in Chef's Recommendations</p>
                      </CardHeader>
                      <CardContent>
                        {regularItems.filter(item => item.isAvailable).length === 0 ? (
                          <div className="text-center py-8 text-stone-400">
                            All available items are already featured
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                            {regularItems.filter(item => item.isAvailable).map((item) => (
                              <div
                                key={item.id}
                                className="bg-stone-700/50 border border-stone-600 rounded-lg overflow-hidden hover:border-amber-500/50 transition-all group"
                              >
                                {item.image ? (
                                  <div className="h-20 bg-stone-600 overflow-hidden">
                                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                                  </div>
                                ) : (
                                  <div className="h-20 bg-gradient-to-br from-stone-600 to-stone-700 flex items-center justify-center">
                                    <span className="text-3xl">{getCategoryIcon(item.category)}</span>
                                  </div>
                                )}
                                <div className="p-3">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-white font-medium text-sm truncate flex-1">{item.name}</span>
                                    <Badge variant="outline" className="border-stone-500 text-stone-300 text-xs">
                                      {getCategoryIcon(item.category)}
                                    </Badge>
                                  </div>
                                  <p className="text-amber-400 font-bold text-sm mb-2">{item.price?.toLocaleString()} XAF</p>
                                  <Button
                                    size="sm"
                                    onClick={() => handleAddToFeatured(item)}
                                    className="w-full bg-green-600 hover:bg-green-500 text-white"
                                  >
                                    <Plus className="h-4 w-4 mr-2" />
                                    Add to Featured
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                </TabsContent>

                {/* Gallery Tab */}
                <TabsContent value="gallery" className="mt-0">
                  <div className="pr-4 space-y-6">
                    {/* Add/Edit Form */}
                    {(isAddingGallery || editingGallery) && (
                      <Card className="bg-stone-800 border-amber-500/50">
                        <CardHeader className="pb-2">
                          <CardTitle className="text-amber-400 text-base">
                            {isAddingGallery ? 'Add Gallery Image' : `Edit: ${editingGallery?.title}`}
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div>
                            <Label className="text-stone-300 text-xs">Image URL *</Label>
                            <Input
                              value={galleryFormData.url || ''}
                              onChange={e => setGalleryFormData({ ...galleryFormData, url: e.target.value })}
                              className="bg-stone-700 border-stone-600 text-white"
                              placeholder="/image.png or https://..."
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-stone-300 text-xs">Title *</Label>
                              <Input
                                value={galleryFormData.title || ''}
                                onChange={e => setGalleryFormData({ ...galleryFormData, title: e.target.value })}
                                className="bg-stone-700 border-stone-600 text-white"
                              />
                            </div>
                            <div>
                              <Label className="text-stone-300 text-xs">Category</Label>
                              <Select
                                value={galleryFormData.category || 'food'}
                                onValueChange={v => setGalleryFormData({ ...galleryFormData, category: v })}
                              >
                                <SelectTrigger className="bg-stone-700 border-stone-600 text-white">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-stone-700">
                                  {galleryCategories.map(cat => (
                                    <SelectItem key={cat.value} value={cat.value}>
                                      {cat.icon} {cat.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                          {galleryFormData.url && (
                            <div className="h-32 rounded-lg overflow-hidden border border-stone-600">
                              <img src={galleryFormData.url} alt="Preview" className="w-full h-full object-cover" onError={(e) => (e.target as HTMLImageElement).style.display = 'none'} />
                            </div>
                          )}
                          <div className="flex gap-2">
                            <Button onClick={handleSaveGallery} disabled={savingGallery} className="bg-amber-600 hover:bg-amber-500">
                              {savingGallery ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => { setEditingGallery(null); setIsAddingGallery(false); }}
                              className="border-stone-600"
                            >
                              Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-lg font-bold text-amber-400 flex items-center gap-2">
                          <ImageIcon className="h-5 w-5" />
                          Gallery Management
                        </h3>
                        <p className="text-stone-400 text-sm">Manage images shown on the website gallery section</p>
                      </div>
                      <Button onClick={handleAddGallery} className="bg-amber-600 hover:bg-amber-500">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Image
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                      {galleryImages.map((image) => (
                        <div
                          key={image.id}
                          className="bg-stone-800 border border-stone-700 rounded-lg overflow-hidden hover:border-amber-500/50 transition-all group"
                        >
                          <div className="aspect-square bg-stone-700 overflow-hidden">
                            <img 
                              src={image.url} 
                              alt={image.title} 
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = '/placeholder.png';
                              }}
                            />
                          </div>
                          <div className="p-3">
                            <p className="text-white font-medium text-sm truncate">{image.title}</p>
                            <p className="text-stone-400 text-xs">{image.category}</p>
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditGallery(image)}
                                className="text-blue-400 hover:bg-stone-700 h-7 w-7 p-0"
                              >
                                <Pencil className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteGallery(image.id)}
                                className="text-red-400 hover:bg-stone-700 h-7 w-7 p-0"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {galleryImages.length === 0 && (
                      <div className="text-center py-12 border-2 border-dashed border-stone-600 rounded-lg">
                        <ImageIcon className="h-12 w-12 text-stone-500 mx-auto mb-3" />
                        <p className="text-stone-400">No gallery images yet</p>
                        <p className="text-stone-500 text-sm">Click "Add Image" to add your first image</p>
                      </div>
                    )}
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

                {/* News Tab */}
                <TabsContent value="news" className="mt-0">
                  <div className="pr-4 space-y-4">
                    {(isAddingNews || editingNews) && (
                      <Card className="bg-stone-800 border-amber-500/50">
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
                            />
                          </div>
                          <div>
                            <Label className="text-stone-300 text-xs">Description *</Label>
                            <Textarea
                              value={newsFormData.description || ''}
                              onChange={e => setNewsFormData({ ...newsFormData, description: e.target.value })}
                              className="bg-stone-700 border-stone-600 text-white"
                              rows={3}
                            />
                          </div>
                          <div>
                            <Label className="text-stone-300 text-xs">Image URL</Label>
                            <Input
                              value={newsFormData.image || ''}
                              onChange={e => setNewsFormData({ ...newsFormData, image: e.target.value })}
                              className="bg-stone-700 border-stone-600 text-white"
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <Switch
                              checked={newsFormData.active ?? true}
                              onCheckedChange={v => setNewsFormData({ ...newsFormData, active: v })}
                            />
                            <Label className="text-stone-300 text-xs">Active (show on website)</Label>
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={handleSaveNews} disabled={savingNews} className="bg-amber-600 hover:bg-amber-500">
                              {savingNews ? 'Saving...' : 'Save'}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => { setEditingNews(null); setIsAddingNews(false); }}
                              className="border-stone-600"
                            >
                              Cancel
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-bold text-amber-400">News & Announcements</h3>
                      <Button onClick={handleAddNews} className="bg-amber-600 hover:bg-amber-500">
                        <Plus className="h-4 w-4 mr-2" />
                        Add News
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {newsItems.map((news) => (
                        <Card key={news.id} className="bg-stone-800 border-stone-700">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-start gap-4">
                              <div className="flex gap-4">
                                {news.image && (
                                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-stone-700 shrink-0">
                                    <img src={news.image} alt={news.title} className="w-full h-full object-cover" />
                                  </div>
                                )}
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-white font-medium">{news.title}</span>
                                    {news.active ? (
                                      <Badge className="bg-green-500 text-xs">Active</Badge>
                                    ) : (
                                      <Badge className="bg-stone-500 text-xs">Inactive</Badge>
                                    )}
                                  </div>
                                  <p className="text-stone-400 text-sm mt-1 line-clamp-2">{news.description}</p>
                                  <p className="text-stone-500 text-xs mt-1">{new Date(news.createdAt).toLocaleDateString()}</p>
                                </div>
                              </div>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleEditNews(news)}
                                  className="text-blue-400 hover:bg-stone-700"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handleDeleteNews(news.id)}
                                  className="text-red-400 hover:bg-stone-700"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
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
