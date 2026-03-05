/**
 * Admin Log Service
 * Comprehensive audit logging for all admin actions
 */

import { db } from '@/lib/db';

export type AdminTargetType = 'order' | 'reservation' | 'event' | 'payment' | 'user' | 'invoice' | 'report' | 'system';

export interface AdminLogInput {
  adminId: string;
  adminEmail?: string;
  action: string;
  targetId: string;
  targetType: AdminTargetType;
  details: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}

export interface AdminLogEntry {
  id: string;
  adminId: string;
  adminEmail: string | null;
  action: string;
  targetId: string;
  targetType: AdminTargetType;
  details: string;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: Date;
}

/**
 * Log an admin action
 */
export async function logAction(input: AdminLogInput): Promise<string | null> {
  try {
    const log = await db.adminLog.create({
      data: {
        adminId: input.adminId,
        adminEmail: input.adminEmail,
        action: input.action,
        targetId: input.targetId,
        targetType: input.targetType,
        details: input.details,
        metadata: input.metadata ? JSON.stringify(input.metadata) : null,
        ipAddress: input.ipAddress,
        userAgent: input.userAgent,
      }
    });
    
    return log.id;
  } catch (error) {
    console.error('Failed to log admin action:', error);
    return null;
  }
}

/**
 * Get admin logs with pagination
 */
export async function getAdminLogs(options: {
  adminId?: string;
  action?: string;
  targetType?: AdminTargetType;
  targetId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
}): Promise<{ logs: AdminLogEntry[]; total: number }> {
  const page = options.page || 1;
  const limit = options.limit || 50;
  const skip = (page - 1) * limit;
  
  try {
    const where: Record<string, unknown> = {};
    
    if (options.adminId) {
      where.adminId = options.adminId;
    }
    
    if (options.action) {
      where.action = options.action;
    }
    
    if (options.targetType) {
      where.targetType = options.targetType;
    }
    
    if (options.targetId) {
      where.targetId = options.targetId;
    }
    
    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        (where.createdAt as Record<string, unknown>).gte = options.startDate;
      }
      if (options.endDate) {
        (where.createdAt as Record<string, unknown>).lte = options.endDate;
      }
    }
    
    const [logs, total] = await Promise.all([
      db.adminLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      db.adminLog.count({ where })
    ]);
    
    return {
      logs: logs.map(log => ({
        ...log,
        metadata: log.metadata ? JSON.parse(log.metadata) : null,
      })),
      total
    };
  } catch (error) {
    console.error('Failed to get admin logs:', error);
    return { logs: [], total: 0 };
  }
}

/**
 * Get recent admin activity
 */
export async function getRecentActivity(limit: number = 20): Promise<AdminLogEntry[]> {
  try {
    const logs = await db.adminLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    
    return logs.map(log => ({
      ...log,
      metadata: log.metadata ? JSON.parse(log.metadata) : null,
    }));
  } catch (error) {
    console.error('Failed to get recent activity:', error);
    return [];
  }
}

/**
 * Get admin statistics
 */
export async function getAdminStats(adminId: string): Promise<{
  totalActions: number;
  actionsToday: number;
  actionsThisWeek: number;
  actionsThisMonth: number;
  actionTypes: Record<string, number>;
}> {
  try {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    const [totalActions, actionsToday, actionsThisWeek, actionsThisMonth, actionTypeResults] = await Promise.all([
      db.adminLog.count({ where: { adminId } }),
      db.adminLog.count({ where: { adminId, createdAt: { gte: today } } }),
      db.adminLog.count({ where: { adminId, createdAt: { gte: weekAgo } } }),
      db.adminLog.count({ where: { adminId, createdAt: { gte: monthAgo } } }),
      db.adminLog.groupBy({
        by: ['action'],
        where: { adminId },
        _count: { action: true },
      })
    ]);
    
    const actionTypes: Record<string, number> = {};
    actionTypeResults.forEach(result => {
      actionTypes[result.action] = result._count.action;
    });
    
    return {
      totalActions,
      actionsToday,
      actionsThisWeek,
      actionsThisMonth,
      actionTypes,
    };
  } catch (error) {
    console.error('Failed to get admin stats:', error);
    return {
      totalActions: 0,
      actionsToday: 0,
      actionsThisWeek: 0,
      actionsThisMonth: 0,
      actionTypes: {},
    };
  }
}

/**
 * Log payment confirmation action
 */
