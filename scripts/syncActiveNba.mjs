import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import axios from 'axios';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

const BDL_API_KEY = '69d21e57-4a04-47ea-bf29-dd63fe1e2a39';
const TARGET_COLLECTION = `nbaProps_2025`;

async function syncActivePlayers() {
  console.log("🏀 Fetching Active NBA Rosters...");

  try {
    // 1. Get all teams to get their IDs
    const teamsRes = await axios.get('https://api.balldontlie.io/v1/teams', {
      headers: { 'Authorization': BDL_API_KEY }
    });
    const teams = teamsRes.data.data;

    for (const team of teams) {
      console.log(`📡 Pulling active players for ${team.full_name}...`);
      
      // 2. Get players for THIS team only
      // Note: BDL filtering varies by tier; if this endpoint 401s, 
      // we use the 'players' endpoint with a team_ids filter.
      const playersRes = await axios.get(`https://api.balldontlie.io/v1/players`, {
        headers: { 'Authorization': BDL_API_KEY },
        params: { team_ids: [team.id], per_page: 50 }
      });

      const activePlayers = playersRes.data.data;
      const playerIds = activePlayers.map(p => p.id);

      if (playerIds.length === 0) continue;

      // 3. Get Season Averages for these specific active players
      const statsRes = await axios.get(`https://api.balldontlie.io/v1/season_averages`, {
        headers: { 'Authorization': BDL_API_KEY },
        params: { season: 2024, 'player_ids[]': playerIds }
      });

      const stats = statsRes.data.data;
      const batch = db.batch();

      stats.forEach(s => {
        const pInfo = activePlayers.find(p => p.id === s.player_id);
        const docId = `nba-${s.player_id}-2025`;
        const ref = db.collection(TARGET_COLLECTION).doc(docId);

        batch.set(ref, {
          player: `${pInfo.first_name} ${pInfo.last_name}`,
          team: team.abbreviation,
          league: 'nba',
          season: 2025,
          playerAvg: s.pts || 0,
          rebAvg: s.reb || 0,
          astAvg: s.ast || 0,
          prop: 'Points', // Default category
          confidenceScore: 0.7, // Manual entries/syncs get a base score
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      });

      await batch.commit();
      console.log(`✅ Synced ${stats.length} players for ${team.abbreviation}`);
      
      // Wait to respect the 12s rate limit (5 requests per minute)
      await new Promise(r => setTimeout(r, 12000));
    }

  } catch (error) {
    console.error("❌ Sync Error:", error.response?.data || error.message);
  }
}

syncActivePlayers();