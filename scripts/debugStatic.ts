#!/usr/bin/env tsx
import 'dotenv/config';
import { db } from '@/lib/firebase/admin';

async function main() {
  // Check static season stats
  const snap = await db.collection('static_playerSeasonStats')
    .where('season', '==', 2024)
    .limit(5)
    .get();

  console.log(`\n📊 static_playerSeasonStats (2024): ${snap.size} docs found`);
  snap.docs.forEach(d => console.log(' -', d.id, JSON.stringify(d.data())));

  // Check a specific player
  const lockett = await db.collection('allProps_2025')
    .where('week', '==', 1)
    .get();

  const lDoc = lockett.docs.find(d => {
    const p = d.data().player ?? d.data().Player ?? '';
    return p.toLowerCase().includes('lockett');
  });

  if (lDoc) {
    console.log('\n🔍 Tyler Lockett week 1 doc:');
    console.log(JSON.stringify(lDoc.data(), null, 2));
  } else {
    console.log('\n⚠️  No Tyler Lockett doc found in allProps_2025 week 1');
  }

  // Show a sample of week 1 docs to see field names
  console.log('\n📋 Sample week 1 doc fields:');
  const sample = lockett.docs[0];
  if (sample) console.log(JSON.stringify(sample.data(), null, 2));

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });