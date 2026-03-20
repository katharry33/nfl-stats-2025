import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import axios from 'axios';

if (!getApps().length) {
  const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

// CONFIG
const BDL_API_KEY = '69d21e57-4a04-47ea-bf29-dd63fe1e2a39'; 
const TARGET_COLLECTION = `nbaProps_2025`;
const SEASON = 2024; 

async function syncActivePlayers() {
  console.log(`🏀 NBA Sync: Targeting ${TARGET_COLLECTION}...`);

  try {
    let allPlayers = [];
    let currentPage = 1;
    let totalPages = 1;

    // --- PHASE 1: PLAYER DIRECTORY ---
    do {
      console.log(`📡 Fetching Players Page ${currentPage}...`);
      const playersRes = await axios.get('https://api.balldontlie.io/v1/players', {
        headers: { 'Authorization': BDL_API_KEY }, // Or try: `Bearer ${BDL_API_KEY}`
        params: { per_page: 100, page: currentPage }
      });
      
      allPlayers = allPlayers.concat(playersRes.data.data);
      totalPages = playersRes.data.meta.total_pages;
      currentPage++;
      
      // Free Tier: 5 req/min = 1 req every 12 seconds
      await new Promise(r => setTimeout(r, 12500)); 
    } while (currentPage <= 5); // Limit to 5 pages for testing to save your quota

    const playerIds = allPlayers.map(p => p.id);
    console.log(`✅ Directory: ${playerIds.length} players loaded.`);

    // --- PHASE 2: STAT ENRICHMENT ---
    const chunkSize = 25; // Smaller chunks for the free tier
    for (let i = 0; i < playerIds.length; i += chunkSize) {
      const chunk = playerIds.slice(i, i + chunkSize);
      
      console.log(`🔥 Fetching averages for chunk ${i/chunkSize + 1}...`);
      const statsRes = await axios.get('https://api.balldontlie.io/v1/season_averages', {
        headers: { 'Authorization': BDL_API_KEY },
        params: { season: SEASON, 'player_ids[]': chunk }
      });

      const stats = statsRes.data.data;
      if (!stats || stats.length === 0) {
        console.log("⚠️ No stats found for this chunk, skipping...");
        continue;
      }

      const batch = db.batch();
      stats.forEach(s => {
        const pInfo = allPlayers.find(p => p.id === s.player_id);
        if (!pInfo) return;

        const docId = `nba-${s.player_id}-${SEASON}`;
        const ref = db.collection(TARGET_COLLECTION).doc(docId);

        batch.set(ref, {
          player: `${pInfo.first_name} ${pInfo.last_name}`,
          team: pInfo.team?.abbreviation || 'N/A',
          league: 'nba',
          season: SEASON,
          pts: s.pts || 0,
          reb: s.reb || 0,
          ast: s.ast || 0,
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      });

      await batch.commit();
      console.log(`✅ Synced ${stats.length} players.`);
      
      // Wait 13 seconds between chunks to stay under the 5 req/min limit
      await new Promise(r => setTimeout(r, 13000)); 
    }

    console.log("🚀 Sync Complete!");
  } catch (error) {
    console.error("❌ Sync Error:", error.response?.status, error.response?.data || error.message);
  }
}

syncActivePlayers();