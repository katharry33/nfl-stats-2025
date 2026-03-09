import 'dotenv/config';
import { db } from '@/lib/firebase/admin';
import { getPfrIdMap } from '@/lib/enrichment/firestore';
import { getPfrId, fetchSeasonLog } from '@/lib/enrichment/pfr';

async function debug() {
  console.log("🔍 Starting Debug Sync...");

  // 1. Check DB Connection
  if (!db) {
    console.error("❌ Firestore DB not initialized. Check your .env");
    return;
  }
  console.log("✅ Firestore Connected.");

  // 2. Pull ONE sample prop from AllProps
  const sample = await db.collection('allProps_2025').limit(1).get();
  if (sample.empty) {
    console.error("❌ No data found in 'allProps_2025'. Is the collection name correct?");
    return;
  }
  
  const data = sample.docs[0].data();
  console.log(`✅ Found sample prop: ${data.player} | Week ${data.week} | ${data.prop}`);

  // 3. Check PFR ID Mapping
  const pfrIdMap = await getPfrIdMap();
  const pfrId = await getPfrId(data.player, pfrIdMap);
  
  if (!pfrId) {
    console.error(`❌ Could not find PFR ID for ${data.player}. Check your PFR ID Map.`);
    return;
  }
  console.log(`✅ Found PFR ID: ${pfrId}`);

  // 4. Test External Scraping
  console.log(`📡 Attempting to fetch logs for ${data.player} (Season 2025)...`);
  try {
    const logs = await fetchSeasonLog(data.player, pfrId, 2025);
    console.log(`✅ Successfully fetched ${logs.length} games.`);
    
    const weekGame = logs.find(g => g.week === data.week);
    if (weekGame) {
      console.log(`✅ Found game for Week ${data.week}:`, weekGame);
    } else {
      console.warn(`⚠️  Logs fetched, but no game found for Week ${data.week}.`);
    }
  } catch (err) {
    console.error("❌ Failed to fetch logs from PFR:", err);
  }
}

debug().catch(console.error);