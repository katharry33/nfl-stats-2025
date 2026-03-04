import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

const PAGE_SIZE = 50;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fixGameDate(gameDate: string | undefined): string | undefined {
  if (!gameDate) return undefined;
  // Store as noon UTC to prevent timezone rollback
  const d = new Date(`${gameDate}T12:00:00.000Z`);
  return isNaN(d.getTime()) ? gameDate : d.toISOString();
}

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

function parseAmericanOdds(val: any): number {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const s = String(val).replace(/\s/g, '');
  const n = parseInt(s, 10);
  return isNaN(n) ? 0 : n;
}

function parseLineAndSelection(data: any): { line: number; selection: 'Over' | 'Under' } {
  // Try explicit selection field first
  let rawSel = String(
    data.selection ?? data.overUnder ?? data['Over/Under?'] ?? data.pick ?? ''
  ).trim().toLowerCase();

  // Try line field — could be "Under 205.5", "Over 55.5", or a number
  const rawLine = data.line ?? data.Line ?? data.prop_line ?? data.value ?? null;
  let line = 0;

  if (typeof rawLine === 'string') {
    const m = rawLine.match(/^(over|under)\s*([\d.]+)/i);
    if (m) {
      if (!rawSel) rawSel = m[1].toLowerCase();
      line = parseFloat(m[2]);
    } else {
      line = parseFloat(rawLine) || 0;
    }
  } else {
    line = Number(rawLine) || 0;
  }

  const selection: 'Over' | 'Under' = rawSel === 'under' ? 'Under' : 'Over';
  return { line, selection };
}

function parseStatus(data: any): 'pending' | 'won' | 'lost' | 'void' {
  const raw = String(data.result ?? data.status ?? 'pending').toLowerCase();
  const map: Record<string, 'pending' | 'won' | 'lost' | 'void'> = {
    won: 'won', win: 'won', cashed: 'won',
    lost: 'lost', loss: 'lost',
    void: 'void', push: 'void', voided: 'void',
    pending: 'pending',
  };
  return map[raw] ?? 'pending';
}

function parseGameDate(data: any): string {
  const raw = data.gameDate ?? data.date ?? data['Game Date'] ?? data.createdAt ?? null;
  return toISO(raw);
}

