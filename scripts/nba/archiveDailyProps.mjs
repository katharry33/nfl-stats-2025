import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

if (!getApps().length) {
  const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

const DAILY_COLLECTION = 'nbaPropsDaily_2025';
const HISTORICAL_COLLECTION = 'nbaProps_2025';

async function archiveDailyProps() {
  console.log(`📦 Archiving ${DAILY_COLLECTION} to ${HISTORICAL_COLLECTION}...`);

  try {
    const snapshot = await db.collection(DAILY_COLLECTION).get();
    
    if (snapshot.empty) {
      console.log("📭 Daily collection is empty. Nothing to archive.");
      return;
    }

    const batch = db.batch();
    let count = 0;

    snapshot.forEach(doc => {
      // Don't archive the metadata doc
      if (doc.id === 'today_metadata') return;

      const data = doc.data();
      const historicalRef = db.collection(HISTORICAL_COLLECTION).doc(doc.id);
      
      batch.set(historicalRef, {
        ...data,
        archivedAt: new Date().toISOString()
      }, { merge: true });

      // Delete from daily after moving
      batch.delete(doc.ref);
      count++;
    });

    await batch.commit();
    console.log(`✅ Successfully archived ${count} props and cleared daily collection.`);
  } catch (error) {
    console.error("❌ Archive Error:", error.message);
  }
}

archiveDailyProps();