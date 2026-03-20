// src/lib/firebase/admin.ts
import * as admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';

const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

const firebaseAdminConfig = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: privateKey,
};

export function getAdminApp() {
  if (!admin.apps.length) {
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

getAdminApp(); // Initialize on load

export const adminDb = getFirestore();
// Add this alias if you don't want to rename everything in batchEnrich.ts
export const db = adminDb;

console.log("🛠️ Admin Init Check - ProjectID:", firebaseAdminConfig.projectId);
console.log("🛠️ Admin Init Check - Email:", firebaseAdminConfig.clientEmail ? "✅ Found" : "❌ MISSING");
console.log("🛠️ Admin Init Check - PrivateKey:", firebaseAdminConfig.privateKey ? "✅ Found" : "❌ MISSING");