function normLegFull(data: any, docId: string) {
  const { line, selection } = parseLineAndSelection(data);
  const player = String(
    data.player ?? data.playerteam ?? data.Player ?? data.PlayerTeam ?? ''
  ).trim();
  const stake = Number(data.stake ?? data.wager ?? data.Stake ?? 0) || 0;

  return {
    id: docId,
    player,
    prop:     String(data.prop ?? data.Prop ?? '').trim(),
    line,
    selection,
    odds:     parseAmericanOdds(data.odds ?? data.Odds),
    matchup:  String(data.matchup ?? data.Matchup ?? '').trim(),
    week:     Number(data.week ?? data.Week) || null,
    status:   parseStatus(data),
    gameDate: parseGameDate(data),
    team:     String(data.team ?? data.Team ?? '').trim(),
    isLive:   Boolean(data.isLive),
    stake,
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
    const requestedUserId = searchParams.get('userId') ?? '';

    const player  = (searchParams.get('player')  ?? '').trim().toLowerCase();
    const week    =  searchParams.get('week')     ?? '';
    const cursor  =  searchParams.get('cursor')   ?? '';
    const limit   = Math.min(parseInt(searchParams.get('limit') ?? String(PAGE_SIZE)), 200);
    const weekNum = week && week !== 'all' ? parseInt(week, 10) : null;

    // No userId filter — we include legacy docs with no userId
    let q: FirebaseFirestore.Query = adminDb.collection('bettingLog');
    if (weekNum !== null && !isNaN(weekNum)) q = q.where('week', '==', weekNum);

    const snap = await q.orderBy('createdAt', 'desc').limit(2000).get();

    const docs = snap.docs;

    const bets: any[] = [];
    // parlayMap groups individual leg docs by their parlayid
    const parlayMap = new Map<string, any[]>();

    for (const doc of docs) {
      const raw = doc.data();
      const parlayId = raw?.parlayId ?? raw?.parlayid ?? null;

      // ── RULE 1: If doc has a parlayid, it is a leg in a grouped parlay.
      //    Route to parlayMap regardless of whether it also has a legs sub-array
      //    (legacy imports have both; we prefer top-level fields for accuracy).
      if (parlayId) {
        if (!parlayMap.has(parlayId)) parlayMap.set(parlayId, []);
        parlayMap.get(parlayId)!.push({ doc, raw });
        continue;
      }

      // ── RULE 2: New format — single doc with legs[] array (created by Parlay Studio)
      const hasLegsArray = Array.isArray(raw?.legs) && raw.legs.length > 0;
      if (hasLegsArray) {
        const stake = Number(raw.stake) || null;
        const odds  = Number(raw.odds)  || null;

        const normalizedLegs = raw.legs.map((l: any, i: number) => {
          const { line, selection } = parseLineAndSelection(l);
          return {
            id:        l.id ?? `${doc.id}-leg-${i}`,
            player:    String(l.player ?? l.playerteam ?? l.Player ?? '').trim(),
            prop:      String(l.prop   ?? l.Prop ?? '').trim(),
            line,
            selection,
            odds:      parseAmericanOdds(l.odds ?? l.Odds),
            matchup:   String(l.matchup ?? l.Matchup ?? '').trim(),
            week:      Number(l.week ?? raw.week) || null,
            status:    parseStatus(l),
            gameDate:  toISO(l.gameDate ?? raw.gameDate),
            team:      String(l.team ?? l.Team ?? '').trim(),
            isLive:    Boolean(l.isLive),
          };
        });

        bets.push({
          id:       doc.id,
          isParlay: normalizedLegs.length > 1,
          legs:     normalizedLegs,
          week:     Number(raw.week) || null,
          status:   String(raw.status || 'pending'),
          odds,
          stake,
          boost:      raw.boost,
          isBonusBet: raw.isBonusBet,
          type:       raw.type ?? raw.betType ?? raw.bettype,
          payout:   calcPayout(stake, odds),
          createdAt: toISO(raw.createdAt),
        });
        continue;
      }

      // ── RULE 3: Standalone single-leg doc with no parlayid and no legs array
      const leg   = normLegFull(raw, doc.id);
      const stake = Number(raw.stake ?? raw.wager) || null;
      const odds  = parseAmericanOdds(raw.odds) || null;
      bets.push({
        id:       doc.id,
        isParlay: false,
        legs:     [leg],
        week:     leg.week ?? Number(raw.week) ?? null,
        status:   leg.status,
        odds,
        stake,
        boost:      raw.boost,
        isBonusBet: raw.isBonusBet,
        type:       raw.type ?? raw.betType ?? raw.bettype,
        payout:   calcPayout(stake, odds),
        createdAt: toISO(raw.createdAt),
      });
    }

    // ── Assemble parlayMap entries into grouped parlay bets
    for (const [parlayId, entries] of parlayMap) {
      // Use the entry with the most complete stake/odds data as the "header"
      const header = entries.find(e => Number(e.raw.stake ?? e.raw.wager) > 0) ?? entries[0];
      const headerRaw = header.raw;

      const stake = Number(headerRaw.stake ?? headerRaw.wager) || null;
      const odds  = parseAmericanOdds(headerRaw.odds ?? headerRaw.parlayOdds) || null;

      const legs = entries.map(({ doc, raw }) => normLegFull(raw, doc.id));

      bets.push({
        id:       parlayId,
        isParlay: legs.length > 1,
        legs,
        week:     Number(headerRaw.week) || null,
        status:   parseStatus(headerRaw),
        odds,
        stake,
        boost:      headerRaw.boost,
        isBonusBet: headerRaw.isBonusBet,
        type:       headerRaw.type ?? headerRaw.betType ?? headerRaw.bettype,
        payout:   calcPayout(stake, odds),
        createdAt: toISO(headerRaw.createdAt ?? headerRaw.date),
      });
    }

    // ── Player filter (in-memory, case-insensitive substring)
    let filteredBets = player
      ? bets.filter(bet =>
          bet.legs?.some((leg: any) =>
            (leg.player ?? '').toLowerCase().includes(player)
          )
        )
      : bets;

    filteredBets.sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt));

    // ── Cursor pagination on filtered result
    let startIndex = 0;
    if (cursor) {
      const idx = filteredBets.findIndex((b: any) => b.id === cursor);
      if (idx !== -1) startIndex = idx + 1;
    }
    const page = filteredBets.slice(startIndex, startIndex + limit);
    const hasMore = startIndex + limit < filteredBets.length;
    const nextCursor = hasMore ? page[page.length - 1]?.id ?? null : null;

    return NextResponse.json({
      bets: page,
      hasMore,
      nextCursor,
      totalCount: filteredBets.length,
    });

  } catch (error: any) {
    console.error('❌ betting-log GET:', error);
    return NextResponse.json({ error: error.message, bets: [] }, { status: 500 });
  }
}


