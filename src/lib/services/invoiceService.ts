/**
 * Invoice Service
 * Handles invoice generation, retrieval, and email sending for The Yard Restaurant
 */

import { getAdminDb } from '@/lib/firebase-admin';
import { 
  InvoiceData, 
  CreateInvoiceInput, 
  PaymentMethod, 
  PaymentStatus,
  InvoiceStatus,
  Order,
  Reservation,
  EventBooking 
} from '@/lib/types';

// Constants for The Yard Restaurant
const BUSINESS_INFO = {
  name: 'THE YARD RESTAURANT',
  address: '737 Rue Batibois, Douala, Cameroon',
  phone: '+237 671 490 733',
  email: 'info@theyardrestaurant.com',
};

const VAT_RATE = 0.1925; // 19.25%
const SERVICE_CHARGE_RATE = 0.05; // 5%

// Demo storage for invoices
let demoInvoices: InvoiceData[] = [];

/**
 * Generate a unique invoice number
 */
function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear().toString().slice(-2);
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `INV-${year}${month}${day}-${random}`;
}

/**
 * Calculate invoice totals with VAT
 */
function calculateInvoiceTotals(subtotal: number, deliveryFee: number = 0, discount: number = 0): {
  serviceCharge: number;
  vat: number;
  total: number;
} {
  const serviceCharge = Math.round(subtotal * SERVICE_CHARGE_RATE);
  const taxableAmount = subtotal + serviceCharge + deliveryFee - discount;
  const vat = Math.round(taxableAmount * VAT_RATE);
  const total = subtotal + serviceCharge + vat + deliveryFee - discount;
  
  return { serviceCharge, vat, total };
}

/**
 * Generate a professional invoice for an order
 */
