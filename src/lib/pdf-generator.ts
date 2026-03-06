/**
 * PDF Generator for The Yard Restaurant
 * Generates professional invoices with branding
 */

import { jsPDF } from 'jspdf';
import { InvoiceData, PaymentMethod } from '@/lib/types';

// Business information
const BUSINESS_INFO = {
  name: 'THE YARD RESTAURANT',
  address: '737 Rue Batibois, Douala',
  country: 'Cameroon',
  phone: '+237 671 490 733',
  email: 'info@theyardrestaurant.com',
  website: 'www.theyardrestaurant.com',
};

// Payment method labels
const paymentMethodLabels: Record<string, string> = {
  CASH: 'Cash',
  ORANGE_MONEY: 'Orange Money',
  MTN_MONEY: 'MTN Money',
  VISA: 'Visa',
  MASTERCARD: 'Mastercard',
  STRIPE: 'Stripe',
};

// Color palette
const colors = {
  primary: [217, 119, 6] as [number, number, number], // amber-600
  secondary: [120, 53, 15] as [number, number, number], // amber-900
  dark: [28, 25, 23] as [number, number, number], // stone-900
  light: [168, 162, 158] as [number, number, number], // stone-400
  white: [255, 255, 255] as [number, number, number],
  black: [0, 0, 0] as [number, number, number],
};

/**
 * Format currency in XAF
 */
function formatCurrency(amount: number): string {
  return `${amount.toLocaleString('en-CM')} XAF`;
}

/**
 * Format date
 */
