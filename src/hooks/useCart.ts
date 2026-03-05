'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { notifyCartUpdate, subscribeToSyncEvent, SYNC_EVENTS } from '@/utils/syncEvents';

export interface CartItem {
  id: string;
  menuItemId: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  image?: string;
  notes?: string;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  serviceCharge: number;
  tax: number;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export function useCart() {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch cart from server
  const fetchCart = useCallback(async () => {
    try {
      const userId = user?.uid || 'guest';
      const res = await fetch(`/api/cart?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setCart(data.cart);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  // Load cart on mount or user change
  useEffect(() => {
    fetchCart();
  }, [fetchCart]);

  // Subscribe to cart sync events from other components
  useEffect(() => {
    const unsub = subscribeToSyncEvent(SYNC_EVENTS.CART_UPDATED, (data) => {
      // Only refresh if this event is for this user or guest
      const currentUserId = user?.uid || 'guest';
      if (!data?.userId || data.userId === currentUserId) {
        fetchCart();
      }
    });
    return unsub;
  }, [user?.uid, fetchCart]);

  // Add item to cart
  const addToCart = async (item: { 
    id: string; 
    name: string; 
    description?: string; 
    price: number; 
    image?: string;
  }, quantity: number = 1, notes?: string) => {
    const userId = user?.uid || 'guest';
    
    // Optimistic update
    const tempItem: CartItem = {
      id: item.id,
      menuItemId: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      quantity,
      image: item.image,
      notes,
    };

    setCart(prev => {
      if (!prev) {
        return {
          id: 'temp',
          userId,
          items: [tempItem],
          subtotal: item.price * quantity,
          serviceCharge: Math.round(item.price * quantity * 0.05),
          tax: Math.round(item.price * quantity * 0.1925),
          totalAmount: Math.round(item.price * quantity * 1.2425),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      const existingIndex = prev.items.findIndex(
        i => i.menuItemId === item.id && i.notes === notes
      );

      let newItems: CartItem[];
      if (existingIndex >= 0) {
        newItems = prev.items.map((i, idx) =>
          idx === existingIndex ? { ...i, quantity: i.quantity + quantity } : i
        );
      } else {
        newItems = [...prev.items, tempItem];
      }

      const subtotal = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const serviceCharge = Math.round(subtotal * 0.05);
      const tax = Math.round(subtotal * 0.1925);

      return {
        ...prev,
        items: newItems,
        subtotal,
        serviceCharge,
        tax,
        totalAmount: subtotal + serviceCharge + tax,
        updatedAt: new Date(),
      };
    });

    // Sync with server
    try {
      const res = await fetch('/api/cart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          item: {
            menuItemId: item.id,
            name: item.name,
            description: item.description,
            price: item.price,
            quantity,
            image: item.image,
            notes,
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCart(data.cart);
        // Notify other components about cart update
        notifyCartUpdate(userId);
      }
    } catch (error) {
      console.error('Error adding to cart:', error);
    }

    toast.success(`Added ${quantity}x ${item.name} to cart`);
  };

  // Update item quantity
  const updateQuantity = async (menuItemId: string, quantity: number) => {
    const userId = user?.uid || 'guest';

    // Optimistic update
    setCart(prev => {
      if (!prev) return prev;

      let newItems: CartItem[];
      if (quantity <= 0) {
        newItems = prev.items.filter(i => i.menuItemId !== menuItemId);
      } else {
        newItems = prev.items.map(i =>
          i.menuItemId === menuItemId ? { ...i, quantity } : i
        );
      }

      const subtotal = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const serviceCharge = Math.round(subtotal * 0.05);
      const tax = Math.round(subtotal * 0.1925);

      return {
        ...prev,
        items: newItems,
        subtotal,
        serviceCharge,
        tax,
        totalAmount: subtotal + serviceCharge + tax,
        updatedAt: new Date(),
      };
    });

    // Sync with server
    try {
      await fetch('/api/cart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          menuItemId,
          quantity,
        }),
      });
      // Notify other components about cart update
      notifyCartUpdate(userId);
    } catch (error) {
      console.error('Error updating cart:', error);
    }
  };

  // Remove item from cart
  const removeItem = async (menuItemId: string) => {
    const userId = user?.uid || 'guest';

    // Optimistic update
    setCart(prev => {
      if (!prev) return prev;

      const newItems = prev.items.filter(i => i.menuItemId !== menuItemId);
      const subtotal = newItems.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const serviceCharge = Math.round(subtotal * 0.05);
      const tax = Math.round(subtotal * 0.1925);

      return {
        ...prev,
        items: newItems,
        subtotal,
        serviceCharge,
        tax,
        totalAmount: subtotal + serviceCharge + tax,
        updatedAt: new Date(),
      };
    });

    // Sync with server
    try {
      await fetch('/api/cart', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          menuItemId,
          action: 'remove',
        }),
      });
      toast.success('Item removed from cart');
      // Notify other components about cart update
      notifyCartUpdate(userId);
    } catch (error) {
      console.error('Error removing from cart:', error);
    }
  };

  // Clear cart
  const clearCart = async () => {
    const userId = user?.uid || 'guest';

    setCart(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        items: [],
        subtotal: 0,
        serviceCharge: 0,
        tax: 0,
        totalAmount: 0,
        updatedAt: new Date(),
      };
    });

    try {
      await fetch(`/api/cart?userId=${userId}`, { method: 'DELETE' });
      // Notify other components about cart update
      notifyCartUpdate(userId);
    } catch (error) {
      console.error('Error clearing cart:', error);
    }
  };

  // Item count
  const itemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return {
    cart,
    loading,
    addToCart,
    updateQuantity,
    removeItem,
    clearCart,
    itemCount,
    refetch: fetchCart,
  };
}
