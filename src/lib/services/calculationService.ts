/**
 * Calculation Service
 * Handles all pricing calculations for orders, invoices, etc.
 */

import { SERVICE_CHARGE_PERCENT, TAX_PERCENT, OrderCalculation, OrderItem, CartItem } from '../types/index';

/**
 * Calculate subtotal from items
 */
export function calculateSubtotal(items: Array<{ price: number; quantity: number }>): number {
  return items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
}

/**
 * Calculate service charge (5% of subtotal)
 */
export function calculateServiceCharge(subtotal: number): number {
  return Math.round(subtotal * (SERVICE_CHARGE_PERCENT / 100));
}

/**
 * Calculate tax (10% of subtotal + service charge)
 */
export function calculateTax(subtotal: number, serviceCharge: number): number {
  return Math.round((subtotal + serviceCharge) * (TAX_PERCENT / 100));
}

/**
 * Calculate delivery fee based on order type
 */
export function calculateDeliveryFee(type: string, subtotal: number): number {
  if (type === 'delivery') {
    // Free delivery for orders over 15000 XAF
    if (subtotal >= 15000) return 0;
    // Standard delivery fee
    return 1500;
  }
  return 0;
}

/**
 * Calculate all order pricing
 */
export function calculateOrderPricing(
  items: Array<{ price: number; quantity: number }>,
  orderType: string = 'pickup',
  discount: number = 0
): OrderCalculation {
  const subtotal = calculateSubtotal(items);
  const serviceCharge = calculateServiceCharge(subtotal);
  const tax = calculateTax(subtotal, serviceCharge);
  const deliveryFee = calculateDeliveryFee(orderType, subtotal);
  
  const totalAmount = subtotal + serviceCharge + tax + deliveryFee - discount;
  
  return {
    subtotal,
    serviceCharge,
    tax,
    deliveryFee,
    discount,
    totalAmount,
  };
}

/**
 * Calculate item subtotal
 */
export function calculateItemSubtotal(price: number, quantity: number): number {
  return price * quantity;
}

/**
 * Format order items from cart items
 */
export function formatOrderItems(cartItems: CartItem[]): OrderItem[] {
  return cartItems.map(item => ({
    menuItemId: item.menuItemId,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    subtotal: calculateItemSubtotal(item.price, item.quantity),
    notes: item.notes,
  }));
}

/**
 * Generate a unique order ID
 */
export function generateOrderId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `ORD-${timestamp}-${random}`.toUpperCase();
}

/**
 * Generate a unique invoice number
 */
export function generateInvoiceNumber(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `INV-${year}${month}${day}-${random}`;
}

/**
 * Generate a unique ID for any entity
 */
export function generateId(prefix: string = 'ID'): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 6);
  return `${prefix}_${timestamp}_${random}`.toLowerCase();
}

/**
 * Calculate grand total for multiple pending orders
 */
export function calculateGrandTotal(orders: Array<{ totalAmount: number; paymentStatus?: string }>): number {
  return orders
    .filter(order => order.paymentStatus !== 'PAID')
    .reduce((sum, order) => sum + order.totalAmount, 0);
}

/**
 * Estimate preparation time based on items
 */
export function estimatePreparationTime(items: Array<{ quantity: number }>): number {
  // Base time: 10 minutes
  const baseTime = 10;
  // Add 3 minutes per item
  const itemTime = items.reduce((sum, item) => sum + (item.quantity * 3), 0);
  // Cap at 45 minutes
  return Math.min(baseTime + itemTime, 45);
}

/**
 * Format price for display
 */
export function formatPrice(amount: number, currency: string = 'XAF'): string {
  return `${amount.toLocaleString()} ${currency}`;
}

/**
 * Parse price string to number
 */
export function parsePrice(priceString: string): number {
  const cleaned = priceString.replace(/[^\d.-]/g, '');
  return parseInt(cleaned, 10) || 0;
}
