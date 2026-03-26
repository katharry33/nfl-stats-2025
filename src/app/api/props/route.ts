import { NextResponse } from 'next/server';
import { fetchPaginatedProps } from '@/lib/services/props-service';

export const dynamic = 'force-dynamic';

// ─── Matchup Normalizer ───────────────────────────────────────────────────────
// The NBA ingest stores homeTeam / awayTeam separately but doesn't write a
// `matchup` field. BettingPros enrichment sometimes writes the full URL there.
// We normalise here so every row gets a clean "ATL @ BOS" string.

function normalizeMatchup(item: Record<string, any>): string {
  const raw = item.matchup as string | undefined;

  // If the stored value is already a clean abbreviation matchup, keep it
  if (raw && !raw.startsWith('http') && raw.length < 20) return raw;

  // Reconstruct from separate team fields (present in NBA ingest docs)
  const away = item.awayTeam ?? item.away_team;
  const home = item.homeTeam ?? item.home_team;
  if (away && home) return `${away} @ ${home}`;

  // Fallback: nothing useful
  return '—';
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const cursor = searchParams.get('cursor') ?? undefined;
  const pageSize = searchParams.has('pageSize') ? Number(searchParams.get('pageSize')) : 50;

  const league = searchParams.get('sport') as 'nba' | 'nfl';
  let season = searchParams.has('season') ? Number(searchParams.get('season')) : undefined;

  // NBA 2025-26 season data is stored under the 2025 start-year key
  if (league === 'nba' && season === 2026) season = 2025;

  const filters = {
    league,
    season,
    date: searchParams.get('date') ?? undefined,
    week: searchParams.has('week') ? Number(searchParams.get('week')) : undefined,
    search: searchParams.get('search') ?? undefined,
    pageSize,
  };

  if (!filters.league) {
    return NextResponse.json({ error: "The 'sport' parameter is mandatory." }, { status: 400 });
  }

  try {
    const result = await fetchPaginatedProps(filters, cursor);

    // Normalise each document before sending to the client
    const items = (result.docs ?? []).map((doc: Record<string, any>) => ({
      ...doc,
      matchup: normalizeMatchup(doc),
    }));

    return NextResponse.json({
      items,
      total: items.length,
      cursor: result.lastVisible ? result.lastVisible.id : null,
    });
  } catch (error: any) {
    console.error('[API_ERROR] Failed to fetch props:', { error: error.message, filters });
    return NextResponse.json(
      { error: error.message || 'An internal server error occurred.' },
      { status: 500 }
    );
  }
}