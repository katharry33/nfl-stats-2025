import path from 'path';
import dotenv from 'dotenv';
import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

// Manually point to the .env.local in your root directory
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const app = getApps().length ? getApp() : initializeApp({
  credential: cert({
    projectId:   process.env.FIREBASE_PROJECT_ID!,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL!,
    privateKey:  process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  })
});

const db = getFirestore();
const FIELD_MAP: Record<string, string> = {
    'Score Diff': 'scoreDiff',
    'score diff': 'scoreDiff',
    'Season Hit %': 'seasonHitPct',
    'season hit %': 'seasonHitPct',
    'actual stats': 'actualResult',
    'Actual stats': 'actualResult',
    'game stats': 'gameStat',
    'Avg Win Prob': 'avgWinProb',
    'avg win prob': 'avgWinProb',
    'Confidence Score': 'confidenceScore',
    'Expected Value': 'expectedValue',
  };

const normalizeResult = (val: any): string => {
  if (typeof val !== 'string') return 'pending';
  const v = val.toLowerCase();
  if (['won', 'win', 'loss', 'lost', 'push'].includes(v)) {
    if (v === 'win') return 'won';
    if (v === 'loss') return 'lost';
    return v;
  }
  return 'pending';
};

async function runBackfill() {
  const collectionName = 'allProps_2025'; // Collection to normalize
  const snapshot = await db.collection(collectionName).get();
  
  if (snapshot.empty) {
    console.log(`⚠️ No documents found in ${collectionName}.`);
    return;
  }

  let batch = db.batch();
  let count = 0;

  console.log(`Normalizing ${snapshot.size} documents...`);

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const update: any = {};
    let needsUpdate = false;

    for (const [oldKey, newKey] of Object.entries(FIELD_MAP)) {
      if (data[oldKey] !== undefined) {
        let value = data[oldKey];

        if (newKey === 'actualResult') value = normalizeResult(value);
        if (['scoreDiff', 'seasonHitPct', 'avgWinProb', 'confidenceScore', 'expectedValue'].includes(newKey)) {
          value = typeof value === 'number' ? value : parseFloat(value) || 0;
        }

        update[newKey] = value;
        
        if (oldKey !== newKey) {
          update[oldKey] = FieldValue.delete();
        }
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      batch.update(doc.ref, update);
      count++;
    }

    if (count > 0 && count % 400 === 0) {
      await batch.commit();
      batch = db.batch();
      console.log(`✅ Processed ${count} documents...`);
    }
  }

  if (count % 400 !== 0) {
    await batch.commit();
  }

  console.log(`\n✨ Done! Normalized ${count} total documents.\n`);
}

runBackfill().catch(err => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});