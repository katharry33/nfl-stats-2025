import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import axios from 'axios';

// --- CONFIG & AUTH ---
const BDL_API_KEY = '8a3d412e-32f3-4528-90ae-60927fcb3116'; // Your Key
const SEASONS = [2024, 2025];
const BASE_URL = 'https://api.balldontlie.io/nba/v1';

// --- FIREBASE INIT ---
if (!getApps().length) {
  const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

// The specific stars from your Top 25 lists
const TOP_25_PLAYERS = new Set([
  'Luka Doncic', 'Shai Gilgeous-Alexander', 'Anthony Edwards', 'Tyrese Maxey', 'Jaylen Brown',
  'Kawhi Leonard', 'Nikola Jokic', 'Donovan Mitchell', 'Jalen Brunson', 'Devin Booker',
  'Kevin Durant', 'Jamal Murray', 'Cade Cunningham', 'Victor Wembanyama', 'James Harden',
  'Stephen Curry', 'Karl-Anthony Towns', 'LaMelo Ball', 'Bam Adebayo', 'Chet Holmgren',
  'Paolo Banchero', 'De\'Aaron Fox', 'Scottie Barnes', 'LeBron James', 'Jalen Johnson',
  'Alperen Sengun', 'Evan Mobley', 'Jalen Duren', 'Michael Porter Jr.', 'Trey Murphy III', 
  'Brandon Miller', 'Kon Knueppel', 'Sam Merrill'
]);

async function runSync() {
  console.log("🚀 Starting NBA Top 25 Historical Sync...");
  
  // 1. Get IDs from your existing map
  const mapSnap = await db.collection('static_nbaIdMap').get();
  const targetPlayers = mapSnap.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(p => TOP_25_PLAYERS.has(p.playerName) && p.bdlId);

  console.log(`✅ Found ${targetPlayers.length} matches in your ID map.`);

  for (const p of targetPlayers) {
    for (const season of SEASONS) {
      try {
        console.log(`\n🏀 [${season}] Syncing: ${p.playerName} (BDL: ${p.bdlId})`);
        
        // Fetching from /stats (Allowed on Free Tier)
        const res = await axios.get(`${BASE_URL}/stats`, {
          params: { 'player_ids[]': p.bdlId, 'seasons[]': season, per_page: 100 },
          headers: { 'Authorization': BDL_API_KEY } // Using the key here
        });

        const logs = res.data.data;
        if (!logs || logs.length === 0) continue;

        const batch = db.batch();
        
        // Save game logs for the charts
        logs.forEach(log => {
          const gameDate = log.game.date.split('T')[0];
          const logRef = db.collection(`nbaProps_${season}`).doc(`nba-log-${p.bdlId}-${log.game.id}`);
          batch.set(logRef, {
            player: p.playerName,
            team: log.team?.abbreviation || 'N/A',
            pts: log.pts || 0,
            ast: log.ast || 0,
            reb: log.reb || 0,
            fg3m: log.fg3m || 0,
            date: gameDate,
            type: 'game_log'
          }, { merge: true });
        });

        // Save averages for the leaderboards
        const avgRef = db.collection(`nbaAverages_${season}`).doc(String(p.bdlId));
        batch.set(avgRef, {
          player: p.playerName,
          bdlId: p.bdlId,
          avg_pts: (logs.reduce((s, c) => s + (c.pts || 0), 0) / logs.length).toFixed(1),
          avg_ast: (logs.reduce((s, c) => s + (c.ast || 0), 0) / logs.length).toFixed(1),
          avg_reb: (logs.reduce((s, c) => s + (c.reb || 0), 0) / logs.length).toFixed(1),
          avg_fg3m: (logs.reduce((s, c) => s + (c.fg3m || 0), 0) / logs.length).toFixed(1),
          games_played: logs.length,
          type: 'season_summary',
          lastUpdated: new Date().toISOString()
        }, { merge: true });

        await batch.commit();
        console.log(`   ✅ Saved ${logs.length} games.`);

        // ⚠️ Rate limit: 5 requests per minute = 12s delay
        await new Promise(r => setTimeout(r, 15000));

      } catch (err) {
        console.error(`   ❌ Error: ${err.response?.status}`);
        console.error(`   📝 Message: ${JSON.stringify(err.response?.data)}`); // This will tell us if it's "Invalid Key" or "Tier Upgrade Required"
        if (err.response?.status === 401) return; 
      }
    }
  