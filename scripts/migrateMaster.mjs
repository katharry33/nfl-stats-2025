import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const sport = process.argv[2]?.toUpperCase(); // NFL or NBA
if (!['NFL', 'NBA'].includes(sport)) {
  console.error("❌ Please specify sport: node scripts/migrateMaster.mjs NFL");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function migrate() {
  const filePath = `./data_backup/${sport.toLowerCase()}/master-registry.json`;
  // Standardized to match your collect script
  const collectionName = sport === 'NFL' ? 'static_pfrIdMap' : 'static_nbaIdMap';

  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return;
  }

  const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`🚀 Migrating ${rawData.length} ${sport} players to ${collectionName}...`);

  const batchSize = 500;
  for (let i = 0; i < rawData.length; i += batchSize) {
    const batch = db.batch();
    const chunk = rawData.slice(i, i + batchSize);

    chunk.forEach((p) => {
      // Use the 'id' field we saved during the pull phase
      const docId = p.id || p.bdlId;
      if (!docId) return;

      const docRef = db.collection(collectionName).doc(String(docId));
      
      const { id, ...dataToSave } = p;

      batch.set(docRef, {
        ...dataToSave,
        lastUpdated: new Date().toISOString()
      }, { merge: true });
    });

    await batch.commit();
    console.log(`✅ ${Math.min(i + batchSize, rawData.length)} synced`);
  }
}

migrate().catch(console.error);