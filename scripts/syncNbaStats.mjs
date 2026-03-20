import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import axios from 'axios';

// Prevent double-initialization in dev environments
if (!getApps().length) {
  const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

// --- CONFIG ---
// IMPORTANT: BDL v1 requires the key in the 'Authorization' header.
// Some tiers require it to be JUST the key, others 'Bearer {key}'.
const BDL_API_KEY = '69d21e57-4a04-47ea-bf29-dd63fe1e2a39'; 
const TARGET_COLLECTION = `nbaProps_2025`;
const SEASON = 2024; // BDL uses 2024 for the 2024-25 season

async function syncActivePlayers() {
  console.log(`🏀 Starting NBA Sync for ${SEASON} into ${TARGET_COLLECTION}`);

  try {
    let allPlayers = [];
    let currentPage = 1;
    let totalPages = 1;

    // 1. Fetch All Players (with Auth Fix)
    console.log("📡 Pulling player directory...");
    do {
      const playersRes = await axios.get('https://api.balldontlie.io/v1/players', {
        headers: { 'Authorization': BDL_API_KEY }, // Fix: Standard BDL v1 Header
        params: { per_page: 100, page: currentPage }
      });
      
      allPlayers = allPlayers.concat(playersRes.data.data);
      totalPages = playersRes.data.meta.total_pages;
      
      console.log(`  > Progress: ${allPlayers.length} players found (Page ${currentPage}/${totalPages})`);
      currentPage++;
      
      // BDL Free tier is ~30 req/min. 2 seconds is plenty safe.
      await new Promise(r => setTimeout(r, 2000)); 
    } while (currentPage <= totalPages);

    const playerIds = allPlayers.map(p => p.id).filter(id => id != null);
    
    // 2. Fetch Season Averages in Chunks
    const chunkSize = 50; // Smaller chunks are safer for Firestore batches
    for (let i = 0; i < playerIds.length; i += chunkSize) {
      const chunk = playerIds.slice(i, i + chunkSize);
      console.log(`🔥 Syncing Stats: Players ${i + 1} to ${i + chunk.length}...`);

      try {
        const statsRes = await axios.get('https://api.balldontlie.io/v1/season_averages', {
          headers: { 'Authorization': BDL_API_KEY },
          params: { season: SEASON, 'player_ids[]': chunk }
        });

        const stats = statsRes.data.data;
        if (!stats || stats.length === 0) continue;

        const batch = db.batch();

        stats.forEach(s => {
          const pInfo = allPlayers.find(p => p.id === s.player_id);
          if (!pInfo) return;

          const docId = `nba-${s.player_id}-${SEASON}`;
          const ref = db.collection(TARGET_COLLECTION).doc(docId);

          // We ensure 'player' and 'team' are top-level so the UI Table reads them
          batch.set(ref, {
            player: `${pInfo.first_name} ${pInfo.last_name}`,
            team: pInfo.team?.abbreviation || 'N/A',
            league: 'nba',
            season: SEASON,
            // Stats
            pts: s.pts || 0,
            reb: s.reb || 0,
            ast: s.ast || 0,
            stl: s.stl || 0,
            blk: s.blk || 0,
            fg3m: s.fg3m || 0,
            min: s.min || "0:00",
            games_played: s.games_played || 0,
            lastUpdated: new Date().toISOString()
          }, { merge: true });
        });

        await batch.commit();
        await new Promise(r => setTimeout(r, 2000)); // Respect Rate Limit
      } catch (chunkError) {
        console.error(`⚠️ Failed chunk starting at ${i}:`, chunkError.message);
      }
    }

    console.log("✅ NBA Sync Complete!");
  } catch (error) {
    if (error.response?.status === 401) {
      console.error("❌ Unauthorized: Your BDL API Key is invalid or expired.");
    } else {
      console.error("❌ Sync Error:", error.message);
    }
  }
}

syncActivePlayers();