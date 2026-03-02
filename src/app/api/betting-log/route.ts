import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { auth } from '@clerk/nextjs/server';
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

  const selectionNorm = rawSelection.toLowerCase();
  const selection: LegSelection = selectionNorm === 'under' ? 'Under' : 'Over';

  const rawStatus = String(data.result ?? data.status ?? 'pending').toLowerCase();
  const statusMap: Record<string, LegStatus> = { won: 'won', win: 'won', lost: 'lost', loss: 'lost', void: 'void', push: 'void' };
  const status: LegStatus = statusMap[rawStatus] ?? 'pending';

  return {
    id:        docId,
    player:    String(data.player ?? data.playerteam ?? data.Player ?? '').trim(),
    prop:      String(data.prop   ?? data.Prop ?? '').trim(),
    line,
    selection,
    odds:      Number(data.odds ?? data.Odds) || 0,
    matchup:   String(data.matchup ?? data.Matchup ?? '').trim(),
    week:      Number(data.week ?? data.Week) || null,
    status,
    gameDate:  toISO(data.gameDate ?? data.date ?? data['Game Date']),
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

function getDerivedParlayStatus(legs: any[]): string {
  const legStatuses = legs.map(l => (l.status || 'pending').toLowerCase());
  if (legStatuses.includes('lost') || legStatuses.includes('loss')) return 'lost';
  if (legStatuses.every(s => s === 'won' || s === 'win' || s === 'void')) {
    return legStatuses.every(s => s === 'void') ? 'void' : 'won';
  }
  return 'pending';
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { userId: authId } = await auth();
    if (!authId) return new NextResponse('Unauthorized', { status: 401 });

    const { searchParams } = new URL(request.url);
    const player   = (searchParams.get('player')  ?? '').trim().toLowerCase();
    const propType = (searchParams.get('propType') ?? '').trim().toLowerCase();
    const week     =  searchParams.get('week')     ?? '';
    const cursor   =  searchParams.get('cursor')   ?? '';
    const limit    = Math.min(parseInt(searchParams.get('limit') ?? String(PAGE_SIZE)), 200);
    const weekNum  = week && week !== 'all' ? parseInt(week, 10) : null;

    let q: FirebaseFirestore.Query = adminDb.collection('bettingLog').where('userId', '==', authId);
    if (weekNum !== null && !isNaN(weekNum)) q = q.where('week', '==', weekNum);

    // We fetch a large number of docs for in-memory filtering. This is not ideal for very large datasets.
    const snap = await q.orderBy('createdAt', 'desc').limit(1000).get();
    const docs = snap.docs;

    const allBets: any[] = [];
    const parlayMap = new Map<string, any[]>(); // For old-format parlays

    // First pass: Group old-format parlays by parlayId
    docs.forEach(doc => {
        const raw = doc.data();
        const pid = raw?.parlayId ?? raw?.parlayid ?? null;
        if (pid) {
            if (!parlayMap.has(pid)) parlayMap.set(pid, []);
            parlayMap.get(pid)!.push(doc);
        }
    });

    // Second pass: Process all docs into a unified `allBets` array
    docs.forEach(doc => {
        const raw = doc.data();
        const pid = raw?.parlayId ?? raw?.parlayid ?? null;
        const hasLegsArray = Array.isArray(raw?.legs) && raw.legs.length > 0;

        if (pid) {
            // This is part of an old-format parlay, which will be processed in the parlayMap loop below.
            return; 
        }

        if (hasLegsArray) {
            // NEW FORMAT: legs are stored as an array on a single document
            const stake  = Number(raw.stake)  || null;
            const odds   = Number(raw.odds)   || null;
            const normalizedLegs = raw.legs.map((l: any, i: number) => ({
              ...normLeg(l, `${doc.id}-leg-${i}`),
              id: l.id ?? `${doc.id}-leg-${i}` // ensure id exists
            }));

            allBets.push({
              id:        doc.id,
              isParlay:  normalizedLegs.length > 1,
              legs:      normalizedLegs,
              week:      Number(raw.week) || null,
              status:    String(raw.status ?? 'pending'),
              odds,
              stake,
              payout:    raw.payout ?? calcPayout(stake, odds),
              profit:    raw.profit,
              isBonusBet: raw.isBonusBet,
              boost:     raw.boost,
              createdAt: toISO(raw.createdAt),
              gameDate:  toISO(raw.gameDate),
            });
        } else {
            // OLD FORMAT SINGLE LEG BET
            const leg = normLeg(raw, doc.id);
            const stake  = Number(raw.stake)  || null;
            const odds   = Number(raw.odds)   || null;
            allBets.push({
                id:       leg.id,
                isParlay: false,
                legs:     [leg],
                week:     leg.week ?? Number(raw.week) ?? null,
                status:   leg.status,
                odds,
                stake,
                payout:   raw.payout ?? calcPayout(stake, odds),
                profit:   raw.profit,
                isBonusBet: raw.isBonusBet,
                boost:    raw.boost,
                createdAt: toISO(raw.createdAt),
                gameDate: toISO(raw.gameDate),
            });
        }
    });

    // Process the old-format parlays from the map
    for (const [parlayId, parlayDocs] of parlayMap) {
      const firstDoc = parlayDocs[0];
      const firstRaw = firstDoc.data();
      const stake  = Number(firstRaw.stake)  || null;
      const odds   = Number(firstRaw.odds)   || null;
      const parlayLegs = parlayDocs.map(doc => normLeg(doc.data(), doc.id));
      
      allBets.push({
        id:       parlayId,
        isParlay: true,
        legs:     parlayLegs,
        week:     Number(firstRaw.week) || null,
        status:   firstRaw.status && firstRaw.status !== 'pending' ? firstRaw.status : getDerivedParlayStatus(parlayLegs),
        odds,
        stake,
        payout:   firstRaw.payout ?? calcPayout(stake, odds),
        profit:   firstRaw.profit,
        isBonusBet: firstRaw.isBonusBet,
        boost:    firstRaw.boost,
        createdAt: toISO(firstRaw.createdAt),
        gameDate: toISO(firstRaw.gameDate),
      });
    }

    // Apply in-memory filters
    let filteredBets = allBets;
    if (player)   filteredBets = filteredBets.filter(b => b.legs.some((l: any) => l.player.toLowerCase().includes(player)));
    if (propType) filteredBets = filteredBets.filter(b => b.legs.some((l: any) => l.prop.toLowerCase().includes(propType)));

    // Sort all bets together by date
    filteredBets.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));
    
    // Get all unique prop types for the filter dropdown
    const propTypes = [...new Set(filteredBets.flatMap(b => b.legs.map((l: any) => l.prop)).filter(Boolean))].sort();

    // Apply pagination to the final, sorted, filtered list
    const startIdx = cursor ? filteredBets.findIndex(b => b.id === cursor) + 1 : 0;
    const page = filteredBets.slice(startIdx, startIdx + limit);
    const hasMore = filteredBets.length > startIdx + limit;
    const nextCursor = hasMore ? (page[page.length - 1]?.id ?? null) : null;

    return NextResponse.json({ bets: page, hasMore, nextCursor, totalCount: filteredBets.length, propTypes });

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

    delete sharedUpdates.legs;
    delete sharedUpdates.parlayOdds;
    delete sharedUpdates.potentialPayout;

    let snap = await db.collection('bettingLog').where('parlayId', '==', id).get();
    if (snap.empty) snap = await db.collection('bettingLog').where('parlayid', '==', id).get();

    if (snap.empty) {
      // Single bet — update doc directly
      const ref = db.collection('bettingLog').doc(id);
      const existing = await ref.get();
      if (!existing.exists) {
        return NextResponse.json({ error: 'Bet not found' }, { status: 404 });
      }
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