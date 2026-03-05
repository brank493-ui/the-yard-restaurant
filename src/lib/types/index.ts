/**
 * Comprehensive TypeScript Types for The Yard Restaurant Management System
 */

// ==================== User Types ====================

export type UserRole = 'CUSTOMER' | 'STAFF' | 'MANAGER' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  phone?: string;
  avatar?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface UserProfile extends User {
  ordersCount: number;
  reservationsCount: number;
  totalSpent: number;
}

// ==================== Menu Types ====================

export type MenuCategory = 'appetizer' | 'main' | 'grilled' | 'seafood' | 'vegetarian' | 'dessert' | 'beverage' | 'cocktail';

export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: MenuCategory;
  categorySlug?: string;
  image?: string | null;
  featured: boolean;
  isAvailable: boolean;
  preparationTime?: number; // in minutes
  createdAt?: Date;
  updatedAt?: Date;
}

export interface MenuItemWithQuantity extends MenuItem {
  quantity: number;
}

// ==================== Order Types ====================

export type OrderStatus = 'DRAFT' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'COMPLETED' | 'CANCELLED';
export type PaymentStatus = 'PENDING' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REFUNDED';
export type PaymentMethod = 'CASH' | 'ORANGE_MONEY' | 'MTN_MONEY' | 'VISA' | 'MASTERCARD' | 'STRIPE';
export type OrderType = 'pickup' | 'delivery';

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  subtotal: number;
  notes?: string;
}

export interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
  notes?: string;
}

export interface Order {
  id: string;
  userId: string;
  customerName: string;
  phone: string;
  email?: string;
  type: OrderType;
  address?: string;
  items: OrderItem[];
  
  // Pricing
  subtotal: number;
  serviceCharge: number; // 5%
  tax: number; // 10%
  deliveryFee?: number;
  discount?: number;
  totalAmount: number;
  
  // Status
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  transactionReference?: string;
  
  // Metadata
  notes?: string;
  estimatedReadyTime?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateOrderInput {
  userId?: string;
  customerName: string;
  phone: string;
  email?: string;
  type: OrderType;
  address?: string;
  items: OrderItemInput[];
  paymentMethod: PaymentMethod;
  notes?: string;
}

export interface OrderItemInput {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  notes?: string;
}

export interface OrderCalculation {
  subtotal: number;
  serviceCharge: number;
  tax: number;
  deliveryFee: number;
  discount: number;
  totalAmount: number;
}

// ==================== Reservation Types ====================

export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED' | 'NO_SHOW';

export interface Reservation {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  date: string; // YYYY-MM-DD
  time: string; // HH:MM
  partySize: number;
  status: ReservationStatus;
  occasion?: string;
  specialRequests?: string;
  tableNumber?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateReservationInput {
  userId?: string;
  name: string;
  email: string;
  phone: string;
  date: string;
  time: string;
  partySize: number;
  occasion?: string;
  specialRequests?: string;
}

// ==================== Event Types ====================

export type EventStatus = 'INQUIRY' | 'QUOTED' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface EventService {
  serviceName: string;
  description?: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface EventBooking {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  eventType: string;
  eventDate?: string;
  preferredDate?: string;
  guestCount: number;
  services: EventService[];
  totalAmount: number;
  status: EventStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: PaymentMethod;
  budget?: string;
  details?: string;
  createdAt: Date;
  updatedAt?: Date;
}

export interface CreateEventInput {
  userId?: string;
  name: string;
  email: string;
  phone: string;
  eventType: string;
  preferredDate?: string;
  guestCount: number;
  budget?: string;
  details?: string;
}

// ==================== Cart Types ====================

export interface CartItem {
  menuItemId: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  image?: string;
  notes?: string;
}

export interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
  subtotal: number;
  serviceCharge: number;
  tax: number;
  totalAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface CartAddItemInput {
  menuItemId: string;
  name: string;
  description?: string;
  price: number;
  quantity: number;
  image?: string;
  notes?: string;
}

export interface CartUpdateInput {
  items?: CartItem[];
  clearItems?: boolean;
}

// ==================== Notification Types ====================

export type NotificationType = 'ORDER' | 'PAYMENT' | 'RESERVATION' | 'EVENT' | 'SYSTEM' | 'PROMO';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  userId?: string;
  read: boolean;
  
  // Related entity
  orderId?: string;
  reservationId?: string;
  eventId?: string;
  
  // Payment details
  paymentMethod?: PaymentMethod;
  transactionReference?: string;
  amount?: number;
  
  createdAt: Date;
}

export interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  message: string;
  userId?: string;
  orderId?: string;
  reservationId?: string;
  eventId?: string;
  paymentMethod?: PaymentMethod;
  transactionReference?: string;
  amount?: number;
}

// ==================== Invoice Types ====================

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'CANCELLED';

export interface Invoice {
  id: string;
  invoiceNumber: string;
  orderId: string;
  userId: string;
  
  // Customer details
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  
  // Items
  items: OrderItem[];
  
  // Pricing
  subtotal: number;
  serviceCharge: number;
  tax: number;
  total: number;
  
  // Payment
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: InvoiceStatus;
  
