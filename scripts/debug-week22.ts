import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { getAdminDb } from '../src/lib/firebase/admin';

async function debugWeek22() {
  try {
    const db = getAdminDb();
    const collection = 'allProps_2025';
    
    console.log(`\n🔍 Debugging Week 22 in ${collection}...\n`);
    
    // Check total docs
    const total = await db.collection(collection).limit(1).get();
    console.log(`✓ Collection exists: ${total.size > 0}`);
    
    // Try different week 22 queries
    const queries = [
      { desc: 'week (lowercase) == 22 (number)', query: db.collection(collection).where('week', '==', 22) },
      { desc: 'Week (capital) == 22 (number)', query: db.collection(collection).where('Week', '==', 22) },
      { desc: 'week (lowercase) == "22" (string)', query: db.collection(collection).where('week', '==', '22') },
      { desc: 'Week (capital) == "22" (string)', query: db.collection(collection).where('Week', '==', '22') },
    ];
    
    for (const { desc, query } of queries) {
      try {
        const snapshot = await query.limit(5).get();
        console.log(`${desc}: ${snapshot.size} results`);
        
        if (snapshot.size > 0) {
          const sample = snapshot.docs[0].data();
          console.log('  Sample:', {
            player: sample.player || sample.Player,
            week: sample.week || sample.Week,
            prop: sample.prop || sample.Prop,
          });
        }
      } catch (err: any) {
        console.log(`${desc}: ERROR - ${err.message}`);
      }
    }
    
    // Get all unique weeks
    console.log('\n📊 Checking all weeks in collection...\n');
    const allDocs = await db.collection(collection).select('week', 'Week').limit(1000).get();
    const weeks = new Set();
    
    allDocs.forEach(doc => {
      const data = doc.data();
      const w = data.week || data.Week;
      if (w !== undefined) weeks.add(`${w} (${typeof w})`);
    });
    
    console.log('Available weeks:', Array.from(weeks).sort());
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

debugWeek22();
