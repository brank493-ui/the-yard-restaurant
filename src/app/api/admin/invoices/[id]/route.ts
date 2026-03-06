import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { generateInvoicePDF, generateInvoiceFromOrder } from '@/lib/pdf-generator';
import { InvoiceData } from '@/lib/types';

// Demo invoices storage
const demoInvoices: Map<string, InvoiceData> = new Map();

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const searchParams = request.nextUrl.searchParams;
    const download = searchParams.get('download') === 'true';

    const adminDb = getAdminDb();

    let invoice: InvoiceData | null = null;

    if (adminDb) {
      // Try to find invoice by ID or invoice number
      const invoiceDoc = await adminDb.collection('invoices').doc(id).get();
      
      if (invoiceDoc.exists) {
        const data = invoiceDoc.data();
        invoice = {
          ...data,
          id: invoiceDoc.id,
          createdAt: data.createdAt?.toDate?.() || data.createdAt,
          dueDate: data.dueDate?.toDate?.() || data.dueDate,
        } as InvoiceData;
      } else {
        // Try to find by invoice number
        const invoiceQuery = await adminDb
          .collection('invoices')
          .where('invoiceNumber', '==', id)
          .limit(1)
          .get();

        if (!invoiceQuery.empty) {
          const doc = invoiceQuery.docs[0];
          const data = doc.data();
          invoice = {
            ...data,
            id: doc.id,
            createdAt: data.createdAt?.toDate?.() || data.createdAt,
            dueDate: data.dueDate?.toDate?.() || data.dueDate,
          } as InvoiceData;
        }
      }
    } else {
      // Demo mode
      invoice = demoInvoices.get(id) || null;
    }

    if (!invoice) {
      return NextResponse.json({ error: 'Invoice not found' }, { status: 404 });
    }

    // Generate PDF
    const pdfDoc = generateInvoicePDF(invoice);
    const pdfBuffer = Buffer.from(pdfDoc.output('arraybuffer'));

    if (download) {
      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
        },
      });
    }

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="invoice-${invoice.invoiceNumber}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Error generating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, reservationId, eventId } = body;

    const adminDb = getAdminDb();

    let invoice: InvoiceData;

    if (orderId) {
      // Generate from order
      if (adminDb) {
        const orderDoc = await adminDb.collection('orders').doc(orderId).get();
        if (!orderDoc.exists) {
          return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const orderData = orderDoc.data();
        invoice = generateInvoiceFromOrder({
          id: orderDoc.id,
          customerName: orderData.customerName,
          email: orderData.email,
          phone: orderData.phone,
          items: orderData.items || [],
          subtotal: orderData.subtotal || 0,
          serviceCharge: orderData.serviceCharge || 0,
          tax: orderData.tax || 0,
          deliveryFee: orderData.deliveryFee,
          totalAmount: orderData.totalAmount || 0,
          paymentMethod: orderData.paymentMethod || 'CASH',
          paymentStatus: orderData.paymentStatus || 'PENDING',
          transactionReference: orderData.transactionReference,
          createdAt: orderData.createdAt?.toDate?.() || new Date(),
        });

        // Save invoice to Firestore
        const invoiceRef = await adminDb.collection('invoices').add({
          ...invoice,
          orderId,
          createdAt: new Date(),
          dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        });

        invoice.id = invoiceRef.id;
      } else {
        // Demo mode
        invoice = generateInvoiceFromOrder({
          id: orderId,
          customerName: 'Demo Customer',
          email: 'demo@example.com',
          phone: '+237 600000000',
          items: [
            { name: 'Grilled Fish', quantity: 2, price: 7500 },
            { name: 'Jollof Rice', quantity: 2, price: 3000 },
          ],
          subtotal: 21000,
          serviceCharge: 1050,
          tax: 4246,
          totalAmount: 25296,
          paymentMethod: 'ORANGE_MONEY',
          paymentStatus: 'PENDING',
          createdAt: new Date(),
        });

        demoInvoices.set(invoice.id, invoice);
      }
    } else if (reservationId || eventId) {
      // Handle reservations and events
      return NextResponse.json(
        { error: 'Reservation/Event invoices not yet supported' },
        { status: 400 }
      );
    } else {
      return NextResponse.json(
        { error: 'Order ID, Reservation ID, or Event ID required' },
        { status: 400 }
      );
    }

    // Generate PDF content for response
    const pdfDoc = generateInvoicePDF(invoice);
    const invoiceContent = pdfDoc.output('datauristring');

    return NextResponse.json({
      success: true,
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        total: invoice.total,
        paymentStatus: invoice.paymentStatus,
      },
      invoiceContent,
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return NextResponse.json(
      { error: 'Failed to create invoice' },
      { status: 500 }
    );
  }
}
