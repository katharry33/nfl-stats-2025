
import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import admin from 'firebase-admin';

export async function POST(req: Request) {
  const data = await req.json();
  
  // Save to the GLOBAL searchable collection
  await adminDb.collection('allProps').add({
    player: data.player,
    prop: data.prop,
    line: Number(data.line),
    team: data.team,
    isManual: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp()
  });

  return NextResponse.json({ success: true });
}
