/**
 * Invoice Download API
 * Generates and downloads professional PDF invoices for The Yard Restaurant
 */

import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { jsPDF } from 'jspdf';
import { verifyAdminAccess } from '@/lib/admin-middleware';

// Business information for The Yard Restaurant
const BUSINESS_INFO = {
  name: 'THE YARD RESTAURANT',
  tagline: 'Fine Dining & Culinary Excellence',
  address: '737 Rue Batibois, Douala',
  country: 'Cameroon',
  phone: '+237 671 490 733',
  email: 'info@theyardrestaurant.com',
  website: 'www.theyardrestaurant.com',
};

// Payment method labels
const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Cash',
  ORANGE_MONEY: 'Orange Money',
  MTN_MONEY: 'MTN Money',
  VISA: 'Visa',
  MASTERCARD: 'Mastercard',
  STRIPE: 'Stripe',
};

// Color palette for The Yard branding
const COLORS = {
  primary: [217, 119, 6] as [number, number, number],     // amber-600
  secondary: [120, 53, 15] as [number, number, number],   // amber-900
  dark: [28, 25, 23] as [number, number, number],         // stone-900
  light: [168, 162, 158] as [number, number, number],     // stone-400
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
 * Generate professional PDF invoice
 */
function generateInvoicePDF(invoice: {
  invoiceNumber: string;
  customerName: string;
  customerEmail?: string | null;
  customerPhone?: string | null;
  items: Array<{ description: string; quantity: number; unitPrice: number; subtotal: number }>;
  subtotal: number;
  serviceCharge: number;
  vat: number;
  deliveryFee?: number | null;
  discount?: number | null;
  total: number;
  paymentMethod?: string | null;
  paymentStatus: string;
  paymentReference?: string | null;
  status: string;
  createdAt: Date;
  dueDate: Date;
  paidAt?: Date | null;
  order?: {
    customerName: string;
    phone: string;
    email?: string | null;
    type: string;
    address?: string | null;
    notes?: string | null;
    items: Array<{ name: string; quantity: number; price: number }>;
  } | null;
  reservation?: {
    date: string;
    time: string;
    partySize: number;
  } | null;
  event?: {
    eventType: string;
    eventDate?: string | null;
    guestCount: number;
    services?: Array<{ serviceName: string; price: number }> | null;
  } | null;
}): jsPDF {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  let yPos = margin;

  // ============== HEADER ==============
  // Dark header background
  doc.setFillColor(...COLORS.dark);
  doc.rect(0, 0, pageWidth, 55, 'F');
  
  // Gold accent line
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 52, pageWidth, 3, 'F');

  // Restaurant name
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(28);
  doc.setFont('helvetica', 'bold');
  doc.text(BUSINESS_INFO.name, pageWidth / 2, 22, { align: 'center' });

  // Tagline
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.light);
  doc.text(BUSINESS_INFO.tagline, pageWidth / 2, 32, { align: 'center' });

  // Contact info
  doc.setFontSize(8);
  doc.text(`${BUSINESS_INFO.address}, ${BUSINESS_INFO.country}`, pageWidth / 2, 40, { align: 'center' });
  doc.text(`Tel: ${BUSINESS_INFO.phone} | ${BUSINESS_INFO.email}`, pageWidth / 2, 46, { align: 'center' });

  yPos = 70;

  // ============== INVOICE TITLE ==============
  doc.setTextColor(...COLORS.dark);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', margin, yPos);

  // Invoice number with gold color
  doc.setFontSize(14);
  doc.setTextColor(...COLORS.primary);
  doc.text(`#${invoice.invoiceNumber}`, pageWidth - margin, yPos, { align: 'right' });

  yPos += 20;

  // ============== CUSTOMER & INVOICE DETAILS ==============
  // Left box - Customer details
  doc.setDrawColor(...COLORS.light);
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, yPos, 80, 35, 3, 3, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text('BILL TO:', margin + 5, yPos + 10);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.light);
  doc.setFontSize(10);
  doc.text(invoice.customerName.substring(0, 30), margin + 5, yPos + 18);
  
  if (invoice.customerEmail) {
    doc.setFontSize(8);
    doc.text(invoice.customerEmail.substring(0, 35), margin + 5, yPos + 25);
  }
  
  if (invoice.customerPhone) {
    doc.setFontSize(8);
    doc.text(invoice.customerPhone, margin + 5, yPos + 31);
  }

  // Right box - Invoice details
  const rightX = pageWidth - margin - 80;
  doc.roundedRect(rightX, yPos, 80, 35, 3, 3, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text('INVOICE DETAILS:', rightX + 5, yPos + 10);

  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...COLORS.light);
  doc.setFontSize(8);
  doc.text(`Date: ${formatDate(invoice.createdAt)}`, rightX + 5, yPos + 18);
  doc.text(`Due: ${formatDate(invoice.dueDate)}`, rightX + 5, yPos + 25);
  doc.text(`Status: ${invoice.paymentStatus}`, rightX + 5, yPos + 31);

  // Payment status indicator
  const statusColor = invoice.paymentStatus === 'PAID' ? [34, 197, 94] : [234, 179, 8];
  doc.setFillColor(...statusColor as [number, number, number]);
  doc.circle(pageWidth - margin - 10, yPos + 31, 2, 'F');

  yPos += 45;

  // ============== ITEMS TABLE ==============
  // Table header
  doc.setFillColor(...COLORS.dark);
  doc.rect(margin, yPos, pageWidth - 2 * margin, 12, 'F');

  doc.setTextColor(...COLORS.white);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('DESCRIPTION', margin + 5, yPos + 8);
  doc.text('QTY', pageWidth - 75, yPos + 8);
  doc.text('UNIT PRICE', pageWidth - 50, yPos + 8);
  doc.text('TOTAL', pageWidth - margin - 5, yPos + 8, { align: 'right' });

  yPos += 12;

  // Table rows
  doc.setTextColor(...COLORS.dark);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  let rowIndex = 0;
  for (const item of invoice.items) {
    // Alternate row background
    if (rowIndex % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
    }

    doc.setTextColor(...COLORS.dark);
    doc.text(item.description.substring(0, 50), margin + 5, yPos + 5);
    doc.text(item.quantity.toString(), pageWidth - 75, yPos + 5);
    doc.text(formatCurrency(item.unitPrice), pageWidth - 50, yPos + 5);
    doc.text(formatCurrency(item.subtotal), pageWidth - margin - 5, yPos + 5, { align: 'right' });

    yPos += 8;
    rowIndex++;
  }

  // Draw table border
  doc.setDrawColor(...COLORS.light);
  doc.setLineWidth(0.3);
  const tableStart = 127;
  const tableHeight = yPos - tableStart;
  doc.rect(margin, tableStart, pageWidth - 2 * margin, tableHeight);

  yPos += 10;

  // ============== SUMMARY ==============
  const summaryBoxWidth = 85;
  const summaryX = pageWidth - margin - summaryBoxWidth;

  doc.setFillColor(252, 252, 252);
  doc.roundedRect(summaryX, yPos, summaryBoxWidth, 55, 3, 3, 'F');
  doc.setDrawColor(...COLORS.light);
  doc.rect(summaryX, yPos, summaryBoxWidth, 55, 'S');

  doc.setFontSize(8);
  doc.setTextColor(...COLORS.light);
  
  let summaryY = yPos + 8;
  
  doc.text('Subtotal:', summaryX + 5, summaryY);
  doc.text(formatCurrency(invoice.subtotal), summaryX + summaryBoxWidth - 5, summaryY, { align: 'right' });
  summaryY += 8;

  doc.text('Service Charge (5%):', summaryX + 5, summaryY);
  doc.text(formatCurrency(invoice.serviceCharge), summaryX + summaryBoxWidth - 5, summaryY, { align: 'right' });
  summaryY += 8;

  doc.text('VAT (19.25%):', summaryX + 5, summaryY);
  doc.text(formatCurrency(invoice.vat), summaryX + summaryBoxWidth - 5, summaryY, { align: 'right' });
  summaryY += 8;

  if (invoice.deliveryFee && invoice.deliveryFee > 0) {
    doc.text('Delivery:', summaryX + 5, summaryY);
    doc.text(formatCurrency(invoice.deliveryFee), summaryX + summaryBoxWidth - 5, summaryY, { align: 'right' });
    summaryY += 8;
  }

  if (invoice.discount && invoice.discount > 0) {
    doc.setTextColor(239, 68, 68);
    doc.text('Discount:', summaryX + 5, summaryY);
    doc.text(`-${formatCurrency(invoice.discount)}`, summaryX + summaryBoxWidth - 5, summaryY, { align: 'right' });
    doc.setTextColor(...COLORS.light);
    summaryY += 8;
  }

  // Total with gold background
  doc.setFillColor(...COLORS.primary);
  doc.rect(summaryX, yPos + 45, summaryBoxWidth, 10, 'F');
  doc.setTextColor(...COLORS.white);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('TOTAL:', summaryX + 5, yPos + 52);
  doc.text(formatCurrency(invoice.total), summaryX + summaryBoxWidth - 5, yPos + 52, { align: 'right' });

  yPos += 70;

  // ============== PAYMENT INFORMATION ==============
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(1);
  doc.roundedRect(margin, yPos, pageWidth - 2 * margin, 25, 3, 3, 'S');

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...COLORS.dark);
  doc.text('PAYMENT INFORMATION', margin + 5, yPos + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...COLORS.light);
  doc.text(`Payment Method: ${PAYMENT_LABELS[invoice.paymentMethod || 'CASH'] || invoice.paymentMethod || 'Cash'}`, margin + 5, yPos + 16);
  doc.text(`Payment Status: ${invoice.paymentStatus}`, margin + 5, yPos + 22);

  if (invoice.paymentReference) {
    doc.text(`Reference: ${invoice.paymentReference}`, pageWidth / 2, yPos + 16);
  }

  if (invoice.paidAt) {
    doc.text(`Paid: ${formatDate(invoice.paidAt)}`, pageWidth / 2, yPos + 22);
  }

  yPos += 35;

  // ============== RESERVATION/EVENT DETAILS ==============
  if (invoice.reservation) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text('RESERVATION DETAILS', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.light);
    doc.setFontSize(9);
    doc.text(`Date: ${invoice.reservation.date} | Time: ${invoice.reservation.time} | Guests: ${invoice.reservation.partySize}`, margin, yPos + 6);
    yPos += 15;
  }

  if (invoice.event) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...COLORS.dark);
    doc.text('EVENT DETAILS', margin, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.light);
    doc.setFontSize(9);
    let eventText = `Type: ${invoice.event.eventType}`;
    if (invoice.event.eventDate) eventText += ` | Date: ${invoice.event.eventDate}`;
    if (invoice.event.guestCount) eventText += ` | Guests: ${invoice.event.guestCount}`;
    doc.text(eventText, margin, yPos + 6);
    yPos += 15;
  }

  // ============== FOOTER ==============
  const footerY = pageHeight - 25;
  
  // Gold accent line
  doc.setDrawColor(...COLORS.primary);
  doc.setLineWidth(0.5);
  doc.line(margin, footerY, pageWidth - margin, footerY);

  doc.setFontSize(9);
  doc.setTextColor(...COLORS.dark);
  doc.setFont('helvetica', 'bold');
  doc.text('Thank you for dining with us!', pageWidth / 2, footerY + 8, { align: 'center' });
  
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...COLORS.light);
  doc.text(`${BUSINESS_INFO.name} | ${BUSINESS_INFO.address}, ${BUSINESS_INFO.country}`, pageWidth / 2, footerY + 14, { align: 'center' });
  doc.text(`${BUSINESS_INFO.phone} | ${BUSINESS_INFO.email} | ${BUSINESS_INFO.website}`, pageWidth / 2, footerY + 18, { align: 'center' });

  return doc;
}

