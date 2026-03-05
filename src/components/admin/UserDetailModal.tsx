'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserActivity } from '@/lib/services/adminService';
import { Order, Reservation, EventBooking, PaymentMethod } from '@/lib/types';
import { 
  Package, Calendar, CalendarDays, Star, Mail, Phone, 
  User, Clock, MapPin, Users, DollarSign, CreditCard,
  CheckCircle, FileText
} from 'lucide-react';
import { toast } from 'sonner';

interface UserDetailModalProps {
  user: UserActivity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirmPayment?: (orderId: string, paymentMethod: string) => Promise<void>;
}

const orderStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500 text-black',
  CONFIRMED: 'bg-blue-500 text-white',
  PREPARING: 'bg-indigo-500 text-white',
  READY: 'bg-green-500 text-white',
  COMPLETED: 'bg-stone-500 text-white',
  CANCELLED: 'bg-red-500 text-white',
};

const paymentStatusColors: Record<string, string> = {
  PAID: 'bg-green-500 text-white',
  PENDING: 'bg-yellow-500 text-black',
  PROCESSING: 'bg-orange-500 text-white',
  FAILED: 'bg-red-500 text-white',
};

const reservationStatusColors: Record<string, string> = {
  PENDING: 'bg-yellow-500 text-black',
  CONFIRMED: 'bg-green-500 text-white',
  CANCELLED: 'bg-red-500 text-white',
  COMPLETED: 'bg-stone-500 text-white',
  NO_SHOW: 'bg-red-400 text-white',
};

const eventStatusColors: Record<string, string> = {
  INQUIRY: 'bg-blue-500 text-white',
  QUOTED: 'bg-purple-500 text-white',
  CONFIRMED: 'bg-green-500 text-white',
  CANCELLED: 'bg-red-500 text-white',
  COMPLETED: 'bg-stone-500 text-white',
};

const paymentMethodLabels: Record<string, string> = {
  CASH: '💵 Cash',
  ORANGE_MONEY: '🟠 Orange Money',
  MTN_MONEY: '🟡 MTN Money',
  VISA: '💳 Visa',
  MASTERCARD: '💳 Mastercard',
  STRIPE: '💜 Stripe',
};

function formatCurrency(amount: number): string {
  return `${amount.toLocaleString()} XAF`;
}

