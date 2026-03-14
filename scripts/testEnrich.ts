#!/usr/bin/env tsx
// scripts/testEnrich.ts — directly calls enrichAllPropsCollection with full error output
import 'dotenv/config';

async function main() {
  console.log('Step 1: importing db...');
  const { db } = await import('@/lib/firebase/admin');
  console.log('Step 2: db imported, testing connection...');
  const snap = await db.collection('allProps_2025').where('week', '==', 2).limit(1).get();
  console.log(`Step 3: query ok — ${snap.size} docs`);
  if (!snap.empty) {
    const d = snap.docs[0].data();
    console.log('Step 4: sample doc fields:', Object.keys(d).join(', '));
    console.log('  week field:', d.week, typeof d.week);
    console.log('  player:', d.player ?? d.Player);
  }

  console.log('Step 5: importing enrichAllPropsCollection...');
  const { enrichAllPropsCollection } = await import('@/lib/enrichment/enrichProps');
  console.log('Step 6: calling enrichAllPropsCollection...');
  const count = await enrichAllPropsCollection({ season: 2025, week: 2, skipEnriched: false });
  console.log(`Step 7: done — ${count} props updated`);
  process.exit(0);
}

main().catch(e => {
  console.error('❌ CRASH:', e);
  process.exit(1);
});