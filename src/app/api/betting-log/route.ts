import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';


export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const player  = (searchParams.get('player') ?? '').trim().toLowerCase();
    const week    =  searchParams.get('week') ?? '';
    const cursor  =  searchParams.get('cursor') ?? '';
    const limit   = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);
    const weekNum = week && week !== 'all' ? parseInt(week, 10) : null;

    let q: any = adminDb.collection('bettingLog');
    if (weekNum !== null && !isNaN(weekNum)) q = q.where('week', '==', weekNum);

    const snap = await q.orderBy('createdAt', 'desc').limit(2000).get();
    const docs = snap.docs;

    const bets: any[] = [];
    const parlayMap = new Map<string, any[]>();

    for (const doc of docs) {
      const raw = doc.data();
      const parlayId = raw?.parlayId ?? raw?.parlayid ?? null;

      if (parlayId) {
        if (!parlayMap.has(parlayId)) parlayMap.set(parlayId, []);
        parlayMap.get(parlayId)!.push({ doc, raw });
        continue;
      }

      const hasLegsArray = Array.isArray(raw?.legs) && raw.legs.length > 0;
      if (hasLegsArray) {
        const stake = Number(raw.stake) || null;
        const odds  = Number(raw.odds)  || null;
        bets.push({
          id: doc.id, isParlay: raw.legs.length > 1,
          legs: raw.legs.map((l: any, i: number) => ({
            id: l.id ?? `${doc.id}-${i}`,
            player: l.player ?? l.playerteam ?? '',
            prop: l.prop ?? '', line: Number(l.line) || 0,
            selection: l.selection ?? 'Over', odds: Number(l.odds) || 0,
            matchup: l.matchup ?? '', week: Number(l.week ?? raw.week) || null,
            status: l.status ?? 'pending', gameDate: l.gameDate ?? raw.gameDate ?? null,
            team: l.team ?? '',
          })),
          week: Number(raw.week) || null, status: raw.status ?? 'pending',
          odds, stake, boost: raw.boost, isBonusBet: raw.isBonusBet,
          type: raw.type ?? raw.betType ?? raw.bettype,
          payout: stake && odds ? parseFloat((stake * (odds > 0 ? odds/100+1 : 100/Math.abs(odds)+1)).toFixed(2)) : null,
          createdAt: raw.createdAt?.toDate?.().toISOString() ?? raw.createdAt ?? null,
          gameDate: raw.gameDate ?? null,
        });
        continue;
      }

      // Single leg doc with no parlayid
      const stake = Number(raw.stake ?? raw.wager) || null;
      const odds  = typeof raw.odds === 'string' ? parseInt(raw.odds) : Number(raw.odds) || null;
      bets.push({
        id: doc.id, isParlay: false,
        legs: [{ id: doc.id, player: raw.player ?? raw.playerteam ?? '',
          prop: raw.prop ?? '', line: Number(raw.line) || 0,
          selection: raw.selection ?? 'Over', odds: odds || 0,
          matchup: raw.matchup ?? '', week: Number(raw.week) || null,
          status: raw.status ?? raw.result ?? 'pending',
          gameDate: raw.gameDate ?? raw.date ?? null, team: raw.team ?? '' }],
        week: Number(raw.week) || null, status: raw.status ?? raw.result ?? 'pending',
        odds, stake, boost: raw.boost, type: raw.type ?? raw.betType,
        payout: stake && odds ? parseFloat((stake * (odds > 0 ? odds/100+1 : 100/Math.abs(odds)+1)).toFixed(2)) : null,
        createdAt: raw.createdAt?.toDate?.().toISOString() ?? raw.createdAt ?? null,
        gameDate: raw.gameDate ?? raw.date ?? null,
      });
    }

    for (const [parlayId, entries] of parlayMap) {
      const header = entries.find(e => Number(e.raw.stake ?? e.raw.wager) > 0) ?? entries[0];
      const hr = header.raw;
      const stake = Number(hr.stake ?? hr.wager) || null;
      const odds  = typeof hr.odds === 'string' ? parseInt(hr.odds) : Number(hr.parlayOdds ?? hr.odds) || null;
      bets.push({
        id: parlayId, isParlay: entries.length > 1,
        legs: entries.map(({ doc, raw }) => ({
          id: doc.id, player: raw.player ?? raw.playerteam ?? '',
          prop: raw.prop ?? '', line: Number(raw.line) || 0,
          selection: raw.selection ?? 'Over',
          odds: typeof raw.odds === 'string' ? parseInt(raw.odds) : Number(raw.odds) || 0,
          matchup: raw.matchup ?? '', week: Number(raw.week) || null,
          status: raw.status ?? raw.result ?? 'pending',
          gameDate: raw.gameDate ?? raw.date ?? null, team: raw.team ?? '',
        })),
        week: Number(hr.week) || null, status: hr.status ?? hr.result ?? 'pending',
        odds, stake, boost: hr.boost, type: hr.type ?? hr.betType ?? hr.bettype,
        payout: stake && odds ? parseFloat((stake * (odds > 0 ? odds/100+1 : 100/Math.abs(odds)+1)).toFixed(2)) : null,
        createdAt: hr.createdAt?.toDate?.().toISOString() ?? hr.createdAt ?? hr.date ?? null,
        gameDate: hr.gameDate ?? hr.date ?? null,
      });
    }

    let result = player
      ? bets.filter(b => b.legs?.some((l: any) => (l.player ?? '').toLowerCase().includes(player)))
      : bets;

    result.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());

    let start = 0;
    if (cursor) { const i = result.findIndex(b => b.id === cursor); if (i !== -1) start = i + 1; }
    const page = result.slice(start, start + limit);
    const hasMore = start + limit < result.length;

    return NextResponse.json({ bets: page, hasMore, nextCursor: hasMore ? page[page.length-1]?.id : null, totalCount: result.length });
  } catch (error: any) {
    console.error('betting-log GET error:', error);
    return NextResponse.json({ error: error.message, bets: [] }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, userId, gameDate, legs, ...rest } = body;
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const col = adminDb.collection('bettingLog');
    const hasLost = (legs ?? []).some((l: any) => ['lost','loss'].includes((l.status ?? '').toLowerCase()));
    const allWon = (legs ?? []).length > 0 && (legs ?? []).every((l: any) => ['won','win'].includes((l.status ?? '').toLowerCase()));
    const status = rest.status ?? (hasLost ? 'lost' : allWon ? 'won' : 'pending');
    await col.doc(id).set({ ...rest, status, legs: legs ?? [], userId, ...(gameDate && { gameDate: new Date(gameDate + 'T12:00:00.000Z').toISOString() }), updatedAt: new Date().toISOString() }, { merge: true });
    return NextResponse.json({ success: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, userId, gameDate, legs, ...rest } = body;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const col = adminDb.collection('bettingLog');
    const hasLost = (legs ?? []).some((l: any) => ['lost','loss'].includes((l.status ?? '').toLowerCase()));
    const allWon  = (legs ?? []).length > 0 && (legs ?? []).every((l: any) => ['won','win'].includes((l.status ?? '').toLowerCase()));
    const status  = rest.status ?? (hasLost ? 'lost' : allWon ? 'won' : 'pending');

    const doc = {
      ...rest, status, userId, legs: legs ?? [],
      ...(gameDate && { gameDate: new Date(`${gameDate}T12:00:00.000Z`).toISOString() }),
      updatedAt: new Date().toISOString(),
    };

    if (id) {
      await col.doc(id).set(doc, { merge: true });
      return NextResponse.json({ success: true, id });
    } else {
      const ref = await col.add({ ...doc, createdAt: new Date().toISOString() });
      return NextResponse.json({ success: true, id: ref.id });
    }
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}