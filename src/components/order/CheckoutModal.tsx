'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CreditCard, Loader2, CheckCircle, Smartphone, Building, Wallet } from 'lucide-react';
import { toast } from 'sonner';
import { paymentMethodConfig } from '@/components/ui/payment-logos';
import { notifyOrderCreated, notifyCartUpdate } from '@/utils/syncEvents';

interface CartItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  image?: string;
  notes?: string;
}

interface CheckoutModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  cartTotal: number;
  user: any;
  userData: any;
  onOrderComplete: () => void;
}

const paymentMethods = [
  { value: 'CASH', label: 'Cash', icon: '💵', description: 'Pay at counter/table' },
  { value: 'ORANGE_MONEY', label: 'Orange Money', icon: '🟠', description: paymentMethodConfig.ORANGE_MONEY.accountNumber },
  { value: 'MTN_MONEY', label: 'MTN Money', icon: '🟡', description: paymentMethodConfig.MTN_MONEY.accountNumber },
  { value: 'VISA', label: 'Visa Card', icon: '💳', description: 'Pay with Visa card' },
  { value: 'MASTERCARD', label: 'Mastercard', icon: '💳', description: 'Pay with Mastercard' },
  { value: 'STRIPE', label: 'Stripe', icon: '🔷', description: 'Online payment via Stripe' },
];

