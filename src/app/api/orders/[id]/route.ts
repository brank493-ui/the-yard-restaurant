import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

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

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { 
      status, 
      paymentStatus, 
      paymentMethod, 
      transactionReference,
      customerName,
      totalAmount 
    } = body;

    const adminDb = getAdminDb();
    
    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (status) {
      updateData.status = status.toUpperCase();
    }

    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus.toUpperCase();
    }

    if (paymentMethod) {
      updateData.paymentMethod = paymentMethod;
    }

    if (transactionReference) {
      updateData.transactionReference = transactionReference;
    }

    // If no meaningful updates, return error
    if (Object.keys(updateData).length === 1) {
      return NextResponse.json({ error: 'No valid update fields provided' }, { status: 400 });
    }

    // Handle demo mode
    if (!adminDb) {
      // Create notification for payment submission in demo mode
      if (paymentStatus === 'PROCESSING' && paymentMethod && transactionReference) {
        return NextResponse.json({ 
          success: true, 
          message: 'Payment submitted (demo mode)',
          demo: true
        });
      }
      
      return NextResponse.json({ 
        success: true, 
        message: 'Order updated (demo mode)',
        demo: true
      });
    }

    // Get the current order for context
    const orderDoc = await adminDb.collection('orders').doc(id).get();
    const orderData = orderDoc.exists ? orderDoc.data() : null;

    // Update the order
    await adminDb.collection('orders').doc(id).update(updateData);

    // Create notification when payment is submitted (PROCESSING status)
    if (paymentStatus === 'PROCESSING' && paymentMethod && transactionReference) {
      const methodLabel = paymentMethod === 'ORANGE_MONEY' ? 'Orange Money' : 
                          paymentMethod === 'MTN_MONEY' ? 'MTN Money' : 'Cash';
      
      await createNotification(adminDb, {
        type: 'PAYMENT',
        title: 'New Payment Submitted',
        message: `Payment of ${(totalAmount || orderData?.totalAmount || 0).toLocaleString()} XAF via ${methodLabel} awaiting confirmation. Reference: ${transactionReference}`,
        orderId: id,
        paymentMethod,
        transactionReference,
        amount: totalAmount || orderData?.totalAmount || 0,
      });
    }

    // Create notification when admin confirms payment
    if (paymentStatus === 'PAID' && orderData?.paymentStatus !== 'PAID') {
      const methodLabel = paymentMethod === 'ORANGE_MONEY' ? 'Orange Money' : 
                          paymentMethod === 'MTN_MONEY' ? 'MTN Money' : 'Cash';
      
      await createNotification(adminDb, {
        type: 'PAYMENT',
        title: 'Payment Confirmed',
        message: `Payment of ${(totalAmount || orderData?.totalAmount || 0).toLocaleString()} XAF via ${methodLabel} has been confirmed`,
        orderId: id,
        paymentMethod,
        amount: totalAmount || orderData?.totalAmount || 0,
      });
    }

    return NextResponse.json({ success: true, message: 'Order updated' });
  } catch (error) {
    console.error('Error updating order:', error);
    return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminDb = getAdminDb();

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const orderDoc = await adminDb.collection('orders').doc(id).get();
    
    if (!orderDoc.exists) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ id: orderDoc.id, ...orderDoc.data() });
  } catch (error) {
    console.error('Error fetching order:', error);
    return NextResponse.json({ error: 'Failed to fetch order' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminDb = getAdminDb();

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    await adminDb.collection('orders').doc(id).delete();

    return NextResponse.json({ success: true, message: 'Order deleted' });
  } catch (error) {
    console.error('Error deleting order:', error);
    return NextResponse.json({ error: 'Failed to delete order' }, { status: 500 });
  }
}
