import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

// GET /api/users - Fetch all registered users
export async function GET(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    const adminAuth = getAdminAuth();

    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    // Fetch users from Firestore
    const usersSnapshot = await adminDb.collection('users').orderBy('createdAt', 'desc').get();
    
    const users = usersSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        uid: doc.id,
        email: data.email || '',
        displayName: data.displayName || '',
        name: data.name || data.displayName || '',
        phone: data.phone || '',
        role: data.role || 'CUSTOMER',
        photoURL: data.photoURL || null,
        createdAt: data.createdAt?.toDate?.()?.toISOString() || data.createdAt || null,
        updatedAt: data.updatedAt?.toDate?.()?.toISOString() || data.updatedAt || null,
      };
    });

    // Also try to get users from Firebase Auth (for more complete data)
    let authUsers: any[] = [];
    if (adminAuth) {
      try {
        const listUsersResult = await adminAuth.listUsers(100);
        authUsers = listUsersResult.users.map(userRecord => ({
          uid: userRecord.uid,
          email: userRecord.email || '',
          displayName: userRecord.displayName || '',
          photoURL: userRecord.photoURL || null,
          disabled: userRecord.disabled,
          emailVerified: userRecord.emailVerified,
          lastSignInTime: userRecord.metadata.lastSignInTime,
          creationTime: userRecord.metadata.creationTime,
        }));
      } catch (authError) {
        console.error('Error fetching auth users:', authError);
      }
    }

    // Merge Firestore and Auth data
    const mergedUsers = users.map(user => {
      const authUser = authUsers.find(au => au.uid === user.uid);
      return {
        ...user,
        ...authUser,
        // Keep Firestore data as source of truth for role, phone, name
        role: user.role,
        phone: user.phone,
        name: user.name || user.displayName,
      };
    });

    // Add any auth users not in Firestore
    authUsers.forEach(authUser => {
      if (!mergedUsers.find(u => u.uid === authUser.uid)) {
        mergedUsers.push({
          id: authUser.uid,
          uid: authUser.uid,
          email: authUser.email,
          displayName: authUser.displayName,
          name: authUser.displayName,
          phone: '',
          role: 'CUSTOMER',
          photoURL: authUser.photoURL,
          disabled: authUser.disabled,
          emailVerified: authUser.emailVerified,
          lastSignInTime: authUser.lastSignInTime,
          creationTime: authUser.creationTime,
          createdAt: authUser.creationTime,
        });
      }
    });

    return NextResponse.json(mergedUsers);
  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(
      { error: 'Failed to fetch users' },
      { status: 500 }
    );
  }
}

// PATCH /api/users - Update user role
export async function PATCH(request: NextRequest) {
  try {
    const { userId, role } = await request.json();

    if (!userId || !role) {
      return NextResponse.json(
        { error: 'userId and role are required' },
        { status: 400 }
      );
    }

    const adminDb = getAdminDb();

    if (!adminDb) {
      return NextResponse.json(
        { error: 'Database not initialized' },
        { status: 500 }
      );
    }

    await adminDb.collection('users').doc(userId).update({
      role,
      updatedAt: new Date(),
    });

    return NextResponse.json({ success: true, message: 'User role updated' });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
