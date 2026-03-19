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

      // 1. Identify the League and Season
      const league = (leg.league || 'nfl').toLowerCase();
      const season = leg.season || 2025;

      // 2. Determine target collection
      // Matches your GET route logic: nbaProps_2025 or allProps_2025
      const colPrefix = league === 'nba' ? 'nbaProps' : 'allProps';
      const colName = `${colPrefix}_${season}`;

      // 3. Deterministic doc ID (slugified)
      // Including league in slug prevents collisions (e.g., same name in different sports)
      const slug = `${league}-${leg.player}-${leg.prop}-${leg.line ?? '0'}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 200);

      const ref = adminDb.collection(colName).doc(slug);

      batch.set(ref, {
        // Core Identification
        league:       league,
        player:       String(leg.player).trim(),
        prop:         String(leg.prop).trim(),
        line:         Number(leg.line)  || 0,
        week:         Number(leg.week)  || null,
        season:       Number(season),
        
        // Normalized field names (supporting your legacy 'pick' logic)
        'over under': String(leg.selection ?? 'Over'),
        team:         String(leg.team     ?? '').toUpperCase(),
        matchup:      String(leg.matchup  ?? ''),
        'game date':  leg.gameDate ?? '',
        gameDate:     leg.gameDate ?? '', // duplicate for NBA sorting
        odds:         Number(leg.odds)   || -110,
        
        // Metadata
        isManual:     true,
        migratedFrom: colName, 
        createdAt:    FieldValue.serverTimestamp(),
        updatedAt:    FieldValue.serverTimestamp(),
      }, { merge: true }); 
    }

    await batch.commit();
    return NextResponse.json({ success: true, saved: legs.length });

  } catch (error: any) {
    console.error('❌ save-manual-props error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}