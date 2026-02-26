// src/app/api/all-props/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

// ─── Field normalizer ─────────────────────────────────────────────────────────
// Firestore docs have BOTH spaced ("game date") and camelCase ("gamedate") variants.
// This pulls the right value regardless of which key is present.

function pick(data: any, ...keys: string[]): any {
  for (const k of keys) {
    if (data[k] !== undefined && data[k] !== null && data[k] !== '') return data[k];
  }
  return null;
}

function normalizeProp(data: any, docId: string) {
  // Season: derived from migratedFrom field ("allProps_2025" → 2025)
  // or from doc ID pattern (e.g. _w14_ doesn't include season, but migratedFrom does)
  const migratedFrom: string = data.migratedFrom ?? '';
  const seasonMatch = migratedFrom.match(/(\d{4})/);
  const season = seasonMatch ? parseInt(seasonMatch[1]) : null;

  // Game date — stored as "game date" (spaced), "gamedate", or ISO string directly
  const rawGameDate = pick(data, 'game date', 'gamedate', 'gameDate', 'date', 'Game Date');

  // Prop name — stored as "prop" with title case e.g. "Rec Yards"
  const prop = pick(data, 'prop', 'Prop') ?? '';

  // Over/Under — "over under" (spaced) or "overunder"
  const overUnder = pick(data, 'over under', 'overunder', 'overUnder', 'Over/Under?') ?? '';

  return {
    id:        docId,
    player:    pick(data, 'player', 'Player') ?? '',
    prop,
    line:      pick(data, 'line', 'Line') ?? 0,
    week:      pick(data, 'week', 'Week') ?? null,
    matchup:   pick(data, 'matchup', 'Matchup') ?? '',
    team:      pick(data, 'team', 'Team') ?? '',
    overUnder,
    gameDate:  rawGameDate,
    gameTime:  pick(data, 'game time', 'gametime', 'gameTime', 'Game Time') ?? '',
    season,
    migratedFrom,
    // Stats
    actualResult:     pick(data, 'actual stats', 'actualstats', 'actualResult') ?? '',
    playerAvg:        pick(data, 'player avg', 'playeravg', 'playerAvg') ?? null,
    opponentRank:     pick(data, 'opponent rank', 'opponentrank', 'opponentRank') ?? null,
    seasonHitPct:     pick(data, 'season hit %', 'seasonhit', 'seasonHitPct') ?? null,
    projWinPct:       pick(data, 'proj win %', 'projwin', 'projWinPct') ?? null,
    confidenceScore:  pick(data, 'confidence score', 'confidencescore', 'confidenceScore') ?? null,
  };
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerQ = (searchParams.get('player') ?? '').trim().toLowerCase();
    const propQ   = (searchParams.get('prop')   ?? '').trim().toLowerCase();
    const weekQ   =  searchParams.get('week')   ?? '';
    const seasonQ =  searchParams.get('season') ?? 'all';

    // ── Firestore query ────────────────────────────────────────────────────────
    // Only filter by `week` server-side (single where clause, no orderBy → no index needed).
    // All other filters applied in-memory to avoid composite index errors.

    let q: FirebaseFirestore.Query = adminDb.collection('allProps');

    const weekNum = weekQ && weekQ !== 'all' ? parseInt(weekQ, 10) : null;
    if (weekNum !== null && !isNaN(weekNum)) {
      q = q.where('week', '==', weekNum);
    }

    // Fetch — cap at 5000 to avoid runaway reads
    const snapshot = await q.limit(5000).get();
    console.log(`📦 allProps raw: ${snapshot.size} docs (week filter: ${weekNum ?? 'none'})`);

    // ── Normalize ──────────────────────────────────────────────────────────────
    let props = snapshot.docs.map(doc => normalizeProp(doc.data(), doc.id));

    // ── In-memory filters ──────────────────────────────────────────────────────

    // Season filter — match against season derived from migratedFrom
    if (seasonQ !== 'all') {
      const seasonNum = parseInt(seasonQ, 10);
      props = props.filter(p => p.season === seasonNum);
    }

    // Prop type filter — case-insensitive contains match
    // (stored as "Rec Yards", UI may send "REC YARDS" or "rec yards")
    if (propQ) {
      props = props.filter(p => p.prop.toLowerCase().includes(propQ));
    }

    // Player filter — case-insensitive contains match
    if (playerQ) {
      props = props.filter(p => p.player.toLowerCase().includes(playerQ));
    }

    // ── Sort by week desc then player asc ──────────────────────────────────────
    props.sort((a, b) => {
      const wDiff = (b.week ?? 0) - (a.week ?? 0);
      if (wDiff !== 0) return wDiff;
      return a.player.localeCompare(b.player);
    });

    // ── Collect unique prop types for dropdown ─────────────────────────────────
    const propTypes = [...new Set(
      snapshot.docs
        .map(d => (d.data().prop ?? d.data().Prop ?? '') as string)
        .filter(Boolean)
    )].sort();

    return NextResponse.json({ props, propTypes, total: props.length });

  } catch (error: any) {
    console.error('❌ all-props route:', error);
    return NextResponse.json({ error: error.message, props: [], propTypes: [] }, { status: 500 });
  }
}