function formatDate(date: Date | string): string {
  const d = new Date(date);
  return d.toLocaleDateString('en-CM', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Generate a professional invoice PDF
 */
export function generateInvoicePDF(invoice: InvoiceData): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // Header background
  doc.setFillColor(...colors.dark);
  doc.rect(0, 0, pageWidth, 50, 'F');

  // Restaurant name
  doc.setTextColor(...colors.white);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(BUSINESS_INFO.name, pageWidth / 2, 20, { align: 'center' });

  // Restaurant tagline
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.light);
  doc.text('Fine Dining & Culinary Excellence', pageWidth / 2, 28, { align: 'center' });

  // Contact info
  doc.setFontSize(8);
  doc.text(`${BUSINESS_INFO.address}, ${BUSINESS_INFO.country}`, pageWidth / 2, 36, { align: 'center' });
  doc.text(`Tel: ${BUSINESS_INFO.phone} | ${BUSINESS_INFO.email}`, pageWidth / 2, 42, { align: 'center' });

  yPos = 65;

  // Invoice title and number
  doc.setTextColor(...colors.dark);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', margin, yPos);

  doc.setFontSize(12);
  doc.setTextColor(...colors.primary);
  doc.text(`#${invoice.invoiceNumber}`, pageWidth - margin, yPos, { align: 'right' });

  yPos += 15;

  // Invoice details box
  doc.setDrawColor(...colors.light);
  doc.setLineWidth(0.5);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 30, 3, 3, 'S');

  // Left side - Customer info
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.dark);
  doc.text('BILL TO:', margin + 5, yPos + 10);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.light);
  doc.setFontSize(10);
  doc.text(invoice.customerName, margin + 5, yPos + 17);
  if (invoice.customerEmail) {
    doc.setFontSize(8);
    doc.text(invoice.customerEmail, margin + 5, yPos + 23);
  }
  if (invoice.customerPhone) {
    doc.setFontSize(8);
    doc.text(invoice.customerPhone, margin + 5, yPos + 28);
  }

  // Right side - Invoice details
  const rightCol = pageWidth / 2 + 20;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.dark);
  doc.text('INVOICE DETAILS:', rightCol, yPos + 10);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...colors.light);
  doc.setFontSize(8);
  doc.text(`Date: ${formatDate(invoice.createdAt)}`, rightCol, yPos + 17);
  doc.text(`Due: ${formatDate(invoice.dueDate)}`, rightCol, yPos + 23);
  doc.text(`Status: ${invoice.paymentStatus}`, rightCol, yPos + 28);

  yPos += 40;

  // Items table header
  doc.setFillColor(...colors.dark);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 10, 'F');

  doc.setTextColor(...colors.white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIPTION', margin + 5, yPos + 7);
  doc.text('QTY', pageWidth - 80, yPos + 7);
  doc.text('UNIT PRICE', pageWidth - 55, yPos + 7);
  doc.text('TOTAL', pageWidth - margin - 5, yPos + 7, { align: 'right' });

  yPos += 10;

  // Items
  doc.setTextColor(...colors.dark);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  let itemY = yPos;
  invoice.items.forEach((item, index) => {
    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, itemY, pageWidth - 2 * margin, 8, 'F');
    }

    doc.setTextColor(...colors.dark);
    doc.text(item.description.substring(0, 40), margin + 5, itemY + 5);
    doc.text(item.quantity.toString(), pageWidth - 80, itemY + 5);
    doc.text(formatCurrency(item.unitPrice), pageWidth - 55, itemY + 5);
    doc.text(formatCurrency(item.subtotal), pageWidth - margin - 5, itemY + 5, { align: 'right' });

    itemY += 8;
  });

  // Draw table border
  doc.setDrawColor(...colors.light);
  doc.setLineWidth(0.5);
  doc.rect(margin, yPos, pageWidth - 2 * margin, itemY - yPos);

  // Summary section
  const summaryY = itemY + 10;
  const summaryBoxWidth = 80;
  const summaryX = pageWidth - margin - summaryBoxWidth;

  doc.setFillColor(250, 250, 250);
  doc.roundedRect(summaryX, summaryY, summaryBoxWidth, 45, 3, 3, 'F');
  doc.setDrawColor(...colors.light);
  doc.rect(summaryX, summaryY, summaryBoxWidth, 45, 'S');

  doc.setFontSize(8);
  doc.setTextColor(...colors.light);
  doc.text('Subtotal:', summaryX + 5, summaryY + 10);
  doc.text(formatCurrency(invoice.subtotal), summaryX + summaryBoxWidth - 5, summaryY + 10, { align: 'right' });

  doc.text('Service Charge (5%):', summaryX + 5, summaryY + 18);
  doc.text(formatCurrency(invoice.serviceCharge), summaryX + summaryBoxWidth - 5, summaryY + 18, { align: 'right' });

  doc.text('VAT (19.25%):', summaryX + 5, summaryY + 26);
  doc.text(formatCurrency(invoice.vat), summaryX + summaryBoxWidth - 5, summaryY + 26, { align: 'right' });

  if (invoice.deliveryFee && invoice.deliveryFee > 0) {
    doc.text('Delivery:', summaryX + 5, summaryY + 34);
    doc.text(formatCurrency(invoice.deliveryFee), summaryX + summaryBoxWidth - 5, summaryY + 34, { align: 'right' });
  }

  // Total
  doc.setFillColor(...colors.primary);
  doc.rect(summaryX, summaryY + 35, summaryBoxWidth, 10, 'F');
  doc.setTextColor(...colors.white);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', summaryX + 5, summaryY + 42);
  doc.text(formatCurrency(invoice.total), summaryX + summaryBoxWidth - 5, summaryY + 42, { align: 'right' });

  // Payment method box
  const paymentY = summaryY + 60;
  doc.setDrawColor(...colors.primary);
  doc.setLineWidth(1);
  doc.roundedRect(margin, paymentY, pageWidth - 2 * margin, 25, 3, 3, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...colors.dark);
  doc.text('PAYMENT INFORMATION', margin + 5, paymentY + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...colors.light);
  doc.text(`Payment Method: ${paymentMethodLabels[invoice.paymentMethod] || invoice.paymentMethod}`, margin + 5, paymentY + 16);
  doc.text(`Payment Status: ${invoice.paymentStatus}`, margin + 5, paymentY + 22);

  if (invoice.paymentReference) {
    doc.text(`Reference: ${invoice.paymentReference}`, pageWidth / 2, paymentY + 16);
  }

  // Reservation/Event details if present
  if (invoice.reservationDetails) {
    const detailsY = paymentY + 35;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.dark);
    doc.text('RESERVATION DETAILS', margin, detailsY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.light);
    doc.text(`Date: ${invoice.reservationDetails.date} | Time: ${invoice.reservationDetails.time} | Guests: ${invoice.reservationDetails.guests}`, margin, detailsY + 6);
  }

  if (invoice.eventDetails) {
    const detailsY = paymentY + 35;
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...colors.dark);
    doc.text('EVENT DETAILS', margin, detailsY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...colors.light);
    doc.text(`Type: ${invoice.eventDetails.type}${invoice.eventDetails.date ? ` | Date: ${invoice.eventDetails.date}` : ''}${invoice.eventDetails.guests ? ` | Guests: ${invoice.eventDetails.guests}` : ''}`, margin, detailsY + 6);
  }

  // Footer
  const footerY = pageHeight - 30;
  doc.setDrawColor(...colors.light);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFontSize(8);
  doc.setTextColor(...colors.light);
  doc.text('Thank you for dining with us!', pageWidth / 2, footerY + 8, { align: 'center' });
  doc.text(`${BUSINESS_INFO.name} | ${BUSINESS_INFO.address} | ${BUSINESS_INFO.phone}`, pageWidth / 2, footerY + 14, { align: 'center' });
  doc.text(BUSINESS_INFO.website, pageWidth / 2, footerY + 20, { align: 'center' });

  return doc;
}

