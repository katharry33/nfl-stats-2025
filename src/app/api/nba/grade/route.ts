// src/app/api/nba/grade/route.ts
//
// POST /api/nba/grade  { date: "YYYY-MM-DD", season: 2025 }
// GET  /api/nba/grade?date=YYYY-MM-DD&season=2025
//
// Uses BBRef game logs (not BDL) to look up actual stats — free, no API key needed.
// Flow:
//   1. Load all props for the date from nbaProps_{season}
//   2. Group by brid (BBRef player ID)
//   3. Fetch each player's season game log from BBRef
//   4. Find the row matching the game date
//   5. Grade each prop and write results back
//   6. Also migrate any remaining nbaPropsDaily docs for this date
//   7. Update bettingLog leg statuses

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { fetchNBASeasonLog, getNBAStatFromGame } from '@/lib/enrichment/nba/bball';
import { normalizeNBAProp } from '@/lib/enrichment/nba/normalize-nba';
import { determineResult, calculateProfitLoss } from '@/lib/enrichment/shared/scoring';
import type { BRGame } from '@/lib/enrichment/types';

export const dynamic     = 'force-dynamic';
export const maxDuration = 300; // BBRef fetches take time — allow 5 min

// ─── Resolve date for daily docs ──────────────────────────────────────────────

function resolveDailyDocDate(data: Record<string, any>): string {
  if (data.gameDate)   return data.gameDate.split('T')[0];
  if (data.lastUpdated) return data.lastUpdated.split('T')[0];
  if (data.updatedAt)  return data.updatedAt.split('T')[0];
  return '';
}

// ─── Grade a single prop using a BRGame row ───────────────────────────────────

function gradePropFromGame(
  data:    Record<string, any>,
  game:    BRGame,
): Record<string, any> | null {
  const propNorm  = normalizeNBAProp(data.prop ?? '');
  const line      = Number(data.line ?? 0);
  const overUnder = data.overUnder ?? data.type ?? 'Over';

  const stat = getNBAStatFromGame(game, propNorm);
  if (stat === null) return null;

  const result = determineResult(stat, line, overUnder);

  const update: Record<string, any> = {
    gameStat:     stat,
    actualResult: result,
    gradedAt:     new Date().toISOString(),
    source:       'bbref',
    ...(data.playerAvg != null
      ? { scoreDiff: Math.round((Number(data.playerAvg) - line) * 10) / 10 }
      : {}),
  };

  if (data.betAmount && data.bestOdds) {
    update.profitLoss = calculateProfitLoss(data.betAmount, data.bestOdds, result);
  }

  return update;
}

// ─── Core grading logic ───────────────────────────────────────────────────────

