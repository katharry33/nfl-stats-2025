import * as admin from 'firebase-admin';

// This check prevents the browser from trying to execute server-side code.
if (typeof window !== 'undefined') {
  throw new Error('firebase-admin should only be used on the server.');
}

// Initialize the app if it hasn't been already.
if (!admin.apps.length) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Replace escaped newlines for Vercel/similar environments
        privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  } catch (error: any) {
    console.error('Firebase admin initialization error', error);
    // Throwing an error here is important to prevent the app from running with a misconfigured admin SDK.
    throw new Error('Failed to initialize Firebase Admin SDK.');
  }
}

// Export the initialized services and types.
export const adminDb = admin.firestore();
export const adminAuth = admin.auth();
export const FieldValue = admin.firestore.FieldValue;
