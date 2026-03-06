/**
 * Order Service
 * Handles all order-related operations with transaction support
 */

import { getAdminDb } from '@/lib/firebase-admin';
import { 
  Order, 
  OrderItem, 
  OrderStatus, 
  PaymentStatus, 
  PaymentMethod,
  CreateOrderInput,
  OrderFilters,
  OrderItemInput,
  OrderCalculation
} from '../types';
import { 
  generateId, 
  generateOrderId,
  calculateOrderPricing,
  calculateItemSubtotal,
  estimatePreparationTime,
  formatOrderItems
} from './calculationService';
import { notifyNewOrder, notifyPayment } from './notificationService';
import { deleteCart } from './cartService';

// In-memory storage for demo mode
const demoOrders: Order[] = [];

/**
 * Create a new order
 */
export async function createOrder(input: CreateOrderInput): Promise<Order> {
  const adminDb = getAdminDb();
  
  // Format items and calculate subtotals
  const items: OrderItem[] = input.items.map(item => ({
    menuItemId: item.menuItemId,
    name: item.name,
    quantity: item.quantity,
    price: item.price,
    subtotal: calculateItemSubtotal(item.price, item.quantity),
    notes: item.notes,
  }));
  
  // Calculate pricing
  const pricing = calculateOrderPricing(items, input.type);
  
  // Estimate preparation time
  const prepTime = estimatePreparationTime(items);
  const estimatedReadyTime = new Date(Date.now() + prepTime * 60 * 1000);
  
  const order: Order = {
    id: generateOrderId(),
    userId: input.userId || 'guest',
    customerName: input.customerName,
    phone: input.phone,
    email: input.email,
    type: input.type,
    address: input.address,
    items,
    subtotal: pricing.subtotal,
    serviceCharge: pricing.serviceCharge,
    tax: pricing.tax,
    deliveryFee: pricing.deliveryFee,
    discount: pricing.discount,
    totalAmount: pricing.totalAmount,
    status: 'CONFIRMED',
    paymentStatus: input.paymentMethod === 'CASH' ? 'PENDING' : 'PENDING',
    paymentMethod: input.paymentMethod,
    notes: input.notes,
    estimatedReadyTime,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  
  if (!adminDb) {
    // Demo mode
    demoOrders.unshift(order);
    // Notify
    notifyNewOrder(order.id, order.customerName, order.totalAmount, order.type);
    return order;
  }
  
  try {
    // Use batched write for transaction support
    const batch = adminDb.batch();
    
    // Add order
    const orderRef = adminDb.collection('orders').doc();
    batch.set(orderRef, {
      ...order,
      id: orderRef.id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    
    // Clear user's cart
    if (input.userId) {
      const cartSnapshot = await adminDb.collection('carts')
        .where('userId', '==', input.userId)
        .limit(1)
        .get();
      
      if (!cartSnapshot.empty) {
        batch.delete(cartSnapshot.docs[0].ref);
      }
    }
    
    await batch.commit();
    
    // Create notification
    await notifyNewOrder(orderRef.id, order.customerName, order.totalAmount, order.type);
    
    return {
      ...order,
      id: orderRef.id,
    };
  } catch (error) {
    console.error('Error creating order:', error);
    throw error;
  }
}

/**
 * Get order by ID
 */
export async function getOrder(orderId: string): Promise<Order | null> {
  const adminDb = getAdminDb();
  
  if (!adminDb) {
    return demoOrders.find(o => o.id === orderId) || null;
  }
  
  try {
    const doc = await adminDb.collection('orders').doc(orderId).get();
    
    if (!doc.exists) return null;
    
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate?.() || data?.createdAt,
      updatedAt: data?.updatedAt?.toDate?.() || data?.updatedAt,
      estimatedReadyTime: data?.estimatedReadyTime?.toDate?.() || data?.estimatedReadyTime,
    } as Order;
  } catch (error) {
    console.error('Error getting order:', error);
    return null;
  }
}

/**
 * Get orders for a user
 */
export async function getOrders(
  userId?: string, 
  isAdmin: boolean = false,
  filters?: OrderFilters,
  page: number = 1,
  pageSize: number = 20
): Promise<{ orders: Order[]; total: number }> {
  const adminDb = getAdminDb();
  
  if (!adminDb) {
    let filtered = [...demoOrders];
    
    // Apply filters
    if (filters) {
      if (filters.status) {
        filtered = filtered.filter(o => o.status === filters.status);
      }
      if (filters.paymentStatus) {
        filtered = filtered.filter(o => o.paymentStatus === filters.paymentStatus);
      }
      if (filters.search) {
        const search = filters.search.toLowerCase();
        filtered = filtered.filter(o => 
          o.customerName.toLowerCase().includes(search) ||
          o.phone.includes(search) ||
          o.id.toLowerCase().includes(search)
        );
      }
    }
    
    // Filter by user if not admin
    if (!isAdmin && userId) {
      filtered = filtered.filter(o => o.userId === userId);
    }
    
    const total = filtered.length;
    const start = (page - 1) * pageSize;
    const orders = filtered.slice(start, start + pageSize);
    
    return { orders, total };
  }
  
  try {
    let query = adminDb.collection('orders');
    
    // User filter
    if (!isAdmin && userId) {
      query = query.where('userId', '==', userId) as typeof query;
    }
    
    // Apply filters
    if (filters?.status) {
      query = query.where('status', '==', filters.status) as typeof query;
    }
    if (filters?.paymentStatus) {
      query = query.where('paymentStatus', '==', filters.paymentStatus) as typeof query;
    }
    
    // Order and limit
    query = query.orderBy('createdAt', 'desc') as typeof query;
    
    const snapshot = await query.get();
    
    let orders = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      } as Order;
    });
    
    // Apply search filter (client-side for simplicity)
    if (filters?.search) {
      const search = filters.search.toLowerCase();
      orders = orders.filter(o => 
        o.customerName.toLowerCase().includes(search) ||
        o.phone.includes(search) ||
        o.id.toLowerCase().includes(search)
      );
    }
    
    const total = orders.length;
    const start = (page - 1) * pageSize;
    orders = orders.slice(start, start + pageSize);
    
    return { orders, total };
  } catch (error) {
    console.error('Error getting orders:', error);
    return { orders: [], total: 0 };
  }
}

