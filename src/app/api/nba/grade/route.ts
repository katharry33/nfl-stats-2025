// src/app/api/nba/grade/route.ts
//
// POST /api/nba/grade  { date: "YYYY-MM-DD", season: 2025 }
// GET  /api/nba/grade?date=YYYY-MM-DD&season=2025
//
// What this does in order:
//   1. Check nbaPropsDaily_{season} for docs matching this date
//   2. Grade them using BDL box scores
//   3. Merge/write graded docs into nbaProps_{season} (permanent store)
//   4. Delete graded docs from nbaPropsDaily_{season}
//   5. Also grade any pending docs already in nbaProps_{season} for this date
//   6. Update bettingLog leg statuses

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getNBAStatFromGame } from '@/lib/enrichment/nba/bball';
import { normalizeNBAProp } from '@/lib/enrichment/nba/normalize-nba';
import { determineResult, calculateProfitLoss } from '@/lib/enrichment/shared/scoring';
import type { BRGame } from '@/lib/enrichment/types';

export const dynamic     = 'force-dynamic';
export const maxDuration = 120;

const BDL_BASE = 'https://api.balldontlie.io/v1';
const BDL_API_KEY  = process.env.BDL_API_KEY ?? process.env.BALLDONTLIE_API_KEY ?? '';

// ─── BDL box score fetch ──────────────────────────────────────────────────────

async function fetchBDLStatsForDate(date: string): Promise<Map<number, BRGame>> {
  const gameMap = new Map<number, BRGame>();
  let cursor: number | null = null;

  do {
    const params = new URLSearchParams({ 'dates[]': date, per_page: '100' });
    if (cursor != null) params.set('cursor', String(cursor));

    const res = await fetch(`${BDL_BASE}/stats?${params}`, {
      headers: { Authorization: BDL_API_KEY },
    });

    if (!res.ok) {
      console.error(`❌ BDL stats HTTP ${res.status}`);
      break;
    }

    const json = await res.json();

    for (const s of json.data ?? []) {
      const minStr = String(s.min ?? '').trim();
      if (!minStr || minStr === '0' || minStr.startsWith('0:')) continue;

      gameMap.set(s.player.id, {
        gameNum: 0, date: '',
        pts:  s.pts      ?? 0,
        ast:  s.ast      ?? 0,
        reb:  s.reb      ?? 0,
        orb:  0, drb: 0,
        stl:  s.stl      ?? 0,
        blk:  s.blk      ?? 0,
        tov:  s.turnover ?? 0,
        fg3m: s.fg3m     ?? 0,
        fg3a: 0, fgm: 0, fga: 0, ftm: 0, fta: 0,
        mp:   minStr,
      });
    }

    cursor = json.meta?.next_cursor ?? null;
  } while (cursor != null);

  return gameMap;
}

// ─── Grade a single prop doc ──────────────────────────────────────────────────

function gradeProp(
  data:    Record<string, any>,
  gameMap: Map<number, BRGame>,
): Record<string, any> | null {
  const bdlId    = data.bdlId ?? null;
  const propNorm = normalizeNBAProp(data.prop ?? '');
  const line     = Number(data.line ?? 0);
  const overUnder = data.overUnder ?? 'Over';

  if (!bdlId) return null;

  const game = gameMap.get(Number(bdlId));
  if (!game) return null;

  const stat = getNBAStatFromGame(game, propNorm);
  if (stat === null) return null;

  const result = determineResult(stat, line, overUnder);

  const update: Record<string, any> = {
    gameStat:     stat,
    actualResult: result,
    gradedAt:     new Date().toISOString(),
    ...(data.playerAvg != null
      ? { scoreDiff: Math.round((Number(data.playerAvg) - line) * 10) / 10 }
      : {}),
  };

  if (data.betAmount && data.bestOdds) {
    update.profitLoss = calculateProfitLoss(data.betAmount, data.bestOdds, result);
  }

  return update;
}

// ─── Core grading + migration logic ──────────────────────────────────────────

