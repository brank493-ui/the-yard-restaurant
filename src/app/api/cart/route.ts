/**
 * Cart API Route
 * Handles persistent cart operations with real-time sync
 * 
 * GET: Fetch user's active cart (create if not exists)
 * POST: Add item to cart (accumulates, never overwrites)
 * PATCH: Update item quantity or remove
 * DELETE: Clear cart
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { 
  getOrCreateCart, 
  addCartItem, 
  updateCartItemQuantity, 
  clearCart,
  syncCart 
} from '@/lib/services/cartService';
import { CartItem } from '@/lib/types';

// Demo mode storage
const demoCarts: Map<string, { id: string; userId: string; items: CartItem[]; subtotal: number; serviceCharge: number; tax: number; totalAmount: number; createdAt: Date; updatedAt: Date }> = new Map();

/**
 * Helper to get user ID from request
 */
async function getUserId(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('Authorization');
  
  if (authHeader?.startsWith('Bearer ')) {
    const idToken = authHeader.split('Bearer ')[1];
    const adminAuth = getAdminAuth();
    
    if (adminAuth) {
      try {
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        return decodedToken.uid;
      } catch {
        // Token invalid
      }
    }
  }
  
  // Check for userId in body for POST/PATCH requests
  return null;
}

/**
 * GET /api/cart
 * Fetch user's active cart (create if not exists)
 */
export async function GET(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    
    // Get userId from query params or auth
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId') || await getUserId(request);
    
    if (!userId) {
      // Create a guest user ID
      userId = `guest_${Date.now()}`;
    }

    if (!adminDb) {
      // Demo mode
      let cart = demoCarts.get(userId);
      if (!cart) {
        cart = {
          id: `cart_${Date.now()}`,
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
      return NextResponse.json({ success: true, cart });
    }

    // Get or create cart from Firestore
    const cart = await getOrCreateCart(userId);
    
    return NextResponse.json({ success: true, cart });
  } catch (error) {
    console.error('Error fetching cart:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cart' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/cart
 * Add item to cart (accumulates, never overwrites)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, item, localItems } = body;
    
    if (!item || !item.menuItemId || !item.name || item.price === undefined || item.quantity === undefined) {
      return NextResponse.json(
        { error: 'Missing required item fields (menuItemId, name, price, quantity)' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    const resolvedUserId = userId || await getUserId(request) || `guest_${Date.now()}`;

    if (!adminDb) {
      // Demo mode
      let cart = demoCarts.get(resolvedUserId);
      if (!cart) {
        cart = {
          id: `cart_${Date.now()}`,
          userId: resolvedUserId,
          items: [],
          subtotal: 0,
          serviceCharge: 0,
          tax: 0,
          totalAmount: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        demoCarts.set(resolvedUserId, cart);
      }
      
      // Check if item exists
      const existingIndex = cart.items.findIndex(i => i.menuItemId === item.menuItemId);
      if (existingIndex >= 0) {
        cart.items[existingIndex].quantity += item.quantity;
        cart.items[existingIndex].notes = item.notes || cart.items[existingIndex].notes;
      } else {
        cart.items.push({
          menuItemId: item.menuItemId,
          name: item.name,
          description: item.description,
          price: item.price,
          quantity: item.quantity,
          image: item.image,
          notes: item.notes,
        });
      }
      
      // Calculate totals
      const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const serviceCharge = Math.round(subtotal * 0.05);
      const tax = Math.round((subtotal + serviceCharge) * 0.10);
      cart.subtotal = subtotal;
      cart.serviceCharge = serviceCharge;
      cart.tax = tax;
      cart.totalAmount = subtotal + serviceCharge + tax;
      cart.updatedAt = new Date();
      
      return NextResponse.json({ success: true, cart });
    }

    // If local items provided, sync first
    if (localItems && localItems.length > 0) {
      const syncedCart = await syncCart(resolvedUserId, localItems);
      // Then add the new item
      const updatedCart = await addCartItem(resolvedUserId, item);
      return NextResponse.json({ success: true, cart: updatedCart });
    }

    // Add item to cart
    const cart = await addCartItem(resolvedUserId, item);
    
    return NextResponse.json({ success: true, cart });
  } catch (error) {
    console.error('Error adding to cart:', error);
    return NextResponse.json(
      { error: 'Failed to add item to cart' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/cart
 * Update item quantity or remove
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, menuItemId, quantity, action } = body;
    
    if (!menuItemId) {
      return NextResponse.json(
        { error: 'Missing menuItemId' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();
    const resolvedUserId = userId || await getUserId(request) || `guest_${Date.now()}`;

    if (!adminDb) {
      // Demo mode
      const cart = demoCarts.get(resolvedUserId);
      if (!cart) {
        return NextResponse.json(
          { error: 'Cart not found' },
          { status: 404 }
        );
      }
      
      const itemIndex = cart.items.findIndex(i => i.menuItemId === menuItemId);
      
      if (itemIndex >= 0) {
        if (action === 'remove' || quantity <= 0) {
          cart.items.splice(itemIndex, 1);
        } else {
          cart.items[itemIndex].quantity = quantity;
        }
      }
      
      // Calculate totals
      const subtotal = cart.items.reduce((sum, i) => sum + i.price * i.quantity, 0);
      const serviceCharge = Math.round(subtotal * 0.05);
      const tax = Math.round((subtotal + serviceCharge) * 0.10);
      cart.subtotal = subtotal;
      cart.serviceCharge = serviceCharge;
      cart.tax = tax;
      cart.totalAmount = subtotal + serviceCharge + tax;
      cart.updatedAt = new Date();
      
      return NextResponse.json({ success: true, cart });
    }

    // Update cart item quantity
    const cart = await updateCartItemQuantity(
      resolvedUserId, 
      menuItemId, 
      action === 'remove' ? 0 : quantity
    );
    
    return NextResponse.json({ success: true, cart });
  } catch (error) {
    console.error('Error updating cart:', error);
    return NextResponse.json(
      { error: 'Failed to update cart' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cart
 * Clear cart
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || await getUserId(request);
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID required' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    if (!adminDb) {
      // Demo mode
      demoCarts.delete(userId);
      return NextResponse.json({ success: true, message: 'Cart cleared' });
    }

    // Clear cart
    await clearCart(userId);
    
    return NextResponse.json({ success: true, message: 'Cart cleared' });
  } catch (error) {
    console.error('Error clearing cart:', error);
    return NextResponse.json(
      { error: 'Failed to clear cart' },
      { status: 500 }
    );
  }
}
