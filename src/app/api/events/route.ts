import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

// In-memory storage for demo mode
const demoEvents: unknown[] = [];

// Helper function to create a notification
async function createNotification(
  adminDb: FirebaseFirestore.Firestore | null,
  data: {
    type: 'PAYMENT' | 'ORDER' | 'RESERVATION' | 'EVENT';
    title: string;
    message: string;
    orderId?: string;
    amount?: number;
  }
) {
  if (!adminDb) return null;

  try {
    await adminDb.collection('notifications').add({
      ...data,
      read: false,
      createdAt: new Date(),
    });
  } catch (error) {
    console.error('Error creating notification:', error);
  }
}

export async function GET(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      return NextResponse.json(demoEvents);
    }

    // Get auth token if available
    const authHeader = request.headers.get('Authorization');
    let userId: string | null = null;
    
    if (authHeader?.startsWith('Bearer ')) {
      const idToken = authHeader.split('Bearer ')[1];
      const adminAuth = getAdminAuth();
      
      if (adminAuth) {
        try {
          const decodedToken = await adminAuth.verifyIdToken(idToken);
          userId = decodedToken.uid;
        } catch {
          // Token invalid, continue without user filtering
        }
      }
    }

    // Build query
    let query = adminDb.collection('events').orderBy('createdAt', 'desc');
    
    // If user is not admin, only show their events
    if (userId) {
      query = adminDb.collection('events')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc') as typeof query;
    }

    const snapshot = await query.limit(100).get();
    
    const events = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      };
    });

    return NextResponse.json(events);
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(demoEvents);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, email, phone, eventType, guestCount, budget, details, preferredDate } = body;

    if (!name || !email || !eventType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    
    const event = {
      id: `evt_${Date.now()}`,
      userId: userId || 'guest',
      name,
      email,
      phone: phone || null,
      eventType,
      guestCount: guestCount ? parseInt(guestCount) : null,
      budget: budget || null,
      details: details || null,
      preferredDate: preferredDate ? new Date(preferredDate) : null,
      status: 'PENDING',
      paymentStatus: 'PENDING',
      paymentMethod: null,
      totalAmount: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!adminDb) {
      demoEvents.push(event);
      console.log('New event inquiry (demo mode):', event);
      return NextResponse.json({ success: true, event });
    }

    const docRef = await adminDb.collection('events').add(event);
    
    console.log('New event inquiry created:', docRef.id);

    // Create notification for admin
    await createNotification(adminDb, {
      type: 'EVENT',
      title: 'New Event Inquiry',
      message: `${eventType} event for ${guestCount || 'TBD'} guests - ${name} (${email})`,
      amount: guestCount ? parseInt(guestCount as unknown as string) : undefined,
    });

    return NextResponse.json({ 
      success: true, 
      event: { ...event, id: docRef.id } 
    });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json({ error: 'Failed to submit event inquiry' }, { status: 500 });
  }
}