export async function logPaymentConfirmation(data: {
  adminId: string;
  adminEmail?: string;
  orderId: string;
  amount: number;
  paymentMethod: string;
  invoiceNumber?: string;
  ipAddress?: string;
}): Promise<void> {
  await logAction({
    adminId: data.adminId,
    adminEmail: data.adminEmail,
    action: 'CONFIRM_PAYMENT',
    targetId: data.orderId,
    targetType: 'payment',
    details: `Confirmed payment of ${data.amount.toLocaleString()} XAF via ${data.paymentMethod}`,
    metadata: {
      amount: data.amount,
      paymentMethod: data.paymentMethod,
      invoiceNumber: data.invoiceNumber,
    },
    ipAddress: data.ipAddress,
  });
}

/**
 * Log order status change
 */
export async function logOrderStatusChange(data: {
  adminId: string;
  adminEmail?: string;
  orderId: string;
  oldStatus: string;
  newStatus: string;
  ipAddress?: string;
}): Promise<void> {
  await logAction({
    adminId: data.adminId,
    adminEmail: data.adminEmail,
    action: 'UPDATE_ORDER_STATUS',
    targetId: data.orderId,
    targetType: 'order',
    details: `Changed order status from ${data.oldStatus} to ${data.newStatus}`,
    metadata: {
      oldStatus: data.oldStatus,
      newStatus: data.newStatus,
    },
    ipAddress: data.ipAddress,
  });
}

/**
 * Log reservation status change
 */
export async function logReservationStatusChange(data: {
  adminId: string;
  adminEmail?: string;
  reservationId: string;
  oldStatus: string;
  newStatus: string;
  ipAddress?: string;
}): Promise<void> {
  await logAction({
    adminId: data.adminId,
    adminEmail: data.adminEmail,
    action: 'UPDATE_RESERVATION_STATUS',
    targetId: data.reservationId,
    targetType: 'reservation',
    details: `Changed reservation status from ${data.oldStatus} to ${data.newStatus}`,
    metadata: {
      oldStatus: data.oldStatus,
      newStatus: data.newStatus,
    },
    ipAddress: data.ipAddress,
  });
}

/**
 * Log event status change
 */
export async function logEventStatusChange(data: {
  adminId: string;
  adminEmail?: string;
  eventId: string;
  oldStatus: string;
  newStatus: string;
  ipAddress?: string;
}): Promise<void> {
  await logAction({
    adminId: data.adminId,
    adminEmail: data.adminEmail,
    action: 'UPDATE_EVENT_STATUS',
    targetId: data.eventId,
    targetType: 'event',
    details: `Changed event status from ${data.oldStatus} to ${data.newStatus}`,
    metadata: {
      oldStatus: data.oldStatus,
      newStatus: data.newStatus,
    },
    ipAddress: data.ipAddress,
  });
}

/**
 * Log invoice generation
 */
export async function logInvoiceGeneration(data: {
  adminId: string;
  adminEmail?: string;
  invoiceId: string;
  invoiceNumber: string;
  orderId?: string;
  reservationId?: string;
  eventId?: string;
  amount: number;
  ipAddress?: string;
}): Promise<void> {
  await logAction({
    adminId: data.adminId,
    adminEmail: data.adminEmail,
    action: 'GENERATE_INVOICE',
    targetId: data.invoiceId,
    targetType: 'invoice',
    details: `Generated invoice ${data.invoiceNumber} for ${data.amount.toLocaleString()} XAF`,
    metadata: {
      invoiceNumber: data.invoiceNumber,
      orderId: data.orderId,
      reservationId: data.reservationId,
      eventId: data.eventId,
      amount: data.amount,
    },
    ipAddress: data.ipAddress,
  });
}

/**
 * Log report export
 */
export async function logReportExport(data: {
  adminId: string;
  adminEmail?: string;
  reportType: string;
  dateRange?: string;
  ipAddress?: string;
}): Promise<void> {
  await logAction({
    adminId: data.adminId,
    adminEmail: data.adminEmail,
    action: 'EXPORT_REPORT',
    targetId: `report_${Date.now()}`,
    targetType: 'report',
    details: `Exported ${data.reportType} report${data.dateRange ? ` for ${data.dateRange}` : ''}`,
    metadata: {
      reportType: data.reportType,
      dateRange: data.dateRange,
    },
    ipAddress: data.ipAddress,
  });
}

export default {
  logAction,
  getAdminLogs,
  getRecentActivity,
  getAdminStats,
  logPaymentConfirmation,
  logOrderStatusChange,
  logReservationStatusChange,
  logEventStatusChange,
  logInvoiceGeneration,
  logReportExport,
};
