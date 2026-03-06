/**
 * Cart Service
 * Handles persistent cart operations with real-time sync
 */

import { getAdminDb } from '@/lib/firebase-admin';
import { 
  Cart, 
  CartItem, 
  CartAddItemInput, 
  CartUpdateInput 
} from '../types';
import { 
  generateId, 
  calculateSubtotal, 
  calculateServiceCharge, 
  calculateTax, 
  calculateOrderPricing 
} from './calculationService';

// In-memory storage for demo mode
const demoCarts: Map<string, Cart> = new Map();

/**
 * Get or create cart for a user
 */
export async function getOrCreateCart(userId: string): Promise<Cart> {
  const adminDb = getAdminDb();
  
  if (!adminDb) {
    // Demo mode
    let cart = demoCarts.get(userId);
    if (!cart) {
      cart = {
        id: generateId('cart'),
        userId,
        items: [],
        subtotal: 0,
        serviceCharge: 0,
        tax: 0,
        totalAmount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      demoCarts.set(userId, cart);
    }
    return cart;
  }
  
  try {
    // Try to find existing cart
    const snapshot = await adminDb.collection('carts')
      .where('userId', '==', userId)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      const doc = snapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      } as Cart;
    }
    
    // Create new cart
    const newCart: Cart = {
      id: generateId('cart'),
      userId,
      items: [],
      subtotal: 0,
      serviceCharge: 0,
      tax: 0,
      totalAmount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    const docRef = await adminDb.collection('carts').add({
      ...newCart,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    return {
      ...newCart,
      id: docRef.id,
    };
  } catch (error) {
    console.error('Error getting/creating cart:', error);
    // Return a demo cart on error
    return {
      id: generateId('cart'),
      userId,
      items: [],
      subtotal: 0,
      serviceCharge: 0,
      tax: 0,
      totalAmount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }
}

/**
 * Update cart totals based on items
 */
function calculateCartTotals(items: CartItem[]): { subtotal: number; serviceCharge: number; tax: number; totalAmount: number } {
  const subtotal = calculateSubtotal(items);
  const serviceCharge = calculateServiceCharge(subtotal);
  const tax = calculateTax(subtotal, serviceCharge);
  const totalAmount = subtotal + serviceCharge + tax;
  
  return { subtotal, serviceCharge, tax, totalAmount };
}

/**
 * Add item to cart
 */
export async function addCartItem(userId: string, input: CartAddItemInput): Promise<Cart> {
  const adminDb = getAdminDb();
  
  const cart = await getOrCreateCart(userId);
  
  // Check if item already exists
  const existingIndex = cart.items.findIndex(item => item.menuItemId === input.menuItemId);
  
  if (existingIndex >= 0) {
    // Update quantity
    cart.items[existingIndex].quantity += input.quantity;
    cart.items[existingIndex].notes = input.notes || cart.items[existingIndex].notes;
  } else {
    // Add new item
    cart.items.push({
      menuItemId: input.menuItemId,
      name: input.name,
      description: input.description,
      price: input.price,
      quantity: input.quantity,
      image: input.image,
      notes: input.notes,
    });
  }
  
  // Calculate totals
  const totals = calculateCartTotals(cart.items);
  cart.subtotal = totals.subtotal;
  cart.serviceCharge = totals.serviceCharge;
  cart.tax = totals.tax;
  cart.totalAmount = totals.totalAmount;
  cart.updatedAt = new Date();
  
  if (!adminDb) {
    // Demo mode
    demoCarts.set(userId, cart);
    return cart;
  }
  
  try {
    await adminDb.collection('carts').doc(cart.id).update({
      items: cart.items,
      subtotal: cart.subtotal,
      serviceCharge: cart.serviceCharge,
      tax: cart.tax,
      totalAmount: cart.totalAmount,
      updatedAt: new Date(),
    });
    
    return cart;
  } catch (error) {
    console.error('Error adding item to cart:', error);
    return cart;
  }
}

/**
 * Update cart item quantity
 */
export async function updateCartItemQuantity(
  userId: string, 
  menuItemId: string, 
  quantity: number
): Promise<Cart> {
  const adminDb = getAdminDb();
  
  const cart = await getOrCreateCart(userId);
  
  const itemIndex = cart.items.findIndex(item => item.menuItemId === menuItemId);
  
  if (itemIndex >= 0) {
    if (quantity <= 0) {
      // Remove item
      cart.items.splice(itemIndex, 1);
    } else {
      // Update quantity
      cart.items[itemIndex].quantity = quantity;
    }
  }
  
  // Calculate totals
  const totals = calculateCartTotals(cart.items);
  cart.subtotal = totals.subtotal;
  cart.serviceCharge = totals.serviceCharge;
  cart.tax = totals.tax;
  cart.totalAmount = totals.totalAmount;
  cart.updatedAt = new Date();
  
  if (!adminDb) {
    demoCarts.set(userId, cart);
    return cart;
  }
  
  try {
    await adminDb.collection('carts').doc(cart.id).update({
      items: cart.items,
      subtotal: cart.subtotal,
      serviceCharge: cart.serviceCharge,
      tax: cart.tax,
      totalAmount: cart.totalAmount,
      updatedAt: new Date(),
    });
    
    return cart;
  } catch (error) {
    console.error('Error updating cart item:', error);
    return cart;
  }
}

/**
 * Remove item from cart
 */
export async function removeCartItem(userId: string, menuItemId: string): Promise<Cart> {
  return updateCartItemQuantity(userId, menuItemId, 0);
}

/**
 * Clear cart
 */
export async function clearCart(userId: string): Promise<Cart> {
  const adminDb = getAdminDb();
  
  const cart = await getOrCreateCart(userId);
  cart.items = [];
  cart.subtotal = 0;
  cart.serviceCharge = 0;
  cart.tax = 0;
  cart.totalAmount = 0;
  cart.updatedAt = new Date();
  
  if (!adminDb) {
    demoCarts.set(userId, cart);
    return cart;
  }
  
  try {
    await adminDb.collection('carts').doc(cart.id).update({
      items: [],
      subtotal: 0,
      serviceCharge: 0,
      tax: 0,
      totalAmount: 0,
      updatedAt: new Date(),
    });
    
    return cart;
  } catch (error) {
    console.error('Error clearing cart:', error);
    return cart;
  }
}

/**
 * Update cart with new items (replace all)
 */
export async function updateCart(userId: string, input: CartUpdateInput): Promise<Cart> {
  const adminDb = getAdminDb();
  
  const cart = await getOrCreateCart(userId);
  
  if (input.clearItems) {
    cart.items = [];
  } else if (input.items) {
    cart.items = input.items;
  }
  
  // Calculate totals
  const totals = calculateCartTotals(cart.items);
  cart.subtotal = totals.subtotal;
  cart.serviceCharge = totals.serviceCharge;
  cart.tax = totals.tax;
  cart.totalAmount = totals.totalAmount;
  cart.updatedAt = new Date();
  
  if (!adminDb) {
    demoCarts.set(userId, cart);
    return cart;
  }
  
  try {
    await adminDb.collection('carts').doc(cart.id).update({
      items: cart.items,
      subtotal: cart.subtotal,
      serviceCharge: cart.serviceCharge,
      tax: cart.tax,
      totalAmount: cart.totalAmount,
      updatedAt: new Date(),
    });
    
    return cart;
  } catch (error) {
    console.error('Error updating cart:', error);
    return cart;
  }
}

/**
 * Delete cart (after checkout)
 */
export async function deleteCart(userId: string): Promise<boolean> {
  const adminDb = getAdminDb();
  
  if (!adminDb) {
    demoCarts.delete(userId);
    return true;
  }
  
  try {
    const snapshot = await adminDb.collection('carts')
      .where('userId', '==', userId)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      await snapshot.docs[0].ref.delete();
    }
    
    return true;
  } catch (error) {
    console.error('Error deleting cart:', error);
    return false;
  }
}

/**
 * Sync local cart with server cart
 * This merges local cart items with server cart
 */
export async function syncCart(userId: string, localItems: CartItem[]): Promise<Cart> {
  const adminDb = getAdminDb();
  
  const serverCart = await getOrCreateCart(userId);
  
  // Merge items - local items take precedence
  const mergedItems = [...serverCart.items];
  
  for (const localItem of localItems) {
    const existingIndex = mergedItems.findIndex(item => item.menuItemId === localItem.menuItemId);
    
    if (existingIndex >= 0) {
      // Use the higher quantity
      if (localItem.quantity > mergedItems[existingIndex].quantity) {
        mergedItems[existingIndex] = localItem;
      }
    } else {
      mergedItems.push(localItem);
    }
  }
  
  // Calculate totals
  const totals = calculateCartTotals(mergedItems);
  
  const updatedCart: Cart = {
    ...serverCart,
    items: mergedItems,
    subtotal: totals.subtotal,
    serviceCharge: totals.serviceCharge,
    tax: totals.tax,
    totalAmount: totals.totalAmount,
    updatedAt: new Date(),
  };
  
  if (!adminDb) {
    demoCarts.set(userId, updatedCart);
    return updatedCart;
  }
  
  try {
    await adminDb.collection('carts').doc(serverCart.id).update({
      items: mergedItems,
      subtotal: updatedCart.subtotal,
      serviceCharge: updatedCart.serviceCharge,
      tax: updatedCart.tax,
      totalAmount: updatedCart.totalAmount,
      updatedAt: new Date(),
    });
    
    return updatedCart;
  } catch (error) {
    console.error('Error syncing cart:', error);
    return updatedCart;
  }
}
