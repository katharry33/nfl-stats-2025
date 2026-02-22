// src/app/api/static-data/player-teams/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';

const COL = 'static_playerTeamMapping';

export async function GET() {
  try {
    const snap = await adminDb.collection(COL).orderBy('playerName').get();
    return NextResponse.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { playerName, team } = await req.json();
  if (!playerName?.trim() || !team?.trim())
    return NextResponse.json({ error: 'playerName and team required' }, { status: 400 });
  const ref = await adminDb.collection(COL).add({
    playerName: playerName.trim(),
    team: team.trim().toUpperCase(),
    createdAt: Timestamp.now(),
    updatedAt: Timestamp.now(),
  });
  return NextResponse.json({ id: ref.id });
}

export async function PUT(req: NextRequest) {
  const { id, playerName, team } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await adminDb.collection(COL).doc(id).update({
    playerName: playerName.trim(),
    team: team.trim().toUpperCase(),
    updatedAt: FieldValue.serverTimestamp(),
  });
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  await adminDb.collection(COL).doc(id).delete();
  return NextResponse.json({ success: true });
}