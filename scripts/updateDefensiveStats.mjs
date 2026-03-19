// scripts/updateDefensiveStats.mjs
import { db } from '../lib/firebase/config.js';
import { collection, doc, setDoc, getDocs } from 'firebase/firestore';

/**
 * Logic: For a specific team, find every game they played.
 * Then, find every opponent player's stats in those games.
 * Sum them up and divide by total games to get "Allowed Per Game".
 */

async function updateDefensiveStats(teamId, abbrev, season = 2025) {
  console.log(`--- Syncing Defense: ${abbrev} (ID: ${teamId}) for ${season} ---`);
  
  try {
    // 1. Get all "Final" games for this team
    const gamesRes = await fetch(
      `https://api.balldontlie.io/v1/games?seasons[]=${season}&team_ids[]=${teamId}`,
      { headers: { Authorization: process.env.BDL_API_KEY } }
    );
    const { data: games } = await gamesRes.json();
    const completedGames = games.filter(g => g.status === 'Final');

    if (completedGames.length === 0) {
      console.log(`⚠️ No games found for ${abbrev} in ${season}.`);
      return;
    }

    let totals = { 
      pts: 0, 
      reb: 0, 
      ast: 0, 
      fg3m: 0, 
      gamesPlayed: completedGames.length 
    };

    // 2. Loop through each game to get box scores
    for (const game of completedGames) {
      // Small delay between game stats calls to avoid 429s
      await new Promise(resolve => setTimeout(resolve, 2000)); 

      const statsRes = await fetch(
        `https://api.balldontlie.io/v1/stats?game_ids[]=${game.id}`,
        { headers: { Authorization: process.env.BDL_API_KEY } }
      );
      const { data: playerStats } = await statsRes.json();

      // 3. Filter for OPPOSING team players only
      const opponentStats = playerStats.filter(s => s.team.id !== teamId);

      opponentStats.forEach(stat => {
        totals.pts += stat.pts || 0;
        totals.reb += stat.reb || 0;
        totals.ast += stat.ast || 0;
        totals.fg3m += stat.fg3m || 0;
      });
    }

    // 4. Construct Defense Document
    const defenseDoc = {
      teamId,
      abbrev,
      season,
      gamesCount: totals.gamesPlayed,
      // Metrics Allowed (The "Defense" Stat)
      avgPtsAllowed: parseFloat((totals.pts / totals.gamesPlayed).toFixed(2)),
      avgRebAllowed: parseFloat((totals.reb / totals.gamesPlayed).toFixed(2)),
      avgAstAllowed: parseFloat((totals.ast / totals.gamesPlayed).toFixed(2)),
      avgThreesAllowed: parseFloat((totals.fg3m / totals.gamesPlayed).toFixed(2)),
      // Combo helpers for your engine
      avgPtsRebAllowed: parseFloat(((totals.pts + totals.reb) / totals.gamesPlayed).toFixed(2)),
      avgPtsAstAllowed: parseFloat(((totals.pts + totals.ast) / totals.gamesPlayed).toFixed(2)),
      lastUpdated: new Date().toISOString()
    };

    // 5. Save to Firestore (Doc ID: PHI_2025)
    const docRef = doc(db, 'nba_defense_stats', `${abbrev}_${season}`);
    await setDoc(docRef, defenseDoc);

    console.log(`✅ ${abbrev} Stats: Pts: ${defenseDoc.avgPtsAllowed} | 3s: ${defenseDoc.avgThreesAllowed}`);
    return defenseDoc;

  } catch (error) {
    console.error(`❌ Error for ${abbrev}:`, error);
  }
}

/**
 * Bulk Sync: Pulls all teams from your registry and runs the update
 */
async function syncAllNbaDefense(season = 2025) {
  console.log("🚀 Starting Global NBA Defensive Sync...");
  
  try {
    const teamsSnapshot = await getDocs(collection(db, 'nba_teams'));
    const teams = teamsSnapshot.docs.map(d => d.data());

    for (const team of teams) {
      await updateDefensiveStats(team.id, team.abbrev, season);
      
      // Mandatory wait for BDL Free Tier (5 requests per minute)
      // 15-20 seconds ensures we don't get banned during a long loop
      console.log("⏳ Waiting 15s for rate limit...");
      await new Promise(r => setTimeout(r, 15000));
    }

    console.log("🏁 All NBA Defensive Stats are in the Database.");
  } catch (err) {
    console.error("Global Sync Failed:", err);
  }
}

// export and optional immediate run
export { updateDefensiveStats, syncAllNbaDefense };

// To run: node scripts/updateDefensiveStats.mjs
// syncAllNbaDefense(2025);