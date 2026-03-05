import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

// Static reviews for demo/fallback mode
const staticReviews = [
  { 
    id: '1', 
    name: 'Marie L.', 
    email: 'marie@example.com',
    rating: 5, 
    text: 'Absolutely amazing experience! The Poulet DG was cooked to perfection. The ambiance is elegant and the staff very professional.', 
    date: '2025-01-15', 
    avatar: '👩',
    createdAt: new Date('2025-01-15'),
  },
  { 
    id: '2', 
    name: 'Jean-Pierre M.', 
    email: 'jp@example.com',
    rating: 5, 
    text: 'Best restaurant in Douala without a doubt! The Ndolé reminded me of my grandmother\'s cooking. Authentic and delicious.', 
    date: '2025-01-10', 
    avatar: '👨',
    createdAt: new Date('2025-01-10'),
  },
  { 
    id: '3', 
    name: 'Sarah K.', 
    email: 'sarah@example.com',
    rating: 4, 
    text: 'Great cocktails and lovely terrace. Perfect for a date night. The Safari Sunset is a must-try!', 
    date: '2025-01-08', 
    avatar: '👩‍🦰',
    createdAt: new Date('2025-01-08'),
  },
  { 
    id: '4', 
    name: 'David O.', 
    email: 'david@example.com',
    rating: 5, 
    text: 'Exceptional service and the grilled seafood platter was outstanding. Will definitely be back!', 
    date: '2025-01-05', 
    avatar: '👨‍💼',
    createdAt: new Date('2025-01-05'),
  },
];

// In-memory storage for demo mode
let demoReviews = [...staticReviews];

// Avatar options for random assignment
const avatarOptions = ['👩', '👨', '👩‍🦰', '👨‍💼', '👩‍💻', '👨‍🎨', '👩‍🔬', '👨‍🍳'];

export async function GET() {
  try {
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      return NextResponse.json(demoReviews);
    }

    const snapshot = await adminDb
      .collection('reviews')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    if (snapshot.empty) {
      return NextResponse.json(staticReviews);
    }

    const reviews = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        email: data.email,
        rating: data.rating,
        text: data.text,
        date: data.createdAt?.toDate?.()?.toISOString()?.split('T')[0] || data.date,
        avatar: data.avatar || '👤',
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      };
    });

    return NextResponse.json(reviews);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(demoReviews);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, rating, text } = body;

    if (!name || !email || !rating || !text) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 });
    }

    const ratingNum = parseInt(rating);
    if (ratingNum < 1 || ratingNum > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    
    // Assign a random avatar
    const randomAvatar = avatarOptions[Math.floor(Math.random() * avatarOptions.length)];
    
    const review = {
      id: `rev_${Date.now()}`,
      name,
      email,
      rating: ratingNum,
      text,
      date: new Date().toISOString().split('T')[0],
      avatar: randomAvatar,
      createdAt: new Date(),
    };

    if (!adminDb) {
      demoReviews.unshift(review);
      return NextResponse.json({ success: true, review });
    }

    const docRef = await adminDb.collection('reviews').add(review);
    
    return NextResponse.json({ 
      success: true, 
      review: { ...review, id: docRef.id } 
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json({ error: 'Failed to submit review' }, { status: 500 });
  }
}
