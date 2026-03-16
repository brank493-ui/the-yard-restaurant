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
      const offer = store.getSpecialOffer(id);
      
      if (!offer) {
        return NextResponse.json({ error: 'Special offer not found' }, { status: 404 });
      }
      
      return NextResponse.json({
        id: offer.id,
        title: offer.title,
        titleFr: offer.titleFr,
        description: offer.description,
        descriptionFr: offer.descriptionFr,
        icon: offer.icon,
        isActive: offer.isActive,
        order: offer.order,
        createdAt: offer.createdAt instanceof Date ? offer.createdAt.toISOString() : offer.createdAt,
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
      createdAt: data?.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
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
    console.log('Special Offers API PUT:', id, data);
    
    const adminDb = getAdminDb();

    // If no Firebase, use in-memory store
    if (!adminDb) {
      const store = getInMemoryStore();
      const existingOffer = store.getSpecialOffer(id);
      
      if (!existingOffer) {
        console.log('Special Offers API PUT: Offer not found:', id);
        return NextResponse.json({ error: 'Special offer not found' }, { status: 404 });
      }
      
      const updatedOffer = store.updateSpecialOffer(id, {
        title: data.title,
        titleFr: data.titleFr,
        description: data.description,
        descriptionFr: data.descriptionFr,
        icon: data.icon,
        isActive: data.isActive,
        order: data.order,
      });
      
      console.log('Special Offers API PUT: Updated offer:', id);
      
      return NextResponse.json({
        success: true,
        id,
        title: updatedOffer?.title,
        titleFr: updatedOffer?.titleFr,
        description: updatedOffer?.description,
        descriptionFr: updatedOffer?.descriptionFr,
        icon: updatedOffer?.icon,
        isActive: updatedOffer?.isActive,
        order: updatedOffer?.order,
        updatedAt: updatedOffer?.updatedAt instanceof Date ? updatedOffer.updatedAt.toISOString() : updatedOffer?.updatedAt,
      });
    }

    // Check if item exists
    const doc = await adminDb.collection('specialOffers').doc(id).get();
    if (!doc.exists) {
      return NextResponse.json({ error: 'Special offer not found' }, { status: 404 });
    }

    // Update the item
    const updateData: Record<string, unknown> = {
      updatedAt: new Date(),
    };
    
    if (data.title !== undefined) updateData.title = data.title;
    if (data.titleFr !== undefined) updateData.titleFr = data.titleFr;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.descriptionFr !== undefined) updateData.descriptionFr = data.descriptionFr;
    if (data.icon !== undefined) updateData.icon = data.icon;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.order !== undefined) updateData.order = data.order;

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
    console.log('Special Offers API DELETE:', id);
    
    const adminDb = getAdminDb();

    // If no Firebase, use in-memory store
    if (!adminDb) {
      const store = getInMemoryStore();
      const deleted = store.deleteSpecialOffer(id);
      
      if (!deleted) {
        console.log('Special Offers API DELETE: Offer not found:', id);
        return NextResponse.json({ error: 'Special offer not found' }, { status: 404 });
      }
      
      console.log('Special Offers API DELETE: Deleted offer:', id);
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
      const updatedOffer = store.updateSpecialOffer(id, data);
      
      if (!updatedOffer) {
        return NextResponse.json({ error: 'Special offer not found' }, { status: 404 });
      }
      
      return NextResponse.json({ 
        success: true, 
        id,
        title: updatedOffer.title,
        titleFr: updatedOffer.titleFr,
        description: updatedOffer.description,
        descriptionFr: updatedOffer.descriptionFr,
        icon: updatedOffer.icon,
        isActive: updatedOffer.isActive,
        order: updatedOffer.order,
        updatedAt: updatedOffer.updatedAt instanceof Date ? updatedOffer.updatedAt.toISOString() : updatedOffer.updatedAt,
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
