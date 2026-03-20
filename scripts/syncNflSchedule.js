const path = require('path');
const dotenv = require('dotenv');

// 1. Load from .env.local specifically

const admin = require('firebase-admin');
const axios = require('axios');

// 2. Initialize Firebase
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault()
  });
}
const db = admin.firestore();

// 3. Config
const BDL_API_KEY = process.env.BDL_API_KEY;
const COLLECTION_NAME = 'static_nfl_schedule';
const SEASON = 2025; 
const START_WEEK = 6;
const END_WEEK = 22;
const SLEEP_MS = 3500; // Stay safe under 30 RPM (Requests Per Minute)

async function syncNflSchedule() {
  console.log(`🏈 Starting NFL Schedule Sync for ${SEASON} (Weeks ${START_WEEK}-${END_WEEK})...`);

  if (!BDL_API_KEY) {
    console.error('❌ Error: BDL_API_KEY not found in .env.local');
    return;
  }

  let currentWeek = START_WEEK;

  try {
    while (currentWeek <= END_WEEK) {
      console.log(`📡 Fetching Week ${currentWeek}...`);
      
      try {
        const response = await axios.get('https://api.balldontlie.io/nfl/v1/games', {
          params: { 
            'seasons[]': SEASON,
            'weeks[]': currentWeek,
            per_page: 100 
          },
          headers: { 
            'Authorization': BDL_API_KEY.trim() 
          }
        });

        const games = response.data.data;

        if (games && games.length > 0) {
          const batch = db.batch();
          
          games.forEach(game => {
            // Create a consistent ID: nfl_2025_w6_phi_vs_dal
            const home = game.home_team.abbreviation.toLowerCase();
            const away = game.visitor_team.abbreviation.toLowerCase();
            const docId = `nfl_${SEASON}_w${currentWeek}_${home}_vs_${away}`;
            const docRef = db.collection(COLLECTION_NAME).doc(docId);

            batch.set(docRef, {
              gameId: game.id,
              date: game.date,
              status: game.status, // "scheduled", "in_progress", or "closed"
              week: currentWeek,
              season: SEASON,
              homeTeam: game.home_team.abbreviation,
              visitorTeam: game.visitor_team.abbreviation,
              homeScore: game.home_score || 0,
              visitorScore: game.visitor_score || 0,
              // Mapping metadata for easy Hub filtering
              displayTitle: `${game.visitor_team.abbreviation} @ ${game.home_team.abbreviation}`,
              updatedAt: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });
          });

          await batch.commit();
          console.log(`✅ Week ${currentWeek} Synced: ${games.length} games.`);
        } else {
          console.warn(`⚠️ No games found for Week ${currentWeek}.`);
        }

        currentWeek++; 
        
        // Wait to respect rate limits
        await new Promise(r => setTimeout(r, SLEEP_MS));

      } catch (innerErr) {
        if (innerErr.response?.status === 429) {
          console.warn(`🛑 Rate limit hit on Week ${currentWeek}. Cooling down 60s...`);
          await new Promise(r => setTimeout(r, 60000));
          // Retry the same week by not incrementing currentWeek
        } else {
          console.error(`❌ Error on Week ${currentWeek}:`, innerErr.message);
          // Optional: break or continue based on preference
          currentWeek++; 
        }
      }
    }

    console.log('🏁 NFL Schedule Sync Complete!');
  } catch (err) {
    console.error('💀 Fatal Script Error:', err.message);
  }
}

syncNflSchedule();