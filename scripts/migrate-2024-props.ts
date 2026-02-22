// scripts/migrate-2024-props.ts
//
// ONE-TIME migration: weeklyProps_2024 → allProps_2024
//
// Usage:
//   tsx scripts/migrate-2024-props.ts
//   tsx scripts/migrate-2024-props.ts --dry-run        # preview without writing
//   tsx scripts/migrate-2024-props.ts --source=weeklyProps_2024 --dest=allProps_2024
//
// Requires: GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_KEY env var

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp, WriteBatch } from 'firebase-admin/firestore';

// ── Firebase init ─────────────────────────────────────────────────────────────
if (!getApps().length) {
  const serviceAccountKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (serviceAccountKey) {
    initializeApp({ credential: cert(JSON.parse(serviceAccountKey)) });
  } else {
    // Falls back to GOOGLE_APPLICATION_CREDENTIALS file path
    initializeApp();
  }
}

const db = getFirestore();
const BATCH_SIZE = 400; // Firestore max is 500; keep buffer

// ── CLI args ──────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const sourceArg = args.find(a => a.startsWith('--source='))?.split('=')[1];
const destArg   = args.find(a => a.startsWith('--dest='))?.split('=')[1];

const SOURCE_COLLECTION = sourceArg ?? 'weeklyProps_2024';
const DEST_COLLECTION   = destArg   ?? 'allProps_2024';

// ── Field normalizer ──────────────────────────────────────────────────────────
// Apps Script exports can have PascalCase fields (Player, Matchup, Prop, etc.)
// or camelCase depending on when the sheet was exported. This flattens all
// variants into a single consistent shape matching allProps_2025.

function normalizeDoc(raw: any, sourceId: string): Record<string, any> {
  // Helper: try multiple key variants, return first defined value
  const get = (...keys: string[]): any => {
    for (const k of keys) {
      if (raw[k] !== undefined && raw[k] !== null && raw[k] !== '') return raw[k];
    }
    return null;
  };

  // Parse line — may be a number or a string like "45.5"
  const rawLine = get('line', 'Line');
  const line = rawLine !== null ? parseFloat(String(rawLine)) : null;

  // Parse week
  const rawWeek = get('week', 'Week');
  const week = rawWeek !== null ? parseInt(String(rawWeek), 10) : null;

  // Odds — may be stored as number or american string
  const parseOdds = (v: any): number | null => {
    if (v === null || v === undefined || v === '') return null;
    if (typeof v === 'number') return v;
    const n = parseFloat(String(v).replace('+', ''));
    return isNaN(n) ? null : n;
  };

  const normalized: Record<string, any> = {
    // Core identity
    player:   get('player', 'Player')   ?? 'Unknown',
    team:     get('team', 'Team')       ?? '',
    prop:     get('prop', 'Prop')       ?? '',
    line:     isNaN(line as number) ? null : line,
    matchup:  get('matchup', 'Matchup') ?? '',
    week:     isNaN(week as number) ? null : week,

    // Date fields — normalize to string
    gameDate: get('gameDate', 'GameDate', 'game_date', 'date') ?? null,
    gameTime: get('gameTime', 'GameTime', 'game_time')         ?? null,

    // Selection
    overunder: get('overunder', 'Over/Under?', 'overUnder', 'selection') ?? '',

    // Odds
    odds:     parseOdds(get('odds', 'Odds'))         ?? null,
    fdOdds:   parseOdds(get('fdOdds', 'FD Odds'))    ?? null,
    dkOdds:   parseOdds(get('dkOdds', 'DK Odds'))    ?? null,
    bestOdds: parseOdds(get('bestOdds', 'Best Odds')) ?? null,
    bestBook: get('bestBook', 'Best Book')             ?? null,

    // Enrichment / analytics
    playerAvg:          toNum(get('playerAvg', 'Player Avg', 'playeravg')),
    opponentRank:       toNum(get('opponentRank', 'Opp Rank', 'oppRank')),
    opponentAvgVsStat:  toNum(get('opponentAvgVsStat', 'Opp Avg')),
    seasonHitPct:       toNum(get('seasonHitPct', 'Season Hit Pct', 'hitPct')),
    projWinPct:         toNum(get('projWinPct', 'Proj Win Pct')),
    avgWinProb:         toNum(get('avgWinProb', 'Avg Win Prob')),
    confidenceScore:    toNum(get('confidenceScore', 'Confidence Score')),
    bestEdgePct:        toNum(get('bestEdgePct', 'Best Edge Pct')),

    // Results
    actualResult: get('actualResult', 'Actual Result', 'result') ?? null,
    gameStat:     toNum(get('gameStat', 'Game Stat')),

    // Metadata
    season: 2024,
    sourceId,   // original Firestore doc ID from weeklyProps_2024

    // Timestamps
    migratedAt: Timestamp.now(),
    createdAt:  raw.createdAt instanceof Timestamp ? raw.createdAt : Timestamp.now(),
    updatedAt:  Timestamp.now(),
  };

  // Drop null values to keep docs clean (optional — remove if you want nulls preserved)
  return Object.fromEntries(
    Object.entries(normalized).filter(([, v]) => v !== null)
  );
}

