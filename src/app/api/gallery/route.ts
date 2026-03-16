import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getInMemoryStore } from '@/lib/in-memory-store';

export async function GET() {
  try {
    const adminDb = getAdminDb();
    
    // If no Firebase, use in-memory store
    if (!adminDb) {
      const store = getInMemoryStore();
      const images = store.getGalleryImages();
      // Serialize dates to ISO strings
      const serializedImages = images.map(img => ({
        id: img.id,
        url: img.url,
        title: img.title,
        category: img.category,
        createdAt: img.createdAt instanceof Date ? img.createdAt.toISOString() : img.createdAt,
        updatedAt: img.updatedAt instanceof Date ? img.updatedAt.toISOString() : img.updatedAt,
      }));
      console.log('Gallery API: Returning', serializedImages.length, 'images from in-memory store');
      return NextResponse.json(serializedImages);
    }

    // Try to fetch from Firestore
    const snapshot = await adminDb.collection('gallery').orderBy('createdAt', 'desc').get();
    
    // If no data in Firestore, seed with in-memory store data
    if (snapshot.empty) {
      const store = getInMemoryStore();
      const images = store.getGalleryImages();
      
      // Seed Firestore
      const batch = adminDb.batch();
      images.forEach((item) => {
        const docRef = adminDb.collection('gallery').doc(item.id);
        batch.set(docRef, {
          url: item.url,
          title: item.title,
          category: item.category,
          createdAt: new Date(),
        });
      });
      await batch.commit();
      
      const serializedImages = images.map(img => ({
        id: img.id,
        url: img.url,
        title: img.title,
        category: img.category,
        createdAt: img.createdAt instanceof Date ? img.createdAt.toISOString() : img.createdAt,
      }));
      return NextResponse.json(serializedImages);
    }

    // Return Firestore data
    const images = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        url: data.url || '',
        title: data.title || 'Untitled',
        category: data.category || 'food',
        createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
      };
    });

    return NextResponse.json(images);
  } catch (error) {
    console.error('Error fetching gallery:', error);
    // Fallback to in-memory store on error
    const store = getInMemoryStore();
    const images = store.getGalleryImages();
    const serializedImages = images.map(img => ({
      id: img.id,
      url: img.url,
      title: img.title,
      category: img.category,
      createdAt: img.createdAt instanceof Date ? img.createdAt.toISOString() : img.createdAt,
    }));
    return NextResponse.json(serializedImages);
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    console.log('Gallery API POST:', data);
    
    if (!data.url || !data.title) {
      return NextResponse.json({ error: 'URL and title are required' }, { status: 400 });
    }
    
    const adminDb = getAdminDb();
    
    // If no Firebase, use in-memory store
    if (!adminDb) {
      const store = getInMemoryStore();
      const newImage = store.createGalleryImage({
        url: data.url,
        title: data.title,
        category: data.category || 'food',
      });
      
      console.log('Gallery API: Created image in memory store:', newImage.id);
      
      return NextResponse.json({
        id: newImage.id,
        url: newImage.url,
        title: newImage.title,
        category: newImage.category,
        createdAt: newImage.createdAt instanceof Date ? newImage.createdAt.toISOString() : newImage.createdAt,
      }, { status: 201 });
    }

    const galleryItem = {
      url: data.url,
      title: data.title,
      category: data.category || 'food',
      createdAt: new Date(),
    };

    const docRef = await adminDb.collection('gallery').add(galleryItem);
    
    return NextResponse.json({ 
      id: docRef.id, 
      ...galleryItem,
      createdAt: new Date().toISOString(),
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating gallery item:', error);
    return NextResponse.json(
      { error: 'Failed to create gallery item' },
      { status: 500 }
    );
  }
}
