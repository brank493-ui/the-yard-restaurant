'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';
import { Download, FileText, FileSpreadsheet, Calendar as CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { jsPDF } from 'jspdf';

interface DailyReportData {
  date: string;
  stats: {
    totalOrders: number;
    totalReservations: number;
    totalEvents: number;
    totalRevenue: number;
    pendingPayments: number;
    confirmedPayments: number;
  };
  orders: Array<{
    id: string;
    customerName: string;
    totalAmount: number;
    paymentStatus: string;
    paymentMethod?: string;
    createdAt: Date | string;
  }>;
  reservations: Array<{
    id: string;
    name: string;
    partySize: number;
    time: string;
    status: string;
  }>;
  events: Array<{
    id: string;
    eventType: string;
    guestCount: number;
    totalAmount?: number;
    status: string;
  }>;
  topItems: Array<{ name: string; count: number; revenue: number }>;
  paymentMethods: Record<string, number>;
}

interface DailyReportExportProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
  reportData?: DailyReportData;
}

const BUSINESS_INFO = {
  name: 'THE YARD RESTAURANT',
  address: '737 Rue Batibois, Douala, Cameroon',
  phone: '+237 671 490 733',
  email: 'info@theyardrestaurant.com',
};

const paymentMethodLabels: Record<string, string> = {
  CASH: 'Cash',
  ORANGE_MONEY: 'Orange Money',
  MTN_MONEY: 'MTN Money',
  VISA: 'Visa',
  MASTERCARD: 'Mastercard',
  STRIPE: 'Stripe',
};

