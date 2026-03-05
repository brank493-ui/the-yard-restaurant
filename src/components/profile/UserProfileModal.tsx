'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRealtimeData } from '@/hooks/useRealtimeData';
import { PaymentMethodCard, paymentMethodConfig } from '@/components/ui/payment-logos';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { 
  FileText, Download, CreditCard, Clock, CheckCircle, XCircle, Calendar, 
  Package, Users, AlertCircle, Loader2, ShoppingCart, Trash2, Plus, Minus, 
  Wallet, ArrowRight, RefreshCw, ExternalLink
} from 'lucide-react';

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

interface CartItem {
  menuItemId: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  image?: string;
  notes?: string;
}

interface Cart {
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

interface UserProfileModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const paymentMethods = Object.entries(paymentMethodConfig).map(([key, config]) => ({
  value: key,
  label: config.label,
  accountNumber: config.accountNumber,
  accountName: config.accountName,
  color: config.color,
  bgColor: config.bgColor,
}));

export function UserProfileModal({ open, onOpenChange }: UserProfileModalProps) {
  const { user, userData } = useAuth();
  
  const realtimeData = useRealtimeData({
    userId: user?.uid,
    isAdmin: false,
    enabled: open && !!user,
  });
  
  const orders = (realtimeData.orders || []) as Order[];
  const reservations = (realtimeData.reservations || []) as Reservation[];
  const events = (realtimeData.events || []) as Event[];
  const invoices = (realtimeData.invoices || []) as Invoice[];
  const cart = realtimeData.cart as Cart | null;
  const loading = realtimeData.loading;

  const cartItemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;
  
  // Calculate unpaid amounts
  const unpaidOrders = orders.filter((o) => 
    o.paymentStatus !== 'PAID' && o.status !== 'CANCELLED'
  );
  
  const unpaidEvents = events.filter((e) => 
    e.paymentStatus !== 'PAID' && e.status !== 'CANCELLED' && e.totalAmount
  );
  
  const totalOrdersDue = unpaidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const totalEventsDue = unpaidEvents.reduce((sum, e) => sum + (e.totalAmount || 0), 0);
  const totalDue = totalOrdersDue + totalEventsDue;

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [payAllDialogOpen, setPayAllDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [transactionReference, setTransactionReference] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);

  // Cart operations
  const updateCartItem = async (menuItemId: string, quantity: number) => {
    try {
      await fetch('/api/cart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid,
          menuItemId,
          quantity,
        }),
      });
    } catch (error) {
      toast.error('Failed to update cart');
    }
  };

  const removeCartItem = async (menuItemId: string) => {
    try {
      await fetch('/api/cart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user?.uid,
          menuItemId,
          action: 'remove',
        }),
      });
      toast.success('Item removed from cart');
    } catch (error) {
      toast.error('Failed to remove item');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PENDING': return 'bg-yellow-500';
      case 'PROCESSING': return 'bg-blue-500';
      case 'CONFIRMED':
      case 'PREPARING': return 'bg-blue-500';
      case 'READY': return 'bg-green-500';
      case 'DELIVERED':
      case 'COMPLETED': return 'bg-green-500';
      case 'CANCELLED': return 'bg-red-500';
      default: return 'bg-stone-500';
    }
  };

  const getPaymentStatusIcon = (status: string) => {
    switch (status?.toUpperCase()) {
      case 'PAID': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'PROCESSING': return <Loader2 className="h-4 w-4 text-blue-400 animate-spin" />;
      case 'PENDING': return <Clock className="h-4 w-4 text-yellow-400" />;
      case 'FAILED': return <XCircle className="h-4 w-4 text-red-400" />;
      default: return <Clock className="h-4 w-4 text-stone-400" />;
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

  const openPaymentDialog = (order: Order) => {
    setSelectedOrder(order);
    setSelectedPaymentMethod('');
    setTransactionReference('');
    setPaymentDialogOpen(true);
  };

  const handlePayAll = async () => {
    if (!selectedPaymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    if ((selectedPaymentMethod === 'ORANGE_MONEY' || selectedPaymentMethod === 'MTN_MONEY') && !transactionReference.trim()) {
      toast.error('Please enter the transaction reference from your mobile money payment');
      return;
    }

    setProcessingPayment(true);

    try {
      const updatePromises = unpaidOrders.map(order => 
        fetch(`/api/orders/${order.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            paymentMethod: selectedPaymentMethod, 
            paymentStatus: selectedPaymentMethod === 'CASH' ? 'PENDING' : 'PROCESSING',
            transactionReference: transactionReference.trim() || undefined,
          }),
        })
      );

      await Promise.all(updatePromises);

      const invoiceRes = await fetch('/api/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: 'BULK-' + Date.now(),
          orderData: {
            customerName: userData?.name || user?.email || 'Customer',
            email: user?.email,
            phone: userData?.phone || '',
            items: unpaidOrders.flatMap(o => o.items),
            totalAmount: totalDue,
            paymentMethod: selectedPaymentMethod,
            paymentStatus: selectedPaymentMethod === 'CASH' ? 'PENDING' : 'PROCESSING',
            transactionReference: transactionReference.trim() || undefined,
            userId: user?.uid,
            isBulkPayment: true,
            orderIds: unpaidOrders.map(o => o.id),
          },
        }),
      });

      const methodLabel = selectedPaymentMethod === 'ORANGE_MONEY' ? 'Orange Money' : 
                         selectedPaymentMethod === 'MTN_MONEY' ? 'MTN Money' : 'Cash';
      
      if (selectedPaymentMethod === 'CASH') {
        toast.success(`Payment method set to Cash for ${unpaidOrders.length} orders. Total: ${totalDue.toLocaleString()} XAF`);
      } else {
        toast.success(`Payment of ${totalDue.toLocaleString()} XAF submitted via ${methodLabel}! Processing...`);
      }
      
      setPayAllDialogOpen(false);
      setTransactionReference('');
      setSelectedPaymentMethod('');
      
    } catch (error) {
      toast.error('Failed to process payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handlePaymentSubmit = async () => {
    if (!selectedOrder || !selectedPaymentMethod) {
      toast.error('Please select a payment method');
      return;
    }

    if ((selectedPaymentMethod === 'ORANGE_MONEY' || selectedPaymentMethod === 'MTN_MONEY') && !transactionReference.trim()) {
      toast.error('Please enter the transaction reference from your mobile money payment');
      return;
    }

    setProcessingPayment(true);

    try {
      const res = await fetch(`/api/orders/${selectedOrder.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          paymentMethod: selectedPaymentMethod, 
          paymentStatus: selectedPaymentMethod === 'CASH' ? 'PENDING' : 'PROCESSING',
          transactionReference: transactionReference.trim() || undefined,
          customerName: selectedOrder.customerName,
          totalAmount: selectedOrder.totalAmount
        }),
      });

      if (res.ok) {
        const invoiceRes = await fetch('/api/invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: selectedOrder.id,
            orderData: {
              ...selectedOrder,
              paymentMethod: selectedPaymentMethod,
              paymentStatus: selectedPaymentMethod === 'CASH' ? 'PENDING' : 'PROCESSING',
              transactionReference: transactionReference.trim() || undefined,
              email: user?.email || selectedOrder.customerName + '@guest.com',
              userId: user?.uid,
            },
          }),
        });

        const methodLabel = selectedPaymentMethod === 'ORANGE_MONEY' ? 'Orange Money' : 
                           selectedPaymentMethod === 'MTN_MONEY' ? 'MTN Money' : 'Cash';
        
        if (selectedPaymentMethod === 'CASH') {
          toast.success(`Payment method set to Cash.`);
        } else {
          toast.success(`Payment submitted via ${methodLabel}! Processing...`);
        }
        
        setPaymentDialogOpen(false);
      } else {
        toast.error('Failed to submit payment');
      }
    } catch {
      toast.error('Failed to submit payment');
    } finally {
      setProcessingPayment(false);
    }
  };

  const downloadInvoice = (invoice: Invoice) => {
    const invoiceText = `
========================================
           THE YARD RESTAURANT
           INVOICE
========================================

Invoice #: ${invoice.invoiceNumber}
Date: ${new Date(invoice.createdAt).toLocaleDateString()}

----------------------------------------
ITEMS:
----------------------------------------
${invoice.items.map(item => `${item.name} x${item.quantity} - ${(item.price * item.quantity).toLocaleString()} XAF`).join('\n')}

----------------------------------------
TOTAL: ${invoice.total.toLocaleString()} XAF
----------------------------------------

Payment Method: ${invoice.paymentMethod}
Payment Status: ${invoice.paymentStatus}

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

  const initials = user?.displayName
    ? user.displayName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : user?.email?.[0]?.toUpperCase() || 'U';

  const selectedMethodDetails = paymentMethods.find(m => m.value === selectedPaymentMethod);

  const formatDate = (date: string | Date | undefined) => {
    if (!date) return 'N/A';
    try {
      return new Date(date).toLocaleDateString();
    } catch {
      return 'N/A';
    }
  };

  const formatTime = (date: string | Date | undefined) => {
    if (!date) return '';
    try {
      return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-stone-900 border-amber-500/30 text-white max-w-4xl p-0 gap-0 max-h-[85vh] flex flex-col">
          {/* Fixed Header */}
          <DialogHeader className="p-4 border-b border-stone-700 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar className="h-12 w-12 border-2 border-amber-500">
                  <AvatarImage src={user?.photoURL || undefined} />
                  <AvatarFallback className="bg-amber-600 text-white">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-amber-400 text-xl">My Dashboard</DialogTitle>
                  <p className="text-stone-400 text-sm">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 px-2 py-1 rounded-full">
                <RefreshCw className="h-3 w-3" />
                <span>Live</span>
              </div>
            </div>
          </DialogHeader>

          {/* Summary Stats Row - Fixed */}
          <div className="grid grid-cols-6 gap-2 p-3 bg-stone-800/50 flex-shrink-0">
            <div className="bg-stone-800 rounded-lg p-2 text-center border border-stone-700">
              <ShoppingCart className="h-4 w-4 mx-auto text-amber-400 mb-1" />
              <p className="text-lg font-bold">{cartItemCount}</p>
              <p className="text-stone-500 text-xs">Cart</p>
            </div>
            <div className="bg-stone-800 rounded-lg p-2 text-center border border-stone-700">
              <Package className="h-4 w-4 mx-auto text-blue-400 mb-1" />
              <p className="text-lg font-bold">{orders.length}</p>
              <p className="text-stone-500 text-xs">Orders</p>
            </div>
            <div className="bg-stone-800 rounded-lg p-2 text-center border border-stone-700">
              <Calendar className="h-4 w-4 mx-auto text-purple-400 mb-1" />
              <p className="text-lg font-bold">{reservations.length}</p>
              <p className="text-stone-500 text-xs">Reserve</p>
            </div>
            <div className="bg-stone-800 rounded-lg p-2 text-center border border-stone-700">
              <Users className="h-4 w-4 mx-auto text-green-400 mb-1" />
              <p className="text-lg font-bold">{events.length}</p>
              <p className="text-stone-500 text-xs">Events</p>
            </div>
            <div className="bg-stone-800 rounded-lg p-2 text-center border border-stone-700">
              <FileText className="h-4 w-4 mx-auto text-pink-400 mb-1" />
              <p className="text-lg font-bold">{invoices.length}</p>
              <p className="text-stone-500 text-xs">Invoices</p>
            </div>
            <div className={`rounded-lg p-2 text-center border ${totalDue > 0 ? 'bg-red-900/30 border-red-500/50' : 'bg-stone-800 border-stone-700'}`}>
              <Wallet className="h-4 w-4 mx-auto text-yellow-400 mb-1" />
              <p className="text-lg font-bold text-yellow-400">{totalDue > 0 ? totalDue.toLocaleString() : '0'}</p>
              <p className="text-stone-500 text-xs">Due</p>
            </div>
          </div>

          {/* Total Due Banner - Fixed */}
          {totalDue > 0 && (
            <div className="mx-3 mt-2 bg-gradient-to-r from-red-900/40 to-orange-900/30 rounded-lg p-3 border border-red-500/30 flex-shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-red-500/20 rounded-full">
                    <Wallet className="h-6 w-6 text-red-400" />
                  </div>
                  <div>
                    <p className="text-stone-400 text-xs">Total Amount Due</p>
                    <p className="text-2xl font-bold text-white">{totalDue.toLocaleString()} XAF</p>
                  </div>
                </div>
                <Button 
                  className="bg-green-600 hover:bg-green-500 text-white"
                  onClick={() => {
                    setSelectedPaymentMethod('');
                    setTransactionReference('');
                    setPayAllDialogOpen(true);
                  }}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Pay All
                </Button>
              </div>
            </div>
          )}

          {/* Tabs - Scrollable Content Area */}
          <Tabs defaultValue="cart" className="flex-1 flex flex-col min-h-0 mt-2">
            <TabsList className="bg-stone-800 mx-3 rounded-lg p-1 flex-shrink-0">
              <TabsTrigger value="cart" className="flex-1 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-stone-400 text-sm py-2">
                <ShoppingCart className="h-4 w-4 mr-1" />
                Cart
              </TabsTrigger>
              <TabsTrigger value="orders" className="flex-1 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-stone-400 text-sm py-2">
                <Package className="h-4 w-4 mr-1" />
                Orders
              </TabsTrigger>
              <TabsTrigger value="reservations" className="flex-1 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-stone-400 text-sm py-2">
                <Calendar className="h-4 w-4 mr-1" />
                Res.
              </TabsTrigger>
              <TabsTrigger value="events" className="flex-1 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-stone-400 text-sm py-2">
                <Users className="h-4 w-4 mr-1" />
                Events
              </TabsTrigger>
              <TabsTrigger value="invoices" className="flex-1 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-stone-400 text-sm py-2">
                <FileText className="h-4 w-4 mr-1" />
                Invoices
              </TabsTrigger>
            </TabsList>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto px-3 pb-3 mt-2">
              {/* Cart Tab */}
              <TabsContent value="cart" className="mt-0 space-y-2">
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin text-amber-400" />
                  </div>
                ) : !cart || cart.items.length === 0 ? (
                  <div className="text-center py-8">
                    <ShoppingCart className="h-12 w-12 mx-auto text-stone-600 mb-3" />
                    <p className="text-stone-400">Your cart is empty</p>
                  </div>
                ) : (
                  <>
                    {cart.items.map((item) => (
                      <div key={item.menuItemId} className="bg-stone-800 rounded-lg p-3 border border-stone-700">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <p className="text-white font-medium text-sm">{item.name}</p>
                            <p className="text-amber-400 font-bold">{item.price.toLocaleString()} XAF</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-6 w-6 border-stone-600 text-stone-300 hover:bg-stone-700"
                                onClick={() => updateCartItem(item.menuItemId, item.quantity - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="w-6 text-center text-white text-sm">{item.quantity}</span>
                              <Button
                                size="icon"
                                variant="outline"
                                className="h-6 w-6 border-stone-600 text-stone-300 hover:bg-stone-700"
                                onClick={() => updateCartItem(item.menuItemId, item.quantity + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                            </div>
                            <p className="text-white font-bold text-sm w-20 text-right">
                              {(item.price * item.quantity).toLocaleString()}
                            </p>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-6 w-6 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                              onClick={() => removeCartItem(item.menuItemId)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    <div className="bg-stone-800 rounded-lg p-3 border border-amber-500/30">
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between text-stone-400">
                          <span>Subtotal</span>
                          <span>{cart.subtotal.toLocaleString()} XAF</span>
                        </div>
                        <div className="flex justify-between text-stone-400">
                          <span>Service (5%)</span>
                          <span>{cart.serviceCharge.toLocaleString()} XAF</span>
                        </div>
                        <div className="flex justify-between text-stone-400">
                          <span>VAT (19.25%)</span>
                          <span>{cart.tax.toLocaleString()} XAF</span>
                        </div>
                        <div className="border-t border-stone-600 pt-1 flex justify-between font-bold">
                          <span className="text-white">Total</span>
                          <span className="text-amber-400">{cart.totalAmount.toLocaleString()} XAF</span>
                        </div>
                      </div>
                      <Button 
                        className="w-full mt-3 bg-amber-600 hover:bg-amber-500 text-white"
                        onClick={() => {
                          onOpenChange(false);
                          window.dispatchEvent(new CustomEvent('openCheckout'));
                        }}
                      >
                        <CreditCard className="h-4 w-4 mr-2" />
                        Checkout
                      </Button>
                    </div>
                  </>
                )}
              </TabsContent>

              {/* Orders Tab */}
              <TabsContent value="orders" className="mt-0 space-y-2">
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin text-amber-400" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 mx-auto text-stone-600 mb-3" />
                    <p className="text-stone-400">No orders yet</p>
                  </div>
                ) : (
                  orders.map((order) => (
                    <div key={order.id} className={`bg-stone-800 rounded-lg p-3 border ${order.paymentStatus !== 'PAID' && order.status !== 'CANCELLED' ? 'border-yellow-500/50' : 'border-stone-700'}`}>
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-amber-400 text-sm">#{order.id.slice(-6).toUpperCase()}</span>
                            <Badge className={`${getStatusColor(order.status)} text-white text-xs`}>
                              {order.status}
                            </Badge>
                            <div className={`flex items-center gap-1 ${getPaymentStatusColor(order.paymentStatus || 'PENDING')}`}>
                              {getPaymentStatusIcon(order.paymentStatus || 'PENDING')}
                              <span className="text-xs">{order.paymentStatus || 'PENDING'}</span>
                            </div>
                          </div>
                          <p className="text-stone-500 text-xs mt-1">
                            {order.type === 'delivery' ? '🚗 Delivery' : '🏪 Pickup'} • {formatDate(order.createdAt)} {formatTime(order.createdAt)}
                          </p>
                          <p className="text-stone-400 text-xs mt-1">
                            {order.items?.slice(0, 2).map((item, i) => (
                              <span key={i}>{item.name} x{item.quantity}{i < Math.min(order.items.length - 1, 1) ? ', ' : ''}</span>
                            ))}
                            {order.items?.length > 2 && <span className="text-stone-500"> +{order.items.length - 2} more</span>}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-white">{order.totalAmount?.toLocaleString()} XAF</p>
                          {order.paymentStatus !== 'PAID' && order.paymentStatus !== 'PROCESSING' && order.status !== 'CANCELLED' && (
                            <Button
                              size="sm"
                              onClick={() => openPaymentDialog(order)}
                              className="bg-amber-600 hover:bg-amber-500 text-white text-xs h-7 mt-1"
                            >
                              <CreditCard className="h-3 w-3 mr-1" />
                              Pay
                            </Button>
                          )}
                          {order.paymentStatus === 'PROCESSING' && (
                            <Badge className="bg-blue-500 text-white text-xs mt-1 animate-pulse">
                              <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                              Processing
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              {/* Reservations Tab */}
              <TabsContent value="reservations" className="mt-0 space-y-2">
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin text-amber-400" />
                  </div>
                ) : reservations.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-stone-600 mb-3" />
                    <p className="text-stone-400">No reservations yet</p>
                  </div>
                ) : (
                  reservations.map((res) => (
                    <div key={res.id} className="bg-stone-800 rounded-lg p-3 border border-stone-700">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{res.partySize} guests</span>
                            <Badge className={`${getStatusColor(res.status)} text-white text-xs`}>
                              {res.status}
                            </Badge>
                          </div>
                          <p className="text-amber-400 text-sm mt-1">
                            📅 {formatDate(res.date)} at {res.time}
                          </p>
                        </div>
                        <span className="font-mono text-stone-500 text-sm">#{res.id.slice(-6).toUpperCase()}</span>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              {/* Events Tab */}
              <TabsContent value="events" className="mt-0 space-y-2">
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin text-amber-400" />
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 mx-auto text-stone-600 mb-3" />
                    <p className="text-stone-400">No event bookings yet</p>
                  </div>
                ) : (
                  events.map((event) => (
                    <div key={event.id} className="bg-stone-800 rounded-lg p-3 border border-stone-700">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-white font-medium">{event.eventType}</span>
                            <Badge className={`${getStatusColor(event.status)} text-white text-xs`}>
                              {event.status}
                            </Badge>
                          </div>
                          <p className="text-stone-400 text-xs mt-1">
                            👥 {event.guestCount} guests • 📅 {formatDate(event.preferredDate)}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-mono text-stone-500 text-sm">#{event.id.slice(-6).toUpperCase()}</span>
                          {event.totalAmount && (
                            <p className="text-amber-400 font-bold text-sm">{event.totalAmount.toLocaleString()} XAF</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              {/* Invoices Tab */}
              <TabsContent value="invoices" className="mt-0 space-y-2">
                {loading ? (
                  <div className="text-center py-8">
                    <Loader2 className="h-8 w-8 mx-auto animate-spin text-amber-400" />
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-stone-600 mb-3" />
                    <p className="text-stone-400">No invoices yet</p>
                  </div>
                ) : (
                  invoices.map((invoice) => (
                    <div key={invoice.id} className="bg-stone-800 rounded-lg p-3 border border-stone-700">
                      <div className="flex justify-between items-center">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-amber-400 text-sm">{invoice.invoiceNumber}</span>
                            <Badge className={`${getStatusColor(invoice.paymentStatus)} text-white text-xs`}>
                              {invoice.paymentStatus}
                            </Badge>
                          </div>
                          <p className="text-stone-500 text-xs mt-1">{formatDate(invoice.createdAt)}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-bold">{invoice.total?.toLocaleString()} XAF</p>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => downloadInvoice(invoice)}
                            className="h-7 border-stone-600 text-stone-300 hover:bg-stone-700"
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>
            </div>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Single Order Payment Dialog */}
      <AlertDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <AlertDialogContent className="bg-stone-800 border-amber-500/30 text-white max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-400">Pay Order #{selectedOrder?.id.slice(-6).toUpperCase()}</AlertDialogTitle>
            <AlertDialogDescription className="text-stone-400">
              Amount: <span className="text-white font-bold">{selectedOrder?.totalAmount?.toLocaleString()} XAF</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-stone-300">Select Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.value}
                    onClick={() => setSelectedPaymentMethod(method.value)}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      selectedPaymentMethod === method.value
                        ? 'border-amber-500 bg-amber-500/20'
                        : 'border-stone-600 bg-stone-700 hover:border-stone-500'
                    }`}
                  >
                    <span className="text-sm font-medium text-white">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {selectedMethodDetails && (selectedPaymentMethod === 'ORANGE_MONEY' || selectedPaymentMethod === 'MTN_MONEY') && (
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${selectedMethodDetails.bgColor} ${selectedMethodDetails.textColor}`}>
                  <p className="text-sm font-medium">Send payment to:</p>
                  <p className="font-bold text-lg">{selectedMethodDetails.accountNumber}</p>
                  <p className="text-xs opacity-75">{selectedMethodDetails.accountName}</p>
                </div>
                <div>
                  <Label className="text-stone-300">Transaction Reference *</Label>
                  <Input
                    value={transactionReference}
                    onChange={(e) => setTransactionReference(e.target.value)}
                    placeholder="Enter reference from your phone"
                    className="bg-stone-700 border-stone-600 mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-stone-700 border-stone-600 text-white hover:bg-stone-600">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePaymentSubmit}
              disabled={processingPayment || !selectedPaymentMethod}
              className="bg-amber-600 hover:bg-amber-500 text-white"
            >
              {processingPayment ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirm Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pay All Dialog */}
      <AlertDialog open={payAllDialogOpen} onOpenChange={setPayAllDialogOpen}>
        <AlertDialogContent className="bg-stone-800 border-amber-500/30 text-white max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-400">Pay All Outstanding</AlertDialogTitle>
            <AlertDialogDescription className="text-stone-400">
              Total to pay: <span className="text-white font-bold text-xl">{totalDue.toLocaleString()} XAF</span>
              <br />
              <span className="text-sm">{unpaidOrders.length} unpaid order(s)</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-stone-300">Select Payment Method</Label>
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.value}
                    onClick={() => setSelectedPaymentMethod(method.value)}
                    className={`p-2 rounded-lg border text-center transition-all ${
                      selectedPaymentMethod === method.value
                        ? 'border-amber-500 bg-amber-500/20'
                        : 'border-stone-600 bg-stone-700 hover:border-stone-500'
                    }`}
                  >
                    <span className="text-sm font-medium text-white">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {selectedMethodDetails && (selectedPaymentMethod === 'ORANGE_MONEY' || selectedPaymentMethod === 'MTN_MONEY') && (
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${selectedMethodDetails.bgColor} ${selectedMethodDetails.textColor}`}>
                  <p className="text-sm font-medium">Send payment to:</p>
                  <p className="font-bold text-lg">{selectedMethodDetails.accountNumber}</p>
                  <p className="text-xs opacity-75">{selectedMethodDetails.accountName}</p>
                </div>
                <div>
                  <Label className="text-stone-300">Transaction Reference *</Label>
                  <Input
                    value={transactionReference}
                    onChange={(e) => setTransactionReference(e.target.value)}
                    placeholder="Enter reference from your phone"
                    className="bg-stone-700 border-stone-600 mt-1"
                  />
                </div>
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="bg-stone-700 border-stone-600 text-white hover:bg-stone-600">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handlePayAll}
              disabled={processingPayment || !selectedPaymentMethod}
              className="bg-green-600 hover:bg-green-500 text-white"
            >
              {processingPayment ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CreditCard className="h-4 w-4 mr-2" />}
              Pay {totalDue.toLocaleString()} XAF
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
