// src/app/api/all-props/options/route.ts
// Returns filter metadata for a given season: weeks, propTypes, totalVolume
// ?season=2024|2025

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

const SEASON_COLLECTION: Record<string, string> = {
  '2024': 'allProps_2024',
  '2025': 'allProps_2025',
};

// Cache results in memory per season — this rarely changes
const optionsCache: Record<string, { data: any; cachedAt: number }> = {};
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

export async function GET(request: NextRequest) {
  const season     = new URL(request.url).searchParams.get('season') || '2025';
  const collection = SEASON_COLLECTION[season] ?? 'allProps_2025';

  // Return from cache if fresh
  const cached = optionsCache[season];
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    // Fetch only the fields we need for filter options — avoids reading full docs
    const snapshot = await adminDb
      .collection(collection)
      .select('week', 'prop')
      .get();

    const weekSet    = new Set<number>();
    const propSet    = new Set<string>();

    for (const doc of snapshot.docs) {
      const data = doc.data();
      if (data.week)  weekSet.add(Number(data.week));
      if (data.prop)  propSet.add(String(data.prop));
    }

    const weeks = Array.from(weekSet)
      .filter(w => !isNaN(w))
      .sort((a, b) => a - b);

    const propTypes = [
      'All Props',
      ...Array.from(propSet).sort(),
    ];

    const result = {
      weeks,
      propTypes,
      totalVolume: snapshot.size,
      season,
      collection,
    };

    optionsCache[season] = { data: result, cachedAt: Date.now() };

    return NextResponse.json(result, {
      headers: { 'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=1200' },
    });
  } catch (error: any) {
    console.error('[GET /api/all-props/options]', error);
    return NextResponse.json(
      { error: error?.message ?? 'Failed to fetch options' },
      { status: 500 }
    );
  }
}