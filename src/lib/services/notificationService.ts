/**
 * Notification Service
 * Handles creating and managing notifications
 */

import { getAdminDb } from '@/lib/firebase-admin';
import { 
  Notification, 
  CreateNotificationInput, 
  NotificationType 
} from '../types';
import { generateId } from './calculationService';

// In-memory storage for demo mode
const demoNotifications: Notification[] = [];

/**
 * Create a new notification
 */
export async function createNotification(input: CreateNotificationInput): Promise<Notification | null> {
  const adminDb = getAdminDb();
  
  const notification: Notification = {
    id: generateId('notif'),
    type: input.type,
    title: input.title,
    message: input.message,
    userId: input.userId,
    read: false,
    orderId: input.orderId,
    reservationId: input.reservationId,
    eventId: input.eventId,
    paymentMethod: input.paymentMethod,
    transactionReference: input.transactionReference,
    amount: input.amount,
    createdAt: new Date(),
  };
  
  if (!adminDb) {
    // Demo mode
    demoNotifications.push(notification);
    return notification;
  }
  
  try {
    const docRef = await adminDb.collection('notifications').add({
      ...notification,
      createdAt: new Date(), // Firestore timestamp
    });
    
    return {
      ...notification,
      id: docRef.id,
    };
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
}

/**
 * Get notifications for a user (or all for admin)
 */
export async function getNotifications(
  userId?: string, 
  isAdmin: boolean = false,
  limit: number = 50
): Promise<Notification[]> {
  const adminDb = getAdminDb();
  
  if (!adminDb) {
    if (isAdmin) return demoNotifications;
    return demoNotifications.filter(n => !userId || n.userId === userId);
  }
  
  try {
    let query = adminDb.collection('notifications')
      .orderBy('createdAt', 'desc')
      .limit(limit);
    
    if (!isAdmin && userId) {
      query = adminDb.collection('notifications')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc')
        .limit(limit) as typeof query;
    }
    
    const snapshot = await query.get();
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      } as Notification;
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    return [];
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<boolean> {
  const adminDb = getAdminDb();
  
  if (!adminDb) {
    const notification = demoNotifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      return true;
    }
    return false;
  }
  
  try {
    await adminDb.collection('notifications').doc(notificationId).update({
      read: true,
    });
    return true;
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return false;
  }
}

/**
 * Mark all notifications as read for a user (or all for admin)
 */
export async function markAllNotificationsRead(userId?: string): Promise<boolean> {
  const adminDb = getAdminDb();
  
  if (!adminDb) {
    demoNotifications.forEach(n => {
      if (!userId || n.userId === userId) {
        n.read = true;
      }
    });
    return true;
  }
  
  try {
    let query = adminDb.collection('notifications').where('read', '==', false);
    
    if (userId) {
      query = query.where('userId', '==', userId) as typeof query;
    }
    
    const snapshot = await query.get();
    const batch = adminDb.batch();
    
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });
    
    await batch.commit();
    return true;
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return false;
  }
}

/**
 * Create order notification
 */
export async function notifyNewOrder(orderId: string, customerName: string, totalAmount: number, orderType: string): Promise<void> {
  await createNotification({
    type: 'ORDER',
    title: 'New Order Received',
    message: `Order from ${customerName} - ${totalAmount.toLocaleString()} XAF (${orderType})`,
    orderId,
    amount: totalAmount,
  });
}

/**
 * Create payment notification
 */
export async function notifyPayment(
  orderId: string,
  amount: number,
  paymentMethod: string,
  transactionReference?: string
): Promise<void> {
  await createNotification({
    type: 'PAYMENT',
    title: 'Payment Submitted',
    message: `Payment of ${amount.toLocaleString()} XAF via ${paymentMethod}${transactionReference ? ` (Ref: ${transactionReference})` : ''}`,
    orderId,
    paymentMethod: paymentMethod as never,
    transactionReference,
    amount,
  });
}

/**
 * Create reservation notification
 */
export async function notifyNewReservation(reservationId: string, name: string, date: string, time: string, partySize: number): Promise<void> {
  await createNotification({
    type: 'RESERVATION',
    title: 'New Reservation',
    message: `Reservation for ${partySize} guests on ${date} at ${time} - ${name}`,
    reservationId,
  });
}

/**
 * Create event booking notification
 */
export async function notifyNewEvent(eventId: string, name: string, eventType: string, guestCount: number): Promise<void> {
  await createNotification({
    type: 'EVENT',
    title: 'New Event Inquiry',
    message: `Event inquiry: ${eventType} for ${guestCount} guests - ${name}`,
    eventId,
  });
}

/**
 * Delete notification
 */
export async function deleteNotification(notificationId: string): Promise<boolean> {
  const adminDb = getAdminDb();
  
  if (!adminDb) {
    const index = demoNotifications.findIndex(n => n.id === notificationId);
    if (index >= 0) {
      demoNotifications.splice(index, 1);
      return true;
    }
    return false;
  }
  
  try {
    await adminDb.collection('notifications').doc(notificationId).delete();
    return true;
  } catch (error) {
    console.error('Error deleting notification:', error);
    return false;
  }
}