async function gradeAndMigrate(date: string, season: number, force: boolean) {
  const dailyCol = `nbaPropsDaily_${season}`;
  const permCol  = `nbaProps_${season}`;
  const now      = new Date().toISOString();

  // Fetch BDL box scores once
  const gameMap = await fetchBDLStatsForDate(date);
  console.log(`📡 BDL: ${gameMap.size} player rows for ${date}`);

  let migrated = 0;
  let gradedDaily = 0;
  let gradedPerm  = 0;
  let noId = 0;

  // ── Step 1: Process nbaPropsDaily_{season} ────────────────────────────────
  // Grade docs, write to nbaProps_{season}, delete from daily collection
  const dailySnap = await adminDb.collection(dailyCol)
    .where('gameDate', '==', date)
    .get();

  console.log(`📋 Daily collection: ${dailySnap.size} docs for ${date}`);

  if (!dailySnap.empty) {
    const writeBatch  = adminDb.batch();
    const deleteBatch = adminDb.batch();
    let writeCount  = 0;
    let deleteCount = 0;

    for (const doc of dailySnap.docs) {
      const data   = doc.data();
      const grades = gradeProp(data, gameMap);
      if (!data.bdlId) noId++;

      // Build the merged doc for nbaProps_{season}
      // Use same deterministic doc ID format as ingest route
      const playerKey = (data.player ?? '').toLowerCase().trim();
      const propNorm  = normalizeNBAProp(data.prop ?? '');
      const line      = data.line ?? 0;
      const ou        = (data.overUnder ?? data.type ?? '').toLowerCase();
      const slug      = playerKey.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const permDocId = `nba-${slug}-${propNorm}-${line}-${ou}-${date}`;

      const permDoc: Record<string, any> = {
        // Migrate all fields from daily doc
        ...data,
        // Normalize field names that may differ between old/new ingest
        league:    data.league    ?? 'nba',
        season,
        prop:      propNorm,       // canonical prop name
        overUnder: data.overUnder ?? data.type ?? null,
        odds:      data.odds      ?? data.price ?? null,
        bestOdds:  data.bestOdds  ?? data.odds  ?? data.price ?? null,
        // Apply grades if available
        ...(grades ?? {}),
        migratedFrom: dailyCol,
        migratedAt:   now,
        updatedAt:    now,
      };

      // Remove old field names that don't belong in nbaProps
      delete permDoc.type;
      delete permDoc.price;
      delete permDoc.gameId;
      delete permDoc.lastUpdated;

      writeBatch.set(
        adminDb.collection(permCol).doc(permDocId),
        permDoc,
        { merge: true },
      );
      writeCount++;

      // Mark for deletion from daily
      deleteBatch.delete(doc.ref);
      deleteCount++;

      if (grades) gradedDaily++;
      migrated++;

      // Commit in chunks of 400
      if (writeCount >= 400) {
        await writeBatch.commit();
        writeCount = 0;
      }
      if (deleteCount >= 400) {
        await deleteBatch.commit();
        deleteCount = 0;
      }
    }

    if (writeCount  > 0) await writeBatch.commit();
    if (deleteCount > 0) await deleteBatch.commit();

    console.log(`✅ Migrated ${migrated} docs from ${dailyCol} → ${permCol}`);
  }

  // ── Step 2: Grade any remaining pending docs already in nbaProps_{season} ──
  let permQuery = adminDb.collection(permCol).where('gameDate', '==', date);
  if (!force) permQuery = permQuery.where('actualResult', '==', null) as any;

  const permSnap = await permQuery.get();
  console.log(`📋 Perm collection: ${permSnap.size} docs to grade for ${date}`);

  if (!permSnap.empty) {
    const batch = adminDb.batch();
    let count   = 0;

    for (const doc of permSnap.docs) {
      const data   = doc.data();
      const grades = gradeProp(data, gameMap);
      if (!grades) {
        if (!data.bdlId) noId++;
        continue;
      }
      batch.update(doc.ref, grades);
      count++;
      gradedPerm++;

      if (count >= 400) {
        await batch.commit();
        count = 0;
      }
    }
    if (count > 0) await batch.commit();
  }

  // ── Step 3: Sync bettingLog leg statuses ─────────────────────────────────
  await gradeBettingLog(date, gameMap);

  return {
    migrated,
    gradedFromDaily: gradedDaily,
    gradedFromPerm:  gradedPerm,
    noId,
    bdlRows:         gameMap.size,
  };
}

// ─── bettingLog sync ──────────────────────────────────────────────────────────

async function gradeBettingLog(date: string, gameMap: Map<number, BRGame>) {
  const betSnap = await adminDb.collection('bettingLog')
    .where('league',  '==', 'nba')
    .where('status',  '==', 'pending')
    .get();

  if (betSnap.empty) return;

  const batch = adminDb.batch();
  let updated = 0;

  for (const doc of betSnap.docs) {
    const bet  = doc.data();
    const legs = (bet.legs ?? bet.selections ?? []) as any[];
    if (!legs.length) continue;

    const legsForDate = legs.filter((l: any) =>
      (l.gameDate ?? '').toString().split('T')[0] === date
    );
    if (!legsForDate.length) continue;

    let anyPending = false, anyLost = false, allWon = true;

    const updatedLegs = legs.map((leg: any) => {
      const ld = (leg.gameDate ?? '').toString().split('T')[0];
      if (ld !== date) {
        if (leg.status === 'pending') anyPending = true;
        if (leg.status === 'lost')    anyLost    = true;
        if (leg.status !== 'won')     allWon     = false;
        return leg;
      }

      const bdlId    = Number(leg.bdlId ?? 0);
      const game     = bdlId ? gameMap.get(bdlId) : null;
      const propNorm = normalizeNBAProp(leg.prop ?? '');
      const stat     = game ? getNBAStatFromGame(game, propNorm) : null;

      if (stat === null) { anyPending = true; allWon = false; return leg; }

      const result = determineResult(stat, Number(leg.line ?? 0), leg.selection ?? leg.overUnder ?? 'Over');
      if (result === 'lost') { anyLost = true; allWon = false; }
      return { ...leg, status: result, gameStat: stat };
    });

    const betStatus = anyLost    ? 'lost'
                    : allWon     ? 'won'
                    : anyPending ? 'pending'
                    : 'void';

    if (betStatus !== 'pending') {
      batch.update(doc.ref, { legs: updatedLegs, status: betStatus, updatedAt: new Date().toISOString() });
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
  if (!BDL_API_KEY) {
    return NextResponse.json({ error: 'BDL_API_KEY not configured' }, { status: 500 });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Invalid date — use YYYY-MM-DD' }, { status: 400 });
  }

  console.log(`\n🏀 NBA Grade+Migrate — ${date} (season ${season}) force=${force}`);
  const result = await gradeAndMigrate(date, season, force);
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
    console.error('❌ NBA grade POST error:', err);
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
    console.error('❌ NBA grade GET error:', err);
    return NextResponse.json({ error: err.message ?? 'Grade failed' }, { status: 500 });
  }
}