// ─── UNIFIED PUT (edit bet) ───────────────────────────────────────────────────

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const authId = body.userId || 'dev-user';

    const { id, legs, ...betData } = body;

    if (!id) {
      return new NextResponse('Bet ID is required', { status: 400 });
    }

    const betRef = adminDb.collection('bettingLog').doc(id);
    const betDoc = await betRef.get();

    if (!betDoc.exists) {
      return new NextResponse('Bet not found', { status: 404 });
    }

    if (betDoc.data()?.userId !== authId) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const hasLost = legs?.some((l: any) => l.status === 'lost');
    const allWon = legs?.every((l: any) => l.status === 'won');
    const parlayStatus = betData.status === 'cashed' 
        ? 'cashed'
        : hasLost ? 'lost' : (allWon ? 'won' : 'pending');

    const sanitizedLegs = legs?.map((leg: any) => ({
      ...leg,
      player: String(leg.player || ''),
      prop: String(leg.prop || ''),
      line: Number(leg.line) || 0,
      odds: Number(leg.odds) || 0,
      status: (leg.status || 'pending') as 'pending' | 'won' | 'lost' | 'void',
      selection: leg.selection as 'Over' | 'Under'
    })) || [];

    const { gameDate, ...restOfBetData } = betData;

    const finalData = {
      ...restOfBetData,
      legs: sanitizedLegs,
      status: parlayStatus,
      stake: Number(betData.stake ?? 0),
      odds: Number(betData.odds ?? 0),
      userId: authId,
      updatedAt: FieldValue.serverTimestamp(),
      ...(gameDate && { gameDate: fixGameDate(gameDate) }),
    };

    await betRef.update(finalData);

    return NextResponse.json({ success: true, id, status: parlayStatus });

  } catch (error: any) {
    console.error('❌ betting-log PUT:', error);
    return new NextResponse(error.message, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const authId = searchParams.get('userId') || 'dev-user';

    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'ID is required' }, { status: 400 });
    }

    const db = adminDb;
    const betRef = db.collection('bettingLog').doc(id);
    const doc = await betRef.get();

    if (!doc.exists) {
      return await deleteByParlayId(db, id, authId);
    }
    
    const data = doc.data();
    if (data?.userId !== authId) {
      return new NextResponse('Forbidden', { status: 403 });
    }

    const parlayId = data?.parlayId || data?.parlayid;
    if (parlayId) {
      return await deleteByParlayId(db, parlayId, authId);
    }

    await betRef.delete();
    return NextResponse.json({ success: true, message: 'Bet deleted' });

  } catch (error: any) {
    console.error('❌ DELETE Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

async function deleteByParlayId(db: any, pId: string, authId: string) {
  let snap = await db.collection('bettingLog').where('parlayId', '==', pId).get();
  if (snap.empty) {
    snap = await db.collection('bettingLog').where('parlayid', '==', pId).get();
  }

  if (!snap.empty) {
    const batch = db.batch();
     snap.docs.forEach((doc: any) => batch.delete(doc.ref));
    await batch.commit();
    return NextResponse.json({ success: true, message: `Deleted parlay with ${snap.size} legs` });
  }

  const directRef = db.collection('bettingLog').doc(pId);
  const directDoc = await directRef.get();
  if (directDoc.exists) {
    if (directDoc.data()?.userId !== authId) {
      return new NextResponse('Forbidden', { status: 403 });
    }
    await directRef.delete();
    return NextResponse.json({ success: true, message: 'Bet deleted' });
  }

  return NextResponse.json({ error: 'Bet not found' }, { status: 404 });
}
