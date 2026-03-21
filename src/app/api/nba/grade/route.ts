// src/app/api/nba/grade/route.ts
//
// Fetches actual box scores from BallDontLie and grades all pending NBA props
// for a given date. Called by the Data Hub "Sync NBA Stats" button.
//
// POST /api/nba/grade        { date: "YYYY-MM-DD", season: 2025 }
// GET  /api/nba/grade?date=YYYY-MM-DD&season=2025   (for manual testing)

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { getNBAStatFromGame } from '@/lib/enrichment/nba/bball';
import { normalizeNBAProp } from '@/lib/enrichment/nba/normalize-nba';
import { determineResult, calculateProfitLoss } from '@/lib/enrichment/shared/scoring';
import type { BRGame } from '@/lib/enrichment/types';

export const dynamic     = 'force-dynamic';
export const maxDuration = 120;

const BDL_BASE = 'https://api.balldontlie.io/v1';
const BDL_KEY  = process.env.BALLDONTLIE_API_KEY ?? '';

// ─── BDL stat fetch ───────────────────────────────────────────────────────────

async function fetchBDLStatsForDate(date: string): Promise<Map<number, BRGame>> {
  const gameMap = new Map<number, BRGame>();
  let cursor: number | null = null;

  do {
    const params = new URLSearchParams({ 'dates[]': date, per_page: '100' });
    if (cursor != null) params.set('cursor', String(cursor));

    const res = await fetch(`${BDL_BASE}/stats?${params}`, {
      headers: { Authorization: BDL_KEY },
    });

    if (!res.ok) {
      console.error(`❌ BDL stats: HTTP ${res.status}`);
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

// ─── Core grading logic (shared by GET + POST) ────────────────────────────────

async function gradeForDate(date: string, season: number, force: boolean) {
  const colName  = `nbaProps_${season}`;

  // Load props for this date
  let query = adminDb.collection(colName).where('gameDate', '==', date);
  if (!force) query = query.where('actualResult', '==', null) as any;

  const snap = await query.get();
  if (snap.empty) return { graded: 0, noId: 0, noStat: 0, total: 0 };

  // Fetch BDL box scores
  const gameMap = await fetchBDLStatsForDate(date);
  console.log(`📡 BDL: ${gameMap.size} player rows for ${date}`);

  const updates: Array<{ id: string; data: Record<string, any> }> = [];
  let graded = 0, noId = 0, noStat = 0;

  for (const doc of snap.docs) {
    const r        = doc.data();
    const bdlId    = r.bdlId ?? null;
    const propNorm = normalizeNBAProp(r.prop ?? '');
    const line     = Number(r.line ?? 0);
    const overUnder = r.overUnder ?? 'Over';

    if (!bdlId) { noId++; continue; }

    const game = gameMap.get(Number(bdlId));
    if (!game) { noStat++; continue; }

    const stat = getNBAStatFromGame(game, propNorm);
    if (stat === null) { noStat++; continue; }

    const result = determineResult(stat, line, overUnder);

    const update: Record<string, any> = {
      gameStat:     stat,
      actualResult: result,   // 'won' | 'lost' | 'push'
      gradedAt:     new Date().toISOString(),
      ...(r.playerAvg != null
        ? { scoreDiff: Math.round((Number(r.playerAvg) - line) * 10) / 10 }
        : {}),
    };

    if (r.betAmount && r.bestOdds) {
      update.profitLoss = calculateProfitLoss(r.betAmount, r.bestOdds, result);
    }

    updates.push({ id: doc.id, data: update });
    graded++;
  }

  // Batch write
  for (let i = 0; i < updates.length; i += 400) {
    const batch = adminDb.batch();
    for (const { id, data } of updates.slice(i, i + 400)) {
      batch.update(adminDb.collection(colName).doc(id), data);
    }
    await batch.commit();
  }

  // Also update bettingLog legs that reference these props
  await gradeBettingLog(date, season, gameMap);

  return { graded, noId, noStat, total: snap.size };
}

// ─── Sync bettingLog legs ─────────────────────────────────────────────────────
// Walks pending bettingLog docs for this date and updates individual leg statuses
// + the overall bet status (parlay logic: any lost leg = lost bet).

async function gradeBettingLog(
  date:    string,
  season:  number,
  gameMap: Map<number, BRGame>,
) {
  const betSnap = await adminDb.collection('bettingLog')
    .where('league',  '==',     'nba')
    .where('status',  '==',     'pending')
    .get();

  if (betSnap.empty) return;

  const batch = adminDb.batch();
  let updated = 0;

  for (const doc of betSnap.docs) {
    const bet  = doc.data();
    const legs = (bet.legs ?? bet.selections ?? []) as any[];
    if (!legs.length) continue;

    // Only grade legs for this date
    const legsForDate = legs.filter((l: any) => {
      const ld = (l.gameDate ?? '').toString().split('T')[0];
      return ld === date;
    });
    if (!legsForDate.length) continue;

    let anyPending = false;
    let anyLost    = false;
    let allWon     = true;

    const updatedLegs = legs.map((leg: any) => {
      const ld = (leg.gameDate ?? '').toString().split('T')[0];
      if (ld !== date) {
        // Leg from a different date — carry its existing status
        if (leg.status === 'pending') anyPending = true;
        if (leg.status === 'lost')    anyLost    = true;
        if (leg.status !== 'won')     allWon     = false;
        return leg;
      }

      const bdlId    = Number(leg.bdlId ?? 0);
      const game     = bdlId ? gameMap.get(bdlId) : null;
      const propNorm = normalizeNBAProp(leg.prop ?? '');
      const stat     = game ? getNBAStatFromGame(game, propNorm) : null;

      if (stat === null) {
        anyPending = true; allWon = false;
        return leg;
      }

      const result = determineResult(stat, Number(leg.line ?? 0), leg.selection ?? leg.overUnder ?? 'Over');
      if (result === 'lost') { anyLost = true; allWon = false; }
      if (result === 'won'  && allWon) allWon = true;

      return { ...leg, status: result, gameStat: stat };
    });

    const betStatus = anyLost    ? 'lost'
                    : allWon     ? 'won'
                    : anyPending ? 'pending'
                    : 'void';

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

// ─── Handlers ─────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  if (!BDL_KEY) {
    return NextResponse.json({ error: 'BALLDONTLIE_API_KEY not configured' }, { status: 500 });
  }

  try {
    const body   = await req.json();
    const date   = body.date   ?? new Date().toISOString().split('T')[0];
    const season = Number(body.season ?? 2025);
    const force  = body.force  ?? false;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return NextResponse.json({ error: 'Invalid date — use YYYY-MM-DD' }, { status: 400 });
    }

    console.log(`\n🏀 NBA Grade — ${date} (season ${season}) force=${force}`);
    const result = await gradeForDate(date, season, force);

    return NextResponse.json({ success: true, date, season, ...result });
  } catch (err: any) {
    console.error('❌ NBA grade error:', err);
    return NextResponse.json({ error: err.message ?? 'Grade failed' }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  if (!BDL_KEY) {
    return NextResponse.json({ error: 'BALLDONTLIE_API_KEY not configured' }, { status: 500 });
  }

  try {
    const { searchParams } = req.nextUrl;
    const date   = searchParams.get('date')   ?? new Date().toISOString().split('T')[0];
    const season = Number(searchParams.get('season') ?? 2025);
    const force  = searchParams.get('force')  === 'true';

    console.log(`\n🏀 NBA Grade — ${date} (season ${season}) force=${force}`);
    const result = await gradeForDate(date, season, force);

    return NextResponse.json({ success: true, date, season, ...result });
  } catch (err: any) {
    console.error('❌ NBA grade error:', err);
    return NextResponse.json({ error: err.message ?? 'Grade failed' }, { status: 500 });
  }
}