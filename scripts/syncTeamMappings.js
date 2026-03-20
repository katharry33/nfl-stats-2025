const admin = require('firebase-admin');
const axios = require('axios');
const path = require('path');

// 1. Setup the path to the service account in the project root
const keyPath = path.join(__dirname, '..', 'serviceAccountKey.json');
console.log("Loading key from:", keyPath);

// 2. Load the service account
const serviceAccount = require(keyPath);

// 3. INITIALIZE FIREBASE FIRST (Crucial step)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

// 4. Now that Firebase is initialized, define the Firestore instance
const db = admin.firestore();

// Your Balldontlie API Key
const BDL_API_KEY = "69d21e57-4a04-47ea-bf29-dd63fe1e2a39"; 

async function syncTeamMappings(sport) {
  console.log(`🚀 Starting ${sport} Team Mapping Sync...`);
  
  try {
    // Fetch players from BDL for the specific sport
    const response = await axios.get(`https://api.balldontlie.io/v1/players`, {
      params: {
        sport: sport.toLowerCase(),
        per_page: 100
      },
      headers: { Authorization: BDL_API_KEY }
    });

    const bdlPlayers = response.data.data;
    
    if (!bdlPlayers || bdlPlayers.length === 0) {
      console.log(`⚠️ No ${sport} players found.`);
      return;
    }

    const batch = db.batch();

    bdlPlayers.forEach(player => {
      // Create a unique ID for the mapping (e.g., NFL_123)
      const mappingId = `${sport.toUpperCase()}_${player.id}`;
      const docRef = db.collection('static_playerTeamMapping').doc(mappingId);

      batch.set(docRef, {
        bdlId: player.id.toString(),
        playerName: `${player.first_name} ${player.last_name}`,
        teamAbbreviation: player.team.abbreviation,
        teamName: player.team.full_name,
        sport: sport.toUpperCase(),
        lastUpdated: admin.firestore.FieldValue.serverTimestamp()
      }, { merge: true });
    });

    await batch.commit();
    console.log(`✅ Successfully mapped ${bdlPlayers.length} ${sport} players to teams.`);

  } catch (error) {
    // If you get a 401 here, check if the API key has extra spaces or is expired
    console.error(`❌ ${sport} Sync failed:`, error.response?.data?.error || error.message);
  }
}

async function run() {
  try {
    await syncTeamMappings('NFL');
    await syncTeamMappings('NBA');
    console.log("🏁 All mappings updated.");
  } catch (err) {
    console.error("Critical run error:", err);
  } finally {
    process.exit();
  }
}

run();