export async function generateInvoice(
  input: CreateInvoiceInput
): Promise<{ success: boolean; invoice?: InvoiceData; error?: string }> {
  const adminDb = getAdminDb();
  
  try {
    const { serviceCharge, vat, total } = calculateInvoiceTotals(
      input.subtotal,
      input.deliveryFee || 0,
      input.discount || 0
    );
    
    const invoiceNumber = generateInvoiceNumber();
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7); // Due in 7 days
    
    const invoice: InvoiceData = {
      id: `inv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      invoiceNumber,
      orderId: input.orderId,
      reservationId: input.reservationId,
      eventId: input.eventId,
      userId: input.userId,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      businessName: BUSINESS_INFO.name,
      businessAddress: BUSINESS_INFO.address,
      businessPhone: BUSINESS_INFO.phone,
      businessEmail: BUSINESS_INFO.email,
      items: input.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.quantity * item.unitPrice,
      })),
      reservationDetails: input.reservationDetails,
      eventDetails: input.eventDetails,
      subtotal: input.subtotal,
      serviceCharge,
      vat,
      deliveryFee: input.deliveryFee,
      discount: input.discount,
      total,
      paymentMethod: input.paymentMethod,
      paymentStatus: 'PENDING' as PaymentStatus,
      status: 'DRAFT' as InvoiceStatus,
      dueDate,
      createdAt: new Date(),
    };
    
    if (!adminDb) {
      // Demo mode - store in memory
      demoInvoices.push(invoice);
      return { success: true, invoice };
    }
    
    // Store in Firestore
    await adminDb.collection('invoices').doc(invoice.id).set({
      ...invoice,
      createdAt: new Date(),
      dueDate,
    });
    
    return { success: true, invoice };
  } catch (error) {
    console.error('Error generating invoice:', error);
    return { success: false, error: 'Failed to generate invoice' };
  }
}

/**
 * Generate invoice from an order
 */
export async function generateInvoiceFromOrder(
  order: Order
): Promise<{ success: boolean; invoice?: InvoiceData; error?: string }> {
  const input: CreateInvoiceInput = {
    orderId: order.id,
    userId: order.userId,
    customerName: order.customerName,
    customerEmail: order.email,
    customerPhone: order.phone,
    items: order.items.map(item => ({
      description: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
    })),
    paymentMethod: order.paymentMethod || 'CASH',
    subtotal: order.subtotal,
    deliveryFee: order.deliveryFee,
    discount: order.discount,
  };
  
  return generateInvoice(input);
}

/**
 * Generate invoice from a reservation
 */
export async function generateInvoiceFromReservation(
  reservation: Reservation,
  amount: number,
  paymentMethod: PaymentMethod = 'CASH'
): Promise<{ success: boolean; invoice?: InvoiceData; error?: string }> {
  const input: CreateInvoiceInput = {
    reservationId: reservation.id,
    userId: reservation.userId,
    customerName: reservation.name,
    customerEmail: reservation.email,
    customerPhone: reservation.phone,
    items: [{
      description: `Table Reservation for ${reservation.partySize} guests`,
      quantity: 1,
      unitPrice: amount,
    }],
    paymentMethod,
    subtotal: amount,
    reservationDetails: {
      date: reservation.date,
      time: reservation.time,
      guests: reservation.partySize,
    },
  };
  
  return generateInvoice(input);
}

/**
 * Generate invoice from an event booking
 */
export async function generateInvoiceFromEvent(
  event: EventBooking
): Promise<{ success: boolean; invoice?: InvoiceData; error?: string }> {
  const items = event.services?.map(service => ({
    description: service.serviceName,
    quantity: service.quantity,
    unitPrice: service.price,
  })) || [{
    description: `${event.eventType} Event Package`,
    quantity: 1,
    unitPrice: event.totalAmount || 0,
  }];
  
  const input: CreateInvoiceInput = {
    eventId: event.id,
    userId: event.userId,
    customerName: event.name,
    customerEmail: event.email,
    customerPhone: event.phone,
    items,
    paymentMethod: event.paymentMethod || 'CASH',
    subtotal: event.totalAmount || 0,
    eventDetails: {
      type: event.eventType,
      date: event.eventDate,
      guests: event.guestCount,
      services: event.services?.map(s => s.serviceName),
    },
  };
  
  return generateInvoice(input);
}

/**
 * Get invoice by ID
 */
export async function getInvoice(invoiceId: string): Promise<InvoiceData | null> {
  const adminDb = getAdminDb();
  
  if (!adminDb) {
    // Demo mode
    return demoInvoices.find(inv => inv.id === invoiceId) || null;
  }
  
  try {
    const doc = await adminDb.collection('invoices').doc(invoiceId).get();
    if (doc.exists) {
      return doc.data() as InvoiceData;
    }
    return null;
  } catch (error) {
    console.error('Error getting invoice:', error);
    return null;
  }
}

/**
 * Get invoice by invoice number
 */
export async function getInvoiceByNumber(invoiceNumber: string): Promise<InvoiceData | null> {
  const adminDb = getAdminDb();
  
  if (!adminDb) {
    return demoInvoices.find(inv => inv.invoiceNumber === invoiceNumber) || null;
  }
  
  try {
    const snapshot = await adminDb.collection('invoices')
      .where('invoiceNumber', '==', invoiceNumber)
      .limit(1)
      .get();
    
    if (!snapshot.empty) {
      return snapshot.docs[0].data() as InvoiceData;
    }
    return null;
  } catch (error) {
    console.error('Error getting invoice by number:', error);
    return null;
  }
}

/**
 * Get all invoices for a user
 */
export async function getUserInvoices(userId: string): Promise<InvoiceData[]> {
  const adminDb = getAdminDb();
  
  if (!adminDb) {
    return demoInvoices.filter(inv => inv.userId === userId);
  }
  
  try {
    const snapshot = await adminDb.collection('invoices')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .get();
    
    return snapshot.docs.map(doc => doc.data() as InvoiceData);
  } catch (error) {
    console.error('Error getting user invoices:', error);
    return [];
  }
}

/**
 * Get all invoices (for admin)
 */
export async function getAllInvoices(limit: number = 100): Promise<InvoiceData[]> {
  const adminDb = getAdminDb();
  
  if (!adminDb) {
    return demoInvoices.slice(0, limit);
  }
  
  try {
    const snapshot = await adminDb.collection('invoices')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map(doc => doc.data() as InvoiceData);
  } catch (error) {
    console.error('Error getting all invoices:', error);
    return [];
  }
}

/**
 * Update invoice payment status
 */
export async function updateInvoicePaymentStatus(
  invoiceId: string,
  paymentStatus: PaymentStatus,
  paymentReference?: string
): Promise<{ success: boolean; error?: string }> {
  const adminDb = getAdminDb();
  
  if (!adminDb) {
    // Demo mode
    const invoice = demoInvoices.find(inv => inv.id === invoiceId);
    if (invoice) {
      invoice.paymentStatus = paymentStatus;
      invoice.paymentReference = paymentReference;
      if (paymentStatus === 'PAID') {
        invoice.paidAt = new Date();
        invoice.status = 'PAID';
      }
      return { success: true };
    }
    return { success: false, error: 'Invoice not found' };
  }
  
  try {
    const updateData: Record<string, unknown> = {
      paymentStatus,
      updatedAt: new Date(),
    };
    
    if (paymentReference) {
      updateData.paymentReference = paymentReference;
    }
    
    if (paymentStatus === 'PAID') {
      updateData.paidAt = new Date();
      updateData.status = 'PAID';
    }
    
    await adminDb.collection('invoices').doc(invoiceId).update(updateData);
    return { success: true };
  } catch (error) {
    console.error('Error updating invoice payment status:', error);
    return { success: false, error: 'Failed to update invoice' };
  }
}

/**
 * Send invoice email to user
 */
export async function sendInvoiceEmail(
  invoiceId: string,
  email?: string
): Promise<{ success: boolean; error?: string }> {
  const adminDb = getAdminDb();
  
  try {
    const invoice = await getInvoice(invoiceId);
    if (!invoice) {
      return { success: false, error: 'Invoice not found' };
    }
    
    const recipientEmail = email || invoice.customerEmail;
    if (!recipientEmail) {
      return { success: false, error: 'No email address provided' };
    }
    
    // Create email log
    const emailData = {
      to: recipientEmail,
      subject: `Invoice ${invoice.invoiceNumber} from ${BUSINESS_INFO.name}`,
      type: 'INVOICE',
      invoiceId: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      amount: invoice.total,
      customerName: invoice.customerName,
      sentAt: new Date(),
      status: 'sent',
    };
    
    if (adminDb) {
      await adminDb.collection('email_logs').add(emailData);
    }
    
    // In a real implementation, you would send the email here using SendGrid, Mailgun, etc.
    // For now, we'll just log it
    
    console.log('Invoice email would be sent to:', recipientEmail, emailData);
    
    return { success: true };
  } catch (error) {
    console.error('Error sending invoice email:', error);
    return { success: false, error: 'Failed to send email' };
  }
}

/**
 * Generate invoice PDF content (text-based for now)
 */
export function generateInvoicePDFContent(invoice: InvoiceData): string {
  const divider = '='.repeat(50);
  const subDivider = '-'.repeat(50);
  
  let content = `
${divider}
              ${BUSINESS_INFO.name}
                  INVOICE
${divider}

Invoice Number: ${invoice.invoiceNumber}
Date: ${new Date(invoice.createdAt).toLocaleDateString('en-GB')}
Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-GB')}
Status: ${invoice.status}
Payment Status: ${invoice.paymentStatus}

${subDivider}
CUSTOMER DETAILS
${subDivider}
Name: ${invoice.customerName}
${invoice.customerEmail ? `Email: ${invoice.customerEmail}` : ''}
${invoice.customerPhone ? `Phone: ${invoice.customerPhone}` : ''}

${subDivider}
BUSINESS DETAILS
${subDivider}
${BUSINESS_INFO.name}
${BUSINESS_INFO.address}
Phone: ${BUSINESS_INFO.phone}
${BUSINESS_INFO.email ? `Email: ${BUSINESS_INFO.email}` : ''}

${subDivider}
ITEMS
${subDivider}
`;

  invoice.items.forEach((item, index) => {
    content += `${index + 1}. ${item.description}
   Qty: ${item.quantity} x ${item.unitPrice.toLocaleString()} XAF = ${item.subtotal.toLocaleString()} XAF
`;
  });

  content += `
${subDivider}
SUMMARY
${subDivider}
Subtotal:           ${invoice.subtotal.toLocaleString()} XAF
Service Charge (5%): ${invoice.serviceCharge.toLocaleString()} XAF
VAT (19.25%):       ${invoice.vat.toLocaleString()} XAF
${invoice.deliveryFee ? `Delivery Fee:        ${invoice.deliveryFee.toLocaleString()} XAF` : ''}
${invoice.discount ? `Discount:            -${invoice.discount.toLocaleString()} XAF` : ''}
${subDivider}
TOTAL:              ${invoice.total.toLocaleString()} XAF
${subDivider}

Payment Method: ${invoice.paymentMethod}
${invoice.paymentReference ? `Reference: ${invoice.paymentReference}` : ''}

`;

  if (invoice.reservationDetails) {
    content += `
${subDivider}
RESERVATION DETAILS
${subDivider}
Date: ${invoice.reservationDetails.date}
Time: ${invoice.reservationDetails.time}
Number of Guests: ${invoice.reservationDetails.guests}

`;
  }

  if (invoice.eventDetails) {
    content += `
${subDivider}
EVENT DETAILS
${subDivider}
Event Type: ${invoice.eventDetails.type}
${invoice.eventDetails.date ? `Date: ${invoice.eventDetails.date}` : ''}
${invoice.eventDetails.guests ? `Number of Guests: ${invoice.eventDetails.guests}` : ''}
${invoice.eventDetails.services?.length ? `Services: ${invoice.eventDetails.services.join(', ')}` : ''}

`;
  }

  content += `
${divider}
Thank you for choosing ${BUSINESS_INFO.name}!
We look forward to serving you again.
${divider}
`;

  return content;
}

/**
 * Get pending invoices count
 */
export async function getPendingInvoicesCount(): Promise<number> {
  const adminDb = getAdminDb();
  
  if (!adminDb) {
    return demoInvoices.filter(inv => inv.paymentStatus === 'PENDING').length;
  }
  
  try {
    const snapshot = await adminDb.collection('invoices')
      .where('paymentStatus', '==', 'PENDING')
      .get();
    
    return snapshot.size;
  } catch (error) {
    console.error('Error getting pending invoices count:', error);
    return 0;
  }
}

const invoiceService = {
  generateInvoice,
  generateInvoiceFromOrder,
  generateInvoiceFromReservation,
  generateInvoiceFromEvent,
  getInvoice,
  getInvoiceByNumber,
  getUserInvoices,
  getAllInvoices,
  updateInvoicePaymentStatus,
  sendInvoiceEmail,
  generateInvoicePDFContent,
  getPendingInvoicesCount,
};

export default invoiceService;
