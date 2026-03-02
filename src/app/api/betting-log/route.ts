// src/app/api/betting-log/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const PAGE_SIZE = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toISO(val: any): string {
  if (!val) return '';
  if (typeof val?.toDate === 'function') return val.toDate().toISOString();
  const secs = val?.seconds ?? val?._seconds;
  if (secs != null) return new Date(Number(secs) * 1000).toISOString();
  if (typeof val === 'string' && val.length > 0) return val;
  return '';
}

function toMs(val: any): number {
  if (!val) return 0;
  if (typeof val?.toDate === 'function') return val.toDate().getTime();
  const secs = val?.seconds ?? val?._seconds;
  if (secs != null) return Number(secs) * 1000;
  if (typeof val === 'string') return new Date(val).getTime() || 0;
  return 0;
}

type LegSelection = 'Over' | 'Under';
type LegStatus    = 'pending' | 'won' | 'lost' | 'void';

function normLeg(data: any, docId: string) {
  let line = 0;
  let rawSelection = String(data.selection ?? data.overUnder ?? data['Over/Under?'] ?? '').trim();
  const rawLine = data.line ?? data.Line;
  if (typeof rawLine === 'string') {
    const m = rawLine.match(/^(over|under)\s+([\d.]+)/i);
    if (m) {
      if (!rawSelection) rawSelection = m[1].charAt(0).toUpperCase() + m[1].slice(1).toLowerCase();
      line = parseFloat(m[2]);
    } else {
      line = parseFloat(rawLine) || 0;
    }
  } else {
    line = Number(rawLine) || 0;
  }

  // Normalize selection to union type — default Over if unrecognized
  const selectionNorm = rawSelection.toLowerCase();
  const selection: LegSelection = selectionNorm === 'under' ? 'Under' : 'Over';

  // Normalize status to union type
  const rawStatus = String(data.result ?? data.status ?? 'pending').toLowerCase();
  const statusMap: Record<string, LegStatus> = { won: 'won', win: 'won', lost: 'lost', loss: 'lost', void: 'void', push: 'void' };
  const status: LegStatus = statusMap[rawStatus] ?? 'pending';

  return {
    id:        docId,
    player:    String(data.player ?? data.playerteam ?? data.Player ?? '').trim(),
    prop:      String(data.prop   ?? data.Prop ?? '').trim(),
    line,
    selection,                             // 'Over' | 'Under'
    odds:      Number(data.odds ?? data.Odds) || 0,  // number (not null)
    matchup:   String(data.matchup ?? data.Matchup ?? '').trim(),
    week:      Number(data.week ?? data.Week) || null,
    status,                                // 'pending' | 'won' | 'lost' | 'void'
    gameDate:  toISO(data.gameDate ?? data.date ?? data['Game Date']),  // string (not null)
    team:      String(data.team ?? data.Team ?? '').trim(),
    isLive:    Boolean(data.isLive),
  };
}

function calcPayout(stake: number | null, odds: number | null): number | null {
  if (!stake || !odds) return null;
  return odds > 0
    ? parseFloat((stake * (odds / 100) + stake).toFixed(2))
    : parseFloat((stake * (100 / Math.abs(odds)) + stake).toFixed(2));
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const player   = (searchParams.get('player')  ?? '').trim().toLowerCase();
    const propType = (searchParams.get('propType') ?? '').trim().toLowerCase();
    const week     =  searchParams.get('week')     ?? '';
    const cursor   =  searchParams.get('cursor')   ?? '';
    const limit    = Math.min(parseInt(searchParams.get('limit') ?? String(PAGE_SIZE)), 200);

    const weekNum = week && week !== 'all' ? parseInt(week, 10) : null;

    let q: FirebaseFirestore.Query = adminDb.collection('bettingLog');
    if (weekNum !== null && !isNaN(weekNum)) q = q.where('week', '==', weekNum);

    q = q.orderBy('createdAt', 'desc').limit(limit + 1);
    if (cursor) {
      const cursorDoc = await adminDb.collection('bettingLog').doc(cursor).get();
      if (cursorDoc.exists) q = q.startAfter(cursorDoc);
    }

    const snap = await q.get();
    const docs = snap.docs.slice(0, limit);
    const hasMore = snap.docs.length > limit;
    const nextCursor = hasMore ? docs[docs.length - 1].id : null;

    // Normalize all legs
    let legs = docs.map(d => normLeg(d.data(), d.id));

    // In-memory player/prop filters
    if (player)   legs = legs.filter(l => l.player.toLowerCase().includes(player));
    if (propType) legs = legs.filter(l => l.prop.toLowerCase().includes(propType));

    // Group by parlayId to build BetRow objects
    const parlayMap = new Map<string, typeof legs>();
    const singles: typeof legs = [];

    for (const leg of legs) {
      const raw = docs.find(d => d.id === leg.id)?.data();
      const pid = raw?.parlayId ?? raw?.parlayid ?? null;
      if (pid) {
        if (!parlayMap.has(pid)) parlayMap.set(pid, []);
        parlayMap.get(pid)!.push(leg);
      } else {
        singles.push(leg);
      }
    }

    const bets: any[] = [];

    // Single bets
    for (const leg of singles) {
      const raw = docs.find(d => d.id === leg.id)?.data() ?? {};
      const stake  = Number(raw.stake)  || null;
      const odds   = Number(raw.odds)   || null;
      bets.push({
        id:       leg.id,
        isParlay: false,
        legs:     [leg],
        week:     leg.week ?? Number(raw.week) ?? null,
        status:   leg.status,
        odds,
        stake,
        payout:   calcPayout(stake, odds),
        createdAt: toISO(raw.createdAt),
      });
    }

    // Parlays
    for (const [parlayId, parlayLegs] of parlayMap) {
      const firstRaw = docs.find(d => d.id === parlayLegs[0].id)?.data() ?? {};
      const stake  = Number(firstRaw.stake)  || null;
      const odds   = Number(firstRaw.odds)   || null;
      bets.push({
        id:       parlayId,
        isParlay: true,
        legs:     parlayLegs,
        week:     Number(firstRaw.week) || null,
        status:   String(firstRaw.status ?? 'pending'),
        odds,
        stake,
        payout:   calcPayout(stake, odds),
        createdAt: toISO(firstRaw.createdAt),
      });
    }

    // Sort descending by createdAt
    bets.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));

    return NextResponse.json({ bets, hasMore, nextCursor, totalCount: bets.length });

  } catch (error: any) {
    console.error('❌ betting-log GET:', error);
    return NextResponse.json({ error: error.message, bets: [] }, { status: 500 });
  }
}

