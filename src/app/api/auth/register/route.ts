import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';
import { FirebaseUser } from '@/lib/firebase-types';

export async function POST(request: NextRequest) {
  try {
    const { email, password, displayName } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const adminAuth = getAdminAuth();
    const adminDb = getAdminDb();

    if (!adminAuth || !adminDb) {
      return NextResponse.json(
        { error: 'Firebase Admin not initialized. Please check server configuration.' },
        { status: 500 }
      );
    }

    // Create user in Firebase Auth
    const userRecord = await adminAuth.createUser({
      email,
      password,
      displayName: displayName || email.split('@')[0],
    });

    // Create user document in Firestore
    const userData: FirebaseUser = {
      uid: userRecord.uid,
      email: userRecord.email || email,
      displayName: userRecord.displayName || displayName || email.split('@')[0],
      photoURL: userRecord.photoURL || null,
      role: 'CUSTOMER',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await adminDb.collection('users').doc(userRecord.uid).set({
      ...userData,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        displayName: userRecord.displayName,
      },
    });
  } catch (error: unknown) {
    console.error('Registration error:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Registration failed';
    
    // Handle specific Firebase errors
    if (errorMessage.includes('email-already-exists')) {
      return NextResponse.json(
        { error: 'An account with this email already exists' },
        { status: 400 }
      );
    }
    
    if (errorMessage.includes('invalid-email')) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }
    
    if (errorMessage.includes('weak-password')) {
      return NextResponse.json(
        { error: 'Password is too weak. Please use a stronger password' },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
