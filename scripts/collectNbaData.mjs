import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

async function collectNbaData() {
  console.log("📥 Pulling NBA players from static_nbaIdMap...");
  
  const snapshot = await db.collection('static_nbaIdMap').get();
  const players = [];

  snapshot.forEach(doc => {
    const data = doc.data();
    players.push({
      playerName: data.playerName || data.player, // Flex for naming variants
      bdlId: data.bdlId || doc.id,               // Fallback to Document ID if field is missing
      pfrId: null,                               // NBA doesn't use PFR
      team: data.team,
      sport: 'NBA'
    });
  });

  const outputPath = './data/nba/master-registry.json';
  
  // Ensure NBA directory exists
  if (!fs.existsSync('./data/nba')) {
    fs.mkdirSync('./data/nba', { recursive: true });
  }

  fs.writeFileSync(outputPath, JSON.stringify(players, null, 2));
  console.log(`✅ Success! ${players.length} NBA players saved to ${outputPath}`);
}

collectNbaData().catch(console.error);