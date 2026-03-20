import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import axios from 'axios';

// 1. Manual Initialization (Bypasses the .ts import error)
if (!getApps().length) {
  // Path adjustment: moving from /scripts/nba/ back to root /
  const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

const BDL_API_KEY = '69d21e57-4a04-47ea-bf29-dd63fe1e2a39';
const TODAY = new Date().toISOString().split('T')[0];
const TARGET_COLLECTION = `nbaPropsDaily_2025`;

async function fetchNbaDailyContext() {
  console.log(`📡 Fetching NBA Schedule for: ${TODAY}`);

  try {
    const response = await axios.get('https://api.balldontlie.io/v1/games', {
      headers: { 'Authorization': BDL_API_KEY },
      params: { 'dates[]': TODAY }
    });

    const games = response.data.data;
    if (!games || games.length === 0) {
      console.log("📭 No NBA games scheduled for today.");
      return;
    }

    console.log(`🏀 Found ${games.length} games today.`);
    
    // Extract Team IDs and Matchups
    const activeTeamIds = games.flatMap(g => [g.home_team.id, g.visitor_team.id]);
    
    // Save to Daily Collection
    await db.collection(TARGET_COLLECTION).doc('today_metadata').set({
      date: TODAY,
      games: games.map(g => ({
        id: g.id,
        matchup: `${g.visitor_team.abbreviation} @ ${g.home_team.abbreviation}`,
        time: g.status,
        home_team_id: g.home_team.id,
        visitor_team_id: g.visitor_team.id
      })),
      activeTeamIds,
      lastUpdated: new Date().toISOString()
    });

    console.log(`✅ Daily metadata saved to ${TARGET_COLLECTION}`);
    
    // Log the matchups found
    games.forEach(g => console.log(`   > ${g.visitor_team.full_name} vs ${g.home_team.full_name}`));

  } catch (error) {
    console.error("❌ Schedule Fetch Error:", error.response?.data || error.message);
  }
}

fetchNbaDailyContext();