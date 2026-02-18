import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

export const adminDb = admin.firestore();
export const adminAuth = admin.auth();

// ADD THESE TO FIX THE BUILD ERRORS:
export const getAdminDb = () => adminDb; // Fixes 'getAdminDb' errors
export const db = adminDb;               // Fixes 'db' errors in bet-actions.ts
