/**
 * Checkout API Route
 * Handles comprehensive checkout with:
 * - Order breakdown (items, quantities, prices)
 * - Reservation fees (if applicable)
 * - Event services (if applicable)
 * - Taxes (19.25% VAT in Cameroon - this includes the 10% tax + service charge)
 * - Service charge (optional 10%)
 * - Grand total
 * - Payment method selection
 * - Confirmation flow
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { 
  createOrder,
  getOrders,
} from '@/lib/services/orderService';
import { 
  getOrCreateCart,
  clearCart,
} from '@/lib/services/cartService';
import { notifyNewOrder, notifyPayment } from '@/lib/services/notificationService';
import { 
  calculateOrderPricing,
  generateInvoiceNumber,
} from '@/lib/services/calculationService';
import { 
  CartItem, 
  PaymentMethod, 
  OrderItem,
  CheckoutResult,
} from '@/lib/types';

// Cameroon VAT rate: 19.25%
const CAMEROON_VAT_RATE = 0.1925;
// Service charge: optional 10%
const SERVICE_CHARGE_RATE = 0.10;

interface CheckoutItem {
  menuItemId: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface CheckoutRequest {
  userId?: string;
  customerName: string;
  phone: string;
  email?: string;
  orderType: 'pickup' | 'delivery';
  address?: string;
  items: CheckoutItem[];
  paymentMethod: PaymentMethod;
  notes?: string;
  includeServiceCharge?: boolean;
  
  // Optional: Link reservation or event
  reservationId?: string;
  eventId?: string;
  
  // For mobile money payments
  transactionReference?: string;
}

interface CheckoutCalculation {
  subtotal: number;
  serviceCharge: number;
  vatAmount: number;
  deliveryFee: number;
  discount: number;
  grandTotal: number;
  items: OrderItem[];
}

/**
 * Calculate checkout totals with Cameroon VAT
 */
function calculateCheckoutTotals(
  items: CheckoutItem[],
  orderType: string,
  includeServiceCharge: boolean = true
): CheckoutCalculation {
  // Calculate subtotal
  const subtotal = items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  
  // Service charge (optional 10%)
  const serviceCharge = includeServiceCharge ? Math.round(subtotal * SERVICE_CHARGE_RATE) : 0;
  
  // Cameroon VAT 19.25% on subtotal + service charge
  const vatAmount = Math.round((subtotal + serviceCharge) * CAMEROON_VAT_RATE);
  
  // Delivery fee
  let deliveryFee = 0;
  if (orderType === 'delivery') {
    deliveryFee = subtotal >= 15000 ? 0 : 1500; // Free delivery over 15,000 XAF
  }
  
  // Discount (can be extended for promotions)
  const discount = 0;
  
  // Grand total
  const grandTotal = subtotal + serviceCharge + vatAmount + deliveryFee - discount;
  
  // Format items with subtotal
  const orderItems: OrderItem[] = items.map(item => ({
    menuItemId: item.menuItemId,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    subtotal: item.price * item.quantity,
    notes: item.notes,
  }));
  
  return {
    subtotal,
    serviceCharge,
    vatAmount,
    deliveryFee,
    discount,
    grandTotal,
    items: orderItems,
  };
}

/**
 * Create notification helper
 */
