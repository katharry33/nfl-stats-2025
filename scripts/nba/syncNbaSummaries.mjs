import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import axios from 'axios';

if (!getApps().length) {
  const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

// --- CONFIG ---
const BDL_API_KEY = '0c0c5389-4aa3-4bae-ad6d-373c95591339'; 
const SEASON = 2024; 
const TARGET_COLLECTION = `nbaAverages_${SEASON}`; // Separate from game logs

async function syncAverages() {
  console.log(`📊 Generating Season Summaries for ${SEASON}...`);

  try {
    // 1. Get Top Players
    const playersRes = await axios.get('https://api.balldontlie.io/v1/players', {
      headers: { 'Authorization': BDL_API_KEY },
      params: { per_page: 50 } 
    });
    
    const players = playersRes.data.data;
    const playerIds = players.map(p => p.id);

    // 2. Fetch Season Averages in one go (BDL supports multiple IDs here)
    console.log(`📡 Fetching averages for ${playerIds.length} nodes...`);
    const avgRes = await axios.get('https://api.balldontlie.io/v1/season_averages', {
      headers: { 'Authorization': '0c0c5389-4aa3-4bae-ad6d-373c95591339' },
      params: { 
        season: SEASON,
        'player_ids[]': playerIds
      }
    });

    const averages = avgRes.data.data;
    const batch = db.batch();

    averages.forEach(avg => {
      const p = players.find(player => player.id === avg.player_id);
      if (!p) return;

      const docId = `avg-${p.id}-${SEASON}`;
      const ref = db.collection(TARGET_COLLECTION).doc(docId);

      batch.set(ref, {
        player: `${p.first_name} ${p.last_name}`,
        team: p.team?.abbreviation || 'N/A',
        season: SEASON,
        league: 'nba',
        // Key averages
        pts: parseFloat(avg.pts.toFixed(1)),
        reb: parseFloat(avg.reb.toFixed(1)),
        ast: parseFloat(avg.ast.toFixed(1)),
        stl: parseFloat(avg.stl.toFixed(1)),
        blk: parseFloat(avg.blk.toFixed(1)),
        fg3m: parseFloat(avg.fg3m.toFixed(1)),
        // Percentages
        fg_pct: (avg.fg_pct * 100).toFixed(1) + '%',
        ft_pct: (avg.ft_pct * 100).toFixed(1) + '%',
        // Totals
        games_played: avg.games_played,
        min: avg.min,
        lastUpdated: new Date().toISOString(),
        type: 'season_summary' // Useful for filtering
      }, { merge: true });
    });

    await batch.commit();
    console.log(`✅ Successfully synced ${averages.length} season summaries!`);

  } catch (error) {
    console.error("❌ Summary Sync Error:", error.message);
  }
}

syncAverages();