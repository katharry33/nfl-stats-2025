// src/app/api/all-props/route.ts
// Supports: ?player=&week=&propType=&season=2024|2025

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

// Map season → Firestore collection name
const SEASON_COLLECTION: Record<string, string> = {
  '2024': 'allProps_2024',
  '2025': 'allProps_2025',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const season   = searchParams.get('season')   || '2025';
  const player   = searchParams.get('player')   || '';
  const week     = searchParams.get('week')     || '';
  const propType = searchParams.get('propType') || '';

  const collection = SEASON_COLLECTION[season] ?? 'allProps_2025';

  try {
    let query: FirebaseFirestore.Query = adminDb.collection(collection);

    // Server-side filters — Firestore only supports equality/range on indexed fields.
    // Player search uses a prefix range query (case-sensitive), so we normalize to
    // Title Case on write and query accordingly.
    if (player) {
      // Case-insensitive prefix: store players in Title Case, query the same way
      const titlePlayer = player
        .toLowerCase()
        .replace(/\b\w/g, c => c.toUpperCase());

      query = query
        .where('player', '>=', titlePlayer)
        .where('player', '<=', titlePlayer + '\uf8ff')
        .orderBy('player');
    }

    if (week) {
      query = query.where('week', '==', parseInt(week, 10));
    }

    if (propType && propType !== 'All Props') {
      query = query.where('prop', '==', propType);
    }

    // Default sort when not filtering by player
    if (!player) {
      query = query.orderBy('gameDate', 'desc');
    }

    // Cap results — historical page is search-driven, not a full dump
    query = query.limit(500);

    const snapshot = await query.get();
    const docs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));

    return NextResponse.json(docs, {
      headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' },
    });
  } catch (error: any) {
    console.error('[GET /api/all-props]', error);
    return NextResponse.json(
      { error: error?.message ?? 'Failed to fetch props' },
      { status: 500 }
    );
  }
}