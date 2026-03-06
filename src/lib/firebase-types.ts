// User types
export interface FirebaseUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  photoURL: string | null;
  role: 'CUSTOMER' | 'STAFF' | 'KITCHEN_STAFF' | 'MANAGER' | 'ADMIN';
  phone?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Menu Item types
export interface MenuItem {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  categorySlug: string;
  image?: string;
  isAvailable: boolean;
  isPopular: boolean;
  preparationTime?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Order types
export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'READY' | 'DELIVERED' | 'CANCELLED';
export type PaymentMethod = 'ORANGE_MONEY' | 'MTN_MONEY' | 'CASH' | 'CARD';
export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';

export interface OrderItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

export interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  totalAmount: number;
  status: OrderStatus;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  transactionId?: string;
  tableNumber?: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Reservation types
export type ReservationStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'COMPLETED';

export interface Reservation {
  id: string;
  userId: string;
  name: string;
  email: string;
  phone: string;
  date: Date;
  time: string;
  partySize: number;
  tableNumber?: number;
  status: ReservationStatus;
  specialRequests?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Payment types
export interface Payment {
  id: string;
  orderId: string;
  userId: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  phoneNumber?: string;
  transactionId?: string;
  providerReference?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Contact Message types
export interface ContactMessage {
  id: string;
  name: string;
  email: string;
  phone?: string;
  subject: string;
  message: string;
  isRead: boolean;
  createdAt: Date;
}

// Category types
export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// Staff types
export interface StaffMember {
  id: string;
  userId: string;
  position: string;
  salary?: number;
  hireDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Settings types
export interface RestaurantSettings {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  openingHours: {
    [key: string]: { open: string; close: string; closed: boolean };
  };
  currency: string;
  taxRate: number;
  deliveryFee: number;
  minOrderAmount: number;
  createdAt: Date;
  updatedAt: Date;
}
