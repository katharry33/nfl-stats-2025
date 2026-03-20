import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// 1. Setup Firebase Admin
const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function fixNflData() {
  // We check both the 2024 and 2025 NFL collections
  const collections = ['allProps_2024', 'allProps_2025'];

  for (const colName of collections) {
    console.log(`🔍 Scanning ${colName} for missing fields...`);
    
    try {
      const snapshot = await db.collection(colName).get();
      
      if (snapshot.empty) {
        console.log(`⚠️  ${colName} appears to be empty. Skipping.`);
        continue;
      }

      const batch = db.batch();
      let updateCount = 0;

      snapshot.forEach(doc => {
        const data = doc.data();
        
        // Firestore 'orderBy' ignores documents missing the field.
        // We ensure confidenceScore and league exist for every doc.
        if (typeof data.confidenceScore !== 'number' || !data.league) {
          batch.update(doc.ref, { 
            confidenceScore: data.confidenceScore ?? 0,
            bestEdgePct: data.bestEdgePct ?? 0,
            league: data.league ?? 'nfl',
            updatedAt: new Date().toISOString()
          });
          updateCount++;
        }

        // Commit in chunks of 500 (Firestore limit)
        if (updateCount > 0 && updateCount % 499 === 0) {
          console.log(`   ...intermediate commit for ${colName}`);
        }
      });

      if (updateCount > 0) {
        await batch.commit();
        console.log(`✅ Success! Updated ${updateCount} documents in ${colName}.`);
      } else {
        console.log(`✨ All documents in ${colName} are already properly indexed.`);
      }
    } catch (err) {
      console.error(`❌ Error processing ${colName}:`, err.message);
    }
  }
}

fixNflData().catch(console.error);