async function gradeWithBBRef(date: string, season: number, force: boolean) {
  const dailyCol = `nbaPropsDaily_${season}`;
  const permCol  = `nbaProps_${season}`;
  const now      = new Date().toISOString();

  let migrated    = 0;
  let gradedPerm  = 0;
  let noBrid      = 0;
  let noGameRow   = 0;
  let brFetches   = 0;

  // ── Step 1: Migrate any remaining nbaPropsDaily docs for this date ─────────
  const allDailySnap = await adminDb.collection(dailyCol).limit(1000).get();
  const dailyDocs = allDailySnap.docs.filter(doc =>
    resolveDailyDocDate(doc.data()) === date
  );

  console.log(`📋 Daily: ${dailyDocs.length} docs to migrate for ${date}`);

  if (dailyDocs.length > 0) {
    let wb = adminDb.batch(), db = adminDb.batch();
    let wc = 0, dc = 0;

    for (const doc of dailyDocs) {
      const data     = doc.data();
      const playerKey = (data.player ?? '').toLowerCase().trim();
      const propNorm  = normalizeNBAProp(data.prop ?? '');
      const line      = data.line ?? 0;
      const ou        = (data.overUnder ?? data.type ?? '').toLowerCase();
      const slug      = playerKey.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const permDocId = `nba-${slug}-${propNorm}-${line}-${ou}-${date}`;

      const permDoc: Record<string, any> = {
        ...data,
        league:    data.league    ?? 'nba',
        season,
        gameDate:  date,
        prop:      propNorm,
        overUnder: data.overUnder ?? data.type  ?? null,
        odds:      data.odds      ?? data.price ?? null,
        bestOdds:  data.bestOdds  ?? data.odds  ?? data.price ?? null,
        migratedFrom: dailyCol,
        migratedAt:   now,
        updatedAt:    now,
      };
      delete permDoc.type; delete permDoc.price;
      delete permDoc.gameId; delete permDoc.lastUpdated;

      wb.set(adminDb.collection(permCol).doc(permDocId), permDoc, { merge: true });
      db.delete(doc.ref);
      wc++; dc++; migrated++;

      if (wc >= 400) { await wb.commit(); wb = adminDb.batch(); wc = 0; }
      if (dc >= 400) { await db.commit(); db = adminDb.batch(); dc = 0; }
    }
    if (wc > 0) await wb.commit();
    if (dc > 0) await db.commit();
    console.log(`✅ Migrated ${migrated} docs → ${permCol}`);
  }

  // ── Step 2: Load all props for this date from nbaProps_{season} ───────────
  let permQuery: FirebaseFirestore.Query = adminDb.collection(permCol)
    .where('gameDate', '==', date);
  if (!force) permQuery = permQuery.where('actualResult', '==', null);

  const permSnap = await permQuery.get();
  console.log(`📋 Perm: ${permSnap.size} props to grade for ${date}`);

  if (permSnap.empty) {
    return { migrated, gradedPerm, noBrid, noGameRow, brFetches };
  }

  // ── Step 3: Group by brid ─────────────────────────────────────────────────
  // Build map: brid → list of prop docs
  interface PropDoc { docId: string; data: Record<string, any> }
  const byBrid = new Map<string, PropDoc[]>();
  const noBridDocs: PropDoc[] = [];

  for (const doc of permSnap.docs) {
    const d    = doc.data();
    const brid = (d.brid ?? '').trim();
    if (!brid || brid === 'VERIFY') {
      noBridDocs.push({ docId: doc.id, data: d });
      noBrid++;
      continue;
    }
    if (!byBrid.has(brid)) byBrid.set(brid, []);
    byBrid.get(brid)!.push({ docId: doc.id, data: d });
  }

  console.log(`\n👤 ${byBrid.size} unique players to fetch from BBRef`);
  console.log(`⚠️  ${noBrid} props skipped — no brid`);

  // ── Step 4: Fetch BBRef game logs and grade ────────────────────────────────
  // BBRef ending year: season=2025 → 2025-26 → endYear=2026
  const endYear = season + 1;

  const updates: Array<{ docId: string; data: Record<string, any> }> = [];

  for (const [brid, propDocs] of byBrid) {
    const playerName = propDocs[0]?.data?.player ?? brid;
    console.log(`\n  📥 ${playerName} (${brid})`);

    let games: BRGame[];
    try {
      games = await fetchNBASeasonLog(playerName, brid, season);
      brFetches++;
    } catch (err: any) {
      console.warn(`  ⚠️  BBRef fetch failed: ${err.message}`);
      noGameRow += propDocs.length;
      continue;
    }

    // Find the game row matching our date
    const gameRow = games.find(g => g.date === date);

    if (!gameRow) {
      console.log(`  ⚠️  No game row for ${date} (${games.length} total games)`);
      noGameRow += propDocs.length;
      continue;
    }

    console.log(`  ✅ Found game: pts=${gameRow.pts} ast=${gameRow.ast} reb=${gameRow.reb}`);

    // Grade all props for this player
    for (const { docId, data } of propDocs) {
      const grades = gradePropFromGame(data, gameRow);
      if (!grades) { noGameRow++; continue; }

      const propNorm = normalizeNBAProp(data.prop ?? '');
      console.log(
        `    ${grades.actualResult === 'won' ? '✅' : '❌'} ` +
        `${propNorm.padEnd(12)} actual=${grades.gameStat} line=${data.line} ${grades.actualResult}`
      );

      updates.push({ docId, data: grades });
      gradedPerm++;
    }

    // Polite delay between players to avoid BBRef rate limiting
    await sleep(2000);
  }

  // ── Step 5: Batch write grades ────────────────────────────────────────────
  if (updates.length > 0) {
    console.log(`\n💾 Writing ${updates.length} grades...`);
    let batch = adminDb.batch();
    let count = 0;

    for (const { docId, data } of updates) {
      batch.update(adminDb.collection(permCol).doc(docId), data);
      count++;
      if (count >= 400) {
        await batch.commit();
        batch = adminDb.batch();
        count = 0;
      }
    }
    if (count > 0) await batch.commit();
  }

  // ── Step 6: Sync bettingLog ───────────────────────────────────────────────
  await gradeBettingLog(date, byBrid, season);

  return { migrated, gradedPerm, noBrid, noGameRow, brFetches };
}