  // Dates
  dueDate: Date;
  paidAt?: Date;
  createdAt: Date;
}

// ==================== News Types ====================

export interface NewsItem {
  id: string;
  title: string;
  description: string;
  image?: string;
  active: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: Date;
  updatedAt?: Date;
}

// ==================== Review Types ====================

export interface Review {
  id: string;
  userId?: string;
  name: string;
  email?: string;
  rating: number; // 1-5
  text: string;
  avatar?: string;
  approved: boolean;
  createdAt: Date;
}

export interface CreateReviewInput {
  userId?: string;
  name: string;
  email?: string;
  rating: number;
  text: string;
}

// ==================== API Response Types ====================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CheckoutResult {
  success: boolean;
  order?: Order;
  invoice?: Invoice;
  transactionReference?: string;
  message?: string;
  error?: string;
}

// ==================== Filter Types ====================

export interface OrderFilters {
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  paymentMethod?: PaymentMethod;
  startDate?: string;
  endDate?: string;
  search?: string; // customer name, phone, or order ID
}

export interface ReservationFilters {
  status?: ReservationStatus;
  date?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface EventFilters {
  status?: EventStatus;
  eventType?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

// ==================== Constants ====================

export const SERVICE_CHARGE_PERCENT = 5; // 5%
export const TAX_PERCENT = 10; // 10%

export const PAYMENT_METHODS: Record<PaymentMethod, { label: string; icon: string; color: string }> = {
  CASH: { label: 'Cash', icon: '💵', color: 'green' },
  ORANGE_MONEY: { label: 'Orange Money', icon: '🟠', color: 'orange' },
  MTN_MONEY: { label: 'MTN Money', icon: '🟡', color: 'yellow' },
  VISA: { label: 'Visa', icon: '💳', color: 'blue' },
  MASTERCARD: { label: 'Mastercard', icon: '💳', color: 'red' },
  STRIPE: { label: 'Stripe', icon: '💜', color: 'purple' },
};

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  DRAFT: 'Draft',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
};

export const RESERVATION_STATUS_LABELS: Record<ReservationStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
  NO_SHOW: 'No Show',
};

export const EVENT_STATUS_LABELS: Record<EventStatus, string> = {
  INQUIRY: 'Inquiry',
  QUOTED: 'Quoted',
  CONFIRMED: 'Confirmed',
  CANCELLED: 'Cancelled',
  COMPLETED: 'Completed',
};

// ==================== Admin Dashboard Types ====================

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

export interface UserActivitySummary {
  id: string;
  userId: string;
  userName: string;
  email: string;
  phone?: string;
  ordersCount: number;
  reservationsCount: number;
  eventsCount: number;
  totalAmount: number;
  paymentStatus: 'PAID' | 'PENDING' | 'PARTIAL';
  paymentMethod?: PaymentMethod;
  lastActivity: Date;
}

export interface DailyReport {
  id: string;
  date: string;
  orders: Order[];
  reservations: Reservation[];
  events: EventBooking[];
  totalRevenue: number;
  paymentStats: {
    pending: number;
    confirmed: number;
    total: number;
  };
  topItems: Array<{
    name: string;
    count: number;
    revenue: number;
  }>;
  hourlyDistribution: Array<{
    hour: number;
    orders: number;
    revenue: number;
  }>;
  createdAt: Date;
}

export type AdminTargetType = 'order' | 'reservation' | 'event' | 'payment' | 'user' | 'invoice' | 'report' | 'system';

export interface AdminLog {
  id: string;
  adminId: string;
  adminEmail?: string;
  action: string;
  targetId: string;
  targetType: AdminTargetType;
  details: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface InvoiceData {
  id: string;
  invoiceNumber: string;
  orderId?: string;
  reservationId?: string;
  eventId?: string;
  userId: string;
  
  // Customer details
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  
  // Business details
  businessName: string;
  businessAddress: string;
  businessPhone: string;
  businessEmail?: string;
  
  // Items
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    subtotal: number;
  }>;
  
  // Additional details
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
  
  // Pricing
  subtotal: number;
  serviceCharge: number;
  vat: number; // 19.25%
  deliveryFee?: number;
  discount?: number;
  total: number;
  
  // Payment
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentReference?: string;
  paidAt?: Date;
  
  // Status
  status: InvoiceStatus;
  
  // Dates
  dueDate: Date;
  createdAt: Date;
  updatedAt?: Date;
  
  // PDF URL
  pdfUrl?: string;
}

export interface CreateInvoiceInput {
  orderId?: string;
  reservationId?: string;
  eventId?: string;
  userId: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  paymentMethod: PaymentMethod;
  subtotal: number;
  deliveryFee?: number;
  discount?: number;
  reservationDetails?: InvoiceData['reservationDetails'];
  eventDetails?: InvoiceData['eventDetails'];
}

export interface AnalyticsData {
  revenueOverTime: Array<{
    date: string;
    revenue: number;
    orders: number;
  }>;
  mostOrderedItems: Array<{
    name: string;
    count: number;
    revenue: number;
  }>;
  peakHours: Array<{
    hour: number;
    orders: number;
    revenue: number;
  }>;
  eventPopularity: Array<{
    type: string;
    count: number;
    revenue: number;
  }>;
  paymentDistribution: Array<{
    method: string;
    count: number;
    amount: number;
    percentage: number;
  }>;
}
