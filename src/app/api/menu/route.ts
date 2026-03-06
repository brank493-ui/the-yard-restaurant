import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';
import { getInMemoryStore, MenuItem } from '@/lib/in-memory-store';

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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const showAll = searchParams.get('all') === 'true';
    
    const adminDb = getAdminDb();
    
    // If no Firebase, use in-memory store
    if (!adminDb) {
      const store = getInMemoryStore();
      const items = store.getMenuItems(showAll);
      return NextResponse.json(items.map(normalizeMenuItem));
    }

    // Try to fetch from Firestore
    let query = adminDb.collection('menuItems');
    
    if (!showAll) {
      query = query.where('isAvailable', '==', true) as typeof query;
    }
    
    const snapshot = await query.get();
    
    // If no data in Firestore, seed with in-memory store data
    if (snapshot.empty) {
      const store = getInMemoryStore();
      const items = store.getMenuItems(true);
      
      // Seed Firestore
      const batch = adminDb.batch();
      items.forEach((item) => {
        const docRef = adminDb.collection('menuItems').doc(item.id);
        batch.set(docRef, {
          ...item,
          createdAt: item.createdAt || new Date(),
          updatedAt: item.updatedAt || new Date(),
        });
      });
      await batch.commit();
      
      return NextResponse.json(items.map(normalizeMenuItem));
    }

    // Return Firestore data, normalized
    const menuItems = snapshot.docs.map((doc) => {
      const data = doc.data();
      return normalizeMenuItem({
        id: doc.id,
        ...data,
      });
    });

    return NextResponse.json(menuItems);
  } catch (error) {
    console.error('Error fetching menu:', error);
    // Fallback to in-memory store on error
    const store = getInMemoryStore();
    const items = store.getMenuItems(true);
    return NextResponse.json(items.map(normalizeMenuItem));
  }
}

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const adminDb = getAdminDb();
    
    // If no Firebase, use in-memory store
    if (!adminDb) {
      const store = getInMemoryStore();
      const newItem = store.createMenuItem({
        name: data.name,
        description: data.description || '',
        price: Number(data.price) || 0,
        category: data.category || 'main',
        categorySlug: data.categorySlug || data.category || 'main',
        image: data.image || '',
        isAvailable: data.isAvailable !== false,
        featured: data.featured === true || data.isPopular === true,
        isPopular: data.featured === true || data.isPopular === true,
      });
      
      return NextResponse.json(normalizeMenuItem(newItem as Record<string, unknown>), { status: 201 });
    }

    const featured = data.featured === true || data.isPopular === true;
    
    const menuItem = {
      name: data.name,
      description: data.description || '',
      price: Number(data.price) || 0,
      category: data.category || 'main',
      categorySlug: data.categorySlug || data.category || 'main',
      image: data.image || '',
      isAvailable: data.isAvailable !== false,
      featured,
      isPopular: featured,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const docRef = await adminDb.collection('menuItems').add(menuItem);
    
    return NextResponse.json({ 
      id: docRef.id, 
      ...menuItem 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating menu item:', error);
    return NextResponse.json(
      { error: 'Failed to create menu item' },
      { status: 500 }
    );
  }
}
