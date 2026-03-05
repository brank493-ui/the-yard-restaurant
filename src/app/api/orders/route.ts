import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

// In-memory storage for demo mode (when Firebase is not configured)
const demoOrders: unknown[] = [];

// Helper function to create a notification
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

export async function GET(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      return NextResponse.json(demoOrders);
    }

    // Get auth token if available
    const authHeader = request.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      const adminAuth = getAdminAuth();
      
      if (adminAuth) {
        try {
          const decodedToken = await adminAuth.verifyIdToken(idToken);
          userId = decodedToken.uid;
        } catch {
          // Token invalid, continue without user filtering
        }
      }
    }

    // Build query
    let query = adminDb.collection('orders').orderBy('createdAt', 'desc');
    
    // If user is not admin, only show their orders
    if (userId) {
      query = adminDb.collection('orders')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc') as typeof query;
    }

    const snapshot = await query.limit(100).get();
    
    const orders = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      };
    });

    return NextResponse.json(orders);
  } catch (error) {
    console.error('Error fetching orders:', error);
    return NextResponse.json(demoOrders);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, customerName, phone, type, address, items, totalAmount, paymentMethod, notes } = body;

    if (!customerName || !phone || !type || !items || !totalAmount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (type === 'delivery' && !address) {
      return NextResponse.json({ error: 'Address required for delivery' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    
    const order = {
      id: `ord_${Date.now()}`,
      userId: userId || 'guest',
      customerName,
      phone,
      type,
      address: address || null,
      items: items,
      totalAmount: parseInt(totalAmount),
      status: 'PENDING',
      paymentMethod: paymentMethod || 'CASH',
      paymentStatus: 'PENDING',
      notes: notes || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!adminDb) {
      // Demo mode - store in memory
      demoOrders.push(order);
      console.log('New order (demo mode):', order);
      return NextResponse.json({ success: true, order });
    }

    // Save to Firestore
    const docRef = await adminDb.collection('orders').add(order);
    
    console.log('New order created:', docRef.id);

    // Create notification for admin
    await createNotification(adminDb, {
      type: 'ORDER',
      title: 'New Order Received',
      message: `Order from ${customerName} - ${totalAmount.toLocaleString()} XAF (${type})`,
      orderId: docRef.id,
      amount: parseInt(totalAmount),
    });

    return NextResponse.json({ 
      success: true, 
      order: { ...order, id: docRef.id } 
    });
  } catch (error) {
    console.error('Error creating order:', error);
    return NextResponse.json({ error: 'Failed to create order' }, { status: 500 });
  }
}