export function CheckoutModal({ open, onOpenChange, cart, cartTotal, user, userData, onOrderComplete }: CheckoutModalProps) {
  const [form, setForm] = useState({
    customerName: userData?.name || '',
    phone: userData?.phone || '',
    tableNumber: '',
    orderType: 'dine-in',
    paymentMethod: 'CASH',
    transactionReference: '',
  });
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const subtotal = cartTotal;
  const serviceCharge = Math.round(subtotal * 0.05);
  const tax = Math.round(subtotal * 0.1925);
  const totalAmount = subtotal + serviceCharge + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.customerName.trim()) {
      toast.error('Please enter your name');
      return;
    }
    if (!form.phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }
    if (form.orderType === 'dine-in' && !form.tableNumber.trim()) {
      toast.error('Please enter your table number');
      return;
    }
    if ((form.paymentMethod === 'ORANGE_MONEY' || form.paymentMethod === 'MTN_MONEY') && !form.transactionReference.trim()) {
      toast.error('Please enter the transaction reference');
      return;
    }

    setProcessing(true);

    try {
      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName: form.customerName,
          phone: form.phone,
          tableNumber: form.orderType === 'dine-in' ? form.tableNumber : null,
          type: form.orderType,
          items: cart.map(item => ({
            menuItemId: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            notes: item.notes,
          })),
          subtotal,
          serviceCharge,
          tax,
          totalAmount,
          paymentMethod: form.paymentMethod,
          paymentStatus: form.paymentMethod === 'CASH' ? 'PENDING' : 'PROCESSING',
          transactionReference: form.transactionReference || null,
          userId: user?.uid || null,
          email: user?.email || null,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSuccess(true);
        toast.success('Order placed successfully!');
        
        // Generate invoice for non-cash payments
        if (form.paymentMethod !== 'CASH') {
          await fetch('/api/invoices', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              orderId: data.order.id,
              orderData: {
                ...data.order,
                customerEmail: user?.email,
                userId: user?.uid,
              },
            }),
          });
        }

        // Notify other components about the new order and cart clear
        notifyOrderCreated(data.order.id, user?.uid);
        notifyCartUpdate(user?.uid || 'guest');

        setTimeout(() => {
          setSuccess(false);
          setForm({
            customerName: '',
            phone: '',
            tableNumber: '',
            orderType: 'dine-in',
            paymentMethod: 'CASH',
            transactionReference: '',
          });
          onOrderComplete();
          onOpenChange(false);
        }, 1500);
      } else {
        toast.error('Failed to place order');
      }
    } catch (error) {
      console.error('Order error:', error);
      toast.error('Failed to place order');
    } finally {
      setProcessing(false);
    }
  };

  const selectedPayment = paymentMethods.find(m => m.value === form.paymentMethod);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-stone-900 border-amber-500/30 text-white max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-amber-400 text-2xl">Checkout</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="text-center py-12">
            <CheckCircle className="h-20 w-20 mx-auto text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Order Placed!</h2>
            <p className="text-stone-400">Your order has been submitted successfully.</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            {/* Order Summary */}
            <Card className="bg-stone-800 border-stone-700">
              <CardContent className="p-4">
                <h3 className="font-bold text-amber-400 mb-3">Order Summary</h3>
                <div className="space-y-2">
                  {cart.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span className="text-stone-300">
                        {item.name} <span className="text-amber-400">x{item.quantity}</span>
                        {item.notes && <span className="text-stone-500 text-xs ml-1">({item.notes})</span>}
                      </span>
                      <span className="text-white">{(item.price * item.quantity).toLocaleString()} XAF</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-stone-600 mt-3 pt-3 space-y-1 text-sm">
                  <div className="flex justify-between text-stone-400">
                    <span>Subtotal</span>
                    <span>{subtotal.toLocaleString()} XAF</span>
                  </div>
                  <div className="flex justify-between text-stone-400">
                    <span>Service Charge (5%)</span>
                    <span>{serviceCharge.toLocaleString()} XAF</span>
                  </div>
                  <div className="flex justify-between text-stone-400">
                    <span>VAT (19.25%)</span>
                    <span>{tax.toLocaleString()} XAF</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2">
                    <span className="text-white">Total</span>
                    <span className="text-amber-400">{totalAmount.toLocaleString()} XAF</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Customer Details */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-stone-300">Your Name *</Label>
                <Input
                  value={form.customerName}
                  onChange={(e) => setForm({ ...form, customerName: e.target.value })}
                  placeholder="Enter your name"
                  className="bg-stone-800 border-stone-700 mt-1"
                />
              </div>
              <div>
                <Label className="text-stone-300">Phone Number *</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+237 xxx xxx xxx"
                  className="bg-stone-800 border-stone-700 mt-1"
                />
              </div>
            </div>

            {/* Order Type */}
            <div>
              <Label className="text-stone-300">Order Type *</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {[
                  { value: 'dine-in', label: '🍽️ Dine In', desc: 'Eat at restaurant' },
                  { value: 'pickup', label: '🥡 Pickup', desc: 'Take away' },
                  { value: 'delivery', label: '🚗 Delivery', desc: 'We deliver to you' },
                ].map((type) => (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setForm({ ...form, orderType: type.value })}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      form.orderType === type.value
                        ? 'border-amber-500 bg-amber-500/20'
                        : 'border-stone-700 bg-stone-800 hover:border-stone-600'
                    }`}
                  >
                    <div className="text-lg">{type.label}</div>
                    <div className="text-xs text-stone-400">{type.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Table Number (for dine-in) */}
            {form.orderType === 'dine-in' && (
              <div>
                <Label className="text-stone-300">Table Number *</Label>
                <Input
                  value={form.tableNumber}
                  onChange={(e) => setForm({ ...form, tableNumber: e.target.value })}
                  placeholder="e.g., T1, T2, T3..."
                  className="bg-stone-800 border-stone-700 mt-1"
                />
              </div>
            )}

            {/* Payment Method */}
            <div>
              <Label className="text-stone-300">Payment Method *</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                {paymentMethods.map((method) => (
                  <button
                    key={method.value}
                    type="button"
                    onClick={() => setForm({ ...form, paymentMethod: method.value })}
                    className={`p-3 rounded-lg border text-center transition-all ${
                      form.paymentMethod === method.value
                        ? 'border-amber-500 bg-amber-500/20'
                        : 'border-stone-700 bg-stone-800 hover:border-stone-600'
                    }`}
                  >
                    <div className="text-2xl mb-1">{method.icon}</div>
                    <div className="text-sm font-medium text-white">{method.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile Money Instructions */}
            {(form.paymentMethod === 'ORANGE_MONEY' || form.paymentMethod === 'MTN_MONEY') && (
              <Card className={`${form.paymentMethod === 'ORANGE_MONEY' ? 'bg-orange-900/30 border-orange-500/30' : 'bg-yellow-900/30 border-yellow-500/30'}`}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Smartphone className="h-5 w-5 text-amber-400" />
                    <span className="font-bold text-white">{selectedPayment?.label} Payment</span>
                  </div>
                  <p className="text-stone-300 text-sm mb-2">
                    Send <span className="font-bold text-amber-400">{totalAmount.toLocaleString()} XAF</span> to:
                  </p>
                  <p className="text-xl font-bold text-white">{selectedPayment?.description}</p>
                  <p className="text-xs text-stone-400 mt-2">Account Name: The Yard Restaurant</p>
                  <div className="mt-3">
                    <Label className="text-stone-300 text-sm">Transaction Reference *</Label>
                    <Input
                      value={form.transactionReference}
                      onChange={(e) => setForm({ ...form, transactionReference: e.target.value })}
                      placeholder="Enter the reference from your phone"
                      className="bg-stone-800 border-stone-700 mt-1"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Card Payment Info */}
            {(form.paymentMethod === 'VISA' || form.paymentMethod === 'MASTERCARD' || form.paymentMethod === 'STRIPE') && (
              <Card className="bg-blue-900/30 border-blue-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="h-5 w-5 text-blue-400" />
                    <span className="font-bold text-white">Card Payment</span>
                  </div>
                  <p className="text-stone-300 text-sm">
                    A payment link will be sent to your email. Your order will be processed after payment confirmation.
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline" className="border-stone-600 text-stone-400">
                      <Building className="h-3 w-3 mr-1" />
                      Secure Payment
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Cash Payment Info */}
            {form.paymentMethod === 'CASH' && (
              <Card className="bg-green-900/30 border-green-500/30">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-green-400" />
                    <div>
                      <span className="font-bold text-white">Cash Payment</span>
                      <p className="text-stone-300 text-sm">
                        {form.orderType === 'dine-in' 
                          ? 'Pay at your table when your order is served.'
                          : form.orderType === 'pickup'
                          ? 'Pay when you pick up your order.'
                          : 'Pay when your order is delivered.'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={processing}
              className="w-full h-14 bg-amber-600 hover:bg-amber-500 text-white text-lg font-bold"
            >
              {processing ? (
                <>
                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 mr-2" />
                  Confirm Order - {totalAmount.toLocaleString()} XAF
                </>
              )}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
