import { initializeApp, getApps, cert, App } from 'firebase-admin/app';
import { getFirestore, Firestore } from 'firebase-admin/firestore';

// 1. We keep these local to the module
let adminAppInstance: App | undefined;
let adminDbInstance: Firestore | undefined;

export function getAdminApp(): App {
  if (adminAppInstance) {
    return adminAppInstance;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    adminAppInstance = existingApps[0];
    adminDbInstance = getFirestore(adminAppInstance);
    return adminAppInstance;
  }

  try {
    console.log('🔥 Initializing Firebase Admin SDK...');

    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing Firebase Admin credentials. Check .env.local');
    }

    // Clean the PEM key: handle quotes and escaped newlines
    const formattedPrivateKey = privateKey
      .replace(/^['"]|['"]$/g, '')
      .replace(/\\n/g, '\n');

    adminAppInstance = initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: formattedPrivateKey,
      }),
    });

    adminDbInstance = getFirestore(adminAppInstance);
    console.log('✅ Firebase Admin initialized');
    
    return adminAppInstance;
  } catch (error: any) {
    console.error('❌ Firebase Admin initialization failed:', error.message);
    throw error;
  }
}

/**
 * FIX: This function ensures the DB is initialized and returned.
 */
export function getAdminDb(): Firestore {
  if (!adminDbInstance) {
    getAdminApp();
  }
  return adminDbInstance!;
}

/**
 * COMPATIBILITY EXPORT: 
 * This allows your other files to use `import { adminDb }` 
 * while still benefiting from the lazy-loading logic above.
 */
export const adminDb = getAdminDb();
export const db = adminDb; // Add this line to fix the TS2305 error
