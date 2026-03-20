import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function collectData() {
  console.log("📥 Pulling NFL players from static_pfrIdMap...");
  
  const snapshot = await db.collection('static_pfrIdMap').get();
  const players = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    players.push({
      playerName: data.player || data.playerName, // Handles both naming conventions
      bdlId: data.pfrid || data.bdlId,           // Uses pfrid as the primary ID for now
      pfrId: data.pfrid || null,
      team: data.team,
      sport: 'NFL'
    });
  });

  const outputPath = './data/nfl/master-registry.json';
  
  // Ensure directory exists
  if (!fs.existsSync('./data/nfl')) {
    fs.mkdirSync('./data/nfl', { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(players, null, 2));
  console.log(`✅ Success! ${players.length} players saved to ${outputPath}`);
}

collectData().catch(console.error);