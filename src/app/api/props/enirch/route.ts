import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));

    const league = body.league || 'nfl';
    const season = body.season || 2024;
    const week = body.week || null;
    const date = body.date || null;

    const collection =
      league === 'nfl'
        ? 'allProps'
        : 'nbaProps_2025';

    let query: FirebaseFirestore.Query = adminDb.collection(collection);

    if (league === 'nfl' && week) {
      query = query.where('week', '==', Number(week));
    }

    if (league === 'nba' && date) {
      query = query.where('gameDate', '==', date);
    }

    const snapshot = await query.get();

    if (snapshot.empty) {
      return NextResponse.json({
        success: true,
        message: 'No props found to enrich.'
      });
    }

    const batch = adminDb.batch();

    snapshot.docs.forEach((doc) => {
      batch.update(doc.ref, {
        enriched: false,
        lastEnriched: null,
        status: 'pending'
      });
    });

    await batch.commit();

    return NextResponse.json({
      success: true,
      count: snapshot.size,
      message: 'Props marked for enrichment.'
    });
  } catch (err) {
    console.error('[POST /api/props/enrich] Error:', err);
    return NextResponse.json(
      { error: 'Failed to trigger enrichment.' },
      { status: 500 }
    );
  }
}
