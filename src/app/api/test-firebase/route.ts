import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

export async function GET() {
  const results = {
    timestamp: new Date().toISOString(),
    firebaseAdmin: false,
    firestore: false,
    auth: false,
    errors: [] as string[],
  };

  try {
    // Test Firebase Admin initialization
    const adminAuth = getAdminAuth();
    if (adminAuth) {
      results.firebaseAdmin = true;
      results.auth = true;

      // Test listing users (limited to 1)
      try {
        await adminAuth.listUsers(1);
      } catch (error) {
        results.errors.push(`Auth test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Test Firestore connection
    const adminDb = getAdminDb();
    if (adminDb) {
      results.firestore = true;

      // Try to read from a collection
      try {
        const snapshot = await adminDb.collection('menuItems').limit(1).get();
        results.errors.push(`Firestore read success: Found ${snapshot.size} documents`);
      } catch (error) {
        results.errors.push(`Firestore test error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    return NextResponse.json({
      success: results.firebaseAdmin && results.firestore,
      results,
    });
  } catch (error) {
    results.errors.push(`General error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    return NextResponse.json({
      success: false,
      results,
    });
  }
}
