import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

// GET single menu item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminDb = getAdminDb();

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const doc = await adminDb.collection('menuItems').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    const data = doc.data();
    return NextResponse.json({
      id: doc.id,
      ...data,
      createdAt: data?.createdAt?.toDate?.() || data?.createdAt,
      updatedAt: data?.updatedAt?.toDate?.() || data?.updatedAt,
    });
  } catch (error) {
    console.error('Error fetching menu item:', error);
    return NextResponse.json({ error: 'Failed to fetch menu item' }, { status: 500 });
  }
}

// UPDATE menu item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminDb = getAdminDb();

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const data = await request.json();

    // Check if item exists
    const doc = await adminDb.collection('menuItems').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    // Update the item
    const updateData = {
      ...data,
      isPopular: data.featured || data.isPopular,
      updatedAt: new Date(),
    };

    await adminDb.collection('menuItems').doc(id).update(updateData);

    return NextResponse.json({
      success: true,
      id,
      ...updateData,
    });
  } catch (error) {
    console.error('Error updating menu item:', error);
    return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 });
  }
}

// DELETE menu item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminDb = getAdminDb();

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    // Check if item exists
    const doc = await adminDb.collection('menuItems').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    // Delete the item
    await adminDb.collection('menuItems').doc(id).delete();

    return NextResponse.json({ success: true, message: 'Menu item deleted' });
  } catch (error) {
    console.error('Error deleting menu item:', error);
    return NextResponse.json({ error: 'Failed to delete menu item' }, { status: 500 });
  }
}

// PATCH for partial updates (like toggling availability)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminDb = getAdminDb();

    if (!adminDb) {
      return NextResponse.json({ error: 'Database not available' }, { status: 503 });
    }

    const data = await request.json();

    // Update only provided fields
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    await adminDb.collection('menuItems').doc(id).update(updateData);

    return NextResponse.json({ success: true, id, ...updateData });
  } catch (error) {
    console.error('Error patching menu item:', error);
    return NextResponse.json({ error: 'Failed to update menu item' }, { status: 500 });
  }
}