function toNum(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}

// ── Deduplication key ────────────────────────────────────────────────────────
function dedupKey(doc: Record<string, any>): string {
  return `${(doc.player ?? '').toLowerCase()}||${(doc.prop ?? '').toLowerCase()}||${(doc.matchup ?? '').toLowerCase()}||${doc.week ?? ''}`;
}

// ── Main migration ───────────────────────────────────────────────────────────
async function migrate() {
  console.log(`\n🏈 NFL Props Migration`);
  console.log(`   Source: ${SOURCE_COLLECTION}`);
  console.log(`   Dest:   ${DEST_COLLECTION}`);
  console.log(`   Mode:   ${isDryRun ? '🔍 DRY RUN (no writes)' : '✍️  LIVE'}\n`);

  // ── 1. Read all source docs ─────────────────────────────────────────────
  console.log(`📥 Reading ${SOURCE_COLLECTION}...`);
  const sourceSnap = await db.collection(SOURCE_COLLECTION).get();
  const totalSource = sourceSnap.docs.length;
  console.log(`   Found ${totalSource} documents\n`);

  if (totalSource === 0) {
    console.log(`⚠️  Source collection is empty. Nothing to migrate.`);
    return;
  }

  // ── 2. Load existing dest keys to skip duplicates ───────────────────────
  console.log(`🔍 Checking ${DEST_COLLECTION} for existing docs...`);
  const destSnap = await db.collection(DEST_COLLECTION)
    .select('player', 'prop', 'matchup', 'week')
    .get();
  const existingKeys = new Set(
    destSnap.docs.map(d => dedupKey(d.data()))
  );
  console.log(`   ${existingKeys.size} docs already in destination\n`);

  // ── 3. Process + batch write ─────────────────────────────────────────────
  let written = 0;
  let skipped = 0;
  let errors  = 0;

  // Track field coverage for the summary
  const fieldCoverage: Record<string, number> = {};

  const allNormalized: Array<{ key: string; doc: Record<string, any> }> = [];

  for (const snap of sourceSnap.docs) {
    try {
      const raw = snap.data();
      const normalized = normalizeDoc(raw, snap.id);
      const key = dedupKey(normalized);

      // Track which fields are populated
      for (const f of Object.keys(normalized)) {
        fieldCoverage[f] = (fieldCoverage[f] ?? 0) + 1;
      }

      if (existingKeys.has(key)) {
        skipped++;
        continue;
      }

      existingKeys.add(key);
      allNormalized.push({ key, doc: normalized });
    } catch (err) {
      console.error(`  ❌ Error processing ${snap.id}:`, err);
      errors++;
    }
  }

  console.log(`📊 Pre-write summary:`);
  console.log(`   To write:  ${allNormalized.length}`);
  console.log(`   Duplicate: ${skipped}`);
  console.log(`   Errors:    ${errors}\n`);

  if (isDryRun) {
    console.log(`🔍 DRY RUN — Sample of first 3 docs to be written:`);
    allNormalized.slice(0, 3).forEach(({ doc }, i) => {
      console.log(`\n  [${i + 1}] player=${doc.player}, prop=${doc.prop}, week=${doc.week}, matchup=${doc.matchup}`);
      console.log(`       line=${doc.line}, overunder=${doc.overunder}, gameDate=${doc.gameDate}`);
    });

    console.log(`\n📋 Field coverage (fields present in source docs):`);
    const sorted = Object.entries(fieldCoverage).sort(([, a], [, b]) => b - a);
    for (const [field, count] of sorted) {
      const pct = Math.round((count / totalSource) * 100);
      console.log(`   ${field.padEnd(24)} ${count}/${totalSource} (${pct}%)`);
    }

    console.log(`\n✅ Dry run complete. Run without --dry-run to execute.`);
    return;
  }

  // ── Live write in batches ─────────────────────────────────────────────────
  const destRef = db.collection(DEST_COLLECTION);

  for (let i = 0; i < allNormalized.length; i += BATCH_SIZE) {
    const chunk = allNormalized.slice(i, i + BATCH_SIZE);
    const batch: WriteBatch = db.batch();

    for (const { doc } of chunk) {
      batch.set(destRef.doc(), doc);
    }

    await batch.commit();
    written += chunk.length;

    const pct = Math.round((written / allNormalized.length) * 100);
    process.stdout.write(`\r   ✍️  Writing... ${written}/${allNormalized.length} (${pct}%)`);
  }

  console.log(`\n\n✅ Migration complete!`);
  console.log(`   Written:   ${written}`);
  console.log(`   Skipped:   ${skipped} (duplicates)`);
  console.log(`   Errors:    ${errors}`);
  console.log(`\n   Collection: ${DEST_COLLECTION} now has ${destSnap.docs.length + written} total docs`);
}

migrate().catch(err => {
  console.error('\n❌ Migration failed:', err);
  process.exit(1);
});