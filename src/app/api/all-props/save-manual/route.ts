// src/app/api/all-props/save-manual/route.ts
// Persists manually entered props to the allProps collection so they're
// searchable from the Historical Props page going forward.

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function POST(request: NextRequest) {
  try {
    const { legs } = await request.json();

    if (!Array.isArray(legs) || legs.length === 0) {
      return NextResponse.json({ error: 'No legs provided' }, { status: 400 });
    }

    const batch = adminDb.batch();

    for (const leg of legs) {
      if (!leg.player || !leg.prop) continue;

      // Deterministic doc ID: player-prop-line (lowercased, slugified)
      const slug = `${leg.player}-${leg.prop}-${leg.line ?? '0'}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 200);

      const ref = adminDb.collection('allProps').doc(slug);

      batch.set(ref, {
        // Normalized field names matching the existing allProps schema
        player:       String(leg.player).trim(),
        prop:         String(leg.prop).trim(),
        line:         Number(leg.line)  || 0,
        week:         Number(leg.week)  || null,
        'over under': String(leg.selection ?? 'Over'),
        team:         String(leg.team     ?? '').toUpperCase(),
        matchup:      String(leg.matchup  ?? ''),
        'game date':  leg.gameDate ?? '',
        odds:         Number(leg.odds)   || -110,
        isManual:     true,
        migratedFrom: 'allProps_2025',   // so season extraction returns 2025
        createdAt:    FieldValue.serverTimestamp(),
        updatedAt:    FieldValue.serverTimestamp(),
      }, { merge: true }); // merge:true so re-entering same prop updates it
    }

    await batch.commit();
    return NextResponse.json({ success: true, saved: legs.length });

  } catch (error: any) {
    console.error('❌ save-manual-props:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}