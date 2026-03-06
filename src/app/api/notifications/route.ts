import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

interface Notification {
  id: string;
  type: 'PAYMENT' | 'ORDER' | 'RESERVATION' | 'EVENT';
  title: string;
  message: string;
  orderId?: string;
  paymentMethod?: string;
  transactionReference?: string;
  amount?: number;
  read: boolean;
  createdAt: Date;
}

// GET - Fetch notifications for admin
export async function GET(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      // Return demo notifications when Firebase not configured
      const demoNotifications: Notification[] = [
        {
          id: 'demo-1',
          type: 'PAYMENT',
          title: 'New Payment Submitted',
          message: 'A payment of 15,000 XAF is awaiting confirmation',
          orderId: 'demo-order-1',
          paymentMethod: 'ORANGE_MONEY',
          transactionReference: 'TXN-12345',
          amount: 15000,
          read: false,
          createdAt: new Date(),
        },
        {
          id: 'demo-2',
          type: 'PAYMENT',
          title: 'Payment Received',
          message: 'A payment of 25,500 XAF via MTN Money is pending',
          orderId: 'demo-order-2',
          paymentMethod: 'MTN_MONEY',
          transactionReference: 'TXN-67890',
          amount: 25500,
          read: false,
          createdAt: new Date(Date.now() - 3600000),
        },
      ];
      return NextResponse.json(demoNotifications);
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    let query = adminDb.collection('notifications').orderBy('createdAt', 'desc');
    
    if (unreadOnly) {
      query = query.where('read', '==', false);
    }

    const snapshot = await query.limit(50).get();
    const notifications: Notification[] = [];

    snapshot.forEach((doc) => {
      notifications.push({ id: doc.id, ...doc.data() } as Notification);
    });

    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
  }
}

// POST - Create a new notification
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, message, orderId, paymentMethod, transactionReference, amount } = body;

    if (!type || !title || !message) {
      return NextResponse.json({ error: 'Type, title, and message are required' }, { status: 400 });
    }

    const adminDb = getAdminDb();

    if (!adminDb) {
      // Return success in demo mode
      return NextResponse.json({ 
        success: true, 
        id: `demo-${Date.now()}`,
        notification: {
          id: `demo-${Date.now()}`,
          type,
          title,
          message,
          orderId,
          paymentMethod,
          transactionReference,
          amount,
          read: false,
          createdAt: new Date(),
        }
      });
    }

    const notification: Omit<Notification, 'id'> = {
      type,
      title,
      message,
      orderId,
      paymentMethod,
      transactionReference,
      amount,
      read: false,
      createdAt: new Date(),
    };

    const docRef = await adminDb.collection('notifications').add(notification);

    return NextResponse.json({ 
      success: true, 
      id: docRef.id,
      notification: { id: docRef.id, ...notification }
    });
  } catch (error) {
    console.error('Error creating notification:', error);
    return NextResponse.json({ error: 'Failed to create notification' }, { status: 500 });
  }
}

// PATCH - Mark notification(s) as read
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, markAllRead } = body;

    const adminDb = getAdminDb();

    if (!adminDb) {
      return NextResponse.json({ success: true });
    }

    if (markAllRead) {
      // Mark all notifications as read
      const snapshot = await adminDb.collection('notifications').where('read', '==', false).get();
      const batch = adminDb.batch();
      
      snapshot.forEach((doc) => {
        batch.update(doc.ref, { read: true });
      });

      await batch.commit();
      return NextResponse.json({ success: true, updatedCount: snapshot.size });
    }

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    await adminDb.collection('notifications').doc(id).update({ read: true });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating notification:', error);
    return NextResponse.json({ error: 'Failed to update notification' }, { status: 500 });
  }
}

// DELETE - Delete a notification
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Notification ID is required' }, { status: 400 });
    }

    const adminDb = getAdminDb();

    if (!adminDb) {
      return NextResponse.json({ success: true });
    }

    await adminDb.collection('notifications').doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json({ error: 'Failed to delete notification' }, { status: 500 });
  }
}
