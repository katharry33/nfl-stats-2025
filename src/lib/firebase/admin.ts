import { initializeApp, cert, getApps, getApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';

function getCredential() {
  // Pattern 1: single JSON blob
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (key) {
    try {
      return cert(key.startsWith('{') ? JSON.parse(key) : key);
    } catch (err) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', err);
    }
  }

  // Pattern 2: separate fields (.env.local)
  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  if (projectId && clientEmail && privateKey) {
    return cert({ projectId, clientEmail, privateKey });
  }

  // Pattern 3: GOOGLE_APPLICATION_CREDENTIALS file path
  if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    try {
      return cert(require(process.env.GOOGLE_APPLICATION_CREDENTIALS));
    } catch (err) {
      console.error('Failed to load GOOGLE_APPLICATION_CREDENTIALS:', err);
    }
  }

  // Pattern 4: Firebase Studio / GCP managed environment
  // applicationDefault() resolves via the GCP metadata server automatically —
  // no login or key file needed when running inside Firebase Studio.
  console.log('🔑 Firebase Admin: using applicationDefault (GCP metadata server)');
  return applicationDefault();
}

export const app = getApps().length
  ? getApp()
  : initializeApp({
      credential: getCredential(),
      projectId: process.env.FIREBASE_PROJECT_ID ?? 'studio-8723557452-72ba7',
    });

export const db = getFirestore(app, '(default)');
export const adminDb = db;