export default function DailyReportExport({
  selectedDate,
  onDateChange,
  reportData,
}: DailyReportExportProps) {
  const [isExporting, setIsExporting] = useState<'csv' | 'pdf' | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);

  const generateCSV = () => {
    if (!reportData) {
      toast.error('No report data available');
      return;
    }

    const rows: string[][] = [];
    
    // Header
    rows.push(['DAILY REPORT', BUSINESS_INFO.name]);
    rows.push(['Date:', reportData.date]);
    rows.push(['Generated:', format(new Date(), 'yyyy-MM-dd HH:mm:ss')]);
    rows.push([]);
    
    // Summary
    rows.push(['SUMMARY']);
    rows.push(['Total Orders', reportData.stats.totalOrders.toString()]);
    rows.push(['Total Reservations', reportData.stats.totalReservations.toString()]);
    rows.push(['Total Events', reportData.stats.totalEvents.toString()]);
    rows.push(['Total Revenue', `${reportData.stats.totalRevenue} XAF`]);
    rows.push(['Pending Payments', reportData.stats.pendingPayments.toString()]);
    rows.push(['Confirmed Payments', reportData.stats.confirmedPayments.toString()]);
    rows.push([]);
    
    // Orders
    if (reportData.orders.length > 0) {
      rows.push(['ORDERS']);
      rows.push(['Order ID', 'Customer', 'Amount (XAF)', 'Payment Status', 'Payment Method', 'Time']);
      reportData.orders.forEach(order => {
        rows.push([
          order.id.slice(-8),
          order.customerName,
          order.totalAmount.toString(),
          order.paymentStatus,
          order.paymentMethod ? paymentMethodLabels[order.paymentMethod] || order.paymentMethod : 'N/A',
          new Date(order.createdAt).toLocaleTimeString(),
        ]);
      });
      rows.push([]);
    }
    
    // Reservations
    if (reportData.reservations.length > 0) {
      rows.push(['RESERVATIONS']);
      rows.push(['Reservation ID', 'Name', 'Guests', 'Time', 'Status']);
      reportData.reservations.forEach(res => {
        rows.push([
          res.id.slice(-8),
          res.name,
          res.partySize.toString(),
          res.time,
          res.status,
        ]);
      });
      rows.push([]);
    }
    
    // Events
    if (reportData.events.length > 0) {
      rows.push(['EVENTS']);
      rows.push(['Event ID', 'Type', 'Guests', 'Amount (XAF)', 'Status']);
      reportData.events.forEach(evt => {
        rows.push([
          evt.id.slice(-8),
          evt.eventType,
          evt.guestCount?.toString() || '0',
          evt.totalAmount?.toString() || '0',
          evt.status,
        ]);
      });
      rows.push([]);
    }
    
    // Top Items
    if (reportData.topItems.length > 0) {
      rows.push(['TOP ITEMS']);
      rows.push(['Item', 'Orders', 'Revenue (XAF)']);
      reportData.topItems.forEach(item => {
        rows.push([item.name, item.count.toString(), item.revenue.toString()]);
      });
      rows.push([]);
    }
    
    // Payment Methods
    if (Object.keys(reportData.paymentMethods).length > 0) {
      rows.push(['PAYMENT METHODS BREAKDOWN']);
      rows.push(['Method', 'Amount (XAF)']);
      Object.entries(reportData.paymentMethods).forEach(([method, amount]) => {
        rows.push([paymentMethodLabels[method] || method, amount.toString()]);
      });
    }

    // Create CSV content
    const csvContent = rows.map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `daily-report-${reportData.date}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    
    toast.success('CSV report downloaded');
  };

  const generatePDF = () => {
    if (!reportData) {
      toast.error('No report data available');
      return;
    }

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = margin;

    // Header background
    doc.setFillColor(28, 25, 23);
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Restaurant name
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(BUSINESS_INFO.name, pageWidth / 2, 18, { align: 'center' });

    // Report title
    doc.setFontSize(14);
    doc.text('DAILY REPORT', pageWidth / 2, 28, { align: 'center' });

    // Date
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(168, 162, 158);
    doc.text(`Date: ${reportData.date}`, pageWidth / 2, 38, { align: 'center' });

    yPos = 55;

    // Summary section
    doc.setTextColor(28, 25, 23);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text('SUMMARY', margin, yPos);
    yPos += 8;

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const summaryData = [
      ['Total Orders', reportData.stats.totalOrders.toString()],
      ['Total Reservations', reportData.stats.totalReservations.toString()],
      ['Total Events', reportData.stats.totalEvents.toString()],
      ['Total Revenue', `${reportData.stats.totalRevenue.toLocaleString()} XAF`],
      ['Pending Payments', reportData.stats.pendingPayments.toString()],
      ['Confirmed Payments', reportData.stats.confirmedPayments.toString()],
    ];

    summaryData.forEach(([label, value]) => {
      doc.setTextColor(100, 100, 100);
      doc.text(label + ':', margin, yPos);
      doc.setTextColor(28, 25, 23);
      doc.text(value, margin + 60, yPos);
      yPos += 6;
    });

    yPos += 5;

    // Orders section
    if (reportData.orders.length > 0) {
      doc.setFillColor(245, 158, 11);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('ORDERS', margin + 2, yPos + 6);
      yPos += 12;

      doc.setTextColor(28, 25, 23);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      reportData.orders.slice(0, 15).forEach((order, idx) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = margin;
        }
        const time = new Date(order.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        doc.text(`${idx + 1}. ${order.customerName} - ${order.totalAmount.toLocaleString()} XAF - ${order.paymentStatus} - ${time}`, margin, yPos);
        yPos += 5;
      });

      if (reportData.orders.length > 15) {
        doc.setTextColor(100, 100, 100);
        doc.text(`... and ${reportData.orders.length - 15} more orders`, margin, yPos);
        yPos += 5;
      }
      yPos += 5;
    }

    // Reservations section
    if (reportData.reservations.length > 0) {
      if (yPos > 240) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFillColor(59, 130, 246);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('RESERVATIONS', margin + 2, yPos + 6);
      yPos += 12;

      doc.setTextColor(28, 25, 23);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      reportData.reservations.forEach((res) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(`${res.name} - ${res.partySize} guests at ${res.time} - ${res.status}`, margin, yPos);
        yPos += 5;
      });
      yPos += 5;
    }

    // Events section
    if (reportData.events.length > 0) {
      if (yPos > 240) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFillColor(139, 92, 246);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('EVENTS', margin + 2, yPos + 6);
      yPos += 12;

      doc.setTextColor(28, 25, 23);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      reportData.events.forEach((evt) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(`${evt.eventType} - ${evt.guestCount || 0} guests - ${evt.totalAmount?.toLocaleString() || 0} XAF - ${evt.status}`, margin, yPos);
        yPos += 5;
      });
      yPos += 5;
    }

    // Top Items section
    if (reportData.topItems.length > 0) {
      if (yPos > 220) {
        doc.addPage();
        yPos = margin;
      }

      doc.setFillColor(16, 185, 129);
      doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('TOP ITEMS', margin + 2, yPos + 6);
      yPos += 12;

      doc.setTextColor(28, 25, 23);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      reportData.topItems.slice(0, 10).forEach((item, idx) => {
        if (yPos > 270) {
          doc.addPage();
          yPos = margin;
        }
        doc.text(`${idx + 1}. ${item.name} - ${item.count} orders - ${item.revenue.toLocaleString()} XAF`, margin, yPos);
        yPos += 5;
      });
    }

    // Footer
    const footerY = doc.internal.pageSize.getHeight() - 20;
    doc.setDrawColor(200, 200, 200);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);
    
    doc.setFontSize(8);
    doc.setTextColor(150, 150, 150);
    doc.text(BUSINESS_INFO.address, pageWidth / 2, footerY, { align: 'center' });
    doc.text(`Tel: ${BUSINESS_INFO.phone} | ${BUSINESS_INFO.email}`, pageWidth / 2, footerY + 5, { align: 'center' });
    doc.text(`Generated on ${format(new Date(), 'PPpp')}`, pageWidth / 2, footerY + 10, { align: 'center' });

    // Save PDF
    doc.save(`daily-report-${reportData.date}.pdf`);
    toast.success('PDF report downloaded');
  };

  const handleExport = async (type: 'csv' | 'pdf') => {
    setIsExporting(type);
    try {
      if (type === 'csv') {
        generateCSV();
      } else {
        generatePDF();
      }
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <Card className="bg-stone-800 border-stone-700">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2 text-base">
            <FileText className="h-4 w-4 text-amber-400" />
            Daily Report
          </CardTitle>
          <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="border-stone-600 text-stone-300 hover:bg-stone-700">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {format(selectedDate, 'MMM dd, yyyy')}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0 bg-stone-800 border-stone-700" align="end">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(date) => {
                  if (date) {
                    onDateChange(date);
                    setCalendarOpen(false);
                  }
                }}
                className="bg-stone-800 text-white"
              />
            </PopoverContent>
          </Popover>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleExport('csv')}
            disabled={isExporting !== null}
            className="flex-1 border-stone-600 text-stone-300 hover:bg-stone-700 hover:text-white"
          >
            {isExporting === 'csv' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-4 w-4 mr-2" />
            )}
            Export CSV
          </Button>
          <Button
            size="sm"
            onClick={() => handleExport('pdf')}
            disabled={isExporting !== null}
            className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isExporting === 'pdf' ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Export PDF
          </Button>
        </div>
        {reportData && (
          <div className="mt-4 pt-4 border-t border-stone-700 grid grid-cols-3 gap-2">
            <div className="text-center">
              <p className="text-amber-400 font-bold">{reportData.stats.totalOrders}</p>
              <p className="text-stone-500 text-xs">Orders</p>
            </div>
            <div className="text-center">
              <p className="text-green-400 font-bold">{reportData.stats.totalRevenue.toLocaleString()}</p>
              <p className="text-stone-500 text-xs">Revenue (XAF)</p>
            </div>
            <div className="text-center">
              <p className="text-blue-400 font-bold">{reportData.stats.totalReservations}</p>
              <p className="text-stone-500 text-xs">Reservations</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
