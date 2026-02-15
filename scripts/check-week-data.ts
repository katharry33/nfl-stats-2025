// scripts/check-week-data.ts
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(__dirname, '../.env.local') });

import { getAdminDb } from '../src/lib/firebase/admin';

async function checkWeekData() {
  try {
    const db = getAdminDb();
    const collection = 'allProps_2025';
    
    console.log(`\n🔍 Checking ${collection} collection...\n`);
    
    // Get sample documents
    const sampleDocs = await db.collection(collection).limit(5).get();
    
    console.log('📄 Sample document structures:');
    // Cast sampleDocs to an array if you need the index
(sampleDocs as any).docs.forEach((doc: any, index: number) => {
    const data = doc.data();
      console.log(`\nDoc ${index + 1}:`, {
        id: doc.id,
        week: data.week,
        Week: data.Week,
        player: data.player,
        team: data.team,
        allFields: Object.keys(data),
      });
    });
    
    // Check for Week 22 specifically
    console.log('\n\n🔍 Searching for Week 22 data...\n');
    
    const week22Lowercase = await db.collection(collection)
      .where('week', '==', 22)
      .limit(5)
      .get();
    console.log(`Week 22 (lowercase 'week'): ${week22Lowercase.size} documents`);
    
    const week22Capital = await db.collection(collection)
      .where('Week', '==', 22)
      .limit(5)
      .get();
    console.log(`Week 22 (capital 'Week'): ${week22Capital.size} documents`);
    
    const week22String = await db.collection(collection)
      .where('week', '==', '22')
      .limit(5)
      .get();
    console.log(`Week 22 (string "22"): ${week22String.size} documents`);
    
    // Check what weeks exist
    console.log('\n\n📊 Checking available weeks...\n');
    const allDocs = await db.collection(collection).limit(500).get();
    const weeks = new Set<any>();
    const weekTypes = new Map<string, number>();
    
    allDocs.forEach(doc => {
      const data = doc.data();
      const weekValue = data.week || data.Week;
      if (weekValue !== undefined) {
        weeks.add(weekValue);
        const type = typeof weekValue;
        weekTypes.set(type, (weekTypes.get(type) || 0) + 1);
      }
    });
    
    console.log('Available weeks:', Array.from(weeks).sort((a, b) => Number(a) - Number(b)));
    console.log('\nWeek field types:');
    weekTypes.forEach((count, type) => {
      console.log(`  ${type}: ${count} documents`);
    });
    
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkWeekData();