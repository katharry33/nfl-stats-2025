// src/lib/firebase/admin.ts
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function getCredential() {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  
  if (!key) return undefined;

  try {
    // If it's a JSON string (typical for Vercel/Env variables), parse it
    if (key.startsWith('{')) {
      return cert(JSON.parse(key));
    }
    // Otherwise, treat it as a path to a JSON file
    return cert(key);
  } catch (err) {
    console.error("❌ Failed to parse Firebase Credential:", err);
    return undefined;
  }
}

export const app = !getApps().length 
  ? initializeApp({ credential: getCredential() })
  : getApp();

export const db = getFirestore(app);