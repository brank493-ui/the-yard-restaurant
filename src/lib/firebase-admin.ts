import admin from 'firebase-admin';

let adminApp: admin.app.App | null = null;
let initializationAttempted = false;

function getAdminApp() {
  // Only attempt initialization once
  if (initializationAttempted) {
    return adminApp;
  }

  initializationAttempted = true;

  // Check if already initialized
  if (admin.apps.length > 0) {
    adminApp = admin.apps[0]!;
    return adminApp;
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const projectId = process.env.FIREBASE_PROJECT_ID;

  // Check if all required credentials are present
  if (!privateKey || !clientEmail || !projectId) {
    console.warn('Firebase Admin SDK credentials not configured. Some features may not work.');
    return null;
  }

  // Validate private key format
  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    console.warn('Firebase private key format appears invalid.');
    return null;
  }

  try {
    adminApp = admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey,
      }),
      projectId,
    });

    return adminApp;
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
    return null;
  }
}

export function getAdminAuth() {
  const app = getAdminApp();
  if (!app) return null;
  
  try {
    return admin.auth(app);
  } catch {
    return null;
  }
}

export function getAdminDb() {
  const app = getAdminApp();
  if (!app) return null;
  
  try {
    return admin.firestore(app);
  } catch {
    return null;
  }
}

export { admin };
export default getAdminApp;
