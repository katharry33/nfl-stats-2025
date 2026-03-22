import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { fetchNBASeasonLog, getNBAStatFromGame } from '@/lib/enrichment/nba/bball';
import { normalizeNBAProp } from '@/lib/enrichment/nba/normalize-nba';
import { determineResult, calculateProfitLoss } from '@/lib/enrichment/shared/scoring';
import type { BRGame } from '@/lib/enrichment/types';

export const dynamic     = 'force-dynamic';
export const maxDuration = 300; // BBRef fetches take time — allow 5 min

// ─── UTILS ───────────────────────────────────────────────────────────────────
function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

function resolveDailyDocDate(data: Record<string, any>): string {
  if (data.gameDate)   return data.gameDate.split('T')[0];
  if (data.lastUpdated) return data.lastUpdated.split('T')[0];
  if (data.updatedAt)  return data.updatedAt.split('T')[0];
  return '';
}

// ─── GRADING LOGIC ───────────────────────────────────────────────────────────
function gradePropFromGame(
  data: Record<string, any>,
  game: BRGame,
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

// ─── BETTING LOG SYNC ────────────────────────────────────────────────────────
async function gradeBettingLog(date: string, season: number) {
  const betSnap = await adminDb.collection('bettingLog')
    .where('league', '==', 'nba')
    .where('status', '==', 'pending')
    .get();

  if (betSnap.empty) return;

  const gameCache = new Map<string, BRGame | null>();
  const batch = adminDb.batch();
  let updated = 0;

  for (const doc of betSnap.docs) {
    const bet = doc.data();
    const legs = (bet.legs ?? bet.selections ?? []) as any[];
    if (!legs.length) continue;

    const hasLegsForDate = legs.some((l: any) => 
      (l.gameDate ?? '').toString().split('T')[0] === date
    );
    if (!hasLegsForDate) continue;

    let anyLost = false, allWon = true, anyPending = false;

    const updatedLegs = await Promise.all(legs.map(async (leg: any) => {
      const ld = (leg.gameDate ?? '').toString().split('T')[0];
      if (ld !== date) return leg;

      const brid = (leg.brid ?? '').trim();
      if (!brid || brid === 'VERIFY') { anyPending = true; return leg; }

      if (!gameCache.has(brid)) {
        try {
          const games = await fetchNBASeasonLog(leg.player ?? brid, brid, season);
          gameCache.set(brid, games.find(g => g.date === date) ?? null);
          await sleep(1500); // Polite rate limit
        } catch { gameCache.set(brid, null); }
      }

      const gameRow = gameCache.get(brid);
      if (!gameRow) { anyPending = true; return leg; }

      const propNorm = normalizeNBAProp(leg.prop ?? '');
      const stat = getNBAStatFromGame(gameRow, propNorm);
      if (stat === null) { anyPending = true; return leg; }

      const result = determineResult(stat, Number(leg.line ?? 0), leg.selection ?? 'Over');
      if (result === 'lost') anyLost = true;
      if (result !== 'won') allWon = false;

      return { ...leg, status: result, gameStat: stat };
    }));

    const betStatus = anyLost ? 'lost' : (allWon && !anyPending) ? 'won' : 'pending';
    batch.update(doc.ref, { legs: updatedLegs, status: betStatus, updatedAt: new Date().toISOString() });
    updated++;
  }
  if (updated > 0) await batch.commit();
}

// ─── MAIN HANDLER ────────────────────────────────────────────────────────────
async function gradeWithBBRef(date: string, season: number, force: boolean) {
  const permCol = `nbaProps_${season}`;
  const now = new Date().toISOString();

  // 1. Migration from Daily (Simplified for brevity)
  // ... (Keep your migration logic here)

  // 2. Grading
  let permQuery: FirebaseFirestore.Query = adminDb.collection(permCol).where('gameDate', '==', date);
  if (!force) permQuery = permQuery.where('actualResult', '==', null);

  const permSnap = await permQuery.get();
  if (permSnap.empty) return { gradedPerm: 0 };

  const updates: Array<{ docId: string; data: any }> = [];
  let gradedPerm = 0;

  // Group and fetch logic
  for (const doc of permSnap.docs) {
    const d = doc.data();
    if (!d.brid || d.brid === 'VERIFY') continue;

    try {
      const games = await fetchNBASeasonLog(d.player, d.brid, season);
      const gameRow = games.find(g => g.date === date);
      if (gameRow) {
        const grades = gradePropFromGame(d, gameRow);
        if (grades) {
          updates.push({ docId: doc.id, data: grades });
          gradedPerm++;
        }
      }
      await sleep(1000); 
    } catch (e) { console.error(e); }
  }

  // Batch Updates
  if (updates.length > 0) {
    let batch = adminDb.batch();
    updates.forEach((u, i) => {
      batch.update(adminDb.collection(permCol).doc(u.docId), u.data);
      if ((i + 1) % 400 === 0) { batch.commit(); batch = adminDb.batch(); }
    });
    await batch.commit();
  }

  await gradeBettingLog(date, season);
  return { gradedPerm };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const date = body.date || new Date().toISOString().split('T')[0];
    const season = body.season || 2025;
    const force = body.force || false;
    
    const res = await gradeWithBBRef(date, season, force);
    return NextResponse.json({ success: true, ...res });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const date = searchParams.get('date') ?? new Date().toISOString().split('T')[0];
  const season = Number(searchParams.get('season') ?? 2025);
  const force = searchParams.get('force') === 'true';
  const res = await gradeWithBBRef(date, season, force);
  return NextResponse.json({ success: true, ...res });
}
