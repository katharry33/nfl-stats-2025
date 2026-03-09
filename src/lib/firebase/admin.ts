// src/lib/firebase/admin.ts
import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  const keyPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const keyJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (keyPath) {
    initializeApp({ credential: cert(keyPath) });
  } else if (keyJson) {
    initializeApp({ credential: cert(JSON.parse(keyJson)) });
  } else {
    throw new Error(
      'Firebase Admin: set GOOGLE_APPLICATION_CREDENTIALS (file path) or FIREBASE_SERVICE_ACCOUNT_KEY (JSON string)'
    );
  }
}

export const adminDb = getFirestore();

// Alias — some files import initAdmin
export const initAdmin = adminDb;