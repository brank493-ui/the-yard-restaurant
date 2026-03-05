'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

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

interface CartContextType {
  cart: Cart | null;
  loading: boolean;
  addToCart: (item: { 
    id: string; 
    name: string; 
    description?: string; 
    price: number; 
    image?: string;
  }, quantity?: number, notes?: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  removeItem: (menuItemId: string) => void;
  clearCart: () => void;
  itemCount: number;
  refetch: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

// Local storage key for guest cart
const GUEST_CART_KEY = 'yard_guest_cart';

// Get guest cart from local storage
function getGuestCartFromStorage(): Cart | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(GUEST_CART_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error('Error reading guest cart from storage:', e);
  }
  return null;
}

// Save guest cart to local storage
function saveGuestCartToStorage(cart: Cart | null) {
  if (typeof window === 'undefined') return;
  try {
    if (cart) {
      localStorage.setItem(GUEST_CART_KEY, JSON.stringify(cart));
    } else {
      localStorage.removeItem(GUEST_CART_KEY);
    }
  } catch (e) {
    console.error('Error saving guest cart to storage:', e);
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
  const isUpdatingRef = useRef(false);

  // Calculate cart totals
  const calculateTotals = (items: CartItem[]) => {
    const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const serviceCharge = Math.round(subtotal * 0.05);
    const tax = Math.round(subtotal * 0.1925);
    return { subtotal, serviceCharge, tax, totalAmount: subtotal + serviceCharge + tax };
  };

  // Fetch cart from server (only for logged-in users)
  const fetchCart = useCallback(async () => {
    // Skip fetching if we're in the middle of an update
    if (isUpdatingRef.current) return;
    
    // For guest users, use local storage
    if (!user) {
      const storedCart = getGuestCartFromStorage();
      setCart(storedCart);
      setLoading(false);
      return;
    }

    try {
      const res = await fetch(`/api/cart?userId=${user.uid}`);
      if (res.ok) {
        const data = await res.json();
        // Only update if server cart has items or our local cart is empty
        setCart(prev => {
          if (data.cart?.items?.length > 0) {
            return data.cart;
          }
          // Keep local cart if server cart is empty
          return prev;
        });
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Load cart on mount or user change
  useEffect(() => {
    if (!user) {
      // Guest user - load from local storage
      const storedCart = getGuestCartFromStorage();
      setCart(storedCart);
      setLoading(false);
      return;
    }
    fetchCart();
  }, [user, fetchCart]);

  // Add item to cart
  const addToCart = useCallback(async (item: { 
    id: string; 
    name: string; 
    description?: string; 
    price: number; 
    image?: string;
  }, quantity: number = 1, notes?: string) => {
    isUpdatingRef.current = true;
    
    const userId = user?.uid || 'guest';
    
    // Create the new item
    const newItem: CartItem = {
      id: item.id,
      menuItemId: item.id,
      name: item.name,
      description: item.description,
      price: item.price,
      quantity,
      image: item.image,
      notes,
    };

    // Update cart locally first
    setCart(prev => {
      let newItems: CartItem[];
      
      if (!prev || !prev.items) {
        newItems = [newItem];
      } else {
        const existingIndex = prev.items.findIndex(
          i => i.menuItemId === item.id && i.notes === notes
        );

        if (existingIndex >= 0) {
          newItems = prev.items.map((i, idx) =>
            idx === existingIndex ? { ...i, quantity: i.quantity + quantity } : i
          );
        } else {
          newItems = [...prev.items, newItem];
        }
      }

      const totals = calculateTotals(newItems);
      
      const newCart: Cart = {
        id: prev?.id || `cart_${Date.now()}`,
        userId,
        items: newItems,
        ...totals,
        createdAt: prev?.createdAt || new Date(),
        updatedAt: new Date(),
      };

      // Save to local storage for guests
      if (!user) {
        saveGuestCartToStorage(newCart);
      }

      return newCart;
    });

    // Sync with server only for logged-in users
    if (user) {
      try {
        const res = await fetch('/api/cart', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
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
          // Only update if server has items
          if (data.cart?.items?.length > 0) {
            setCart(data.cart);
          }
        }
      } catch (error) {
        console.error('Error adding to cart:', error);
      }
    }

    // Reset updating flag after a short delay
    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 500);

    toast.success(`Added ${quantity}x ${item.name} to cart`);
  }, [user]);

  // Update item quantity
  const updateQuantity = useCallback(async (menuItemId: string, quantity: number) => {
    isUpdatingRef.current = true;
    const userId = user?.uid || 'guest';

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

      const totals = calculateTotals(newItems);
      
      const newCart: Cart = {
        ...prev,
        items: newItems,
        ...totals,
        updatedAt: new Date(),
      };

      // Save to local storage for guests
      if (!user) {
        saveGuestCartToStorage(newCart);
      }

      return newCart;
    });

    // Sync with server only for logged-in users
    if (user) {
      try {
        await fetch('/api/cart', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            menuItemId,
            quantity,
          }),
        });
      } catch (error) {
        console.error('Error updating cart:', error);
      }
    }

    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 500);
  }, [user]);

  // Remove item from cart
  const removeItem = useCallback(async (menuItemId: string) => {
    isUpdatingRef.current = true;
    const userId = user?.uid || 'guest';

    setCart(prev => {
      if (!prev) return prev;

      const newItems = prev.items.filter(i => i.menuItemId !== menuItemId);
      const totals = calculateTotals(newItems);
      
      const newCart: Cart = {
        ...prev,
        items: newItems,
        ...totals,
        updatedAt: new Date(),
      };

      // Save to local storage for guests
      if (!user) {
        saveGuestCartToStorage(newCart);
      }

      return newCart;
    });

    toast.success('Item removed from cart');

    // Sync with server only for logged-in users
    if (user) {
      try {
        await fetch('/api/cart', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: user.uid,
            menuItemId,
            action: 'remove',
          }),
        });
      } catch (error) {
        console.error('Error removing from cart:', error);
      }
    }

    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 500);
  }, [user]);

  // Clear cart
  const clearCart = useCallback(async () => {
    isUpdatingRef.current = true;
    const userId = user?.uid || 'guest';

    setCart(prev => {
      if (!prev) return prev;
      
      const newCart: Cart = {
        ...prev,
        items: [],
        subtotal: 0,
        serviceCharge: 0,
        tax: 0,
        totalAmount: 0,
        updatedAt: new Date(),
      };

      // Clear local storage for guests
      if (!user) {
        saveGuestCartToStorage(null);
      }

      return newCart;
    });

    // Sync with server only for logged-in users
    if (user) {
      try {
        await fetch(`/api/cart?userId=${user.uid}`, { method: 'DELETE' });
      } catch (error) {
        console.error('Error clearing cart:', error);
      }
    }

    setTimeout(() => {
      isUpdatingRef.current = false;
    }, 500);
  }, [user]);

  // Item count
  const itemCount = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0;

  return (
    <CartContext.Provider
      value={{
        cart,
        loading,
        addToCart,
        updateQuantity,
        removeItem,
        clearCart,
        itemCount,
        refetch: fetchCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
