import * as admin from 'firebase-admin';

// 1. Define the private key logic BEFORE the config object
const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: privateKey, // 2. Reference the variable here
};

export function getAdminApp() {
  // Check if any apps are already initialized to prevent "App already exists" error
  if (!admin.apps.length) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(firebaseAdminConfig as admin.ServiceAccount),
      });
      console.log("🚀 Firebase Admin initialized successfully");
    } catch (error) {
      console.error("❌ Firebase Admin initialization error:", error);
    }
  }
  return admin.app();
}

// Initialize and export the services
export const adminDb = getAdminApp().firestore();
export const adminAuth = getAdminApp().auth();

export { admin };
export const db = adminDb;