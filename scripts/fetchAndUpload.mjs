import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import axios from 'axios';

// 1. Setup Firebase Admin
const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
if (process.env.NODE_ENV !== 'production') {
    initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

const BDL_API_KEY = '69d21e57-4a04-47ea-bf29-dd63fe1e2a39';
const SEASONS = [2024, 2025]; 

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchAndUpload() {
  for (const season of SEASONS) {
    console.log(`🏀 Starting Regular Season Sync for ${season}...`);
    let cursor = 0;
    let totalSeasonGames = 0;

    while (cursor !== null) {
      try {
        const response = await axios.get(`https://api.balldontlie.io/v1/games`, {
          headers: { 'Authorization': BDL_API_KEY },
          params: { 
            'seasons[]': [season], 
            per_page: 100, 
            cursor: cursor,
            postseason: false // 🛑 CRITICAL: Only get regular season games
          }
        });

        const games = response.data.data;
        if (!games || games.length === 0) break;

        // 2. Use Firestore Batched Writes (max 500 per batch)
        const batch = db.batch();
        
        games.forEach(game => {
          const gameRef = db.collection('static_nba_schedule').doc(game.id.toString());
          batch.set(gameRef, {
            id: game.id,
            date: game.date,
            season: game.season,
            status: game.status,
            homeTeam: game.home_team.abbreviation,
            homeTeamId: game.home_team.id,
            visitorTeam: game.visitor_team.abbreviation,
            visitorTeamId: game.visitor_team.id,
            homeScore: game.home_team_score,
            visitorScore: game.visitor_team_score,
            lastUpdated: new Date().toISOString()
          });
        });

        await batch.commit();
        
        totalSeasonGames += games.length;
        cursor = response.data.meta.next_cursor;
        
        console.log(` ✅ Synced ${totalSeasonGames} games for ${season}...`);

        // 3. Rate Limit Protection (5 req/min)
        if (cursor !== null) {
          console.log(" ⏳ Respecting rate limit (12s)...");
          await sleep(12000); 
        }

      } catch (error) {
        if (error.response?.status === 429) {
          console.warn("⚠️ Rate limit hit! Sleeping for 60s...");
          await sleep(60000);
          continue; 
        }
        console.error(`❌ Error at cursor ${cursor}:`, error.message);
        break;
      }
    }
  }
  console.log("🏁 All NBA Schedules Synced Cleanly.");
}

fetchAndUpload();