// src/lib/firebase/admin.ts
import * as admin from 'firebase-admin';

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: privateKey,
};

export function getAdminApp() {
  if (!admin.apps.length) {
    // DIAGNOSTIC LOG: This will show in your terminal (not browser)
    if (!firebaseAdminConfig.privateKey) {
      console.error("❌ CRITICAL: FIREBASE_PRIVATE_KEY is missing from environment!");
    }

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

export const adminDb = getAdminApp().firestore();

console.log("🛠️ Admin Init Check - ProjectID:", firebaseAdminConfig.projectId);
console.log("🛠️ Admin Init Check - Email:", firebaseAdminConfig.clientEmail ? "✅ Found" : "❌ MISSING");
console.log("🛠️ Admin Init Check - PrivateKey:", firebaseAdminConfig.privateKey ? "✅ Found" : "❌ MISSING");