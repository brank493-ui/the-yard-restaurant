import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

// In-memory storage for demo mode
const demoInvoices: unknown[] = [];

// Invoice number generator
function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}-${random}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get('orderId');
    const userId = searchParams.get('userId');
    
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      if (orderId) {
        const invoice = demoInvoices.find((inv: unknown) => (inv as { orderId: string }).orderId === orderId);
        return NextResponse.json(invoice || null);
      }
      return NextResponse.json(demoInvoices);
    }

    let query = adminDb.collection('invoices');
    
    if (orderId) {
      const snapshot = await query.where('orderId', '==', orderId).limit(1).get();
      if (snapshot.empty) {
        return NextResponse.json(null);
      }
      const invoice = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
      return NextResponse.json(invoice);
    }

    if (userId) {
      query = query.where('userId', '==', userId) as typeof query;
    }

    const snapshot = await query.orderBy('createdAt', 'desc').limit(100).get();
    
    const invoices = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      };
    });

    return NextResponse.json(invoices);
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json(demoInvoices);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, orderData } = body;

    if (!orderId || !orderData) {
      return NextResponse.json({ error: 'Order ID and order data are required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    
    const invoiceNumber = generateInvoiceNumber();
    
    const invoice = {
      id: `inv_${Date.now()}`,
      invoiceNumber,
      orderId,
      userId: orderData.userId || 'guest',
      customerName: orderData.customerName,
      customerEmail: orderData.email,
      customerPhone: orderData.phone,
      items: orderData.items || [],
      subtotal: orderData.totalAmount,
      tax: 0, // Tax can be added later
      total: orderData.totalAmount,
      paymentMethod: orderData.paymentMethod || 'CASH',
      paymentStatus: orderData.paymentStatus || 'PENDING',
      status: 'ISSUED',
      createdAt: new Date(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    };

    if (!adminDb) {
      demoInvoices.push(invoice);
      return NextResponse.json({ success: true, invoice });
    }

    const docRef = await adminDb.collection('invoices').add(invoice);
    
    return NextResponse.json({ 
      success: true, 
      invoice: { ...invoice, id: docRef.id } 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json({ error: 'Failed to create invoice' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const { invoiceId, paymentStatus, paymentMethod } = body;

    if (!invoiceId) {
      return NextResponse.json({ error: 'Invoice ID is required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    
    if (!adminDb) {
      const invoiceIndex = demoInvoices.findIndex(
        (inv: unknown) => (inv as { id: string }).id === invoiceId
      );
      if (invoiceIndex !== -1) {
        (demoInvoices[invoiceIndex] as { paymentStatus?: string; paymentMethod?: string; updatedAt: Date }).paymentStatus = paymentStatus;
        (demoInvoices[invoiceIndex] as { paymentStatus?: string; paymentMethod?: string; updatedAt: Date }).paymentMethod = paymentMethod;
        (demoInvoices[invoiceIndex] as { paymentStatus?: string; paymentMethod?: string; updatedAt: Date }).updatedAt = new Date();
      }
      return NextResponse.json({ success: true });
    }

    const updateData: { paymentStatus?: string; paymentMethod?: string; updatedAt: Date } = { updatedAt: new Date() };
    if (paymentStatus) updateData.paymentStatus = paymentStatus;
    if (paymentMethod) updateData.paymentMethod = paymentMethod;

    await adminDb.collection('invoices').doc(invoiceId).update(updateData);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return NextResponse.json({ error: 'Failed to update invoice' }, { status: 500 });
  }
}