/**
 * Update order status
 */
export async function updateOrderStatus(
  orderId: string, 
  status: OrderStatus
): Promise<Order | null> {
  const adminDb = getAdminDb();
  
  if (!adminDb) {
    const order = demoOrders.find(o => o.id === orderId);
    if (order) {
      order.status = status;
      order.updatedAt = new Date();
      return order;
    }
    return null;
  }
  
  try {
    await adminDb.collection('orders').doc(orderId).update({
      status,
      updatedAt: new Date(),
    });
    
    return getOrder(orderId);
  } catch (error) {
    console.error('Error updating order status:', error);
    return null;
  }
}

/**
 * Update payment status
 */
export async function updatePaymentStatus(
  orderId: string,
  paymentStatus: PaymentStatus,
  paymentMethod?: PaymentMethod,
  transactionReference?: string
): Promise<Order | null> {
  const adminDb = getAdminDb();
  
  const updateData: Record<string, unknown> = {
    paymentStatus,
    updatedAt: new Date(),
  };
  
  if (paymentMethod) {
    updateData.paymentMethod = paymentMethod;
  }
  if (transactionReference) {
    updateData.transactionReference = transactionReference;
  }
  
  if (!adminDb) {
    const order = demoOrders.find(o => o.id === orderId);
    if (order) {
      Object.assign(order, updateData);
      return order;
    }
    return null;
  }
  
  try {
    await adminDb.collection('orders').doc(orderId).update(updateData);
    
    // Create notification for payment
    const order = await getOrder(orderId);
    if (order && paymentStatus === 'PROCESSING') {
      await notifyPayment(
        orderId,
        order.totalAmount,
        paymentMethod || order.paymentMethod,
        transactionReference
      );
    }
    
    return getOrder(orderId);
  } catch (error) {
    console.error('Error updating payment status:', error);
    return null;
  }
}

/**
 * Cancel order
 */
export async function cancelOrder(orderId: string): Promise<Order | null> {
  return updateOrderStatus(orderId, 'CANCELLED');
}

/**
 * Get order statistics
 */
export async function getOrderStats(userId?: string, isAdmin: boolean = false): Promise<{
  total: number;
  pending: number;
  completed: number;
  revenue: number;
  pendingPayments: number;
}> {
  const adminDb = getAdminDb();
  
  if (!adminDb) {
    let orders = demoOrders;
    if (!isAdmin && userId) {
      orders = orders.filter(o => o.userId === userId);
    }
    
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'PENDING' || o.status === 'CONFIRMED' || o.status === 'PREPARING').length,
      completed: orders.filter(o => o.status === 'COMPLETED').length,
      revenue: orders.filter(o => o.paymentStatus === 'PAID').reduce((sum, o) => sum + o.totalAmount, 0),
      pendingPayments: orders.filter(o => o.paymentStatus === 'PROCESSING').length,
    };
  }
  
  try {
    let query = adminDb.collection('orders');
    
    if (!isAdmin && userId) {
      query = query.where('userId', '==', userId) as typeof query;
    }
    
    const snapshot = await query.get();
    const orders = snapshot.docs.map(doc => doc.data() as Order);
    
    return {
      total: orders.length,
      pending: orders.filter(o => o.status === 'PENDING' || o.status === 'CONFIRMED' || o.status === 'PREPARING').length,
      completed: orders.filter(o => o.status === 'COMPLETED').length,
      revenue: orders.filter(o => o.paymentStatus === 'PAID').reduce((sum, o) => sum + o.totalAmount, 0),
      pendingPayments: orders.filter(o => o.paymentStatus === 'PROCESSING').length,
    };
  } catch (error) {
    console.error('Error getting order stats:', error);
    return { total: 0, pending: 0, completed: 0, revenue: 0, pendingPayments: 0 };
  }
}