/**
 * GET /api/invoices/[id]/download
 * Download invoice as PDF
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Verify admin access (optional - allow user to download their own invoice)
    await verifyAdminAccess(request);
    
    // Get invoice from database
    const invoice = await db.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        order: {
          include: {
            items: true
          }
        },
        reservation: true,
        event: {
          include: {
            services: true
          }
        }
      }
    });
    
    if (!invoice) {
      return NextResponse.json(
        { error: 'Invoice not found' },
        { status: 404 }
      );
    }
    
    // Prepare invoice data for PDF generation
    const invoiceData = {
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      customerEmail: invoice.customerEmail,
      customerPhone: invoice.customerPhone,
      items: invoice.items.map(item => ({
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        subtotal: item.subtotal,
      })),
      subtotal: invoice.subtotal,
      serviceCharge: invoice.serviceCharge,
      vat: invoice.vat,
      deliveryFee: invoice.deliveryFee,
      discount: invoice.discount,
      total: invoice.total,
      paymentMethod: invoice.paymentMethod,
      paymentStatus: invoice.paymentStatus,
      paymentReference: invoice.paymentReference,
      status: invoice.status,
      createdAt: invoice.createdAt,
      dueDate: invoice.dueDate,
      paidAt: invoice.paidAt,
      order: invoice.order ? {
        customerName: invoice.order.customerName,
        phone: invoice.order.phone,
        email: invoice.order.email,
        type: invoice.order.type,
        address: invoice.order.address,
        notes: invoice.order.notes,
        items: invoice.order.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
        })),
      } : null,
      reservation: invoice.reservation ? {
        date: invoice.reservation.date,
        time: invoice.reservation.time,
        partySize: invoice.reservation.partySize,
      } : null,
      event: invoice.event ? {
        eventType: invoice.event.eventType,
        eventDate: invoice.event.eventDate,
        guestCount: invoice.event.guestCount,
        services: invoice.event.services.map(s => ({
          serviceName: s.serviceName,
          price: s.price,
        })),
      } : null,
    };
    
    // Generate PDF
    const pdfDoc = generateInvoicePDF(invoiceData);
    const pdfBuffer = Buffer.from(pdfDoc.output('arraybuffer'));
    
    // Return PDF response
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="invoice-${invoice.invoiceNumber}.pdf"`,
        'Content-Length': pdfBuffer.length.toString(),
      },
    });
    
  } catch (error) {
    console.error('Error generating invoice PDF:', error);
    return NextResponse.json(
      { error: 'Failed to generate invoice' },
      { status: 500 }
    );
  }
}