async function createNotification(
  adminDb: FirebaseFirestore.Firestore | null,
  data: {
    type: 'PAYMENT' | 'ORDER' | 'RESERVATION' | 'EVENT';
    title: string;
    message: string;
    orderId?: string;
    paymentMethod?: string;
    transactionReference?: string;
    amount?: number;
  }
) {
  if (!adminDb) return null;

  try {
    await adminDb.collection('notifications').add({
      ...data,
      read: false,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

/**
 * Send confirmation email (logs for now, can integrate with email service)
 */
async function sendConfirmationEmail(
  email: string,
  orderDetails: {
    orderId: string;
    customerName: string;
    totalAmount: number;
    items: OrderItem[];
    paymentMethod: string;
  }
) {
  console.log(`[EMAIL] Order confirmation for ${email}:`, {
    orderId: orderDetails.orderId,
    customer: orderDetails.customerName,
    total: orderDetails.totalAmount,
    itemCount: orderDetails.items.length,
    payment: orderDetails.paymentMethod,
  });
  
  // TODO: Integrate with email service (SendGrid, Mailgun, etc.)
}

/**
 * POST /api/checkout
 * Process checkout with full validation and calculation
 */
export async function POST(request: NextRequest) {
  try {
    const body: CheckoutRequest = await request.json();
    
    // Validate required fields
    if (!body.customerName || !body.phone || !body.orderType || !body.items?.length) {
      return NextResponse.json(
        { error: 'Missing required fields: customerName, phone, orderType, items' },
        { status: 400 }
      );
    }
    
    if (body.orderType === 'delivery' && !body.address) {
      return NextResponse.json(
        { error: 'Delivery address required for delivery orders' },
        { status: 400 }
      );
    }
    
    // Get authenticated user
    const authHeader = request.headers.get('Authorization');
    let authenticatedUserId: string | null = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      const adminAuth = getAdminAuth();
      
      if (adminAuth) {
        try {
          const decodedToken = await adminAuth.verifyIdToken(idToken);
          authenticatedUserId = decodedToken.uid;
        } catch {
          // Token invalid, continue as guest
        }
      }
    }
    
    const userId = body.userId || authenticatedUserId || `guest_${Date.now()}`;
    const adminDb = getAdminDb();
    
    // Calculate totals
    const calculation = calculateCheckoutTotals(
      body.items,
      body.orderType,
      body.includeServiceCharge !== false // Default to include service charge
    );
    
    // Generate order ID
    const orderId = `ORD-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
    
    // Determine payment status
    let paymentStatus: 'PENDING' | 'PROCESSING' = 'PENDING';
    if (body.paymentMethod !== 'CASH' && body.transactionReference) {
      paymentStatus = 'PROCESSING';
    }
    
    // Create order object
    const order = {
      id: orderId,
      userId,
      cartId: null, // Will be updated if cart exists
      customerName: body.customerName,
      phone: body.phone,
      email: body.email,
      type: body.orderType,
      address: body.address,
      items: calculation.items,
      
      // Pricing breakdown
      subtotal: calculation.subtotal,
      serviceCharge: calculation.serviceCharge,
      tax: calculation.vatAmount, // VAT
      deliveryFee: calculation.deliveryFee,
      discount: calculation.discount,
      totalAmount: calculation.grandTotal,
      
      // Status
      status: 'CONFIRMED',
      paymentStatus,
      paymentMethod: body.paymentMethod,
      transactionReference: body.transactionReference,
      
      // Links
      reservationId: body.reservationId,
      eventId: body.eventId,
      
      // Metadata
      notes: body.notes,
      estimatedReadyTime: new Date(Date.now() + 30 * 60 * 1000), // 30 min estimate
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    
    if (!adminDb) {
      // Demo mode - return success with order
      console.log('[DEMO] Checkout order:', order);
      
      const result: CheckoutResult = {
        success: true,
        order: order as any,
        transactionReference: body.transactionReference,
        message: 'Order placed successfully (demo mode)',
      };
      
      return NextResponse.json(result);
    }
    
    // Use Firestore batch for atomic operations
    const batch = adminDb.batch();
    
    // Create order document
    const orderRef = adminDb.collection('orders').doc(orderId);
    batch.set(orderRef, order);
    
    // Clear user's cart if exists
    const cartSnapshot = await adminDb.collection('carts')
      .where('userId', '==', userId)
      .limit(1)
      .get();
    
    if (!cartSnapshot.empty) {
      const cartDoc = cartSnapshot.docs[0];
      batch.update(orderRef, { cartId: cartDoc.id });
      batch.delete(cartDoc.ref);
    }
    
    // Commit batch
    await batch.commit();
    
    // Create notification for admin
    await createNotification(adminDb, {
      type: 'ORDER',
      title: 'New Order Received',
      message: `Order ${orderId} from ${body.customerName} - ${calculation.grandTotal.toLocaleString()} XAF (${body.orderType})`,
      orderId,
      amount: calculation.grandTotal,
    });
    
    // If payment submitted, create payment notification
    if (paymentStatus === 'PROCESSING') {
      await createNotification(adminDb, {
        type: 'PAYMENT',
        title: 'Payment Submitted',
        message: `Payment of ${calculation.grandTotal.toLocaleString()} XAF via ${body.paymentMethod} for order ${orderId}`,
        orderId,
        paymentMethod: body.paymentMethod,
        transactionReference: body.transactionReference,
        amount: calculation.grandTotal,
      });
    }
    
    // Send confirmation email if email provided
    if (body.email) {
      await sendConfirmationEmail(body.email, {
        orderId,
        customerName: body.customerName,
        totalAmount: calculation.grandTotal,
        items: calculation.items,
        paymentMethod: body.paymentMethod,
      });
    }
    
    // Generate invoice number
    const invoiceNumber = generateInvoiceNumber();
    
    const result: CheckoutResult = {
      success: true,
      order: order as any,
      transactionReference: body.transactionReference,
      message: 'Order placed successfully',
    };
    
    return NextResponse.json({
      ...result,
      invoiceNumber,
      calculation: {
        subtotal: calculation.subtotal,
        serviceCharge: calculation.serviceCharge,
        vat: calculation.vatAmount,
        deliveryFee: calculation.deliveryFee,
        grandTotal: calculation.grandTotal,
      },
    });
  } catch (error) {
    console.error('Checkout error:', error);
    return NextResponse.json(
      { error: 'Failed to process checkout', message: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/checkout/calculate
 * Preview checkout totals without creating order
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const itemsJson = searchParams.get('items');
    const orderType = searchParams.get('orderType') || 'pickup';
    const includeServiceCharge = searchParams.get('serviceCharge') !== 'false';
    
    if (!itemsJson) {
      return NextResponse.json(
        { error: 'Items required' },
        { status: 400 }
      );
    }
    
    const items: CheckoutItem[] = JSON.parse(itemsJson);
    
    const calculation = calculateCheckoutTotals(items, orderType, includeServiceCharge);
    
    return NextResponse.json({
      success: true,
      calculation: {
        subtotal: calculation.subtotal,
        serviceCharge: calculation.serviceCharge,
        vat: calculation.vatAmount,
        deliveryFee: calculation.deliveryFee,
        discount: calculation.discount,
        grandTotal: calculation.grandTotal,
        vatRate: `${CAMEROON_VAT_RATE * 100}%`,
        serviceChargeRate: `${SERVICE_CHARGE_RATE * 100}%`,
      },
      items: calculation.items,
    });
  } catch (error) {
    console.error('Calculation error:', error);
    return NextResponse.json(
      { error: 'Failed to calculate totals' },
      { status: 500 }
    );
  }
}