// ─── bettingLog sync ──────────────────────────────────────────────────────────

async function gradeBettingLog(
  date:    string,
  byBrid:  Map<string, { docId: string; data: Record<string, any> }[]>,
  season:  number,
) {
  const betSnap = await adminDb.collection('bettingLog')
    .where('league', '==', 'nba')
    .where('status', '==', 'pending')
    .get();

  if (betSnap.empty) return;

  // Build stat lookup: brid → BRGame (we already have this from the grade pass)
  // Re-fetch is cheap since BBRef caches in-process
  const endYear   = season + 1;
  const gameCache = new Map<string, BRGame | null>();

  const batch = adminDb.batch();
  let updated = 0;

  for (const doc of betSnap.docs) {
    const bet  = doc.data();
    const legs = (bet.legs ?? bet.selections ?? []) as any[];
    if (!legs.length) continue;

    const hasLegsForDate = legs.some((l: any) =>
      (l.gameDate ?? '').toString().split('T')[0] === date
    );
    if (!hasLegsForDate) continue;

    let anyPending = false, anyLost = false, allWon = true;

    const updatedLegs = await Promise.all(legs.map(async (leg: any) => {
      const ld = (leg.gameDate ?? '').toString().split('T')[0];
      if (ld !== date) {
        if (leg.status === 'pending') anyPending = true;
        if (leg.status === 'lost')    anyLost    = true;
        if (leg.status !== 'won')     allWon     = false;
        return leg;
      }

      const brid = (leg.brid ?? '').trim();
      if (!brid || brid === 'VERIFY') { anyPending = true; allWon = false; return leg; }

      // Get game row (cached)
      if (!gameCache.has(brid)) {
        try {
          const games = await fetchNBASeasonLog(leg.player ?? brid, brid, season);
          gameCache.set(brid, games.find(g => g.date === date) ?? null);
        } catch {
          gameCache.set(brid, null);
        }
        await sleep(1500);
      }

      const gameRow = gameCache.get(brid);
      if (!gameRow) { anyPending = true; allWon = false; return leg; }

      const propNorm = normalizeNBAProp(leg.prop ?? '');
      const stat     = getNBAStatFromGame(gameRow, propNorm);
      if (stat === null) { anyPending = true; allWon = false; return leg; }

      const result = determineResult(
        stat,
        Number(leg.line ?? 0),
        leg.selection ?? leg.overUnder ?? 'Over',
      );
      if (result === 'lost') { anyLost = true; allWon = false; }
      return { ...leg, status: result, gameStat: stat };
    }));

    const betStatus = anyLost ? 'lost' : allWon ? 'won' : anyPending ? 'pending' : 'void';
    if (betStatus !== 'pending') {
      batch.update(doc.ref, {
        legs:      updatedLegs,
        status:    betStatus,
        updatedAt: new Date().toISOString(),
      });
      updated++;
    }
  }

  if (updated > 0) {
    await batch.commit();
    console.log(`✅ bettingLog: ${updated} bets graded`);
  }
}

// ─── Route handlers ───────────────────────────────────────────────────────────

async function handle(date: string, season: number, force: boolean) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date — use YYYY-MM-DD' }, { status: 400 });
  }

  console.log(`\n🏀 NBA Grade (BBRef) — ${date} season=${season} force=${force}`);
  const result = await gradeWithBBRef(date, season, force);

  return NextResponse.json({ success: true, date, season, ...result });
}

export async function POST(req: NextRequest) {
  try {
    const body   = await req.json();
    const date   = body.date   ?? new Date().toISOString().split('T')[0];
    const season = Number(body.season ?? 2025);
    const force  = body.force  ?? false;
    return handle(date, season, force);
  } catch (err: any) {
    console.error('❌ NBA grade POST:', err);
    return NextResponse.json({ error: err.message ?? 'Grade failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const date   = searchParams.get('date')   ?? new Date().toISOString().split('T')[0];
    const season = Number(searchParams.get('season') ?? 2025);
    const force  = searchParams.get('force')  === 'true';
    return handle(date, season, force);
  } catch (err: any) {
    console.error('❌ NBA grade GET:', err);
    return NextResponse.json({ error: err.message ?? 'Grade failed' }, { status: 500 });
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }