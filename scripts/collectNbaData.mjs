import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

// Prevent double initialization
try {
  const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
} catch (e) {
  // App already exists
}

const db = getFirestore();

async function collectNbaData() {
  console.log("📥 Pulling NBA players from static_nbaIdMap...");
  
  try {
    const snapshot = await db.collection('static_nbaIdMap').get();
    const players = [];

    snapshot.forEach(doc => {
      const data = doc.data();
      
      // Normalize data for the Master Registry
      players.push({
        id: doc.id,                             // Critical for the 'Push' back to Firestore
        playerName: data.playerName || data.player || "Unknown Player",
        bdlId: data.bdlId || null,              // Balldontlie ID
        pfrId: null,                            // NBA doesn't use PFR, but we keep the key for schema parity
        team: data.team?.toUpperCase() || "N/A",
        sport: 'NBA',
        lastUpdated: data.lastUpdated || new Date().toISOString()
      });
    });

    const outputPath = './data/nba/master-registry.json';
    
    // Ensure directory exists
    if (!fs.existsSync('./data/nba')) {
      fs.mkdirSync('./data/nba', { recursive: true });
    }

    // Sort alphabetically by playerName
    players.sort((a, b) => a.playerName.localeCompare(b.playerName));

    fs.writeFileSync(outputPath, JSON.stringify(players, null, 2));
    console.log(`✅ Success! ${players.length} NBA players saved to ${outputPath}`);
    
  } catch (error) {
    console.error("❌ Error fetching from Firestore:", error);
  }
}

collectNbaData().catch(console.error);