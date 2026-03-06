import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

// Helper to ensure dates are ISO strings for Firestore sorting
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

// GET: Fetching bets with pagination and user filtering
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId  = searchParams.get('userId'); // CRITICAL: Only get current user's bets
    const player  = (searchParams.get('player') ?? '').trim().toLowerCase();
    const week    = searchParams.get('week') ?? '';
    const cursor  = searchParams.get('cursor') ?? '';
    const limit   = Math.min(parseInt(searchParams.get('limit') ?? '50'), 200);

    if (!userId) return NextResponse.json({ error: 'UserId required', bets: [] }, { status: 400 });

    let q: any = adminDb.collection('bettingLog');
    
    const weekNum = week && week !== 'all' ? parseInt(week, 10) : null;
    if (weekNum !== null && !isNaN(weekNum)) q = q.where('week', '==', weekNum);

    const snap = await q.orderBy('createdAt', 'desc').limit(1000).get();
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
    
      const stake = Number(raw.stake ?? raw.wager) || null;
      const odds  = typeof raw.odds === 'string' ? parseInt(raw.odds) : Number(raw.odds) || null;
      const payout = stake && odds ? parseFloat((stake * (odds > 0 ? odds/100+1 : 100/Math.abs(odds)+1)).toFixed(2)) : null;
    
      const hasLegsArray = Array.isArray(raw?.legs) && raw.legs.length > 0;
      if (hasLegsArray) {
        bets.push({
          id: doc.id, isParlay: raw.legs.length > 1,
          legs: raw.legs.map((l: any, i: number) => ({
            ...l, id: l.id ?? `${doc.id}-${i}`,
            line: Number(l.line) || 0, odds: Number(l.odds) || 0,
          })),
          ...raw, payout,
          createdAt: raw.createdAt?.toDate?.().toISOString() ?? raw.createdAt ?? null,
        });
        continue;
      }
    
      // Single leg doc (no legs array, no parlayId)
      bets.push({
        id: doc.id, isParlay: false,
        legs: [{ id: doc.id, player: raw.player ?? raw.playerteam ?? '',
          prop: raw.prop ?? '', line: Number(raw.line) || 0,
          selection: raw.selection ?? 'Over', odds: odds || 0,
          matchup: raw.matchup ?? '', week: Number(raw.week) || null,
          status: raw.status ?? raw.result ?? 'pending',
          gameDate: raw.gameDate ?? raw.date ?? null, team: raw.team ?? '' }],
        ...raw, payout,
        createdAt: raw.createdAt?.toDate?.().toISOString() ?? raw.createdAt ?? null,
      });
    }
    
    // Process legacy parlays
    for (const [parlayId, entries] of parlayMap) {
      const header = entries.find(e => Number(e.raw.stake ?? e.raw.wager) > 0) ?? entries[0];
      const hr = header.raw;
      const stake = Number(hr.stake ?? hr.wager) || null;
      const odds = typeof hr.odds === 'string' ? parseInt(hr.odds) : Number(hr.parlayOdds ?? hr.odds) || null;
      bets.push({
        id: parlayId, isParlay: entries.length > 1,
        legs: entries.map(({ doc, raw }: any) => ({
          id: doc.id, player: raw.player ?? raw.playerteam ?? '',
          prop: raw.prop ?? '', line: Number(raw.line) || 0,
          selection: raw.selection ?? 'Over',
          odds: typeof raw.odds === 'string' ? parseInt(raw.odds) : Number(raw.odds) || 0,
          matchup: raw.matchup ?? '', week: Number(raw.week) || null,
          status: raw.status ?? raw.result ?? 'pending',
          gameDate: raw.gameDate ?? raw.date ?? null, team: raw.team ?? '',
        })),
        ...hr, odds, stake,
        payout: stake && odds ? parseFloat((stake * (odds > 0 ? odds/100+1 : 100/Math.abs(odds)+1)).toFixed(2)) : null,
        createdAt: hr.createdAt?.toDate?.().toISOString() ?? hr.createdAt ?? hr.date ?? null,
        gameDate: hr.gameDate ?? hr.date ?? null,
      });
    }

    const userBets = bets.filter(b => b.userId === userId || !b.userId);

    let result = player
      ? userBets.filter(b => b.legs?.some((l: any) => (l.player ?? '').toLowerCase().includes(player)))
      : userBets;

    result.sort((a, b) => new Date(b.createdAt ?? 0).getTime() - new Date(a.createdAt ?? 0).getTime());

    let start = 0;
    if (cursor) {
      const i = result.findIndex(b => b.id === cursor);
      if (i !== -1) start = i + 1;
    }
    const page = result.slice(start, start + limit);
    const hasMore = start + limit < result.length;

    return NextResponse.json({
      bets: page,
      hasMore,
      nextCursor: hasMore ? page[page.length - 1]?.id : null,
      totalCount: result.length,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, bets: [] }, { status: 500 });
  }
}

// POST: Save or Create
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, userId, gameDate, legs, ...rest } = body;
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const col = adminDb.collection('bettingLog');
    
    const hasLost = (legs ?? []).some((l: any) => ['lost','loss'].includes((l.status ?? '').toLowerCase()));
    const allWon  = (legs ?? []).length > 0 && (legs ?? []).every((l: any) => ['won','win'].includes((l.status ?? '').toLowerCase()));
    const status  = rest.status ?? (hasLost ? 'lost' : allWon ? 'won' : 'pending');
    
    const docData = {
      ...rest,
      status,
      userId,
      legs: legs ?? [],
      gameDate: processGameDate(gameDate),
      updatedAt: new Date().toISOString(),
    };

    const cleanDoc = Object.fromEntries(Object.entries(docData).filter(([_, v]) => v !== undefined));

    if (id) {
       await col.doc(id).set(cleanDoc, { merge: true });
    } else {
       await col.add({ ...cleanDoc, createdAt: new Date().toISOString() });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE: Bulk support
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const idParam = searchParams.get('id');
    if (!idParam) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const ids = idParam.split(',');
    const batch = adminDb.batch();
    const col = adminDb.collection('bettingLog');

    ids.forEach(id => {
      batch.delete(col.doc(id));
    });

    // Handle legacy parlays
    const legSnaps = await Promise.all(ids.map(id => col.where('parlayId', '==', id).get()));
    legSnaps.forEach(snap => snap.forEach(doc => batch.delete(doc.ref)));

    await batch.commit();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
