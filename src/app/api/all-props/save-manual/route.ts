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

      // 1. Identify the League
      const league = (leg.league || 'nfl').toLowerCase();
      
      // 2. Determine target collection - all manual props go to a master collection
      const colName = 'allProps';

      // 3. Deterministic doc ID (slugified)
      // Including league in slug prevents collisions (e.g., same name in different sports)
      const slug = `${league}-${leg.player}-${leg.prop}-${leg.line ?? '0'}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 200);

      const ref = adminDb.collection(colName).doc(slug);
      
      const batchData = {
        ...leg,
        league: league, // Force lowercase for consistency
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        isManual: true,
      };

      batch.set(ref, batchData, { merge: true }); 
    }

    await batch.commit();
    return NextResponse.json({ success: true, saved: legs.length });

  } catch (error: any) {
    console.error('❌ save-manual-props error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}