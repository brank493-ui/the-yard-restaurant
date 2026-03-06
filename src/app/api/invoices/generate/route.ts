import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
}

interface InvoiceData {
  invoiceNumber: string;
  orderId: string;
  userId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: InvoiceItem[];
  subtotal: number;
  serviceCharge: number;
  tax: number; // VAT 19.25%
  total: number;
  paymentMethod: string;
  paymentStatus: string;
  dueDate: Date;
  createdAt: Date;
  status: 'DRAFT' | 'SENT' | 'PAID' | 'CANCELLED';
  restaurantInfo: {
    name: string;
    address: string;
    phone: string;
    email: string;
    taxId: string;
  };
}

function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}${day}-${random}`;
}

function calculateInvoiceTotals(items: InvoiceItem[], deliveryFee: number = 0): {
  subtotal: number;
  serviceCharge: number;
  tax: number;
  total: number;
} {
  const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
  const serviceCharge = Math.round(subtotal * 0.05); // 5% service charge
  const taxBase = subtotal + serviceCharge;
  const tax = Math.round(taxBase * 0.1925); // 19.25% VAT in Cameroon
  const total = subtotal + serviceCharge + tax + deliveryFee;
  
  return { subtotal, serviceCharge, tax, total };
}

const RESTAURANT_INFO = {
  name: 'The Yard Restaurant',
  address: '737 Rue Batibois, Douala, Cameroon',
  phone: '+237 671 490 733',
  email: 'contact@theyardrestaurant.com',
  taxId: 'CM-DLA-REST-001',
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, orderData } = body;
    
    if (!orderId || !orderData) {
      return NextResponse.json({ error: 'Order ID and order data are required' }, { status: 400 });
    }
    
    const adminDb = getAdminDb();
    
    // Prepare invoice items
    const items: InvoiceItem[] = (orderData.items || []).map((item: { name: string; quantity: number; price: number }) => ({
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      subtotal: item.price * item.quantity,
    }));
    
    // Calculate totals
    const { subtotal, serviceCharge, tax, total } = calculateInvoiceTotals(items, orderData.deliveryFee || 0);
    
    // Create invoice
    const invoiceNumber = generateInvoiceNumber();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days
    
    const invoice: InvoiceData = {
      invoiceNumber,
      orderId,
      userId: orderData.userId || 'guest',
      customerName: orderData.customerName || orderData.name || 'Guest',
      customerEmail: orderData.email,
      customerPhone: orderData.phone,
      items,
      subtotal,
      serviceCharge,
      tax,
      total: total,
      paymentMethod: orderData.paymentMethod || 'CASH',
      paymentStatus: orderData.paymentStatus || 'PENDING',
      dueDate,
      createdAt: new Date(),
      status: 'DRAFT',
      restaurantInfo: RESTAURANT_INFO,
    };
    
    if (!adminDb) {
      // Demo mode - return invoice without saving
      return NextResponse.json({
        success: true,
        invoice,
        message: 'Invoice generated (demo mode)',
      });
    }
    
    // Save invoice to database
    const invoiceRef = await adminDb.collection('invoices').add({
      ...invoice,
      createdAt: new Date(),
      dueDate,
    });
    
    // Update invoice with ID
    await invoiceRef.update({ id: invoiceRef.id });
    
    return NextResponse.json({
      success: true,
      invoice: {
        ...invoice,
        id: invoiceRef.id,
      },
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    return NextResponse.json({ error: 'Failed to generate invoice' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const invoiceId = searchParams.get('id');
    const orderId = searchParams.get('orderId');
    
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      return NextResponse.json({ invoices: [] });
    }
    
    if (invoiceId) {
      const doc = await adminDb.collection('invoices').doc(invoiceId).get();
      if (!doc.exists) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      return NextResponse.json({ invoice: { id: doc.id, ...doc.data() } });
    }
    
    if (orderId) {
      const snapshot = await adminDb.collection('invoices')
        .where('orderId', '==', orderId)
        .limit(1)
        .get();
      
      if (snapshot.empty) {
        return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
      }
      
      const doc = snapshot.docs[0];
      return NextResponse.json({ invoice: { id: doc.id, ...doc.data() } });
    }
    
    // Return all invoices (paginated)
    const snapshot = await adminDb.collection('invoices')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    
    const invoices = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
    
    return NextResponse.json({ invoices });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return NextResponse.json({ invoices: [] });
  }
}
