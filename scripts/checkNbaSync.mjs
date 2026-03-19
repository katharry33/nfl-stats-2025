import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./serviceAccountKey.json', 'utf8'));
if (process.env.NODE_ENV !== 'production') {
    initializeApp({ credential: cert(serviceAccount) });
}
const db = getFirestore();

async function verifySchedule() {
  console.log("🔍 Running NBA Schedule Health Check...");
  
  const seasons = [2024, 2025];
  
  for (const season of seasons) {
    const snapshot = await db.collection('static_nba_schedule')
      .where('season', '==', season)
      .get();

    const count = snapshot.size;
    const expected = 1230;

    console.log(`\n--- Season: ${season} ---`);
    console.log(`📊 Total Games Found: ${count}`);

    if (count === 0) {
      console.log("❌ Status: Empty. Run the sync script.");
    } else if (count === expected) {
      console.log("✅ Status: Perfect! Exactly 1,230 regular season games.");
    } else if (count < expected) {
      console.log(`⚠️ Status: Under-synced. Missing ${expected - count} games.`);
    } else {
      console.log(`🚨 Status: Bloated! Found ${count - expected} extra games. Check for preseason data.`);
    }
  }
}

verifySchedule();