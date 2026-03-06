import { NextRequest, NextResponse } from 'next/server';
import { getAdminDb } from '@/lib/firebase-admin';

// In-memory storage for demo mode
const demoMessages: unknown[] = [];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, subject, message } = body;

    if (!name || !email || !message) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const adminDb = getAdminDb();
    
    const contactMessage = {
      id: `msg_${Date.now()}`,
      name,
      email,
      phone: phone || null,
      subject: subject || 'General Inquiry',
      message,
      isRead: false,
      createdAt: new Date(),
    };

    if (!adminDb) {
      // Demo mode - store in memory
      demoMessages.push(contactMessage);
      console.log('New contact message (demo mode):', contactMessage);
      return NextResponse.json({ success: true, contactMessage });
    }

    // Save to Firestore
    const docRef = await adminDb.collection('contactMessages').add(contactMessage);
    
    console.log('New contact message created:', docRef.id);

    return NextResponse.json({ 
      success: true, 
      contactMessage: { ...contactMessage, id: docRef.id } 
    });
  } catch (error) {
    console.error('Error saving contact message:', error);
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  }
}

export async function GET() {
  try {
    const adminDb = getAdminDb();
    
    if (!adminDb) {
      return NextResponse.json(demoMessages);
    }

    const snapshot = await adminDb.collection('contactMessages')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();
    
    const messages = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt?.toDate?.() || data.createdAt,
      };
    });

    return NextResponse.json(messages);
  } catch (error) {
    console.error('Error fetching contact messages:', error);
    return NextResponse.json(demoMessages);
  }
}
