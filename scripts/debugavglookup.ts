#!/usr/bin/env tsx
// scripts/debugAvgLookup.ts — tests getPlayerSeasonAvg for common players
import 'dotenv/config';
import { db } from '@/lib/firebase/admin';

function nameToDocKey(name: string): string {
  return name
    .replace(/'/g, '')
    .replace(/\./g, '_')
    .replace(/\s+/g, '_')
    .replace(/__+/g, '__');
}

const TEST_CASES = [
  { player: 'Derrick Henry', prop: 'rush_yds', season: 2024 },
  { player: 'Aj Brown',      prop: 'rec_yds',  season: 2024 },
  { player: 'AJ Brown',      prop: 'rec_yds',  season: 2024 },
  { player: 'CeeDee Lamb',   prop: 'rec_yds',  season: 2024 },
  { player: 'Ceedee Lamb',   prop: 'rec_yds',  season: 2024 },
  { player: 'James Cook',    prop: 'rush_yds', season: 2024 },
  { player: 'Keon Coleman',  prop: 'rec_yds',  season: 2024 },
  { player: 'Tyjohnson',     prop: 'rush_yds', season: 2024 },
  { player: 'Ty Johnson',    prop: 'rush_yds', season: 2024 },
];

async function main() {
  const col = db.collection('static_playerSeasonStats');

  // Show first 5 docs so we can see exact player field values
  const sample = await col.where('season', '==', 2024).limit(10).get();
  console.log('\n📋 Sample static docs (player field values):');
  sample.docs.forEach(d => console.log(' ', d.id, '→ player:', d.data().player));

  console.log('\n🔍 Testing lookups:');
  for (const { player, prop, season } of TEST_CASES) {
    const candidates = [
      `${nameToDocKey(player)}_${season}`,
      `${nameToDocKey(player.replace(/\./g, ''))}_${season}`,
    ];

    let found = false;
    for (const docId of [...new Set(candidates)]) {
      const doc = await col.doc(docId).get();
      if (doc.exists) {
        const val = doc.data()![prop];
        console.log(`  ✅ ${player} (${prop}) → docId: ${docId}, value: ${val}`);
        found = true;
        break;
      }
    }
    if (!found) {
      console.log(`  ❌ ${player} (${prop}) → tried: ${candidates.join(', ')}`);
    }
  }

  process.exit(0);
}

main().catch(e => { console.error(e); process.exit(1); });