import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';
import axios from 'axios';

if (!getApps().length) {
  const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
  initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

const BDL_API_KEY = '69d21e57-4a04-47ea-bf29-dd63fe1e2a39';
const TODAY = new Date().toISOString().split('T')[0];
const TARGET_COLLECTION = `nbaPropsDaily_2025`;

async function syncDailyProps() {
  console.log("🎲 Fetching Live NBA Props for Today...");

  try {
    const meta = await db.collection(TARGET_COLLECTION).doc('today_metadata').get();
    if (!meta.exists) {
      console.error("❌ No daily metadata found. Run fetchDailyGames.mjs first!");
      return;
    }
    const { games } = meta.data();

    for (const game of games) {
      console.log(`📡 Fetching props for: ${game.matchup} (ID: ${game.id})`);
      
      const response = await axios.get('https://api.balldontlie.io/v1/nba/player_props', {
        headers: { 'Authorization': BDL_API_KEY }, // This is the BDL standard  
        params: { game_id: game.id }
      });

      const props = response.data.data;
      if (!props || props.length === 0) {
        console.log(`  > No props available yet for ${game.matchup}`);
        continue;
      }

      const batch = db.batch();
      props.forEach(p => {
        // Create a unique ID for this prop today
        const docId = `nba-${p.player.id}-${p.prop_type}-${TODAY}`;
        const ref = db.collection(TARGET_COLLECTION).doc(docId);

        batch.set(ref, {
          id: docId,
          player: `${p.player.first_name} ${p.player.last_name}`,
          team: p.player.team?.abbreviation || 'N/A',
          prop: p.prop_type,
          line: p.line,
          matchup: game.matchup,
          date: TODAY,
          league: 'nba',
          overOdds: p.over_price,
          underOdds: p.under_price,
          lastUpdated: new Date().toISOString()
        }, { merge: true });
      });

      await batch.commit();
      console.log(`✅ Synced ${props.length} props for ${game.matchup}`);
      await new Promise(r => setTimeout(r, 2000)); 
    }
    console.log("🚀 Daily Prop Sync Complete.");
  } catch (error) {
    console.error("❌ Prop Sync Error:", error.response?.data || error.message);
  }
}

syncDailyProps();