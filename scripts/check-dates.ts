// scripts/check-dates.ts
import { config } from 'dotenv';
import { resolve } from 'path';
config({ path: resolve(__dirname, '../.env.local') });

import { adminDb } from '../src/lib/firebase/admin';

async function checkDates() {
  const db = adminDb;
  
  console.log('\n📊 Checking 2025_bets dates...\n');
  
  const snapshot = await db.collection('2025_bets').limit(5).get();
  
  snapshot.forEach(doc => {
    const data = doc.data();
    console.log('Doc:', doc.id);
    console.log('  date:', data.date, typeof data.date);
    console.log('  createdAt:', data.createdAt, typeof data.createdAt);
    console.log('  playerteam:', data.playerteam);
    console.log('  prop:', data.prop);
    console.log('  line:', data.line);
    console.log('---');
  });
  
  process.exit(0);
}

checkDates();