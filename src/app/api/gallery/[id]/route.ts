import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getInMemoryStore } from '@/lib/in-memory-store';

// GET single gallery item
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
      const item = store.getGalleryImage(id);
      
      if (!item) {
        return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
      }
      
      return NextResponse.json({
        id: item.id,
        url: item.url,
        title: item.title,
        category: item.category,
        createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
      });
    }

    const doc = await adminDb.collection('gallery').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
    }

    const data = doc.data();
    return NextResponse.json({
      id: doc.id,
      url: data?.url || '',
      title: data?.title || '',
      category: data?.category || 'food',
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || data?.createdAt,
    });
  } catch (error) {
    console.error('Error fetching gallery item:', error);
    return NextResponse.json({ error: 'Failed to fetch gallery item' }, { status: 500 });
  }
}

// UPDATE gallery item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    console.log('Gallery API PUT:', id, data);
    
    const adminDb = getAdminDb();

    // If no Firebase, use in-memory store
    if (!adminDb) {
      const store = getInMemoryStore();
      const existingItem = store.getGalleryImage(id);
      
      if (!existingItem) {
        console.log('Gallery API PUT: Item not found:', id);
        return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
      }
      
      const updatedItem = store.updateGalleryImage(id, {
        url: data.url || existingItem.url,
        title: data.title || existingItem.title,
        category: data.category || existingItem.category,
      });
      
      console.log('Gallery API PUT: Updated item:', id);
      
      return NextResponse.json({
        success: true,
        id,
        url: updatedItem?.url,
        title: updatedItem?.title,
        category: updatedItem?.category,
        updatedAt: updatedItem?.updatedAt instanceof Date ? updatedItem.updatedAt.toISOString() : updatedItem?.updatedAt,
      });
    }

    // Check if item exists
    const doc = await adminDb.collection('gallery').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
    }

    // Update the item
    const updateData = {
      url: data.url,
      title: data.title,
      category: data.category,
      updatedAt: new Date(),
    };

    await adminDb.collection('gallery').doc(id).update(updateData);

    return NextResponse.json({
      success: true,
      id,
      ...updateData,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating gallery item:', error);
    return NextResponse.json({ error: 'Failed to update gallery item' }, { status: 500 });
  }
}

// DELETE gallery item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('Gallery API DELETE:', id);
    
    const adminDb = getAdminDb();

    // If no Firebase, use in-memory store
    if (!adminDb) {
      const store = getInMemoryStore();
      const deleted = store.deleteGalleryImage(id);
      
      if (!deleted) {
        console.log('Gallery API DELETE: Item not found:', id);
        return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
      }
      
      console.log('Gallery API DELETE: Deleted item:', id);
      return NextResponse.json({ success: true, message: 'Gallery item deleted' });
    }

    // Check if item exists
    const doc = await adminDb.collection('gallery').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
    }

    // Delete the item
    await adminDb.collection('gallery').doc(id).delete();

    return NextResponse.json({ success: true, message: 'Gallery item deleted' });
  } catch (error) {
    console.error('Error deleting gallery item:', error);
    return NextResponse.json({ error: 'Failed to delete gallery item' }, { status: 500 });
  }
}

// PATCH for partial updates
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
      const updatedItem = store.updateGalleryImage(id, data);
      
      if (!updatedItem) {
        return NextResponse.json({ error: 'Gallery item not found' }, { status: 404 });
      }
      
      return NextResponse.json({ 
        success: true, 
        id,
        url: updatedItem.url,
        title: updatedItem.title,
        category: updatedItem.category,
        updatedAt: updatedItem.updatedAt instanceof Date ? updatedItem.updatedAt.toISOString() : updatedItem.updatedAt,
      });
    }

    // Update only provided fields
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    await adminDb.collection('gallery').doc(id).update(updateData);

    return NextResponse.json({ success: true, id, ...updateData, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Error patching gallery item:', error);
    return NextResponse.json({ error: 'Failed to update gallery item' }, { status: 500 });
  }
}
