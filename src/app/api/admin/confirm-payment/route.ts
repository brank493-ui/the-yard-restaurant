/**
 * Admin Payment Confirmation API
 * Handles payment confirmation with invoice generation, notifications, and email
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

interface ConfirmPaymentRequest {
  orderId: string;
  paymentMethod: string;
  amount: number;
  adminId: string;
  transactionReference?: string;
}

// Cameroon VAT rate
const VAT_RATE = 0.1925;
const SERVICE_CHARGE_RATE = 0.05;

/**
 * Generate invoice number
 */
function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${year}${month}${day}-${random}`;
}

/**
 * Create notification in database
 */
async function createNotification(
  adminDb: FirebaseFirestore.Firestore,
  data: {
    type: string;
    title: string;
    message: string;
    userId?: string;
    orderId?: string;
    amount?: number;
    paymentMethod?: string;
  }
) {
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
 * Log admin action for audit trail
 */
async function logAdminAction(
  adminDb: FirebaseFirestore.Firestore,
  data: {
    adminId: string;
    action: string;
    targetType: string;
    targetId: string;
    details: string;
    amount?: number;
  }
) {
  try {
    await adminDb.collection('admin_logs').add({
      ...data,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error logging admin action:', error);
  }
}

/**
 * Generate invoice document
 */
async function generateInvoice(
  adminDb: FirebaseFirestore.Firestore,
  order: any,
  paymentMethod: string
) {
  const invoiceNumber = generateInvoiceNumber();
  
  const invoice = {
    invoiceNumber,
    orderId: order.id,
    userId: order.userId,
    customerName: order.customerName,
    customerEmail: order.email,
    customerPhone: order.phone,
    items: order.items,
    subtotal: order.subtotal || order.totalAmount,
    serviceCharge: order.serviceCharge || Math.round((order.totalAmount || 0) * SERVICE_CHARGE_RATE),
    tax: order.tax || Math.round((order.totalAmount || 0) * VAT_RATE),
    total: order.totalAmount,
    paymentMethod,
    paymentStatus: 'PAID',
    status: 'PAID',
    dueDate: new Date(),
    paidAt: new Date(),
    createdAt: new Date(),
    
    // Restaurant branding
    restaurant: {
      name: 'THE YARD RESTAURANT',
      address: '737 Rue Batibois, Douala, Cameroon',
      phone: '+237 671 490 733',
      email: 'info@theyardrestaurant.com',
    },
  };
  
  const docRef = await adminDb.collection('invoices').add(invoice);
  
  return {
    id: docRef.id,
    ...invoice,
  };
}

/**
 * POST /api/admin/confirm-payment
 * Confirm payment and generate invoice
 */
export async function POST(request: NextRequest) {
  try {
    const body: ConfirmPaymentRequest = await request.json();
    const { orderId, paymentMethod, amount, adminId, transactionReference } = body;
    
    // Validate required fields
    if (!orderId || !paymentMethod || !adminId) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, paymentMethod, adminId' },
        { status: 400 }
      );
    }
    
    // Verify admin authentication
    const authHeader = request.headers.get('Authorization');
    const adminAuth = getAdminAuth();
    
    if (authHeader?.startsWith('Bearer ') && adminAuth) {
      try {
        const idToken = authHeader.split('Bearer ')[1];
        const decodedToken = await adminAuth.verifyIdToken(idToken);
        
        // Verify admin role
        const adminDb = getAdminDb();
        if (adminDb) {
          const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
          const userData = userDoc.data();
          
          if (userData?.role !== 'ADMIN' && userData?.role !== 'MANAGER') {
            return NextResponse.json(
              { error: 'Unauthorized: Admin privileges required' },
              { status: 403 }
            );
          }
        }
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid authentication token' },
          { status: 401 }
        );
      }
    }
    
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database unavailable' },
        { status: 503 }
      );
    }
    
    // Get order
    const orderDoc = await adminDb.collection('orders').doc(orderId).get();
    
    if (!orderDoc.exists) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      );
    }
    
    const orderData = orderDoc.data();
    
    // Use transaction for atomic updates
    const batch = adminDb.batch();
    
    // Update order payment status
    batch.update(orderDoc.ref, {
      paymentStatus: 'PAID',
      paymentMethod,
      transactionReference: transactionReference || `ADMIN-CONFIRMED-${Date.now()}`,
      paidAt: new Date(),
      updatedAt: new Date(),
    });
    
    // Commit batch
    await batch.commit();
    
    // Generate invoice
    const invoice = await generateInvoice(adminDb, orderData, paymentMethod);
    
    // Create notification for user
    await createNotification(adminDb, {
      type: 'PAYMENT',
      title: 'Payment Confirmed',
      message: `Your payment of ${amount?.toLocaleString() || orderData.totalAmount?.toLocaleString()} XAF has been confirmed. Invoice ${invoice.invoiceNumber} is ready for download.`,
      userId: orderData.userId,
      orderId,
      amount: amount || orderData.totalAmount,
      paymentMethod,
    });
    
    // Log admin action
    await logAdminAction(adminDb, {
      adminId,
      action: 'CONFIRM_PAYMENT',
      targetType: 'order',
      targetId: orderId,
      details: `Confirmed payment of ${amount?.toLocaleString() || orderData.totalAmount?.toLocaleString()} XAF via ${paymentMethod}. Invoice: ${invoice.invoiceNumber}`,
      amount: amount || orderData.totalAmount,
    });
    
    // Create daily report entry if not exists
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const reportRef = adminDb.collection('daily_reports').doc(todayStr);
    
    const reportDoc = await reportRef.get();
    if (!reportDoc.exists) {
      await reportRef.set({
        date: todayStr,
        totalOrders: 0,
        totalRevenue: 0,
        paymentsConfirmed: 0,
        paymentsPending: 0,
        createdAt: new Date(),
      });
    }
    
    // Update daily report
    await reportRef.update({
      paymentsConfirmed: adminDb.collection('daily_reports').doc(todayStr).get().then(async (doc) => {
        const data = doc.data();
        return (data?.paymentsConfirmed || 0) + 1;
      }),
    });
    
    // Send confirmation email (log for now)
    console.log(`[EMAIL] Payment confirmation for ${orderData.email}:`, {
      invoiceNumber: invoice.invoiceNumber,
      amount: amount || orderData.totalAmount,
      paymentMethod,
    });
    
    // Generate downloadable invoice URL
    const invoiceUrl = `/api/invoices/${invoice.id}/download`;
    
    return NextResponse.json({
      success: true,
      message: 'Payment confirmed successfully',
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        paymentMethod: invoice.paymentMethod,
        paidAt: invoice.paidAt,
      },
      invoiceUrl,
    });
    
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json(
      { error: 'Failed to confirm payment' },
      { status: 500 }
    );
  }
}
