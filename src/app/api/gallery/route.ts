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
      return NextResponse.json(images);
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
          ...item,
          createdAt: item.createdAt || new Date(),
        });
      });
      await batch.commit();
      
      return NextResponse.json(images);
    }

    // Return Firestore data
    const images = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
    }));

    return NextResponse.json(images);
  } catch (error) {
    console.error('Error fetching gallery:', error);
    // Fallback to in-memory store on error
    const store = getInMemoryStore();
    const images = store.getGalleryImages();
    return NextResponse.json(images);
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    const adminDb = getAdminDb();
    
    // If no Firebase, use in-memory store
    if (!adminDb) {
      const store = getInMemoryStore();
      const newImage = store.createGalleryImage({
        url: data.url || '',
        title: data.title || 'Untitled',
        category: data.category || 'food',
      });
      
      return NextResponse.json({
        id: newImage.id,
        url: newImage.url,
        title: newImage.title,
        category: newImage.category,
        createdAt: newImage.createdAt.toISOString(),
      }, { status: 201 });
    }

    const galleryItem = {
      url: data.url || '',
      title: data.title || 'Untitled',
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
