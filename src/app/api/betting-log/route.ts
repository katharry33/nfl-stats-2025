import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

// ─── Cache ────────────────────────────────────────────────────────────────────
let legacyBetsCache: any[] | null = null;
let legacyCacheTime = 0;
const LEGACY_CACHE_TTL_MS = 10 * 60 * 1000;
function isLegacyCacheValid() {
  return legacyBetsCache !== null && Date.now() - legacyCacheTime < LEGACY_CACHE_TTL_MS;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function processGameDate(gameDate: any): string {
  if (!gameDate) return new Date().toISOString();
  if (gameDate instanceof Date) return gameDate.toISOString();
  if (typeof gameDate === 'string') {
    if (gameDate.includes('T')) return gameDate;
    const dt = new Date(`${gameDate}T12:00:00.000Z`);
    return isNaN(dt.getTime()) ? new Date().toISOString() : dt.toISOString();
  }
  return new Date().toISOString();
}

function parseOdds(val: any): number {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  const n = parseInt(String(val).trim().replace(/\s/g, ''));
  return isNaN(n) ? 0 : n;
}

function parseLineAndSelection(raw: any): { line: number; selection: string } {
  const legLine = raw.line;
  if (typeof legLine === 'string') {
    const lower = legLine.toLowerCase().trim();
    const match = legLine.match(/[\d.]+/);
    const num = match ? parseFloat(match[0]) : 0;
    if (lower.startsWith('under')) return { line: num, selection: 'Under' };
    if (lower.startsWith('over'))  return { line: num, selection: 'Over' };
  }
  return { line: Number(legLine) || 0, selection: raw.selection || '' };
}

// Handles ISO, YYYY-MM-DD, Firestore Timestamp, and "Oct 02 2025" formats
function parseDate(raw: any): string | null {
  const d = raw.gameDate ?? raw.date ?? raw.createdAt ?? null;
  if (!d) return null;
  if (typeof d === 'object' && d.toDate) return d.toDate().toISOString();
  if (typeof d === 'string') {
    if (d.includes('T') || /^\d{4}-\d{2}-\d{2}/.test(d)) return d;
    const parsed = new Date(d);
    if (!isNaN(parsed.getTime())) return parsed.toISOString();
  }
  return null;
}

// Prefer result field when status is stuck at "pending" from migration
function parseStatus(raw: any): string {
  const statusRaw = (raw.status ?? '').toString().toLowerCase().trim();
  const resultRaw = (raw.result ?? '').toString().toLowerCase().trim();
  const effective = (statusRaw === 'pending' || statusRaw === '') && resultRaw && resultRaw !== 'pending'
    ? resultRaw
    : statusRaw || resultRaw || 'pending';
  if (effective === 'win'    || effective === 'won')   return 'won';
  if (effective === 'loss'   || effective === 'lost')  return 'lost';
  if (effective === 'void'   || effective === 'push')  return 'void';
  if (effective === 'cashed' || effective === 'cash')  return 'cashed';
  return 'pending';
}

function parsePlayer(raw: any): string {
  if (raw.playerteam && raw.playerteam !== 'Legacy Bet') return raw.playerteam;
  if (raw.player     && raw.player     !== 'Legacy Bet') return raw.player;
  return raw.playerteam ?? raw.player ?? '';
}

function normalizeLegDoc(doc: any, raw: any): any {
  const { line, selection } = parseLineAndSelection(raw);
  return {
    id: doc.id, player: parsePlayer(raw), prop: raw.prop ?? '',
    line, selection: raw.selection || selection,
    odds: parseOdds(raw.odds), matchup: raw.matchup ?? '',
    week: Number(raw.week) || null, status: parseStatus(raw),
    gameDate: parseDate(raw), team: raw.team ?? '',
  };
}

function normalizeLegItem(l: any, fallbackRaw: any, docId: string, i: number): any {
  const { line, selection } = parseLineAndSelection(l);
  const derivedSelection = l.selection || selection ||
    (typeof l.line === 'string' && l.line.toLowerCase().includes('over')  ? 'Over'  :
     typeof l.line === 'string' && l.line.toLowerCase().includes('under') ? 'Under' : '');
  return {
    id: l.id ?? `${docId}-${i}`,
    player: l.player && l.player !== 'Legacy Bet' ? l.player : parsePlayer(fallbackRaw),
    prop: l.prop ?? fallbackRaw.prop ?? '', line, selection: derivedSelection,
    odds: parseOdds(l.odds ?? fallbackRaw.odds),
    matchup: l.matchup ?? fallbackRaw.matchup ?? '',
    week: Number(l.week ?? fallbackRaw.week) || null,
    status: parseStatus(l),
    gameDate: l.gameDate ?? parseDate(fallbackRaw),
    team: l.team ?? fallbackRaw.team ?? '',
  };
}

function calcPayout(stake: number | null, odds: number | null, isBonusBet?: boolean): number | null {
  if (!stake || !odds) return null;
  const multiplier = odds > 0 ? odds / 100 + 1 : 100 / Math.abs(odds) + 1;
  const total = stake * multiplier;
  return parseFloat((isBonusBet ? total - stake : total).toFixed(2));
}

function buildBetFromDoc(doc: any, raw: any): any {
  const stake  = Number(raw.stake || raw.wager) || null; // || not ?? (stake:0 falls to wager)
  const odds   = parseOdds(raw.odds);
  const hasLegsArray = Array.isArray(raw.legs) && raw.legs.length > 0;
  const legs = hasLegsArray
    ? raw.legs.map((l: any, i: number) => normalizeLegItem(l, raw, doc.id, i))
    : [normalizeLegDoc(doc, raw)];
  return {
    id: doc.id, isParlay: legs.length > 1, legs,
    week: Number(raw.week) || null, status: parseStatus(raw),
    cashOutAmount: raw.cashOutAmount || null, odds: odds || null, stake,
    boost: raw.boost, isBonusBet: raw.isBonusBet, isGhostParlay: raw.isGhostParlay,
    type: raw.type ?? raw.betType ?? raw.bettype,
    payout: calcPayout(stake, odds, !!raw.isBonusBet),
    gameDate: parseDate(raw),
    createdAt: raw.createdAt?.toDate?.().toISOString() ?? raw.createdAt ?? null,
    userId: raw.userId,
  };
}

function buildParlayFromEntries(parlayId: string, entries: { doc: any; raw: any }[]): any {
  const header = entries.find(e => Number(e.raw.stake || e.raw.wager) > 0) ?? entries[0];
  const hr     = header.raw;
  const stake  = Number(hr.stake || hr.wager) || null;
  const odds   = parseOdds(hr.parlayOdds ?? hr.odds);

  const legs = entries.map(({ doc, raw }) => {
    const { line, selection } = parseLineAndSelection(raw);
    let legSelection = raw.selection || selection;
    if (!legSelection && Array.isArray(raw.legs) && raw.legs.length > 0) {
      const emb = raw.legs[0];
      legSelection = emb.selection ||
        (typeof emb.line === 'string' && emb.line.toLowerCase().includes('over')  ? 'Over'  :
         typeof emb.line === 'string' && emb.line.toLowerCase().includes('under') ? 'Under' : '');
    }
    if (!legSelection && typeof raw.line === 'string') {
      const ll = raw.line.toLowerCase();
      legSelection = ll.includes('over') ? 'Over' : ll.includes('under') ? 'Under' : '';
    }
    return {
      id: doc.id, player: parsePlayer(raw), prop: raw.prop ?? '',
      line, selection: legSelection, odds: parseOdds(raw.odds),
      matchup: raw.matchup ?? '', week: Number(raw.week) || null,
      status: parseStatus(raw), gameDate: parseDate(raw), team: raw.team ?? '',
    };
  });

  const legStatuses = legs.map((l: any) => l.status);
  const hasLost    = legStatuses.some((s: string) => s === 'lost');
  const allWon     = legStatuses.length > 0 && legStatuses.every((s: string) => s === 'won');
  const hasPending = legStatuses.some((s: string) => s === 'pending');
  const parlayStatus = parseStatus(hr) !== 'pending'
    ? parseStatus(hr)
    : hasLost ? 'lost' : allWon ? 'won' : hasPending ? 'pending' : 'void';

  return {
    id: parlayId, isParlay: entries.length > 1, legs,
    week: Number(hr.week) || null, status: parlayStatus,
    cashOutAmount: hr.cashOutAmount || null, odds: odds || null, stake,
    boost: hr.boost, isBonusBet: hr.isBonusBet, isGhostParlay: hr.isGhostParlay,
    type: hr.type ?? hr.betType ?? hr.bettype,
    payout: calcPayout(stake, odds, !!hr.isBonusBet),
    gameDate: parseDate(hr),
    createdAt: hr.createdAt?.toDate?.().toISOString() ?? hr.createdAt ?? hr.date ?? null,
    userId: hr.userId,
  };
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId    = searchParams.get('userId') ?? '';
    const player    = (searchParams.get('player') ?? '').trim().toLowerCase();
    const week      = searchParams.get('week') ?? '';
    const cursor    = searchParams.get('cursor') ?? '';
    const limit     = Math.min(parseInt(searchParams.get('limit') ?? '200'), 1000);
    const bustCache = searchParams.get('bust') === '1';
    const league = searchParams.get('league') || 'all'; // new filter

    const col     = adminDb.collection('bettingLog');
    const weekNum = week && week !== 'all' ? parseInt(week, 10) : null;

    // ── 1. New-format bets ────────────────────────────────────────────────────
    // Two passes to catch both current-userId docs AND orphans with stale UIDs.
    let newBets: any[] = [];
    const newBetIds = new Set<string>();

    // Pass A: current userId-scoped docs
    if (userId) {
      let q: any = col.where('userId', '==', userId);
      if (weekNum !== null && !isNaN(weekNum)) q = q.where('week', '==', weekNum);
      const snap = await q.limit(500).get();
      for (const doc of snap.docs) {
        const raw = doc.data();
        if (raw?.parlayId || raw?.parlayid) continue;
        if (newBetIds.has(doc.id)) continue;
        newBetIds.add(doc.id);
        newBets.push(buildBetFromDoc(doc, raw));
      }
    }

    // Pass B: all docs with a userId but no parlayid (catches stale-UID orphans)
    const orphanSnap = await col.where('userId', '>', '').limit(500).get();
    for (const doc of orphanSnap.docs) {
      const raw = doc.data();
      if (raw?.parlayId || raw?.parlayid) continue;
      if (newBetIds.has(doc.id)) continue;
      newBetIds.add(doc.id);
      newBets.push(buildBetFromDoc(doc, raw));
    }

    // ── 2. Legacy parlay bets (cached) ────────────────────────────────────────
    if (bustCache) legacyBetsCache = null;
    if (!isLegacyCacheValid()) {
      console.log('🔄 betting-log: loading legacy parlay docs...');
      const parlayMap = new Map<string, { doc: any; raw: any }[]>();
      const [s1, s2] = await Promise.all([
        col.where('parlayId',  '>', '').limit(5000).get(),
        col.where('parlayid', '>', '').limit(5000).get(),
      ]);
      const seen = new Set<string>();
      for (const doc of [...s1.docs, ...s2.docs]) {
        if (seen.has(doc.id)) continue;
        seen.add(doc.id);
        const raw = doc.data();
        const pid = raw?.parlayId ?? raw?.parlayid;
        if (!pid) continue;
        if (!parlayMap.has(pid)) parlayMap.set(pid, []);
        parlayMap.get(pid)!.push({ doc, raw });
      }
      const built: any[] = [];
      for (const [parlayId, entries] of parlayMap) built.push(buildParlayFromEntries(parlayId, entries));
      legacyBetsCache = built;
      legacyCacheTime = Date.now();
      console.log(`✅ Legacy cache: ${built.length} parlays from ${seen.size} leg docs`);
    }

    // ── 3. Merge, filter, sort ────────────────────────────────────────────────
    let allBets = [...newBets, ...(legacyBetsCache ?? [])];

    if (league !== 'all') {
      allBets = allBets.filter(b => b.league === league || (league === 'nfl' && !b.league));
    }

    if (weekNum !== null && !isNaN(weekNum)) {
      allBets = allBets.filter(b => newBetIds.has(b.id) || b.week === weekNum);
    }
    if (player) {
      allBets = allBets.filter(b =>
        b.legs?.some((l: any) => (l.player ?? '').toLowerCase().includes(player))
      );
    }

    // Sort newest first, fall back to gameDate for docs missing createdAt
    allBets.sort((a, b) => {
      const ad = new Date(a.createdAt ?? a.gameDate ?? 0).getTime();
      const bd = new Date(b.createdAt ?? b.gameDate ?? 0).getTime();
      return bd - ad;
    });

    const seenIds = new Set<string>();
    allBets = allBets.filter(b => { if (seenIds.has(b.id)) return false; seenIds.add(b.id); return true; });

    // ── 4. Cursor pagination ──────────────────────────────────────────────────
    let start = 0;
    if (cursor) {
      const i = allBets.findIndex(b => b.id === cursor);
      if (i !== -1) start = i + 1;
    }
    const page    = allBets.slice(start, start + limit);
    const hasMore = start + limit < allBets.length;

    return NextResponse.json({
      bets: page, hasMore,
      nextCursor: hasMore ? page[page.length - 1]?.id : null,
      totalCount: allBets.length,
    });
  } catch (error: any) {
    console.error('betting-log GET error:', error);
    return NextResponse.json({ error: error.message, bets: [] }, { status: 500 });
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, userId, gameDate, legs, deletedLegIds, ...rest } = body;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const col = adminDb.collection('bettingLog');
    const hasLost = (legs ?? []).some((l: any) => ['lost','loss'].includes((l.status ?? '').toLowerCase()));
    const allWon  = (legs ?? []).length > 0 && (legs ?? []).every((l: any) => ['won','win'].includes((l.status ?? '').toLowerCase()));
    const status  = rest.status ?? (hasLost ? 'lost' : allWon ? 'won' : 'pending');
    const fixedGameDate = processGameDate(gameDate);

    const rawDoc = {
      ...rest, status, userId,
      legs: legs ?? [],
      gameDate: fixedGameDate,
      updatedAt: new Date().toISOString(),
      ...(body.createdAt ? { createdAt: body.createdAt } : {}),
    };
    const cleanDoc = Object.fromEntries(Object.entries(rawDoc).filter(([_, v]) => v !== undefined));

    legacyBetsCache = null;

    if (id) {
      const existing = await col.doc(id).get();

      if (!existing.exists) {
        // Legacy parlayId — batch update all leg docs
        const [s1, s2] = await Promise.all([
          col.where('parlayId',  '==', id).get(),
          col.where('parlayid', '==', id).get(),
        ]);
        const legDocs = [...s1.docs, ...s2.docs];

        if (legDocs.length > 0) {
          const batch = adminDb.batch();

          legDocs.forEach(legDoc => {
            // Skip docs that are being deleted
            if ((deletedLegIds ?? []).includes(legDoc.id)) return;
            const update: Record<string, any> = {
              status, gameDate: fixedGameDate, updatedAt: new Date().toISOString(),
              isBonusBet: cleanDoc.isBonusBet ?? false,
              isGhostParlay: cleanDoc.isGhostParlay ?? false,
              cashOutAmount: cleanDoc.status === 'cashed' ? (cleanDoc.cashOutAmount ?? null) : null,
            };
            if (cleanDoc.stake !== undefined) update.stake = cleanDoc.stake;
            if (cleanDoc.odds  !== undefined) update.odds  = cleanDoc.odds;
            if (cleanDoc.week  !== undefined) update.week  = cleanDoc.week;
            if (cleanDoc.boost !== undefined) update.boost = cleanDoc.boost;
            batch.update(legDoc.ref, update);
          });

          // Per-leg field updates
          (legs ?? []).forEach((editedLeg: any) => {
            const match = legDocs.find(d => d.id === editedLeg.id);
            if (match) batch.update(match.ref, {
              status: editedLeg.status, line: editedLeg.line,
              odds: editedLeg.odds, selection: editedLeg.selection,
              player: editedLeg.player, gameDate: fixedGameDate,
            });
          });

          // Delete removed legs
          (deletedLegIds ?? []).forEach((legId: string) => {
            batch.delete(col.doc(legId));
          });

          await batch.commit();
          return NextResponse.json({ success: true, id });
        }
      }

      // Normal single-doc update
      await col.doc(id).set(cleanDoc, { merge: true });
      return NextResponse.json({ success: true, id });

    } else {
      const ref = await col.add({ ...cleanDoc, createdAt: new Date().toISOString() });
      return NextResponse.json({ success: true, id: ref.id });
    }
  } catch (e: any) {
    console.error('betting-log POST error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get('id');
    if (!idParam) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const col   = adminDb.collection('bettingLog');
    const ids   = idParam.split(',');
    const batch = adminDb.batch();

    for (const id of ids) {
      const direct = await col.doc(id).get();
      if (direct.exists) {
        batch.delete(col.doc(id));
      } else {
        const [s1, s2] = await Promise.all([
          col.where('parlayId',  '==', id).get(),
          col.where('parlayid', '==', id).get(),
        ]);
        [...s1.docs, ...s2.docs].forEach(d => batch.delete(d.ref));
      }
    }

    await batch.commit();
    legacyBetsCache = null;
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
