import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

// Demo mode storage
const demoEventUpdates: Map<string, Record<string, unknown>> = new Map();

/**
 * Helper to create notification
 */
async function createNotification(
  adminDb: FirebaseFirestore.Firestore,
  data: {
    type: string;
    title: string;
    message: string;
    userId?: string;
    eventId?: string;
  }
) {
  try {
    await adminDb.collection('notifications').add({
      ...data,
      read: false,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

/**
 * PATCH /api/events/[id]
 * Update event status or other fields
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { status, paymentStatus, totalAmount, notes, adminId } = body;

    const adminDb = getAdminDb();

    if (!adminDb) {
      // Demo mode
      const existingUpdate = demoEventUpdates.get(id) || {};
      demoEventUpdates.set(id, { ...existingUpdate, ...body, updatedAt: new Date() });
      return NextResponse.json({ 
        success: true, 
        event: { id, ...body } 
      });
    }

    // Get existing event data
    const eventDoc = await adminDb.collection('events').doc(id).get();
    if (!eventDoc.exists) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }
    const eventData = eventDoc.data();

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (status) {
      updateData.status = status;
    }
    if (paymentStatus) {
      updateData.paymentStatus = paymentStatus;
    }
    if (totalAmount !== undefined) {
      updateData.totalAmount = totalAmount;
    }
    if (notes) {
      updateData.notes = notes;
    }

    // Update the event
    await adminDb.collection('events').doc(id).update(updateData);

    // Create notification for status changes
    if (status && eventData?.userId) {
      const statusMessages: Record<string, string> = {
        QUOTED: 'Your event quote is ready! Please review the details.',
        CONFIRMED: 'Your event has been confirmed! We look forward to hosting you.',
        CANCELLED: 'Your event has been cancelled. Please contact us if you have questions.',
        COMPLETED: 'Thank you for hosting your event with us!',
      };

      await createNotification(adminDb, {
        type: 'EVENT',
        title: `Event ${status}`,
        message: statusMessages[status] || `Your event status has been updated to ${status}.`,
        userId: eventData.userId,
        eventId: id,
      });
    }

    // Log admin action if adminId provided
    if (adminId && status) {
      await adminDb.collection('admin_logs').add({
        adminId,
        action: 'EVENT_STATUS_UPDATE',
        targetId: id,
        targetType: 'event',
        details: `Updated event status to ${status}`,
        metadata: { status, previousStatus: eventData?.status },
        timestamp: new Date(),
      });
    }

    return NextResponse.json({ 
      success: true, 
      event: { id, ...updateData } 
    });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { error: 'Failed to update event' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/events/[id]
 * Get a single event by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const adminDb = getAdminDb();

    if (!adminDb) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const doc = await adminDb.collection('events').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Event not found' },
        { status: 404 }
      );
    }

    const data = doc.data();
    return NextResponse.json({
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate?.() || data?.createdAt,
      updatedAt: data?.updatedAt?.toDate?.() || data?.updatedAt,
      preferredDate: data?.preferredDate?.toDate?.() || data?.preferredDate,
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { error: 'Failed to fetch event' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/events/[id]
 * Delete an event (admin only)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const adminDb = getAdminDb();

    if (!adminDb) {
      demoEventUpdates.delete(id);
      return NextResponse.json({ success: true });
    }

    // Get event data before deleting
    const eventDoc = await adminDb.collection('events').doc(id).get();
    const eventData = eventDoc.exists ? eventDoc.data() : null;

    // Delete the event
    await adminDb.collection('events').doc(id).delete();

    // Create notification for user if event existed
    if (eventData?.userId) {
      await createNotification(adminDb, {
        type: 'EVENT',
        title: 'Event Deleted',
        message: 'Your event booking has been removed from our system.',
        userId: eventData.userId,
        eventId: id,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting event:', error);
    return NextResponse.json(
      { error: 'Failed to delete event' },
      { status: 500 }
    );
  }
}
