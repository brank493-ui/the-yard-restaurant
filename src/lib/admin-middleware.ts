/**
 * Admin Middleware
 * Handles JWT verification, RBAC, and audit logging for admin routes
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { db } from '@/lib/db';

// Admin roles that have access to the dashboard
const ADMIN_ROLES = ['ADMIN', 'MANAGER'];

// Actions that require audit logging
const AUDITED_ACTIONS = [
  'CONFIRM_PAYMENT',
  'UPDATE_ORDER_STATUS',
  'UPDATE_RESERVATION_STATUS',
  'UPDATE_EVENT_STATUS',
  'GENERATE_INVOICE',
  'EXPORT_REPORT',
  'DELETE_USER',
  'UPDATE_USER_ROLE',
];

/**
 * Verify admin access from request
 */
export async function verifyAdminAccess(request: NextRequest): Promise<{
  success: boolean;
  userId?: string;
  email?: string;
  role?: string;
  error?: string;
}> {
  try {
    // Get authorization header
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return { success: false, error: 'Missing or invalid authorization header' };
    }
    
    const idToken = authHeader.split('Bearer ')[1];
    
    // Verify Firebase ID token
    const adminAuth = getAdminAuth();
    if (!adminAuth) {
      // Fallback: Check for demo admin session
      const demoUserId = request.headers.get('X-Admin-User-Id');
      if (demoUserId) {
        // In demo mode, check database for user role
        try {
          const user = await db.user.findUnique({
            where: { id: demoUserId },
            select: { id: true, email: true, role: true }
          });
          
          if (user && ADMIN_ROLES.includes(user.role)) {
            return {
              success: true,
              userId: user.id,
              email: user.email || undefined,
              role: user.role
            };
          }
        } catch {
          // Database not available, proceed with basic check
        }
      }
      
      return { success: false, error: 'Authentication service unavailable' };
    }
    
    // Verify the ID token
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const userId = decodedToken.uid;
    
    // Get user role from Firestore
    const adminDb = getAdminDb();
    if (adminDb) {
      const userDoc = await adminDb.collection('users').doc(userId).get();
      const userData = userDoc.data();
      
      if (!userData || !ADMIN_ROLES.includes(userData.role)) {
        return { success: false, error: 'Unauthorized: Admin privileges required' };
      }
      
      return {
        success: true,
        userId,
        email: decodedToken.email || userData.email,
        role: userData.role
      };
    }
    
    // Fallback to Prisma database
    try {
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true }
      });
      
      if (!user || !ADMIN_ROLES.includes(user.role)) {
        return { success: false, error: 'Unauthorized: Admin privileges required' };
      }
      
      return {
        success: true,
        userId: user.id,
        email: user.email || undefined,
        role: user.role
      };
    } catch {
      return { success: false, error: 'Database unavailable' };
    }
    
  } catch (error) {
    console.error('Admin verification error:', error);
    return { success: false, error: 'Invalid authentication token' };
  }
}

/**
 * Log admin action for audit trail
 */
export async function logAdminAction(data: {
  adminId: string;
  adminEmail?: string;
  action: string;
  targetId: string;
  targetType: 'order' | 'reservation' | 'event' | 'payment' | 'user' | 'invoice' | 'report' | 'system';
  details: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  try {
    await db.adminLog.create({
      data: {
        adminId: data.adminId,
        adminEmail: data.adminEmail,
        action: data.action,
        targetId: data.targetId,
        targetType: data.targetType,
        details: data.details,
        metadata: data.metadata ? JSON.stringify(data.metadata) : null,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      }
    });
  } catch (error) {
    console.error('Failed to log admin action:', error);
    // Don't throw - logging should not break the main operation
  }
}

/**
 * Create admin response wrapper with logging
 */
export async function withAdminAuth(
  request: NextRequest,
  handler: (admin: { userId: string; email?: string; role: string }) => Promise<NextResponse>
): Promise<NextResponse> {
  const verification = await verifyAdminAccess(request);
  
  if (!verification.success) {
    return NextResponse.json(
      { error: verification.error || 'Unauthorized' },
      { status: 401 }
    );
  }
  
  return handler({
    userId: verification.userId!,
    email: verification.email,
    role: verification.role!
  });
}

/**
 * Check if user has specific permission
 */
export function hasPermission(role: string, permission: string): boolean {
  const permissions: Record<string, string[]> = {
    ADMIN: ['all'],
    MANAGER: [
      'view_dashboard',
      'manage_orders',
      'manage_reservations',
      'manage_events',
      'confirm_payments',
      'view_reports',
      'manage_menu',
    ],
    STAFF: [
      'view_dashboard',
      'manage_orders',
      'manage_reservations',
    ],
  };
  
  const rolePermissions = permissions[role] || [];
  return rolePermissions.includes('all') || rolePermissions.includes(permission);
}

/**
 * Get client IP address from request
 */
export function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get('x-forwarded-for');
  const realIp = request.headers.get('x-real-ip');
  
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  
  if (realIp) {
    return realIp;
  }
  
  return 'unknown';
}

export default {
  verifyAdminAccess,
  logAdminAction,
  withAdminAuth,
  hasPermission,
  getClientIp,
};
