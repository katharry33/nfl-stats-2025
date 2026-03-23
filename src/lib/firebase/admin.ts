import { initializeApp, getApps, cert, ServiceAccount } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import path from 'path';
import fs from 'fs';

let serviceAccount: ServiceAccount;

// 1. Try to load from the JSON file first (Local Dev)
const localKeyPath = path.join(process.cwd(), 'serviceAccountKey.json');

if (fs.existsSync(localKeyPath)) {
  serviceAccount = JSON.parse(fs.readFileSync(localKeyPath, 'utf8'));
} else {
  // 2. Fallback to Env Var (for Production/Vercel)
  const envKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (!envKey) {
    throw new Error("❌ Missing Firebase Credentials: No serviceAccountKey.json found and no Env Var set.");
  }
  serviceAccount = JSON.parse(envKey);
}

if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

export const db = getFirestore();
export const adminDb = db;