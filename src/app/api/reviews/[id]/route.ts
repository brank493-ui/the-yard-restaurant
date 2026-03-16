import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

// In-memory storage for demo mode reviews
const demoReviews: Map<string, { approved: boolean }> = new Map();

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { approved, rating, text } = body;

    const adminDb = getAdminDb();

    if (!adminDb) {
      // Demo mode
      demoReviews.set(id, { approved: approved ?? true });
      return NextResponse.json({ 
        success: true, 
        review: { id, approved: approved ?? true } 
      });
    }

    // Build update object
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (typeof approved === 'boolean') {
      updateData.approved = approved;
    }
    if (rating) {
      updateData.rating = parseInt(rating);
    }
    if (text) {
      updateData.text = text;
    }

    // Update the review
    await adminDb.collection('reviews').doc(id).update(updateData);

    return NextResponse.json({ 
      success: true, 
      review: { id, ...updateData } 
    });
  } catch (error) {
    console.error('Error updating review:', error);
    return NextResponse.json(
      { error: 'Failed to update review' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const adminDb = getAdminDb();

    if (!adminDb) {
      // Demo mode
      demoReviews.delete(id);
      return NextResponse.json({ success: true });
    }

    // Delete the review
    await adminDb.collection('reviews').doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting review:', error);
    return NextResponse.json(
      { error: 'Failed to delete review' },
      { status: 500 }
    );
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const adminDb = getAdminDb();

    if (!adminDb) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    const doc = await adminDb.collection('reviews').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Review not found' },
        { status: 404 }
      );
    }

    const data = doc.data();
    return NextResponse.json({
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate?.() || data?.createdAt,
    });
  } catch (error) {
    console.error('Error fetching review:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review' },
      { status: 500 }
    );
  }
}
