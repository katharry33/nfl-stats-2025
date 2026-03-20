import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

// ─── Collection resolution ────────────────────────────────────────────────────
function getCollections(league: string, season: string): string[] {
  if (league === 'nba') {
    // 2024: Logs + Summaries
    if (season === '2024') return ['nbaProps_2024', 'nbaAverages_2024'];
    
    // 2025: Live Daily + Logs + Summaries
    if (season === '2025') {
      return ['nbaPropsDaily_2025', 'nbaProps_2025', 'nbaAverages_2025'];
    }
    
    // Default: Return latest 2025 data
    return ['nbaPropsDaily_2025', 'nbaProps_2025', 'nbaAverages_2025'];
  }

  // NFL — all data in 'allProps' or 'allProps_2025'
  return ['allProps', 'allProps_2025'];
}

function dedupKey(d: any): string {
  return [
    (d.player    ?? d.playerName ?? '').toLowerCase().trim(),
    (d.prop      ?? d.propType   ?? '').toLowerCase().trim(),
    String(d.line ?? ''),
    (d.overUnder ?? d['over under'] ?? d['Over/Under'] ?? d.selection ?? '').toLowerCase().trim(),
    String(d.week ?? d.Week ?? ''),
    String(d.date ?? d.gameDate ?? ''), // Check both date keys
    String(d.season ?? ''),
  ].join('|');
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);

  const league = (searchParams.get('league') || 'nba').toLowerCase();
  const season = searchParams.get('season') || '2025';  
  const week   = searchParams.get('week');             
  const date   = searchParams.get('date');
  const offset = parseInt(searchParams.get('offset') || '0', 10);
  const limit  = Math.min(parseInt(searchParams.get('limit') || '50', 10), 500);

  const collections = getCollections(league, season);
  const allDocs: any[] = [];

  try {
    for (const colName of collections) {
      let q: FirebaseFirestore.Query = adminDb.collection(colName);

      // --- NBA Filter ---
      // If filtering by date, check 'date' field (matches your sync script)
      if (league === 'nba' && date) {
        q = q.where('date', '==', date);
      } 
      // --- NFL Filter ---
      else if (league === 'nfl' && week) {
        q = q.where('week', '==', parseInt(week, 10));
      }

      // Ordering logic: attempt 'date' then 'gameDate' fallback
      try { 
        q = q.orderBy('date', 'desc'); 
      } catch {
        try { q = q.orderBy('gameDate', 'desc'); } catch {}
      }

      // Fetch more than limit to ensure enough data remains after deduplication
      q = q.limit(offset + limit + 20);

      const snap = await q.get();
      for (const doc of snap.docs) {
        const data = doc.data();
        allDocs.push({
          id: doc.id,
          _sourceCollection: colName,
          // Tag summaries so the UI can style them differently
          type: data.type || (colName.includes('Average') ? 'season_summary' : 'game_log'),
          ...data,
        });
      }
    }

    // Deduplicate across collections
    const seen    = new Set<string>();
    const deduped = allDocs.filter(d => {
      const key = dedupKey(d);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const page = deduped.slice(offset, offset + limit);

    return NextResponse.json(page, {
      headers: { 'Cache-Control': 'private, no-store' },
    });
  } catch (error: any) {
    console.error('[GET /api/all-props]', { league, season, error: error.message });
    return NextResponse.json({ error: 'Failed to load props' }, { status: 500 });
  }
}