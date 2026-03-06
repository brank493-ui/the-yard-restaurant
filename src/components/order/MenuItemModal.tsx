'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Minus, ShoppingCart, Check } from 'lucide-react';

interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image?: string | null;
  featured: boolean;
}

interface MenuItemModalProps {
  item: MenuItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToCart: (item: MenuItem, quantity: number, notes?: string) => void;
  categoryIcons: Record<string, string>;
}

export function MenuItemModal({ item, open, onOpenChange, onAddToCart, categoryIcons }: MenuItemModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState('');
  const [added, setAdded] = useState(false);

  if (!item) return null;

  const totalPrice = item.price * quantity;

  const handleAddToCart = () => {
    onAddToCart(item, quantity, notes || undefined);
    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      setQuantity(1);
      setNotes('');
      onOpenChange(false);
    }, 800);
  };

  const handleQuantityChange = (delta: number) => {
    setQuantity(prev => Math.max(1, Math.min(prev + delta, 99)));
  };

  const handleClose = () => {
    setQuantity(1);
    setNotes('');
    setAdded(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-stone-900 border-amber-500/30 text-white max-w-md p-0 gap-0 overflow-hidden">
        {/* Image Section */}
        <div className="relative h-56 overflow-hidden">
          <img 
            src={item.image || `/food-${item.category}.png`} 
            alt={item.name} 
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-stone-900 via-transparent to-transparent" />
          <Badge className="absolute top-3 right-3 bg-amber-600 text-white">
            {categoryIcons[item.category]} {item.category}
          </Badge>
          {item.featured && (
            <Badge className="absolute top-3 left-3 bg-red-500 text-white">
              ⭐ Chef's Pick
            </Badge>
          )}
        </div>

        {/* Content Section */}
        <div className="p-4 space-y-4">
          <DialogHeader className="p-0">
            <DialogTitle className="text-amber-400 text-2xl">{item.name}</DialogTitle>
            <DialogDescription className="text-stone-300 text-sm mt-1">
              {item.description}
            </DialogDescription>
          </DialogHeader>

          {/* Price per plate */}
          <div className="flex items-center justify-between py-2 border-y border-stone-700">
            <span className="text-stone-400">Price per plate</span>
            <span className="text-xl font-bold text-white">{item.price.toLocaleString()} XAF</span>
          </div>

          {/* Quantity Selector */}
          <div className="bg-stone-800 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <span className="text-stone-300 font-medium">Number of plates</span>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(-1)}
                  disabled={quantity <= 1}
                  className="h-10 w-10 border-stone-600 text-stone-300 hover:bg-stone-700"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="w-12 text-center text-2xl font-bold text-white">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => handleQuantityChange(1)}
                  disabled={quantity >= 99}
                  className="h-10 w-10 border-stone-600 text-stone-300 hover:bg-stone-700"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Special Notes */}
          <div>
            <label className="text-stone-400 text-sm mb-1 block">Special requests (optional)</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g., Extra sauce, no onions..."
              className="w-full bg-stone-800 border border-stone-700 rounded-lg px-3 py-2 text-white text-sm placeholder:text-stone-500 focus:border-amber-500 focus:outline-none"
            />
          </div>

          {/* Total and Add Button */}
          <Card className="bg-gradient-to-r from-amber-900/30 to-stone-800 border-amber-500/30">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-stone-400 text-sm">Total for {quantity} plate{quantity > 1 ? 's' : ''}</p>
                  <p className="text-2xl font-bold text-amber-400">{totalPrice.toLocaleString()} XAF</p>
                </div>
                <Button
                  onClick={handleAddToCart}
                  disabled={added}
                  className={`h-14 px-6 text-lg font-bold transition-all ${
                    added 
                      ? 'bg-green-500 hover:bg-green-500' 
                      : 'bg-amber-600 hover:bg-amber-500'
                  } text-white`}
                >
                  {added ? (
                    <>
                      <Check className="h-5 w-5 mr-2" />
                      Added!
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-5 w-5 mr-2" />
                      Add to Cart
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
