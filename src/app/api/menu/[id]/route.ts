import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getInMemoryStore } from '@/lib/in-memory-store';

// Helper function to normalize menu item data
function normalizeMenuItem(item: Record<string, unknown>) {
  const featured = item.featured === true || item.isPopular === true;
  return {
    id: String(item.id || ''),
    name: String(item.name || ''),
    description: String(item.description || ''),
    price: Number(item.price) || 0,
    category: String(item.category || ''),
    categorySlug: String(item.categorySlug || item.category || ''),
    featured,
    isPopular: featured,
    image: String(item.image || ''),
    isAvailable: item.isAvailable !== false,
  };
}

// GET single menu item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const adminDb = getAdminDb();

    // If no Firebase, use in-memory store
    if (!adminDb) {
      const store = getInMemoryStore();
      const item = store.getMenuItem(id);
      
      if (!item) {
        return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
      }
      
      return NextResponse.json(normalizeMenuItem(item as Record<string, unknown>));
    }

    const doc = await adminDb.collection('menuItems').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
    }

    const data = doc.data();
    return NextResponse.json(normalizeMenuItem({
      id: doc.id,
      ...data,
    }));
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
    const data = await request.json();
    const adminDb = getAdminDb();

    // If no Firebase, use in-memory store
    if (!adminDb) {
      const store = getInMemoryStore();
      const updatedItem = store.updateMenuItem(id, {
        ...data,
        isPopular: data.featured || data.isPopular,
      });
      
      if (!updatedItem) {
        return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
      }
      
      return NextResponse.json({
        success: true,
        ...normalizeMenuItem(updatedItem as Record<string, unknown>),
      });
    }

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

    // If no Firebase, use in-memory store
    if (!adminDb) {
      const store = getInMemoryStore();
      const deleted = store.deleteMenuItem(id);
      
      if (!deleted) {
        return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
      }
      
      return NextResponse.json({ success: true, message: 'Menu item deleted' });
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
    const data = await request.json();
    const adminDb = getAdminDb();

    // If no Firebase, use in-memory store
    if (!adminDb) {
      const store = getInMemoryStore();
      const updatedItem = store.updateMenuItem(id, data);
      
      if (!updatedItem) {
        return NextResponse.json({ error: 'Menu item not found' }, { status: 404 });
      }
      
      return NextResponse.json({ 
        success: true, 
        ...normalizeMenuItem(updatedItem as Record<string, unknown>) 
      });
    }

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
