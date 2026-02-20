// src/app/api/props/[id]/route.ts
// PATCH /api/props/:id  — update bet amount, status, parlay ID, notes

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { Timestamp } from 'firebase-admin/firestore';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await req.json();

    // Only allow safe fields to be updated client-side
    const allowed = ['betAmount', 'betStatus', 'parlayId', 'notes', 'overUnder'];
    const update: Record<string, unknown> = { updatedAt: Timestamp.now() };

    for (const key of allowed) {
      if (key in body) update[key] = body[key];
    }

    if (Object.keys(update).length === 1) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    // We need season + week to locate the document
    const { season = 2025, week } = body;
    if (!week) return NextResponse.json({ error: 'week required' }, { status: 400 });

    const ref = adminDb
      .collection('seasons').doc(String(season))
      .collection('weeks').doc(String(week))
      .collection('props').doc(id);

    await ref.update(update);

    return NextResponse.json({ success: true, id });
  } catch (err) {
    console.error('[/api/props/:id] Error:', err);
    return NextResponse.json({ error: 'Failed to update prop' }, { status: 500 });
  }
}