import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const sport = process.argv[2]?.toUpperCase(); // NFL or NBA
if (!['NFL', 'NBA'].includes(sport)) {
  console.error("❌ Please specify sport: node migrateMaster.mjs NFL");
  process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function migrate() {
  // Logic maps to your new folder structure
  const filePath = `./data/${sport.toLowerCase()}/master-registry.json`;
  const collectionName = sport === 'NFL' ? 'static_pfrIdMap' : 'nba_player_registry';

  const rawData = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  console.log(`🚀 Migrating ${rawData.length} ${sport} players to ${collectionName}...`);

  const batchSize = 500;
  for (let i = 0; i < rawData.length; i += batchSize) {
    const batch = db.batch();
    const chunk = rawData.slice(i, i + batchSize);

    chunk.forEach((p) => {
      // Use bdlId as primary key, pfrId as fallback
      const docRef = db.collection(collectionName).doc(p.bdlId);
      
      const payload = {
        playerName: p.playerName,
        bdlId: p.bdlId,
        pfrId: p.pfrId || null,
        team: p.team.toUpperCase(),
        lastUpdated: new Date().toISOString(),
        // Backwards compatibility for NFL-specific keys
        ...(sport === 'NFL' && { player: p.playerName, pfrid: p.pfrId || p.bdlId })
      };

      batch.set(docRef, payload, { merge: true });
    });

    await batch.commit();
    console.log(`✅ ${Math.min(i + batchSize, rawData.length)} synced`);
  }
}

migrate().catch(console.error);