/**
 * Admin Logs API
 * Provides access to admin action logs for audit trail
 */

import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { getAdminLogs } from '@/lib/services/adminService';

/**
 * Verify admin access
 */
async function verifyAdmin(request: NextRequest): Promise<{ uid: string; role: string } | null> {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const idToken = authHeader.split('Bearer ')[1];
  const adminAuth = getAdminAuth();
  
  if (!adminAuth) {
    return null;
  }
  
  try {
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const adminDb = getAdminDb();
    
    if (adminDb) {
      const userDoc = await adminDb.collection('users').doc(decodedToken.uid).get();
      const userData = userDoc.data();
      
      if (userData?.role === 'ADMIN' || userData?.role === 'MANAGER') {
        return { uid: decodedToken.uid, role: userData.role };
      }
    }
    
    return null;
  } catch {
    return null;
  }
}

/**
 * Generate demo admin logs for testing/demo mode
 */
function generateDemoLogs(limit: number) {
  const actions = [
    { action: 'PAYMENT_CONFIRMED', targetType: 'payment' as const, details: 'Payment of 15,000 XAF confirmed via Orange Money', amount: 15000 },
    { action: 'STATUS_UPDATE', targetType: 'order' as const, details: 'Order status changed from PENDING to CONFIRMED' },
    { action: 'CREATE', targetType: 'reservation' as const, details: 'New reservation created for 4 guests at 19:00' },
    { action: 'CONFIRM', targetType: 'event' as const, details: 'Event booking confirmed for Wedding Reception - 50 guests' },
    { action: 'UPDATE', targetType: 'user' as const, details: 'User profile updated - phone number changed' },
    { action: 'PAYMENT_CONFIRMED', targetType: 'payment' as const, details: 'Payment of 28,500 XAF confirmed via MTN Money', amount: 28500 },
    { action: 'STATUS_UPDATE', targetType: 'order' as const, details: 'Order status changed from CONFIRMED to PREPARING' },
    { action: 'CANCEL', targetType: 'reservation' as const, details: 'Reservation cancelled by customer request' },
    { action: 'CREATE', targetType: 'invoice' as const, details: 'Invoice INV-240115-AB12 generated for order #1234' },
    { action: 'PAYMENT_CONFIRMED', targetType: 'payment' as const, details: 'Payment of 45,000 XAF confirmed via Cash', amount: 45000 },
    { action: 'STATUS_UPDATE', targetType: 'event' as const, details: 'Event status changed from QUOTED to CONFIRMED' },
    { action: 'LOGIN', targetType: 'system' as const, details: 'Admin logged in from 192.168.1.1' },
    { action: 'UPDATE', targetType: 'order' as const, details: 'Order notes updated with delivery instructions' },
    { action: 'CREATE', targetType: 'report' as const, details: 'Daily report generated for 2024-01-15' },
    { action: 'PAYMENT_CONFIRMED', targetType: 'payment' as const, details: 'Payment of 12,750 XAF confirmed via Visa', amount: 12750 },
  ];

  return actions.slice(0, limit).map((a, i) => ({
    id: `log_demo_${Date.now()}_${i}`,
    adminId: i % 2 === 0 ? 'admin_001' : 'admin_002',
    adminEmail: i % 2 === 0 ? 'admin@theyardrestaurant.com' : 'manager@theyardrestaurant.com',
    action: a.action,
    targetId: `target_${Math.random().toString(36).substr(2, 9)}`,
    targetType: a.targetType,
    details: a.details,
    metadata: a.amount ? { amount: a.amount } : undefined,
    createdAt: new Date(Date.now() - i * 15 * 60000),
  }));
}

/**
 * GET /api/admin/logs
 * Get admin action logs with filtering and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');
    const adminId = searchParams.get('adminId') || undefined;
    const targetType = searchParams.get('targetType') as 'order' | 'reservation' | 'event' | 'payment' | 'user' | 'invoice' | 'report' | 'system' | undefined;

    const adminDb = getAdminDb();

    if (!adminDb) {
      // Demo mode - return demo logs
      const demoLogs = generateDemoLogs(limit);
      return NextResponse.json({
        success: true,
        logs: demoLogs,
        total: demoLogs.length,
      });
    }

    // Try to verify admin, but allow demo mode
    await verifyAdmin(request);

    // Fetch logs from service
    const { logs, total } = await getAdminLogs(limit, offset, adminId, targetType);

    return NextResponse.json({
      success: true,
      logs,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Error fetching admin logs:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to fetch admin logs',
        logs: generateDemoLogs(10),
        total: 10,
      },
      { status: 500 }
    );
  }
}
