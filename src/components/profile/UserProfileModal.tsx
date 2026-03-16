'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useCart } from '@/hooks/useCart';
import { useRealtimeUser } from '@/hooks/useRealtimeUser';
import { PaymentMethodCard, paymentMethodConfig } from '@/components/ui/payment-logos';
import {
  Dialog,
  DialogContent,
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { 
  FileText, Download, CreditCard, Clock, CheckCircle, XCircle, Calendar, 
  Package, Users, Loader2, ShoppingCart, Trash2, Plus, Minus, 
  Wallet, RefreshCw, Zap, Receipt, Utensils, PartyPopper, Settings
} from 'lucide-react';

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
  const { user } = useAuth();
  
  // Use the unified cart hook for real-time cart sync
  const { 
    cart, 
    updateQuantity, 
    removeItem, 
    clearCart,
    itemCount: cartItemCount,
    refetch: refetchCart
  } = useCart();
  
  // Use real-time user data hook
  const { 
    orders, 
    reservations, 
    events, 
    invoices, 
    loading, 
    lastUpdated,
    refresh: refreshUserData 
  } = useRealtimeUser();

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
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [transactionReference, setTransactionReference] = useState('');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Manual refresh function
  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      refetchCart(),
      refreshUserData()
    ]);
    setTimeout(() => setRefreshing(false), 500);
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

  const openPaymentDialog = (order: any) => {
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
      toast.error('Please enter the transaction reference');
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

      const methodLabel = selectedPaymentMethod === 'ORANGE_MONEY' ? 'Orange Money' : 
                         selectedPaymentMethod === 'MTN_MONEY' ? 'MTN Money' : 'Cash';
      
      if (selectedPaymentMethod === 'CASH') {
        toast.success(`Payment set to Cash for ${unpaidOrders.length} orders`);
      } else {
        toast.success(`Payment of ${totalDue.toLocaleString()} XAF submitted via ${methodLabel}!`);
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
      toast.error('Please enter the transaction reference');
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
        }),
      });

      if (res.ok) {
        const methodLabel = selectedPaymentMethod === 'ORANGE_MONEY' ? 'Orange Money' : 
                           selectedPaymentMethod === 'MTN_MONEY' ? 'MTN Money' : 'Cash';
        
        toast.success(`Payment submitted via ${methodLabel}!`);
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

  const downloadInvoice = (invoice: any) => {
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
${invoice.items.map((item: any) => `${item.name} x${item.quantity} - ${(item.price * item.quantity).toLocaleString()} XAF`).join('\n')}

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

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="bg-stone-900 border-amber-500/30 text-white max-w-5xl p-0 gap-0 max-h-[90vh] flex flex-col">
          {/* Header */}
          <DialogHeader className="p-6 border-b border-stone-700 flex-shrink-0 bg-stone-800/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="h-14 w-14 border-2 border-amber-500">
                  <AvatarImage src={user?.photoURL || undefined} />
                  <AvatarFallback className="bg-amber-600 text-white text-lg">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <DialogTitle className="text-amber-400 text-2xl font-serif">My Dashboard</DialogTitle>
                  <p className="text-stone-400 text-sm mt-1">{user?.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleRefresh}
                  disabled={refreshing}
                  className="border-stone-600 text-stone-300 hover:bg-stone-700"
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <div className="flex items-center gap-2 text-xs text-green-400 bg-green-500/10 px-3 py-1.5 rounded-full border border-green-500/30">
                  <Zap className="h-3 w-3" />
                  <span>Live Sync</span>
                </div>
              </div>
            </div>
          </DialogHeader>

          {/* Summary Cards - More Spacious */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 p-6 bg-stone-800/30 flex-shrink-0">
            <Card className="bg-stone-800/60 border-amber-500/20 hover:border-amber-500/40 transition-colors">
              <CardContent className="p-4 text-center">
                <ShoppingCart className="h-8 w-8 mx-auto text-amber-400 mb-2" />
                <p className="text-3xl font-bold text-white">{cartItemCount}</p>
                <p className="text-stone-400 text-sm mt-1">Cart Items</p>
              </CardContent>
            </Card>
            <Card className="bg-stone-800/60 border-blue-500/20 hover:border-blue-500/40 transition-colors">
              <CardContent className="p-4 text-center">
                <Package className="h-8 w-8 mx-auto text-blue-400 mb-2" />
                <p className="text-3xl font-bold text-white">{orders.length}</p>
                <p className="text-stone-400 text-sm mt-1">Orders</p>
              </CardContent>
            </Card>
            <Card className="bg-stone-800/60 border-purple-500/20 hover:border-purple-500/40 transition-colors">
              <CardContent className="p-4 text-center">
                <Calendar className="h-8 w-8 mx-auto text-purple-400 mb-2" />
                <p className="text-3xl font-bold text-white">{reservations.length}</p>
                <p className="text-stone-400 text-sm mt-1">Reservations</p>
              </CardContent>
            </Card>
            <Card className="bg-stone-800/60 border-green-500/20 hover:border-green-500/40 transition-colors">
              <CardContent className="p-4 text-center">
                <PartyPopper className="h-8 w-8 mx-auto text-green-400 mb-2" />
                <p className="text-3xl font-bold text-white">{events.length}</p>
                <p className="text-stone-400 text-sm mt-1">Events</p>
              </CardContent>
            </Card>
            <Card className="bg-stone-800/60 border-pink-500/20 hover:border-pink-500/40 transition-colors">
              <CardContent className="p-4 text-center">
                <FileText className="h-8 w-8 mx-auto text-pink-400 mb-2" />
                <p className="text-3xl font-bold text-white">{invoices.length}</p>
                <p className="text-stone-400 text-sm mt-1">Invoices</p>
              </CardContent>
            </Card>
            <Card className={`border ${totalDue > 0 ? 'bg-red-900/30 border-red-500/50 hover:border-red-500' : 'bg-stone-800/60 border-stone-700'} transition-colors`}>
              <CardContent className="p-4 text-center">
                <Wallet className="h-8 w-8 mx-auto text-yellow-400 mb-2" />
                <p className="text-3xl font-bold text-yellow-400">{totalDue > 0 ? totalDue.toLocaleString() : '0'}</p>
                <p className="text-stone-400 text-sm mt-1">Due (XAF)</p>
              </CardContent>
            </Card>
          </div>

          {/* Total Due Banner - More Prominent */}
          {totalDue > 0 && (
            <div className="mx-6 bg-gradient-to-r from-red-900/40 via-orange-900/30 to-red-900/40 rounded-xl p-5 border border-red-500/30 flex-shrink-0">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-500/20 rounded-full">
                    <Wallet className="h-8 w-8 text-red-400" />
                  </div>
                  <div>
                    <p className="text-stone-400 text-sm">Total Amount Due</p>
                    <p className="text-3xl font-bold text-white">{totalDue.toLocaleString()} XAF</p>
                    <p className="text-stone-500 text-xs mt-1">{unpaidOrders.length} unpaid order(s)</p>
                  </div>
                </div>
                <Button 
                  size="lg"
                  className="bg-green-600 hover:bg-green-500 text-white px-8"
                  onClick={() => {
                    setSelectedPaymentMethod('');
                    setTransactionReference('');
                    setPayAllDialogOpen(true);
                  }}
                >
                  <CreditCard className="h-5 w-5 mr-2" />
                  Pay All Now
                </Button>
              </div>
            </div>
          )}

          {/* Tabs with More Space */}
          <Tabs defaultValue="cart" className="flex-1 flex flex-col min-h-0 mt-2">
            <div className="px-6 flex-shrink-0">
              <TabsList className="bg-stone-800 w-full rounded-lg p-1 h-auto">
                <TabsTrigger value="cart" className="flex-1 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-stone-400 py-3">
                  <ShoppingCart className="h-4 w-4 mr-2" />
                  Cart
                </TabsTrigger>
                <TabsTrigger value="orders" className="flex-1 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-stone-400 py-3">
                  <Package className="h-4 w-4 mr-2" />
                  Orders
                </TabsTrigger>
                <TabsTrigger value="reservations" className="flex-1 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-stone-400 py-3">
                  <Calendar className="h-4 w-4 mr-2" />
                  Reservations
                </TabsTrigger>
                <TabsTrigger value="events" className="flex-1 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-stone-400 py-3">
                  <Users className="h-4 w-4 mr-2" />
                  Events
                </TabsTrigger>
                <TabsTrigger value="invoices" className="flex-1 data-[state=active]:bg-amber-600 data-[state=active]:text-white text-stone-400 py-3">
                  <FileText className="h-4 w-4 mr-2" />
                  Invoices
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Scrollable Content */}
            <ScrollArea className="flex-1 px-6 pb-6 mt-4">
              {/* Cart Tab */}
              <TabsContent value="cart" className="mt-0 space-y-4">
                {loading ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-10 w-10 mx-auto animate-spin text-amber-400" />
                    <p className="mt-4 text-stone-400">Loading cart...</p>
                  </div>
                ) : !cart || cart.items.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto bg-stone-800 rounded-full flex items-center justify-center mb-4">
                      <ShoppingCart className="h-10 w-10 text-stone-600" />
                    </div>
                    <p className="text-stone-400 text-lg">Your cart is empty</p>
                    <p className="text-stone-500 text-sm mt-2">Add items from our menu to get started</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-3">
                      {cart.items.map((item) => (
                        <Card key={item.menuItemId} className="bg-stone-800/60 border-stone-700 hover:border-amber-500/30 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex justify-between items-center gap-4">
                              <div className="flex-1">
                                <p className="text-white font-medium text-lg">{item.name}</p>
                                <p className="text-amber-400 font-bold text-xl mt-1">{item.price.toLocaleString()} XAF</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-9 w-9 border-stone-600 text-stone-300 hover:bg-stone-700"
                                    onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                                  >
                                    <Minus className="h-4 w-4" />
                                  </Button>
                                  <span className="w-10 text-center text-white font-medium text-lg">{item.quantity}</span>
                                  <Button
                                    size="icon"
                                    variant="outline"
                                    className="h-9 w-9 border-stone-600 text-stone-300 hover:bg-stone-700"
                                    onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                                <p className="text-white font-bold text-xl w-28 text-right">
                                  {(item.price * item.quantity).toLocaleString()}
                                </p>
                                <Button
                                  size="icon"
                                  variant="ghost"
                                  className="h-9 w-9 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                  onClick={() => removeItem(item.menuItemId)}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                    
                    {/* Cart Summary */}
                    <Card className="bg-stone-800/80 border-amber-500/30">
                      <CardHeader className="pb-2">
                        <CardTitle className="text-amber-400 text-lg flex items-center gap-2">
                          <Receipt className="h-5 w-5" />
                          Order Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div className="flex justify-between text-stone-400 text-lg">
                          <span>Subtotal</span>
                          <span>{cart.subtotal.toLocaleString()} XAF</span>
                        </div>
                        <div className="flex justify-between text-stone-400 text-lg">
                          <span>Service (5%)</span>
                          <span>{cart.serviceCharge.toLocaleString()} XAF</span>
                        </div>
                        <div className="flex justify-between text-stone-400 text-lg">
                          <span>VAT (19.25%)</span>
                          <span>{cart.tax.toLocaleString()} XAF</span>
                        </div>
                        <Separator className="bg-stone-600" />
                        <div className="flex justify-between font-bold text-xl">
                          <span className="text-white">Total</span>
                          <span className="text-amber-400">{cart.totalAmount.toLocaleString()} XAF</span>
                        </div>
                        <Button 
                          size="lg"
                          className="w-full mt-4 bg-amber-600 hover:bg-amber-500 text-white text-lg py-6"
                          onClick={() => {
                            onOpenChange(false);
                            window.dispatchEvent(new CustomEvent('openCheckout'));
                          }}
                        >
                          <CreditCard className="h-5 w-5 mr-2" />
                          Proceed to Checkout
                        </Button>
                      </CardContent>
                    </Card>
                  </>
                )}
              </TabsContent>

              {/* Orders Tab */}
              <TabsContent value="orders" className="mt-0 space-y-4">
                {loading ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-10 w-10 mx-auto animate-spin text-amber-400" />
                  </div>
                ) : orders.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto bg-stone-800 rounded-full flex items-center justify-center mb-4">
                      <Package className="h-10 w-10 text-stone-600" />
                    </div>
                    <p className="text-stone-400 text-lg">No orders yet</p>
                    <p className="text-stone-500 text-sm mt-2">Place your first order from our menu</p>
                  </div>
                ) : (
                  orders.map((order) => (
                    <Card key={order.id} className={`bg-stone-800/60 border ${order.paymentStatus !== 'PAID' && order.status !== 'CANCELLED' ? 'border-yellow-500/50 hover:border-yellow-400' : 'border-stone-700 hover:border-stone-600'} transition-colors`}>
                      <CardContent className="p-5">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <span className="font-mono text-amber-400 text-lg">#{order.id.slice(-6).toUpperCase()}</span>
                              <Badge className={`${getStatusColor(order.status)} text-white px-3 py-1`}>
                                {order.status}
                              </Badge>
                              <div className={`flex items-center gap-2 ${getPaymentStatusColor(order.paymentStatus || 'PENDING')}`}>
                                {getPaymentStatusIcon(order.paymentStatus || 'PENDING')}
                                <span className="font-medium">{order.paymentStatus || 'PENDING'}</span>
                              </div>
                            </div>
                            <p className="text-stone-400 text-sm mt-2">
                              {order.type === 'delivery' ? '🚗 Delivery' : '🏪 Pickup'} • {formatDate(order.createdAt)}
                            </p>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {order.items?.map((item, i) => (
                                <Badge key={i} variant="outline" className="border-stone-600 text-stone-300">
                                  {item.name} x{item.quantity}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-3">
                            <p className="text-2xl font-bold text-white">{order.totalAmount?.toLocaleString()} XAF</p>
                            {order.paymentStatus !== 'PAID' && order.paymentStatus !== 'PROCESSING' && order.status !== 'CANCELLED' && (
                              <Button
                                size="lg"
                                onClick={() => openPaymentDialog(order)}
                                className="bg-amber-600 hover:bg-amber-500 text-white"
                              >
                                <CreditCard className="h-4 w-4 mr-2" />
                                Pay Now
                              </Button>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Reservations Tab */}
              <TabsContent value="reservations" className="mt-0 space-y-4">
                {loading ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-10 w-10 mx-auto animate-spin text-amber-400" />
                  </div>
                ) : reservations.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto bg-stone-800 rounded-full flex items-center justify-center mb-4">
                      <Calendar className="h-10 w-10 text-stone-600" />
                    </div>
                    <p className="text-stone-400 text-lg">No reservations yet</p>
                    <p className="text-stone-500 text-sm mt-2">Book a table to get started</p>
                  </div>
                ) : (
                  reservations.map((res) => (
                    <Card key={res.id} className="bg-stone-800/60 border-stone-700 hover:border-purple-500/30 transition-colors">
                      <CardContent className="p-5">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="text-white font-medium text-xl">{res.partySize} guests</span>
                              <Badge className={`${getStatusColor(res.status)} text-white px-3 py-1`}>
                                {res.status}
                              </Badge>
                            </div>
                            <p className="text-amber-400 text-lg mt-2">
                              📅 {formatDate(res.date)} at {res.time}
                            </p>
                          </div>
                          <span className="font-mono text-stone-500 text-sm">#{res.id.slice(-6).toUpperCase()}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Events Tab */}
              <TabsContent value="events" className="mt-0 space-y-4">
                {loading ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-10 w-10 mx-auto animate-spin text-amber-400" />
                  </div>
                ) : events.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto bg-stone-800 rounded-full flex items-center justify-center mb-4">
                      <Users className="h-10 w-10 text-stone-600" />
                    </div>
                    <p className="text-stone-400 text-lg">No event bookings yet</p>
                    <p className="text-stone-500 text-sm mt-2">Plan your special occasion with us</p>
                  </div>
                ) : (
                  events.map((event) => (
                    <Card key={event.id} className="bg-stone-800/60 border-stone-700 hover:border-green-500/30 transition-colors">
                      <CardContent className="p-5">
                        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="text-white font-medium text-xl">{event.eventType}</span>
                              <Badge className={`${getStatusColor(event.status)} text-white px-3 py-1`}>
                                {event.status}
                              </Badge>
                            </div>
                            <p className="text-stone-400 text-sm mt-2">
                              👥 {event.guestCount} guests • 📅 {formatDate(event.preferredDate)}
                            </p>
                          </div>
                          <div className="text-right">
                            <span className="font-mono text-stone-500 text-sm">#{event.id.slice(-6).toUpperCase()}</span>
                            {event.totalAmount && (
                              <p className="text-amber-400 font-bold text-xl mt-1">{event.totalAmount.toLocaleString()} XAF</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>

              {/* Invoices Tab */}
              <TabsContent value="invoices" className="mt-0 space-y-4">
                {loading ? (
                  <div className="text-center py-12">
                    <Loader2 className="h-10 w-10 mx-auto animate-spin text-amber-400" />
                  </div>
                ) : invoices.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-20 h-20 mx-auto bg-stone-800 rounded-full flex items-center justify-center mb-4">
                      <FileText className="h-10 w-10 text-stone-600" />
                    </div>
                    <p className="text-stone-400 text-lg">No invoices yet</p>
                    <p className="text-stone-500 text-sm mt-2">Invoices appear after payment confirmation</p>
                  </div>
                ) : (
                  invoices.map((invoice) => (
                    <Card key={invoice.id} className="bg-stone-800/60 border-stone-700 hover:border-pink-500/30 transition-colors">
                      <CardContent className="p-5">
                        <div className="flex justify-between items-center">
                          <div>
                            <div className="flex items-center gap-3">
                              <span className="font-mono text-amber-400 text-lg">{invoice.invoiceNumber}</span>
                              <Badge className={`${getStatusColor(invoice.paymentStatus)} text-white px-3 py-1`}>
                                {invoice.paymentStatus}
                              </Badge>
                            </div>
                            <p className="text-stone-400 text-sm mt-2">{formatDate(invoice.createdAt)}</p>
                          </div>
                          <div className="flex items-center gap-4">
                            <p className="text-2xl font-bold text-white">{invoice.total?.toLocaleString()} XAF</p>
                            <Button
                              size="lg"
                              variant="outline"
                              onClick={() => downloadInvoice(invoice)}
                              className="border-stone-600 text-stone-300 hover:bg-stone-700"
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </TabsContent>
            </ScrollArea>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <AlertDialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <AlertDialogContent className="bg-stone-800 border-amber-500/30 text-white max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-400 text-xl">Pay Order #{selectedOrder?.id?.slice(-6).toUpperCase()}</AlertDialogTitle>
            <AlertDialogDescription className="text-stone-400 text-lg">
              Amount: <span className="text-white font-bold">{selectedOrder?.totalAmount?.toLocaleString()} XAF</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-5 py-4">
            <div className="space-y-3">
              <Label className="text-stone-300 text-lg">Select Payment Method</Label>
              <div className="grid grid-cols-3 gap-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method.value}
                    onClick={() => setSelectedPaymentMethod(method.value)}
                    className={`p-4 rounded-lg border text-center transition-all ${
                      selectedPaymentMethod === method.value
                        ? 'border-amber-500 bg-amber-500/20 ring-2 ring-amber-500/50'
                        : 'border-stone-600 bg-stone-700 hover:border-stone-500'
                    }`}
                  >
                    <span className="text-base font-medium text-white">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {selectedMethodDetails && (selectedPaymentMethod === 'ORANGE_MONEY' || selectedPaymentMethod === 'MTN_MONEY') && (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${selectedMethodDetails.bgColor} ${selectedMethodDetails.textColor}`}>
                  <p className="text-sm font-medium">Send payment to:</p>
                  <p className="font-bold text-2xl">{selectedMethodDetails.accountNumber}</p>
                  <p className="text-sm opacity-75">{selectedMethodDetails.accountName}</p>
                </div>
                <div>
                  <Label className="text-stone-300 text-lg">Transaction Reference *</Label>
                  <Input
                    value={transactionReference}
                    onChange={(e) => setTransactionReference(e.target.value)}
                    placeholder="Enter reference"
                    className="bg-stone-700 border-stone-600 mt-2 text-lg py-6"
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
              className="bg-amber-600 hover:bg-amber-500 text-white px-8 py-6 text-lg"
            >
              {processingPayment ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              Confirm Payment
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Pay All Dialog */}
      <AlertDialog open={payAllDialogOpen} onOpenChange={setPayAllDialogOpen}>
        <AlertDialogContent className="bg-stone-800 border-amber-500/30 text-white max-w-lg">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-amber-400 text-xl">Pay All Outstanding</AlertDialogTitle>
            <AlertDialogDescription className="text-stone-400">
              Total: <span className="text-white font-bold text-2xl">{totalDue.toLocaleString()} XAF</span>
              <br />
              <span className="text-base">{unpaidOrders.length} unpaid order(s)</span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-5 py-4">
            <div className="space-y-3">
              <Label className="text-stone-300 text-lg">Select Payment Method</Label>
              <div className="grid grid-cols-3 gap-3">
                {paymentMethods.map((method) => (
                  <button
                    key={method.value}
                    onClick={() => setSelectedPaymentMethod(method.value)}
                    className={`p-4 rounded-lg border text-center transition-all ${
                      selectedPaymentMethod === method.value
                        ? 'border-amber-500 bg-amber-500/20 ring-2 ring-amber-500/50'
                        : 'border-stone-600 bg-stone-700 hover:border-stone-500'
                    }`}
                  >
                    <span className="text-base font-medium text-white">{method.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {selectedMethodDetails && (selectedPaymentMethod === 'ORANGE_MONEY' || selectedPaymentMethod === 'MTN_MONEY') && (
              <div className="space-y-4">
                <div className={`p-4 rounded-lg ${selectedMethodDetails.bgColor} ${selectedMethodDetails.textColor}`}>
                  <p className="text-sm font-medium">Send payment to:</p>
                  <p className="font-bold text-2xl">{selectedMethodDetails.accountNumber}</p>
                </div>
                <div>
                  <Label className="text-stone-300 text-lg">Transaction Reference *</Label>
                  <Input
                    value={transactionReference}
                    onChange={(e) => setTransactionReference(e.target.value)}
                    placeholder="Enter reference"
                    className="bg-stone-700 border-stone-600 mt-2 text-lg py-6"
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
              className="bg-amber-600 hover:bg-amber-500 text-white px-8 py-6 text-lg"
            >
              {processingPayment ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
              Pay {totalDue.toLocaleString()} XAF
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
