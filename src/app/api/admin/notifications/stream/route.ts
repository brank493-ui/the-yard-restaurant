/**
 * Real-time Notification Stream for Admin Dashboard
 * Uses Server-Sent Events (SSE) for push notifications
 */

import { NextRequest } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { db } from '@/lib/db';

// Store active connections for broadcasting
const activeConnections = new Set<ReadableStreamDefaultController>();

// Broadcast message to all connected clients
function broadcastToAll(data: object) {
  const message = `data: ${JSON.stringify(data)}\n\n`;
  activeConnections.forEach(controller => {
    try {
      controller.enqueue(new TextEncoder().encode(message));
    } catch {
      // Connection might be closed
      activeConnections.delete(controller);
    }
  });
}

// Export broadcast function for use in other API routes
export function broadcastNotification(notification: {
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
}) {
  broadcastToAll({
    ...notification,
    timestamp: new Date().toISOString(),
  });
}

export async function GET(request: NextRequest) {
  // Verify admin access
  const adminDb = getAdminDb();
  
  // Create a TransformStream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Add this connection to active connections
      activeConnections.add(controller);
      
      // Send initial connection message
      const connectMessage = `data: ${JSON.stringify({
        type: 'CONNECTED',
        message: 'Connected to admin notification stream',
        timestamp: new Date().toISOString(),
      })}\n\n`;
      
      controller.enqueue(new TextEncoder().encode(connectMessage));
      
      // Send heartbeat every 30 seconds to keep connection alive
      const heartbeatInterval = setInterval(() => {
        try {
          const heartbeat = `: heartbeat\n\n`;
          controller.enqueue(new TextEncoder().encode(heartbeat));
        } catch {
          clearInterval(heartbeatInterval);
          activeConnections.delete(controller);
        }
      }, 30000);
      
      // Store cleanup function
      const cleanup = () => {
        clearInterval(heartbeatInterval);
        activeConnections.delete(controller);
      };
      
      // Handle client disconnect
      request.signal.addEventListener('abort', cleanup);
    },
    
    cancel() {
      // Clean up when client disconnects
      activeConnections.forEach(controller => {
        try {
          controller.close();
        } catch {}
      });
      activeConnections.clear();
    }
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
    },
  });
}

// POST endpoint to broadcast notifications (called by other services)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, message, data } = body;
    
    if (!type || !title || !message) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400 }
      );
    }
    
    // Broadcast to all connected admin clients
    broadcastNotification({ type, title, message, data });
    
    // Also store in database for persistence
    if (adminDb) {
      await adminDb.collection('admin_notifications').add({
        type,
        title,
        message,
        data: data || null,
        read: false,
        createdAt: new Date(),
      });
    } else {
      // Store in Prisma database
      try {
        await db.notification.create({
          data: {
            type: type as never,
            title,
            message,
            read: false,
          }
        });
      } catch {
        // Database might not be available in demo mode
      }
    }
    
    return new Response(
      JSON.stringify({ success: true, broadcasted: activeConnections.size }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Error broadcasting notification:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to broadcast notification' }),
      { status: 500 }
    );
  }
}
