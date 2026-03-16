import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

// In-memory storage for demo mode
const demoReservations: unknown[] = [];

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
      return NextResponse.json(demoReservations);
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
    let query = adminDb.collection('reservations').orderBy('createdAt', 'desc');
    
    // If user is not admin, only show their reservations
    if (userId) {
      query = adminDb.collection('reservations')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc') as typeof query;
    }

    const snapshot = await query.limit(100).get();
    
    const reservations = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        date: data.date?.toDate?.() || data.date,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
        updatedAt: data.updatedAt?.toDate?.() || data.updatedAt,
      };
    });

    return NextResponse.json(reservations);
  } catch (error) {
    console.error('Error fetching reservations:', error);
    return NextResponse.json(demoReservations);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, name, email, phone, date, time, guests, specialRequest, occasion } = body;

    if (!name || !email || !phone || !date || !time || !guests) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    
    const reservation = {
      id: `res_${Date.now()}`,
      userId: userId || 'guest',
      name,
      email,
      phone,
      date: new Date(date),
      time,
      partySize: parseInt(guests),
      specialRequests: specialRequest || null,
      occasion: occasion || null,
      status: 'PENDING',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (!adminDb) {
      // Demo mode - store in memory
      demoReservations.push(reservation);
      console.log('New reservation (demo mode):', reservation);
      return NextResponse.json({ success: true, reservation });
    }

    // Save to Firestore
    const docRef = await adminDb.collection('reservations').add(reservation);
    
    console.log('New reservation created:', docRef.id);

    // Create notification for admin
    await createNotification(adminDb, {
      type: 'RESERVATION',
      title: 'New Reservation',
      message: `Reservation for ${guests} guests on ${new Date(date).toLocaleDateString()} at ${time} - ${name}`,
      amount: parseInt(guests),
    });

    return NextResponse.json({ 
      success: true, 
      reservation: { ...reservation, id: docRef.id } 
    });
  } catch (error) {
    console.error('Error creating reservation:', error);
    return NextResponse.json({ error: 'Failed to create reservation' }, { status: 500 });
  }
}
