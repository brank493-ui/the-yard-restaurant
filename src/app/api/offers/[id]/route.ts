import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getInMemoryStore } from '@/lib/in-memory-store';

// GET single special offer
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
      const item = store.getSpecialOffer(id);
      
      if (!item) {
        return NextResponse.json({ error: 'Special offer not found' }, { status: 404 });
      }
      
      return NextResponse.json({
        id: item.id,
        title: item.title,
        titleFr: item.titleFr,
        description: item.description,
        descriptionFr: item.descriptionFr,
        icon: item.icon,
        isActive: item.isActive,
        order: item.order,
        createdAt: item.createdAt instanceof Date ? item.createdAt.toISOString() : item.createdAt,
      });
    }

    const doc = await adminDb.collection('specialOffers').doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: 'Special offer not found' }, { status: 404 });
    }

    const data = doc.data();
    return NextResponse.json({
      id: doc.id,
      title: data?.title || '',
      titleFr: data?.titleFr || data?.title || '',
      description: data?.description || '',
      descriptionFr: data?.descriptionFr || data?.description || '',
      icon: data?.icon || '🎁',
      isActive: data?.isActive !== false,
      order: data?.order || 0,
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || data?.createdAt,
    });
  } catch (error) {
    console.error('Error fetching special offer:', error);
    return NextResponse.json({ error: 'Failed to fetch special offer' }, { status: 500 });
  }
}

// UPDATE special offer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await request.json();
    console.log('Offers API PUT:', id, data);
    
    const adminDb = getAdminDb();

    // If no Firebase, use in-memory store
    if (!adminDb) {
      const store = getInMemoryStore();
      const existingItem = store.getSpecialOffer(id);
      
      if (!existingItem) {
        console.log('Offers API PUT: Item not found:', id);
        return NextResponse.json({ error: 'Special offer not found' }, { status: 404 });
      }
      
      const updatedItem = store.updateSpecialOffer(id, {
        title: data.title,
        titleFr: data.titleFr,
        description: data.description,
        descriptionFr: data.descriptionFr,
        icon: data.icon,
        isActive: data.isActive,
        order: data.order,
      });
      
      console.log('Offers API PUT: Updated item:', id);
      
      return NextResponse.json({
        success: true,
        id,
        title: updatedItem?.title,
        titleFr: updatedItem?.titleFr,
        description: updatedItem?.description,
        descriptionFr: updatedItem?.descriptionFr,
        icon: updatedItem?.icon,
        isActive: updatedItem?.isActive,
        order: updatedItem?.order,
        updatedAt: updatedItem?.updatedAt instanceof Date ? updatedItem.updatedAt.toISOString() : updatedItem?.updatedAt,
      });
    }

    // Check if item exists
    const doc = await adminDb.collection('specialOffers').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Special offer not found' }, { status: 404 });
    }

    // Update the item
    const updateData = {
      title: data.title,
      titleFr: data.titleFr,
      description: data.description,
      descriptionFr: data.descriptionFr,
      icon: data.icon,
      isActive: data.isActive,
      order: data.order,
      updatedAt: new Date(),
    };

    await adminDb.collection('specialOffers').doc(id).update(updateData);

    return NextResponse.json({
      success: true,
      id,
      ...updateData,
      updatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error updating special offer:', error);
    return NextResponse.json({ error: 'Failed to update special offer' }, { status: 500 });
  }
}

// DELETE special offer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    console.log('Offers API DELETE:', id);
    
    const adminDb = getAdminDb();

    // If no Firebase, use in-memory store
    if (!adminDb) {
      const store = getInMemoryStore();
      const deleted = store.deleteSpecialOffer(id);
      
      if (!deleted) {
        console.log('Offers API DELETE: Item not found:', id);
        return NextResponse.json({ error: 'Special offer not found' }, { status: 404 });
      }
      
      console.log('Offers API DELETE: Deleted item:', id);
      return NextResponse.json({ success: true, message: 'Special offer deleted' });
    }

    // Check if item exists
    const doc = await adminDb.collection('specialOffers').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Special offer not found' }, { status: 404 });
    }

    // Delete the item
    await adminDb.collection('specialOffers').doc(id).delete();

    return NextResponse.json({ success: true, message: 'Special offer deleted' });
  } catch (error) {
    console.error('Error deleting special offer:', error);
    return NextResponse.json({ error: 'Failed to delete special offer' }, { status: 500 });
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
      const updatedItem = store.updateSpecialOffer(id, data);
      
      if (!updatedItem) {
        return NextResponse.json({ error: 'Special offer not found' }, { status: 404 });
      }
      
      return NextResponse.json({ 
        success: true, 
        id,
        title: updatedItem.title,
        titleFr: updatedItem.titleFr,
        description: updatedItem.description,
        descriptionFr: updatedItem.descriptionFr,
        icon: updatedItem.icon,
        isActive: updatedItem.isActive,
        order: updatedItem.order,
        updatedAt: updatedItem.updatedAt instanceof Date ? updatedItem.updatedAt.toISOString() : updatedItem.updatedAt,
      });
    }

    // Update only provided fields
    const updateData = {
      ...data,
      updatedAt: new Date(),
    };

    await adminDb.collection('specialOffers').doc(id).update(updateData);

    return NextResponse.json({ success: true, id, ...updateData, updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Error patching special offer:', error);
    return NextResponse.json({ error: 'Failed to update special offer' }, { status: 500 });
  }
}
