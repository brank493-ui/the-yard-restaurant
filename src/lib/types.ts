/**
 * Types for The Yard Restaurant Application
 */

// Payment Types
export type PaymentMethod = 'CASH' | 'ORANGE_MONEY' | 'MTN_MONEY' | 'VISA' | 'MASTERCARD' | 'STRIPE';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIAL';
export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'CANCELLED' | 'OVERDUE';

// Order Types
export type OrderType = 'pickup' | 'delivery' | 'dine_in';
export type OrderStatus = 'PENDING' | 'DRAFT' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';

// Reservation Types
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

// Event Types
export type EventStatus = 'INQUIRY' | 'QUOTED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

// User Types
export type UserRole = 'CUSTOMER' | 'STAFF' | 'MANAGER' | 'ADMIN';

// Order Interface
export interface Order {
  id: string;
  userId?: string;
  customerName: string;
  phone: string;
  email?: string;
  type: OrderType;
  address?: string;
  items: OrderItem[];
  subtotal: number;
  serviceCharge: number;
  tax: number;
  deliveryFee?: number;
  discount?: number;
  totalAmount: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  transactionReference?: string;
  notes?: string;
  estimatedReadyAt?: Date;
  paidAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

export interface OrderItem {
  id?: string;
  orderId?: string;
  menuItemId?: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
  notes?: string;
}

// Reservation Interface
export interface Reservation {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  partySize: number;
  status: ReservationStatus;
  occasion?: string;
  specialRequests?: string;
  tableNumber?: string;
  createdAt: Date;
  updatedAt?: Date;
}

// Event Booking Interface
export interface EventBooking {
  id: string;
  userId?: string;
  name: string;
  email: string;
  phone?: string;
  eventType: string;
  eventDate?: string;
  preferredDate?: string;
  guestCount?: number;
  totalAmount?: number;
  status: EventStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  budget?: string;
  details?: string;
  services?: EventService[];
  createdAt: Date;
  updatedAt?: Date;
}

export interface EventService {
  id?: string;
  eventId?: string;
  serviceName: string;
  description?: string;
  price: number;
  quantity: number;
  subtotal: number;
}

// Invoice Interface
export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  orderId?: string;
  reservationId?: string;
  eventId?: string;
  userId?: string;
  
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail?: string;
  
  items: InvoiceItem[];
  reservationDetails?: {
    date: string;
    time: string;
    guests: number;
  };
  eventDetails?: {
    type: string;
    date?: string;
    guests?: number;
    services?: string[];
  };
  
  subtotal: number;
  serviceCharge: number;
  vat: number;
  deliveryFee?: number;
  discount?: number;
  total: number;
  
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  status: InvoiceStatus;
  
  dueDate: Date;
  paidAt?: Date;
  createdAt: Date;
  
  pdfUrl?: string;
  pdfGeneratedAt?: Date;
}

export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

// Create Invoice Input
export interface CreateInvoiceInput {
  orderId?: string;
  reservationId?: string;
  eventId?: string;
  userId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  reservationDetails?: InvoiceData['reservationDetails'];
  eventDetails?: InvoiceData['eventDetails'];
  subtotal: number;
  deliveryFee?: number;
  discount?: number;
  paymentMethod: PaymentMethod;
}

// Admin Log Interface
export interface AdminLog {
  id: string;
  adminId: string;
  adminEmail?: string;
  action: string;
  targetId: string;
  targetType: 'order' | 'reservation' | 'event' | 'payment' | 'user' | 'invoice' | 'report' | 'system';
  details: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Admin Dashboard Stats
export interface AdminDashboardStats {
  totalOrdersToday: number;
  totalReservationsToday: number;
  totalEventsToday: number;
  totalRevenueToday: number;
  pendingPayments: number;
  confirmedPayments: number;
  activeUsers: number;
  pendingOrders: number;
  completedOrders: number;
  avgOrderValue: number;
  newUsersToday: number;
}

// Review Interface
export interface Review {
  id: string;
  userId?: string;
  name: string;
  email?: string;
  rating: number;
  text: string;
  avatar?: string;
  approved: boolean;
  createdAt: Date;
  updatedAt?: Date;
}

// Notification Interface
export interface Notification {
  id: string;
  type: 'ORDER' | 'PAYMENT' | 'RESERVATION' | 'EVENT' | 'SYSTEM' | 'PROMO' | 'REVIEW';
  title: string;
  message: string;
  userId?: string;
  read: boolean;
  orderId?: string;
  reservationId?: string;
  eventId?: string;
  paymentId?: string;
  paymentMethod?: PaymentMethod;
  transactionReference?: string;
  amount?: number;
  priority?: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  sentAt?: Date;
  readAt?: Date;
  createdAt: Date;
}

// Daily Report Interface
export interface DailyReportData {
  id: string;
  date: string;
  totalOrders: number;
  totalReservations: number;
  totalEvents: number;
  totalRevenue: number;
  cashRevenue: number;
  mobileMoneyRevenue: number;
  cardRevenue: number;
  paymentsConfirmed: number;
  paymentsPending: number;
  paymentsFailed: number;
  topItems?: Array<{ name: string; count: number; revenue: number }>;
  paymentMethods?: Record<string, number>;
  peakHours?: Array<{ hour: number; orders: number; revenue: number }>;
  reportGeneratedAt?: Date;
  archivedAt?: Date;
  createdAt: Date;
  updatedAt?: Date;
}

// User Activity for Admin
export interface UserActivityData {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone?: string;
  orders: Order[];
  reservations: Reservation[];
  events: EventBooking[];
  reviews: Review[];
  totalAmount: number;
  paymentStatus: 'PAID' | 'PENDING' | 'PARTIAL';
  paymentMethod?: PaymentMethod;
  lastActivity: Date;
}

// API Response Types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  details?: string;
}

export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
