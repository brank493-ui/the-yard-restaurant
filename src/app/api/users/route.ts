import { NextRequest, NextResponse } from 'next/server';
import { getAdminAuth, getAdminDb } from '@/lib/firebase-admin';

// Demo users for when Firebase isn't configured - includes multiple users for testing
const demoUsers = [
  {
    id: 'demo-admin-1',
    uid: 'demo-admin-1',
    email: 'admin@theyard.com',
    displayName: 'Admin User',
    name: 'Admin User',
    phone: '+237 671 490 733',
    role: 'ADMIN',
    createdAt: new Date().toISOString(),
    emailVerified: true,
  },
  {
    id: 'demo-manager-1',
    uid: 'demo-manager-1',
    email: 'manager@theyard.com',
    displayName: 'Restaurant Manager',
    name: 'Restaurant Manager',
    phone: '+237 699 123 456',
    role: 'MANAGER',
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    emailVerified: true,
  },
  {
    id: 'demo-customer-1',
    uid: 'demo-customer-1',
    email: 'jean.dupont@email.com',
    displayName: 'Jean Dupont',
    name: 'Jean Dupont',
    phone: '+237 677 987 654',
    role: 'CUSTOMER',
    createdAt: new Date(Date.now() - 172800000).toISOString(),
    emailVerified: true,
  },
  {
    id: 'demo-customer-2',
    uid: 'demo-customer-2',
    email: 'marie.ntongo@email.com',
    displayName: 'Marie Ntongo',
    name: 'Marie Ntongo',
    phone: '+237 655 444 333',
    role: 'CUSTOMER',
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    emailVerified: false,
  },
  {
    id: 'demo-customer-3',
    uid: 'demo-customer-3',
    email: 'pierre.kamga@email.com',
    displayName: 'Pierre Kamga',
    name: 'Pierre Kamga',
    phone: '+237 666 777 888',
    role: 'CUSTOMER',
    createdAt: new Date(Date.now() - 345600000).toISOString(),
    emailVerified: true,
  },
];

// GET /api/users - Fetch all registered users
export async function GET(request: NextRequest) {
  try {
    const adminDb = getAdminDb();
    const adminAuth = getAdminAuth();

    // If Firebase isn't configured, return demo users
    if (!adminDb) {
      console.log('Firebase not configured, returning demo users');
      return NextResponse.json(demoUsers);
    }

    let users: any[] = [];

    // First, try to get users from Firebase Auth (most reliable source)
    if (adminAuth) {
      try {
        let allUsers: any[] = [];
        let pageToken: string | undefined = undefined;
        
        // Fetch all users (with pagination)
        do {
          const listUsersResult = await adminAuth.listUsers(1000, pageToken);
          const authUsers = listUsersResult.users.map(userRecord => ({
            uid: userRecord.uid,
            email: userRecord.email || '',
            displayName: userRecord.displayName || '',
            photoURL: userRecord.photoURL || null,
            disabled: userRecord.disabled,
            emailVerified: userRecord.emailVerified,
            lastSignInTime: userRecord.metadata.lastSignInTime,
            creationTime: userRecord.metadata.creationTime,
          }));
          allUsers = allUsers.concat(authUsers);
          pageToken = listUsersResult.pageToken;
        } while (pageToken);

        // If no users found in Auth, return demo users
        if (allUsers.length === 0) {
          console.log('No users found in Firebase Auth, returning demo users');
          return NextResponse.json(demoUsers);
        }

        // Get Firestore user data for each auth user
        const firestoreData = new Map<string, any>();
        
        try {
          const usersSnapshot = await adminDb.collection('users').get();
          usersSnapshot.docs.forEach(doc => {
            firestoreData.set(doc.id, doc.data());
          });
        } catch (firestoreError) {
          console.error('Error fetching Firestore users:', firestoreError);
        }

        // Merge Auth and Firestore data
        users = allUsers.map(authUser => {
          const fsData = firestoreData.get(authUser.uid) || {};
          return {
            id: authUser.uid,
            uid: authUser.uid,
            email: authUser.email,
            displayName: authUser.displayName,
            name: fsData.name || fsData.displayName || authUser.displayName || '',
            phone: fsData.phone || '',
            role: fsData.role || 'CUSTOMER',
            photoURL: authUser.photoURL,
            disabled: authUser.disabled,
            emailVerified: authUser.emailVerified,
            lastSignInTime: authUser.lastSignInTime,
            createdAt: authUser.creationTime,
          };
        });

        console.log(`Fetched ${users.length} users from Firebase Auth`);
        
        // If users found, return them
        if (users.length > 0) {
          return NextResponse.json(users);
        }

      } catch (authError) {
        console.error('Error fetching auth users:', authError);
        // Continue to fallback
      }
    }

    // Fallback: try Firestore only
    try {
      const usersSnapshot = await adminDb.collection('users').get();
      
      if (usersSnapshot.empty) {
        console.log('No users found in Firestore, returning demo users');
        return NextResponse.json(demoUsers);
      }
      
      users = usersSnapshot.docs.map(doc => {
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

      console.log(`Fetched ${users.length} users from Firestore`);
      return NextResponse.json(users);

    } catch (firestoreError) {
      console.error('Error fetching Firestore users:', firestoreError);
      return NextResponse.json(demoUsers);
    }

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json(demoUsers);
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
      return NextResponse.json({ success: true, message: 'Demo mode - user role updated' });
    }

    // Update or create user document
    await adminDb.collection('users').doc(userId).set({
      role,
      updatedAt: new Date(),
    }, { merge: true });

    // Also set custom claims in Firebase Auth if available
    const adminAuth = getAdminAuth();
    if (adminAuth) {
      try {
        await adminAuth.setCustomUserClaims(userId, { role });
      } catch (claimError) {
        console.error('Error setting custom claims:', claimError);
      }
    }

    return NextResponse.json({ success: true, message: 'User role updated' });
  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { error: 'Failed to update user' },
      { status: 500 }
    );
  }
}
