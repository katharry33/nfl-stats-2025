const admin = require('firebase-admin');
const axios = require('axios');
const path = require('path');

/**
 * PATH FIX: 
 * Looks in /home/user/project/serviceAccountKey.json
 */
const keyPath = path.join(__dirname, '..', 'serviceAccountKey.json');

let serviceAccount;
try {
  serviceAccount = require(keyPath);
} catch (e) {
  console.error(`❌ CRITICAL ERROR: Could not find serviceAccountKey.json at ${keyPath}`);
  process.exit(1);
}

// Initialize Firebase before defining DB
if (!admin.apps.length) {
  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}
const db = admin.firestore();

// Using your provided key directly to avoid 401 environment issues
const BDL_KEY = "69d21e57-4a04-47ea-bf29-dd63fe1e2a39";

async function syncSchedule(sport, season) {
  console.log(`🚀 Starting ${sport} sync for the ${season} season...`);
  
  const sportLower = sport.toLowerCase();
  const colName = sportLower === 'nfl' ? 'static_nfl_schedule' : 'static_nba_schedule';
  const baseUrl = `https://api.balldontlie.io/v1/games`;

  let cursor = 0;
  let totalSynced = 0;

  try {
    // Loop through pages until meta.next_cursor is null
    while (cursor !== null) {
      const response = await axios.get(baseUrl, {
        params: { 
          seasons: [season],
          sport: sportLower, // Filter by sport at the API level
          per_page: 100,
          cursor: cursor || undefined
        },
        headers: { Authorization: BDL_KEY }
      });

      const { data, meta } = response.data;
      
      if (!data || data.length === 0) {
        console.log("No more games found for this criteria.");
        break;
      }

      const batch = db.batch();
      
      data.forEach(game => {
        const gameRef = db.collection(colName).doc(game.id.toString());
        
        batch.set(gameRef, {
          id: game.id,
          date: game.date,
          homeTeam: game.home_team.abbreviation,
          visitorTeam: game.visitor_team.abbreviation,
          season: game.season,
          status: game.status,
          week: game.week || null, // Populates for NFL
          postseason: game.postseason || false,
          lastUpdated: admin.firestore.FieldValue.serverTimestamp()
        }, { merge: true });
      });

      await batch.commit();
      totalSynced += data.length;
      cursor = meta.next_cursor;
      
      console.log(`Synced ${totalSynced} games... (Moving to next page)`);
    }

    console.log(`✅ SUCCESS: ${totalSynced} ${sport} games are now in ${colName}.`);
  } catch (err) {
    console.error("❌ SYNC FAILED:", err.response?.data?.error || err.message);
  }
}

// Handle Command Line Args: node scripts/syncSchedules.js NBA 2025
const [,, sportArg, seasonArg] = process.argv;

if (!sportArg) {
  console.log("⚠️ Missing arguments!");
  console.log("Usage: node scripts/syncSchedules.js [NFL|NBA] [YEAR]");
  process.exit(0);
}

// Season defaults to 2025 (2025-26) if not provided
syncSchedule(sportArg.toUpperCase(), seasonArg || 2025);