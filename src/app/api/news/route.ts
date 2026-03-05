import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

// Static news data for demo/fallback mode
const staticNewsItems = [
  {
    id: '1',
    title: 'Grand Opening Weekend Special!',
    description: 'Join us for our grand opening weekend with 20% off all menu items. Live music and special cocktails!',
    image: '/news-opening.png',
    createdAt: new Date('2025-01-15'),
    active: true,
  },
  {
    id: '2',
    title: 'New Cocktail Menu Launch',
    description: 'Discover our new signature cocktails crafted by our expert mixologists. Safari Sunset is now available!',
    image: '/news-cocktails.png',
    createdAt: new Date('2025-01-10'),
    active: true,
  },
  {
    id: '3',
    title: 'Sunday Brunch Special',
    description: 'Every Sunday, enjoy our special brunch menu with free coffee refills and fresh pastries.',
    image: '/news-brunch.png',
    createdAt: new Date('2025-01-08'),
    active: true,
  },
];

// In-memory storage for demo mode
let demoNewsItems = [...staticNewsItems];

export async function GET() {
  try {
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      return NextResponse.json(demoNewsItems.filter(item => item.active));
    }

    const snapshot = await adminDb
      .collection('news')
      .where('active', '==', true)
      .orderBy('createdAt', 'desc')
      .limit(10)
      .get();

    if (snapshot.empty) {
      return NextResponse.json(staticNewsItems.filter(item => item.active));
    }

    const newsItems = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        title: data.title,
        description: data.description,
        image: data.image,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        active: data.active,
      };
    });

    return NextResponse.json(newsItems);
  } catch (error) {
    console.error('Error fetching news:', error);
    return NextResponse.json(demoNewsItems.filter(item => item.active));
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, image } = body;

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    
    const newsItem = {
      id: `news_${Date.now()}`,
      title,
      description,
      image: image || '/news-default.png',
      active: true,
      createdAt: new Date(),
    };

    if (!adminDb) {
      demoNewsItems.push(newsItem);
      return NextResponse.json({ success: true, newsItem });
    }

    const docRef = await adminDb.collection('news').add(newsItem);
    
    return NextResponse.json({ 
      success: true, 
      newsItem: { ...newsItem, id: docRef.id } 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating news item:', error);
    return NextResponse.json({ error: 'Failed to create news item' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'News item ID is required' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    
    if (!adminDb) {
      demoNewsItems = demoNewsItems.filter(item => item.id !== id);
      return NextResponse.json({ success: true });
    }

    await adminDb.collection('news').doc(id).delete();
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting news item:', error);
    return NextResponse.json({ error: 'Failed to delete news item' }, { status: 500 });
  }
}
