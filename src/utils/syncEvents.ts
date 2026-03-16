// Global sync events for real-time updates across components
// This enables automatic synchronization between main page and user dashboard

export const SYNC_EVENTS = {
  CART_UPDATED: 'yard:cart_updated',
  ORDER_CREATED: 'yard:order_created',
  ORDER_UPDATED: 'yard:order_updated',
  RESERVATION_CREATED: 'yard:reservation_created',
  EVENT_CREATED: 'yard:event_created',
  USER_DATA_CHANGED: 'yard:user_data_changed',
} as const;

// Dispatch a sync event
export function dispatchSyncEvent(eventType: string, data?: any) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(eventType, { detail: data }));
  }
}

// Subscribe to sync events
export function subscribeToSyncEvent(
  eventType: string,
  callback: (data?: any) => void
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handler = (event: Event) => {
    const customEvent = event as CustomEvent;
    callback(customEvent.detail);
  };

  window.addEventListener(eventType, handler);
  return () => window.removeEventListener(eventType, handler);
}

// Notify cart update
export function notifyCartUpdate(userId?: string) {
  dispatchSyncEvent(SYNC_EVENTS.CART_UPDATED, { userId, timestamp: Date.now() });
}

// Notify order created
export function notifyOrderCreated(orderId: string, userId?: string) {
  dispatchSyncEvent(SYNC_EVENTS.ORDER_CREATED, { orderId, userId, timestamp: Date.now() });
}

// Notify order updated
export function notifyOrderUpdated(orderId: string, userId?: string) {
  dispatchSyncEvent(SYNC_EVENTS.ORDER_UPDATED, { orderId, userId, timestamp: Date.now() });
}

// Notify reservation created
export function notifyReservationCreated(reservationId: string, email?: string) {
  dispatchSyncEvent(SYNC_EVENTS.RESERVATION_CREATED, { reservationId, email, timestamp: Date.now() });
}

// Notify event created
export function notifyEventCreated(eventId: string, email?: string) {
  dispatchSyncEvent(SYNC_EVENTS.EVENT_CREATED, { eventId, email, timestamp: Date.now() });
}

// Notify user data changed
export function notifyUserDataChanged(userId: string) {
  dispatchSyncEvent(SYNC_EVENTS.USER_DATA_CHANGED, { userId, timestamp: Date.now() });
}