/**
 * Generate invoice from order data
 */
export function generateInvoiceFromOrder(order: {
  id: string;
  customerName: string;
  email?: string;
  phone?: string;
  items: Array<{ name: string; quantity: number; price: number }>;
  subtotal: number;
  serviceCharge: number;
  tax: number;
  deliveryFee?: number;
  totalAmount: number;
  paymentMethod: PaymentMethod;
  paymentStatus: string;
  transactionReference?: string;
  createdAt: Date;
}): InvoiceData {
  const invoiceNumber = `INV-${Date.now().toString().slice(-10)}`;

  return {
    id: `inv_${order.id}`,
    invoiceNumber,
    orderId: order.id,
    userId: '',
    customerName: order.customerName,
    customerEmail: order.email,
    customerPhone: order.phone,
    businessName: BUSINESS_INFO.name,
    businessAddress: BUSINESS_INFO.address,
    businessPhone: BUSINESS_INFO.phone,
    businessEmail: BUSINESS_INFO.email,
    items: order.items.map(item => ({
      description: item.name,
      quantity: item.quantity,
      unitPrice: item.price,
      subtotal: item.price * item.quantity,
    })),
    subtotal: order.subtotal,
    serviceCharge: order.serviceCharge,
    vat: order.tax,
    deliveryFee: order.deliveryFee,
    total: order.totalAmount,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus as InvoiceData['paymentStatus'],
    paymentReference: order.transactionReference,
    status: order.paymentStatus === 'PAID' ? 'PAID' : 'SENT',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
    createdAt: order.createdAt,
  };
}

/**
 * Download invoice PDF
 */
export function downloadInvoicePDF(invoice: InvoiceData): void {
  const doc = generateInvoicePDF(invoice);
  doc.save(`invoice-${invoice.invoiceNumber}.pdf`);
}

/**
 * Get invoice PDF as blob
 */
export function getInvoicePDFBlob(invoice: InvoiceData): Blob {
  const doc = generateInvoicePDF(invoice);
  return doc.output('blob');
}

/**
 * Get invoice PDF as data URL
 */
export function getInvoicePDFDataURL(invoice: InvoiceData): string {
  const doc = generateInvoicePDF(invoice);
  return doc.output('datauristring');
}

export default {
  generateInvoicePDF,
  generateInvoiceFromOrder,
  downloadInvoicePDF,
  getInvoicePDFBlob,
  getInvoicePDFDataURL,
};
