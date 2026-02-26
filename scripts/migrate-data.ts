import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function migrate() {
  // Dynamic import to ensure env vars are loaded first
  const { adminDb } = await import('../src/lib/firebase/admin');

  // CRITICAL: Tells Firestore to ignore 'undefined' instead of crashing
  adminDb.settings({ ignoreUndefinedProperties: true });

  const bulkWriter = adminDb.bulkWriter();

  // 1. Unified Betting Log Migration
  // Note: Added the space in '2025 bets' based on your terminal output
  const betSources = ['betting_logs', '2025 bets'];
  const betDest = 'bettingLog';

  console.log('🚀 Migrating Bets...');

  for (const source of betSources) {
    const snap = await adminDb.collection(source).get();
    console.log(`- ${source}: Found ${snap.size} docs`);

    snap.docs.forEach(doc => {
      const data = doc.data();
      const normalizedBet = {
        ...data,
        stake: Number(data.stake || data.betAmount || 0),
        status: data.status || 'pending',
        legs: Array.isArray(data.legs) ? data.legs : [{
          player: data.player || data.playerteam || 'Unknown Player',
          prop: data.prop || 'N/A',
          line: data.line || '0',
          selection: data.selection || '',
          status: data.status || 'pending',
          matchup: data.matchup || 'N/A'
        }],
        migratedFrom: source,
        updatedAt: new Date().toISOString()
      };
      bulkWriter.set(adminDb.collection(betDest).doc(doc.id), normalizedBet, { merge: true });
    });
  }

  // 2. Unified Historical Props Migration
  const propSources = ['allProps', 'allProps_2025', 'weeklyProps_2024', 'weeklyProps_2025'];
  const propDest = 'allProps';

  console.log('🚀 Migrating Props...');

  for (const source of propSources) {
    const snap = await adminDb.collection(source).get();
    console.log(`- ${source}: Found ${snap.size} docs`);

    snap.docs.forEach(doc => {
      const data = doc.data();
      
      // Fallback values to prevent "undefined" Firestore errors
      const player = data.player || data.playerteam || 'Unknown Player';
      const propType = data.prop || 'Unknown Prop';
      const week = data.week || 0;
      const line = data.line || 0;

      // Stable unique ID for deduplication
      const playerKey = player.toLowerCase().replace(/\s+/g, '_');
      const propKey = propType.toLowerCase().replace(/\s+/g, '_');
      const uniqueId = `${playerKey}_${propKey}_w${week}_${line}`.replace(/[^a-z0-9_]/g, '');

      bulkWriter.set(adminDb.collection(propDest).doc(uniqueId), {
        ...data,
        player,
        prop: propType,
        week: Number(week),
        line: line,
        migratedFrom: source,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    });
  }

  await bulkWriter.close();
  console.log('✅ Migration successfully completed!');
}

migrate().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});