function formatTime(date: Date | string): string {
  return new Date(date).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDate(date: Date | string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function UserDetailModal({ 
  user, 
  open, 
  onOpenChange,
  onConfirmPayment 
}: UserDetailModalProps) {
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [confirmingOrderId, setConfirmingOrderId] = useState<string | null>(null);

  if (!user) return null;

  // Calculate payment summary
  const totalAmount = user.totalAmount;
  const paidOrders = user.orders.filter(o => o.paymentStatus === 'PAID');
  const pendingOrders = user.orders.filter(o => o.paymentStatus !== 'PAID');
  const amountPaid = paidOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  const amountPending = pendingOrders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);

  const handleConfirmPayment = async (orderId: string) => {
    if (!selectedPaymentMethod) {
      toast.error('Please select a payment method');
      return;
    }
    
    setConfirmingOrderId(orderId);
    try {
      if (onConfirmPayment) {
        await onConfirmPayment(orderId, selectedPaymentMethod);
      }
    } finally {
      setConfirmingOrderId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] bg-stone-800 border-stone-700 text-white overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-amber-500/20 flex items-center justify-center">
              <span className="text-amber-400 font-bold text-lg">
                {user.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold">{user.name}</h2>
              <div className="flex items-center gap-4 text-stone-400 text-sm font-normal">
                <span className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  {user.email}
                </span>
                {user.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="h-3 w-3" />
                    {user.phone}
                  </span>
                )}
              </div>
            </div>
          </DialogTitle>
        </DialogHeader>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-3 py-4">
          <Card className="bg-stone-700/50 border-stone-600">
            <CardContent className="p-3 text-center">
              <Package className="h-5 w-5 text-amber-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-white">{user.orders.length}</p>
              <p className="text-stone-400 text-xs">Orders</p>
            </CardContent>
          </Card>
          <Card className="bg-stone-700/50 border-stone-600">
            <CardContent className="p-3 text-center">
              <Calendar className="h-5 w-5 text-blue-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-white">{user.reservations.length}</p>
              <p className="text-stone-400 text-xs">Reservations</p>
            </CardContent>
          </Card>
          <Card className="bg-stone-700/50 border-stone-600">
            <CardContent className="p-3 text-center">
              <CalendarDays className="h-5 w-5 text-purple-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-white">{user.events.length}</p>
              <p className="text-stone-400 text-xs">Events</p>
            </CardContent>
          </Card>
          <Card className="bg-stone-700/50 border-stone-600">
            <CardContent className="p-3 text-center">
              <DollarSign className="h-5 w-5 text-green-400 mx-auto mb-1" />
              <p className="text-2xl font-bold text-white">{formatCurrency(user.totalAmount)}</p>
              <p className="text-stone-400 text-xs">Total</p>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="orders" className="flex-1">
          <TabsList className="bg-stone-700 w-full grid grid-cols-5 h-auto p-1">
            <TabsTrigger value="orders" className="data-[state=active]:bg-amber-600 py-2">
              <Package className="h-4 w-4 mr-2" />
              Orders ({user.orders.length})
            </TabsTrigger>
            <TabsTrigger value="reservations" className="data-[state=active]:bg-amber-600 py-2">
              <Calendar className="h-4 w-4 mr-2" />
              Reservations ({user.reservations.length})
            </TabsTrigger>
            <TabsTrigger value="events" className="data-[state=active]:bg-amber-600 py-2">
              <CalendarDays className="h-4 w-4 mr-2" />
              Events ({user.events.length})
            </TabsTrigger>
            <TabsTrigger value="reviews" className="data-[state=active]:bg-amber-600 py-2">
              <Star className="h-4 w-4 mr-2" />
              Reviews
            </TabsTrigger>
            <TabsTrigger value="payment" className="data-[state=active]:bg-amber-600 py-2">
              <CreditCard className="h-4 w-4 mr-2" />
              Payment
            </TabsTrigger>
          </TabsList>

          <div className="mt-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {/* Orders Tab */}
            <TabsContent value="orders" className="mt-0">
              {user.orders.length === 0 ? (
                <div className="text-center py-12 text-stone-400">
                  <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No orders today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {user.orders.map((order) => (
                    <Card key={order.id} className="bg-stone-700/50 border-stone-600">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-mono text-amber-400">#{order.id.slice(-6).toUpperCase()}</span>
                              <Badge className={orderStatusColors[order.status] || 'bg-stone-500'}>
                                {order.status}
                              </Badge>
                              <Badge className={paymentStatusColors[order.paymentStatus || 'PENDING']}>
                                {order.paymentStatus || 'PENDING'}
                              </Badge>
                            </div>
                            <p className="text-stone-400 text-sm mt-1">
                              {order.type === 'delivery' ? '🚗 Delivery' : '🏪 Pickup'} • {formatDate(order.createdAt)} at {formatTime(order.createdAt)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-green-400 font-bold">{formatCurrency(order.totalAmount)}</p>
                            {order.paymentMethod && (
                              <p className="text-stone-400 text-xs">{paymentMethodLabels[order.paymentMethod]}</p>
                            )}
                          </div>
                        </div>
                        <div className="border-t border-stone-600 pt-3">
                          <p className="text-stone-400 text-xs mb-2">Items:</p>
                          <div className="space-y-1">
                            {order.items?.map((item, idx) => (
                              <div key={idx} className="flex justify-between text-sm">
                                <span className="text-white">{item.name} x{item.quantity}</span>
                                <span className="text-stone-300">{formatCurrency(item.price * item.quantity)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Reservations Tab */}
            <TabsContent value="reservations" className="mt-0">
              {user.reservations.length === 0 ? (
                <div className="text-center py-12 text-stone-400">
                  <Calendar className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No reservations today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {user.reservations.map((reservation) => (
                    <Card key={reservation.id} className="bg-stone-700/50 border-stone-600">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/20">
                              <Users className="h-5 w-5 text-blue-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white">{reservation.partySize} guests</span>
                                <Badge className={reservationStatusColors[reservation.status] || 'bg-stone-500'}>
                                  {reservation.status}
                                </Badge>
                              </div>
                              <p className="text-stone-400 text-sm mt-1">
                                <Clock className="h-3 w-3 inline mr-1" />
                                {reservation.date} at {reservation.time}
                              </p>
                              {reservation.specialRequests && (
                                <p className="text-stone-500 text-sm mt-1">
                                  Note: {reservation.specialRequests}
                                </p>
                              )}
                            </div>
                          </div>
                          <span className="font-mono text-stone-500 text-xs">#{reservation.id.slice(-6)}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Events Tab */}
            <TabsContent value="events" className="mt-0">
              {user.events.length === 0 ? (
                <div className="text-center py-12 text-stone-400">
                  <CalendarDays className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>No events today</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {user.events.map((event) => (
                    <Card key={event.id} className="bg-stone-700/50 border-stone-600">
                      <CardContent className="p-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-3">
                            <div className="p-2 rounded-lg bg-purple-500/20">
                              <CalendarDays className="h-5 w-5 text-purple-400" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-white">{event.eventType}</span>
                                <Badge className={eventStatusColors[event.status] || 'bg-stone-500'}>
                                  {event.status}
                                </Badge>
                                {event.paymentStatus && (
                                  <Badge className={paymentStatusColors[event.paymentStatus] || 'bg-stone-500'}>
                                    {event.paymentStatus}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-stone-400 text-sm mt-1">
                                <Users className="h-3 w-3 inline mr-1" />
                                {event.guestCount} guests
                              </p>
                              {event.details && (
                                <p className="text-stone-500 text-sm mt-1">{event.details}</p>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            {event.totalAmount && (
                              <p className="text-green-400 font-bold">{formatCurrency(event.totalAmount)}</p>
                            )}
                            {event.paymentMethod && (
                              <p className="text-stone-400 text-xs">{paymentMethodLabels[event.paymentMethod]}</p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Reviews Tab */}
            <TabsContent value="reviews" className="mt-0">
              <div className="text-center py-12 text-stone-400">
                <Star className="h-12 w-12 mx-auto mb-2 opacity-50" />
                <p>No reviews yet</p>
              </div>
            </TabsContent>

            {/* Payment Tab */}
            <TabsContent value="payment" className="mt-0">
              <div className="space-y-6">
                {/* Payment Summary */}
                <Card className="bg-stone-700/50 border-stone-600">
                  <CardContent className="p-4">
                    <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-green-400" />
                      Payment Summary
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-stone-400">Total Expected:</span>
                          <span className="text-white font-bold">{formatCurrency(totalAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-400">Amount Paid:</span>
                          <span className="text-green-400 font-bold">{formatCurrency(amountPaid)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-400">Amount Pending:</span>
                          <span className="text-orange-400 font-bold">{formatCurrency(amountPending)}</span>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-stone-400">Payment Status:</span>
                          <Badge className={paymentStatusColors[user.paymentStatus]}>
                            {user.paymentStatus}
                          </Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-400">Payment Method:</span>
                          <span className="text-white">
                            {user.paymentMethod ? paymentMethodLabels[user.paymentMethod] : 'Not specified'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Pending Payments */}
                {pendingOrders.length > 0 && (
                  <Card className="bg-stone-700/50 border-stone-600">
                    <CardContent className="p-4">
                      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-orange-400" />
                        Pending Payments ({pendingOrders.length})
                      </h3>
                      
                      {/* Payment Method Selection */}
                      <div className="mb-4">
                        <label className="text-stone-400 text-sm mb-2 block">Select Payment Method:</label>
                        <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                          <SelectTrigger className="bg-stone-700 border-stone-600 text-white">
                            <SelectValue placeholder="Choose payment method" />
                          </SelectTrigger>
                          <SelectContent className="bg-stone-700 border-stone-600">
                            <SelectItem value="CASH">💵 Cash</SelectItem>
                            <SelectItem value="ORANGE_MONEY">🟠 Orange Money</SelectItem>
                            <SelectItem value="MTN_MONEY">🟡 MTN Money</SelectItem>
                            <SelectItem value="VISA">💳 Visa</SelectItem>
                            <SelectItem value="MASTERCARD">💳 Mastercard</SelectItem>
                            <SelectItem value="STRIPE">💜 Stripe</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-3">
                        {pendingOrders.map((order) => (
                          <div key={order.id} className="flex items-center justify-between p-3 bg-stone-600/50 rounded-lg">
                            <div>
                              <p className="text-white font-medium">#{order.id.slice(-6).toUpperCase()}</p>
                              <p className="text-stone-400 text-sm">{order.items?.length || 0} items • {formatDate(order.createdAt)}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="text-green-400 font-bold">{formatCurrency(order.totalAmount)}</span>
                              <Button
                                size="sm"
                                onClick={() => handleConfirmPayment(order.id)}
                                disabled={!selectedPaymentMethod || confirmingOrderId === order.id}
                                className="bg-green-600 hover:bg-green-700 text-white"
                              >
                                {confirmingOrderId === order.id ? (
                                  <>
                                    <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                                    Confirming...
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Confirm
                                  </>
                                )}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Paid Orders */}
                {paidOrders.length > 0 && (
                  <Card className="bg-stone-700/50 border-stone-600">
                    <CardContent className="p-4">
                      <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
                        <FileText className="h-5 w-5 text-green-400" />
                        Paid Orders ({paidOrders.length})
                      </h3>
                      <div className="space-y-2">
                        {paidOrders.map((order) => (
                          <div key={order.id} className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                            <div>
                              <p className="text-white font-medium">#{order.id.slice(-6).toUpperCase()}</p>
                              <p className="text-stone-400 text-sm">{paymentMethodLabels[order.paymentMethod || 'CASH']}</p>
                            </div>
                            <div className="text-right">
                              <span className="text-green-400 font-bold">{formatCurrency(order.totalAmount)}</span>
                              <Badge className="ml-2 bg-green-500 text-white">PAID</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
