// src/lib/firebase/admin.ts
import { initializeApp, cert, getApps, getApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
function getCredential() {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (key) {
    try {
      return cert(key.startsWith('{') ? JSON.parse(key) : key);
    } catch (err) {
      console.error('❌ Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', err);
    }
  }

  // GOOGLE_APPLICATION_CREDENTIALS file path — works for local scripts
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      return cert(require(process.env.GOOGLE_APPLICATION_CREDENTIALS));
    } catch (err) {
      console.error('❌ Failed to load GOOGLE_APPLICATION_CREDENTIALS file:', err);
    }
  }

  // Last resort: GCP application default (Cloud Run etc.)
  return applicationDefault();
}

export const app = getApps().length
  ? getApp()
  : initializeApp({ credential: getCredential() });

  export const db = getFirestore(app, '(default)');
// Keep adminDb alias so other files importing it don't break
export const adminDb = db;