// ─── PUT (edit bet) ───────────────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, legs: clientLegs, parlayOdds, odds: bodyOdds, ...rest } = body;

    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const db  = adminDb;
    const batch = db.batch();

    // Resolve effective odds (edit modal sends parlayOdds, others send odds)
    const effectiveOdds = Number(parlayOdds ?? bodyOdds ?? 0);

    // Shared fields applied to every leg doc
    const sharedUpdates: Record<string, any> = {
      ...rest,
      odds: effectiveOdds,
      stake:    Number(rest.stake ?? 0),
      boost:    Number(rest.boost ?? 0),
      week:     Number(rest.week  ?? 0),
      status:   rest.status ?? 'pending',
      updatedAt: FieldValue.serverTimestamp(),
    };

    // Convert gameDate string → Firestore Timestamp if provided
    if (rest.gameDate) {
      const d = new Date(rest.gameDate);
      if (!isNaN(d.getTime())) {
        sharedUpdates.gameDate = admin.firestore.Timestamp.fromDate(d);
      }
    }

    // Remove keys that shouldn't be stored flat
    delete sharedUpdates.legs;
    delete sharedUpdates.parlayOdds;
    delete sharedUpdates.potentialPayout;

    // Find docs by parlayId (parlay) or direct doc id (single)
    let snap = await db.collection('bettingLog').where('parlayId', '==', id).get();
    if (snap.empty) snap = await db.collection('bettingLog').where('parlayid', '==', id).get();

    if (snap.empty) {
      // Single bet — update doc directly
      const ref = db.collection('bettingLog').doc(id);
      const existing = await ref.get();
      if (!existing.exists) {
        return NextResponse.json({ error: 'Bet not found' }, { status: 404 });
      }
      // Merge leg-level fields if clientLegs provided
      const legUpdates = (clientLegs ?? [])[0] ?? {};
      batch.update(ref, {
        ...sharedUpdates,
        ...(legUpdates.player    !== undefined && { player:    legUpdates.player }),
        ...(legUpdates.prop      !== undefined && { prop:      legUpdates.prop }),
        ...(legUpdates.line      !== undefined && { line:      Number(legUpdates.line) }),
        ...(legUpdates.odds      !== undefined && { odds:      Number(legUpdates.odds) }),
        ...(legUpdates.selection !== undefined && { selection: legUpdates.selection }),
        ...(legUpdates.status    !== undefined && { status:    legUpdates.status }),
        ...(legUpdates.isLive    !== undefined && { isLive:    legUpdates.isLive }),
      });
    } else {
      // Parlay — update each leg doc
      snap.docs.forEach(doc => {
        const matched = (clientLegs ?? []).find((l: any) => l.id === doc.id);
        const legUpdates: Record<string, any> = { ...sharedUpdates };
        if (matched) {
          if (matched.player    !== undefined) legUpdates.player    = matched.player;
          if (matched.prop      !== undefined) legUpdates.prop      = matched.prop;
          if (matched.line      !== undefined) legUpdates.line      = Number(matched.line);
          if (matched.odds      !== undefined) legUpdates.odds      = Number(matched.odds);
          if (matched.selection !== undefined) legUpdates.selection = matched.selection;
          if (matched.isLive    !== undefined) legUpdates.isLive    = matched.isLive;
          // Per-leg status — if overall status isn't the derived parlay status, use leg's own
          if (sharedUpdates.status === 'pending') {
            legUpdates.status = matched.status ?? 'pending';
          }
        }
        batch.update(doc.ref, legUpdates);
      });
    }

    await batch.commit();
    return NextResponse.json({ success: true, id });

  } catch (error: any) {
    console.error('❌ betting-log PUT:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

    const db    = adminDb;
    const batch = db.batch();

    // Try parlayId match first
    let snap = await db.collection('bettingLog').where('parlayId', '==', id).get();
    if (snap.empty) snap = await db.collection('bettingLog').where('parlayid', '==', id).get();

    if (!snap.empty) {
      snap.docs.forEach(d => batch.delete(d.ref));
    } else {
      const ref = db.collection('bettingLog').doc(id);
      const doc = await ref.get();
      if (doc.exists) batch.delete(ref);
    }

    await batch.commit();
    return NextResponse.json({ success: true });

  } catch (error: any) {
    console.error('❌ betting-log DELETE:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}