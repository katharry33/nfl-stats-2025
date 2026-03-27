// app/api/props/manual/route.ts
import { NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase/admin';

function colName(league: 'nba' | 'nfl', season: number) {
  return `${league}Props_${season}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { league, season, player, team, prop, line, overUnder, matchup, gameDate, odds } = body;
    if (!league || !season || !player || !prop || line == null)
      return NextResponse.json({ error: 'league, season, player, prop, and line are required' }, { status: 400 });

    const slug  = player.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const docId = `manual-${slug}-${prop}-${line}-${(overUnder ?? 'over').toLowerCase()}-${gameDate ?? 'undated'}`;
    const doc   = {
      player, team: team ?? '', prop, line: Number(line),
      overUnder: overUnder ?? 'Over', matchup: matchup ?? '',
      gameDate: gameDate ?? null, odds: odds != null ? Number(odds) : null,
      season: Number(season), league, source: 'manual',
      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    await db.collection(colName(league, Number(season))).doc(docId).set(doc, { merge: true });
    return NextResponse.json({ success: true, id: docId });
  } catch (e: any) {
    console.error('[manual/POST]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, league, season, ...fields } = body;
    if (!id || !league || !season)
      return NextResponse.json({ error: 'id, league, season are required' }, { status: 400 });

    const update: Record<string, any> = { ...fields, updatedAt: new Date().toISOString() };
    if (fields.line != null) update.line = Number(fields.line);
    if (fields.odds != null) update.odds = Number(fields.odds);
    Object.keys(update).forEach((k) => update[k] === undefined && delete update[k]);

    await db.collection(colName(league, Number(season))).doc(id).update(update);
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[manual/PUT]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const id     = searchParams.get('id');
    const league = searchParams.get('league') as 'nba' | 'nfl';
    const season = Number(searchParams.get('season'));
    if (!id || !league || !season)
      return NextResponse.json({ error: 'id, league, season are required' }, { status: 400 });

    await db.collection(colName(league, season)).doc(id).delete();
    return NextResponse.json({ success: true });
  } catch (e: any) {
    console.error('[manual/DELETE]', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}