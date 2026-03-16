import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getInMemoryStore } from '@/lib/in-memory-store';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get('all') === 'true';
    
    const adminDb = getAdminDb();
    
    // If no Firebase, use in-memory store
    if (!adminDb) {
      const store = getInMemoryStore();
      const offers = store.getSpecialOffers(showAll);
      // Serialize dates to ISO strings
      const serializedOffers = offers.map(offer => ({
        id: offer.id,
        title: offer.title,
        titleFr: offer.titleFr,
        description: offer.description,
        descriptionFr: offer.descriptionFr,
        icon: offer.icon,
        isActive: offer.isActive,
        order: offer.order,
        createdAt: offer.createdAt instanceof Date ? offer.createdAt.toISOString() : offer.createdAt,
        updatedAt: offer.updatedAt instanceof Date ? offer.updatedAt.toISOString() : offer.updatedAt,
      }));
      console.log('Offers API: Returning', serializedOffers.length, 'offers from in-memory store');
      return NextResponse.json(serializedOffers);
    }

    // Try to fetch from Firestore
    const snapshot = await adminDb.collection('specialOffers').orderBy('order', 'asc').get();
    
    // If no data in Firestore, seed with in-memory store data
    if (snapshot.empty) {
      const store = getInMemoryStore();
      const offers = store.getSpecialOffers(true);
      
      // Seed Firestore
      const batch = adminDb.batch();
      offers.forEach((item) => {
        const docRef = adminDb.collection('specialOffers').doc(item.id);
        batch.set(docRef, {
          title: item.title,
          titleFr: item.titleFr,
          description: item.description,
          descriptionFr: item.descriptionFr,
          icon: item.icon,
          isActive: item.isActive,
          order: item.order,
          createdAt: new Date(),
        });
      });
      await batch.commit();
      
      const serializedOffers = offers.map(offer => ({
        id: offer.id,
        title: offer.title,
        titleFr: offer.titleFr,
        description: offer.description,
        descriptionFr: offer.descriptionFr,
        icon: offer.icon,
        isActive: offer.isActive,
        order: offer.order,
        createdAt: offer.createdAt instanceof Date ? offer.createdAt.toISOString() : offer.createdAt,
      }));
      return NextResponse.json(showAll ? serializedOffers : serializedOffers.filter(o => o.isActive));
    }

    // Return Firestore data
    const offers = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title || '',
        titleFr: data.titleFr || data.title || '',
        description: data.description || '',
        descriptionFr: data.descriptionFr || data.description || '',
        icon: data.icon || '🎁',
        isActive: data.isActive !== false,
        order: data.order || 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    });

    return NextResponse.json(showAll ? offers : offers.filter(o => o.isActive));
  } catch (error) {
    console.error('Error fetching offers:', error);
    // Fallback to in-memory store on error
    const store = getInMemoryStore();
    const offers = store.getSpecialOffers(true);
    const serializedOffers = offers.map(offer => ({
      id: offer.id,
      title: offer.title,
      titleFr: offer.titleFr,
      description: offer.description,
      descriptionFr: offer.descriptionFr,
      icon: offer.icon,
      isActive: offer.isActive,
      order: offer.order,
      createdAt: offer.createdAt instanceof Date ? offer.createdAt.toISOString() : offer.createdAt,
    }));
    return NextResponse.json(serializedOffers);
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('Offers API POST:', data);
    
    if (!data.title || !data.description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }
    
    const adminDb = getAdminDb();
    
    // If no Firebase, use in-memory store
    if (!adminDb) {
      const store = getInMemoryStore();
      const newOffer = store.createSpecialOffer({
        title: data.title,
        titleFr: data.titleFr || data.title,
        description: data.description,
        descriptionFr: data.descriptionFr || data.description,
        icon: data.icon || '🎁',
        isActive: data.isActive !== false,
        order: data.order,
      });
      
      console.log('Offers API: Created offer in memory store:', newOffer.id);
      
      return NextResponse.json({
        id: newOffer.id,
        title: newOffer.title,
        titleFr: newOffer.titleFr,
        description: newOffer.description,
        descriptionFr: newOffer.descriptionFr,
        icon: newOffer.icon,
        isActive: newOffer.isActive,
        order: newOffer.order,
        createdAt: newOffer.createdAt instanceof Date ? newOffer.createdAt.toISOString() : newOffer.createdAt,
      }, { status: 201 });
    }

    // Get max order
    const snapshot = await adminDb.collection('specialOffers').orderBy('order', 'desc').limit(1).get();
    const maxOrder = snapshot.empty ? 0 : (snapshot.docs[0].data().order || 0);

    const offerItem = {
      title: data.title,
      titleFr: data.titleFr || data.title,
      description: data.description,
      descriptionFr: data.descriptionFr || data.description,
      icon: data.icon || '🎁',
      isActive: data.isActive !== false,
      order: data.order ?? (maxOrder + 1),
      createdAt: new Date(),
    };

    const docRef = await adminDb.collection('specialOffers').add(offerItem);
    
    return NextResponse.json({ 
      id: docRef.id, 
      ...offerItem,
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating offer:', error);
    return NextResponse.json(
      { error: 'Failed to create offer' },
      { status: 500 }
    );
  }
}
