'use client';

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Order, PaymentMethod } from '@/lib/types';
import { 
  CreditCard, AlertCircle, CheckCircle, Loader2, DollarSign, 
  User, Phone, Package 
} from 'lucide-react';
import { toast } from 'sonner';

interface PaymentConfirmModalProps {
  order: Order | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (orderId: string, paymentMethod: PaymentMethod) => Promise<{ success: boolean; error?: string }>;
}

const paymentMethods: { value: PaymentMethod; label: string; icon: string; color: string }[] = [
  { value: 'CASH', label: 'Cash', icon: '💵', color: 'bg-green-500' },
  { value: 'ORANGE_MONEY', label: 'Orange Money', icon: '🟠', color: 'bg-orange-500' },
  { value: 'MTN_MONEY', label: 'MTN Money', icon: '🟡', color: 'bg-yellow-500' },
  { value: 'VISA', label: 'Visa', icon: '💳', color: 'bg-blue-600' },
  { value: 'MASTERCARD', label: 'Mastercard', icon: '💳', color: 'bg-red-600' },
  { value: 'STRIPE', label: 'Stripe', icon: '💜', color: 'bg-purple-600' },
];

export default function PaymentConfirmModal({ 
  order, 
  open, 
  onOpenChange, 
  onConfirm 
}: PaymentConfirmModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | ''>('');
  const [isConfirming, setIsConfirming] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleConfirm = async () => {
    if (!order || !selectedMethod) {
      toast.error('Please select a payment method');
      return;
    }

    setIsConfirming(true);
    try {
      const result = await onConfirm(order.id, selectedMethod);
      if (result.success) {
        setIsSuccess(true);
        toast.success('Payment confirmed successfully!');
        setTimeout(() => {
          onOpenChange(false);
          setIsSuccess(false);
          setSelectedMethod('');
        }, 2000);
      } else {
        toast.error(result.error || 'Failed to confirm payment');
      }
    } catch (error) {
      toast.error('An error occurred');
    } finally {
      setIsConfirming(false);
    }
  };

  const handleClose = () => {
    if (!isConfirming) {
      onOpenChange(false);
      setIsSuccess(false);
      setSelectedMethod('');
    }
  };

  if (!order) return null;

  const totalAmount = order.totalAmount || 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md bg-stone-800 border-stone-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-amber-400">
            <CreditCard className="h-5 w-5" />
            Confirm Payment
          </DialogTitle>
          <DialogDescription className="text-stone-400">
            Review the payment details and confirm
          </DialogDescription>
        </DialogHeader>

        {isSuccess ? (
          <div className="py-8 text-center">
            <div className="h-16 w-16 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Payment Confirmed!</h3>
            <p className="text-stone-400">Invoice has been generated and user notified.</p>
          </div>
        ) : (
          <>
            {/* Order Summary */}
            <Card className="bg-stone-700/50 border-stone-600">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-amber-400">#{order.id.slice(-6).toUpperCase()}</span>
                      <Badge className="bg-yellow-500 text-black text-xs">
                        {order.paymentStatus || 'PENDING'}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-green-400">{totalAmount.toLocaleString()} XAF</p>
                    <p className="text-stone-500 text-xs">Total Amount</p>
                  </div>
                </div>

                <div className="border-t border-stone-600 pt-3 space-y-2">
                  <div className="flex items-center gap-2 text-stone-300 text-sm">
                    <User className="h-4 w-4 text-stone-400" />
                    {order.customerName}
                  </div>
                  <div className="flex items-center gap-2 text-stone-300 text-sm">
                    <Phone className="h-4 w-4 text-stone-400" />
                    {order.phone}
                  </div>
                  <div className="flex items-center gap-2 text-stone-300 text-sm">
                    <Package className="h-4 w-4 text-stone-400" />
                    {order.items?.length || 0} items • {order.type}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Method Selection */}
            <div className="space-y-3">
              <label className="text-stone-300 text-sm font-medium">Select Payment Method</label>
              <Select value={selectedMethod} onValueChange={(v) => setSelectedMethod(v as PaymentMethod)}>
                <SelectTrigger className="bg-stone-700 border-stone-600 text-white">
                  <SelectValue placeholder="Choose payment method" />
                </SelectTrigger>
                <SelectContent className="bg-stone-700 border-stone-600">
                  {paymentMethods.map((method) => (
                    <SelectItem key={method.value} value={method.value} className="text-white">
                      <span className="flex items-center gap-2">
                        <span>{method.icon}</span>
                        <span>{method.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Quick Select Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {paymentMethods.slice(0, 3).map((method) => (
                  <Button
                    key={method.value}
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedMethod(method.value)}
                    className={`h-auto py-2 flex-col ${
                      selectedMethod === method.value 
                        ? 'border-amber-500 bg-amber-500/10 text-amber-400' 
                        : 'border-stone-600 text-stone-300 hover:bg-stone-700'
                    }`}
                  >
                    <span className="text-lg">{method.icon}</span>
                    <span className="text-xs mt-1">{method.label}</span>
                  </Button>
                ))}
              </div>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 p-3 bg-amber-500/10 rounded-lg border border-amber-500/30">
              <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="text-amber-400 font-medium">Please verify</p>
                <p className="text-stone-400 text-xs">
                  Make sure you have received the payment before confirming. This action will notify the user and generate an invoice.
                </p>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={isConfirming}
                className="border-stone-600 text-stone-300 hover:bg-stone-700"
              >
                Cancel
              </Button>
              <Button
                onClick={handleConfirm}
                disabled={isConfirming || !selectedMethod}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {isConfirming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Confirming...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Confirm Payment
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
