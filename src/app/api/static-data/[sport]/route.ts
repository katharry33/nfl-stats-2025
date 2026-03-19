import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

export async function GET(req: NextRequest, { params }: { params: { sport: string, type: string } }) {
  const { sport, type } = params;
  const { searchParams } = new URL(req.url);
  
  // Determine collection based on type
  let colName = '';
  if (type === 'registry') colName = sport === 'nba' ? 'static_nbaIdMap' : 'static_pfrIdMap';
  else if (type === 'teams') colName = 'static_playerTeamMapping'; // Unified for now
  else if (type === 'schedule') colName = 'static_schedule';

  try {
    let q: FirebaseFirestore.Query = adminDb.collection(colName);

    // Apply filters for Schedule
    if (type === 'schedule') {
      const season = searchParams.get('season');
      const week = searchParams.get('week');
      const league = searchParams.get('league') || sport;
      
      q = q.where('league', '==', league);
      if (season) q = q.where('season', '==', parseInt(season, 10));
      if (week && week !== 'All') q = q.where('week', '==', parseInt(week, 10));
      q = q.orderBy('week', 'asc');
    } else {
      q = q.orderBy('player', 'asc');
    }

    const snap = await q.get();
    return NextResponse.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: { sport: string, type: string } }) {
  const { sport, type } = params;
  const body = await req.json();
  let colName = '';
  if (type === 'registry') colName = sport === 'nba' ? 'static_nbaIdMap' : 'static_pfrIdMap';
  else if (type === 'teams') colName = 'static_playerTeamMapping';
  else if (type === 'schedule') colName = 'static_schedule';

  const data: any = { 
    ...body, 
    league: sport, 
    updatedAt: Timestamp.now(), 
    createdAt: Timestamp.now() 
  };

  const ref = await adminDb.collection(colName).add(data);
  return NextResponse.json({ id: ref.id });
}

export async function DELETE(req: NextRequest, { params }: { params: { sport: string, type: string } }) {
  const { type } = params;
  const { id } = await req.json();
  let colName = '';
  if (type === 'registry') colName = params.sport === 'nba' ? 'static_nbaIdMap' : 'static_pfrIdMap';
  else if (type === 'teams') colName = 'static_playerTeamMapping';
  else if (type === 'schedule') colName = 'static_schedule';

  await adminDb.collection(colName).doc(id).delete();
  return NextResponse.json({ success: true });
}