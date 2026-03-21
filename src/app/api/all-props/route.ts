// src/app/api/all-props/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic = 'force-dynamic';

// ─── Collection resolution ────────────────────────────────────────────────────
// NBA: nbaProps_{season} — single collection, gameDate-based
// NFL: allProps_{season} — falls back to unsuffixed 'allProps' for legacy data

function getCollections(league: string, season: string): string[] {
  if (league === 'nba') return [`nbaProps_${season}`];
  // NFL — try suffixed first, then legacy
  return [`allProps_${season}`, 'allProps'];
}

function dedupKey(d: any): string {
  return [
    (d.player    ?? d.playerName ?? '').toLowerCase().trim(),
    (d.prop      ?? d.propType   ?? '').toLowerCase().trim(),
    String(d.line ?? ''),
    (d.overUnder ?? d.overunder  ?? d['Over/Under'] ?? d.selection ?? '').toLowerCase().trim(),
    String(d.week ?? d.Week ?? ''),
    String(d.gameDate ?? d.date ?? ''),
    String(d.season ?? ''),
  ].join('|');
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;

  const league = (searchParams.get('league') || 'nfl').toLowerCase();
  const season = searchParams.get('season') || '2025';
  const week   = searchParams.get('week');
  const date   = searchParams.get('date');
  const offset = parseInt(searchParams.get('offset') || '0',  10);
  const limit  = Math.min(parseInt(searchParams.get('limit')  || '50', 10), 500);
  const search = (searchParams.get('search') || '').toLowerCase().trim();

  const collections = getCollections(league, season);
  const allDocs: any[] = [];

  try {
    for (const colName of collections) {
      let q: FirebaseFirestore.Query = adminDb.collection(colName);

      // ── Filtering ──────────────────────────────────────────────────────────
      if (league === 'nba') {
        // NBA: filter by gameDate (ISO "YYYY-MM-DD") not 'date'
        if (date) {
          q = q.where('gameDate', '==', date);
        }
        // If no date filter for NBA, return recent docs ordered by gameDate
        try {
          q = q.orderBy('gameDate', 'desc');
        } catch { /* index not ready — skip ordering */ }
      } else {
        // NFL: filter by week number
        if (week && week !== 'all') {
          q = q.where('week', '==', parseInt(week, 10));
        }
        // Order by confidenceScore for NFL (most enriched docs first)
        try {
          q = q.orderBy('confidenceScore', 'desc');
        } catch {
          try { q = q.orderBy('updatedAt', 'desc'); } catch {}
        }
      }

      // Fetch generously — dedup + search will trim it
      q = q.limit(offset + limit + 50);

      const snap = await q.get();
      for (const doc of snap.docs) {
        const data = doc.data();
        // Skip clearly empty docs (no player name)
        const player = data.player ?? data.playerName ?? data.Player ?? '';
        if (!player || player.toString().trim() === '') continue;

        allDocs.push({ id: doc.id, _col: colName, ...data });
      }
    }

    // ── Dedup across collections ───────────────────────────────────────────
    const seen    = new Set<string>();
    let deduped = allDocs.filter(d => {
      const key = dedupKey(d);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // ── Client-side search filter ─────────────────────────────────────────
    if (search) {
      deduped = deduped.filter(d => {
        const player  = (d.player  ?? d.playerName ?? '').toLowerCase();
        const team    = (d.team    ?? '').toLowerCase();
        const matchup = (d.matchup ?? '').toLowerCase();
        const prop    = (d.prop    ?? '').toLowerCase();
        return player.includes(search) || team.includes(search) ||
               matchup.includes(search) || prop.includes(search);
      });
    }

    // ── Normalize field names for consistent UI rendering ─────────────────
    const normalized = deduped.map(d => ({
      id:                d.id,
      league:            d.league            ?? league,
      player:            d.player            ?? d.playerName   ?? null,
      team:              d.team              ?? d.Team         ?? null,
      prop:              d.prop              ?? d.Prop         ?? null,
      line:              d.line              ?? d.Line         ?? null,
      overUnder:         d.overUnder         ?? d.overunder    ?? d['Over/Under'] ?? null,
      odds:              d.odds              ?? d.bestOdds     ?? null,
      bestOdds:          d.bestOdds          ?? d.odds         ?? null,
      bestBook:          d.bestBook          ?? null,
      matchup:           d.matchup           ?? d.Matchup      ?? null,
      gameDate:          d.gameDate          ?? d.date         ?? null,
      week:              d.week              ?? d.Week         ?? null,
      season:            d.season            ?? d.Season       ?? null,
      // Enrichment
      playerAvg:         d.playerAvg         ?? null,
      seasonHitPct:      d.seasonHitPct      ?? null,
      opponentRank:      d.opponentRank      ?? null,
      opponentAvgVsStat: d.opponentAvgVsStat ?? null,
      scoreDiff:         d.scoreDiff         ?? null,
      confidenceScore:   d.confidenceScore   ?? null,
      projWinPct:        d.projWinPct        ?? null,
      avgWinProb:        d.avgWinProb        ?? null,
      bestEdgePct:       d.bestEdgePct       ?? null,
      expectedValue:     d.expectedValue     ?? null,
      kellyPct:          d.kellyPct          ?? null,
      valueIcon:         d.valueIcon         ?? null,
      impliedProb:       d.impliedProb       ?? null,
      fdOdds:            d.fdOdds            ?? null,
      dkOdds:            d.dkOdds            ?? null,
      // Post-game
      gameStat:          d.gameStat          ?? d.actualStat   ?? null,
      actualResult:      d.actualResult      ?? d.result       ?? null,
      // IDs
      bdlId:             d.bdlId             ?? null,
      brid:              d.brid              ?? null,
    }));

    const total = normalized.length;
    const page  = normalized.slice(offset, offset + limit);

    return NextResponse.json(page, {
      headers: {
        'Cache-Control': 'private, no-store',
        'X-Total-Count': String(total),
      },
    });

  } catch (err: any) {
    console.error('[GET /api/all-props]', { league, season, error: err.message });
    return NextResponse.json({ error: 'Failed to load props' }, { status: 500 });
  }
}