import { NextResponse } from 'next/server';
import { fetchPaginatedProps } from '@/lib/services/props-service';

export const dynamic = 'force-dynamic';

// ─── Team slug → abbreviation ─────────────────────────────────────────────────

const SLUG_MAP: Record<string, string> = {
  // NBA
  'atlanta-hawks':'ATL','boston-celtics':'BOS','brooklyn-nets':'BKN',
  'charlotte-hornets':'CHA','chicago-bulls':'CHI','cleveland-cavaliers':'CLE',
  'dallas-mavericks':'DAL','denver-nuggets':'DEN','detroit-pistons':'DET',
  'golden-state-warriors':'GSW','houston-rockets':'HOU','indiana-pacers':'IND',
  'los-angeles-clippers':'LAC','los-angeles-lakers':'LAL','memphis-grizzlies':'MEM',
  'miami-heat':'MIA','milwaukee-bucks':'MIL','minnesota-timberwolves':'MIN',
  'new-orleans-hornets':'NOP','new-orleans-pelicans':'NOP','new-york-knicks':'NYK',
  'oklahoma-city-thunder':'OKC','orlando-magic':'ORL','philadelphia-76ers':'PHI',
  'phoenix-suns':'PHX','portland-trail-blazers':'POR','sacramento-kings':'SAC',
  'san-antonio-spurs':'SAS','toronto-raptors':'TOR','utah-jazz':'UTA',
  'washington-wizards':'WAS',
  // NFL
  'arizona-cardinals':'ARI','baltimore-ravens':'BAL','buffalo-bills':'BUF',
  'carolina-panthers':'CAR','cincinnati-bengals':'CIN','cleveland-browns':'CLE',
  'dallas-cowboys':'DAL','denver-broncos':'DEN','detroit-lions':'DET',
  'green-bay-packers':'GB','houston-texans':'HOU','indianapolis-colts':'IND',
  'jacksonville-jaguars':'JAX','kansas-city-chiefs':'KC','las-vegas-raiders':'LV',
  'los-angeles-chargers':'LAC','los-angeles-rams':'LAR','miami-dolphins':'MIA',
  'minnesota-vikings':'MIN','new-england-patriots':'NE','new-orleans-saints':'NO',
  'new-york-giants':'NYG','new-york-jets':'NYJ','pittsburgh-steelers':'PIT',
  'san-francisco-49ers':'SF','seattle-seahawks':'SEA','tampa-bay-buccaneers':'TB',
  'tennessee-titans':'TEN','washington-commanders':'WAS',
};

function slugToAbbrev(slug: string) {
  return SLUG_MAP[slug] ?? slug.toUpperCase().replace(/-/g, '').slice(0, 3);
}

/** "https://...bettingpros.com/nba/matchups/detroit-pistons-vs-new-orleans-hornets/"
 *   → "DET @ NOP" */
function parseBettingProsMatchup(url: string): string | null {
  const m = url.match(/\/matchups\/([^/?#]+)/);
  if (!m) return null;
  const slug = m[1].replace(/\/$/, '');
  const vsIdx = slug.indexOf('-vs-');
  if (vsIdx === -1) return null;
  return `${slugToAbbrev(slug.slice(0, vsIdx))} @ ${slugToAbbrev(slug.slice(vsIdx + 4))}`;
}

function isUrl(v: unknown): v is string {
  return typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://'));
}

function normalizeDoc(doc: Record<string, any>): Record<string, any> {
  // ── matchup ──────────────────────────────────────────────────────────────
  let matchup: string = doc.matchup ?? '';

  if (isUrl(matchup)) {
    matchup = parseBettingProsMatchup(matchup) ?? '';
  }
  if (!matchup) {
    const away = doc.awayTeam ?? doc.away_team;
    const home = doc.homeTeam ?? doc.home_team;
    if (away && home) matchup = `${away} @ ${home}`;
  }

  // ── team ─────────────────────────────────────────────────────────────────
  // Enrichment occasionally overwrites team with a BettingPros URL.
  let team: string = doc.team ?? '';
  if (isUrl(team)) team = '';

  return { ...doc, matchup: matchup || '—', team };
}

// ─── Route ────────────────────────────────────────────────────────────────────

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const cursor   = searchParams.get('cursor') ?? undefined;
  const pageSize = searchParams.has('pageSize') ? Number(searchParams.get('pageSize')) : 50;
  const league   = searchParams.get('sport') as 'nba' | 'nfl';
  let   season   = searchParams.has('season') ? Number(searchParams.get('season')) : undefined;

  if (league === 'nba' && season === 2026) season = 2025;

  const filters = {
    league,
    season,
    date:   searchParams.get('date')   ?? undefined,
    week:   searchParams.has('week')   ? Number(searchParams.get('week')) : undefined,
    search: searchParams.get('search') ?? undefined,
    pageSize,
  };

  if (!filters.league)
    return NextResponse.json({ error: "The 'sport' parameter is mandatory." }, { status: 400 });

  try {
    const result = await fetchPaginatedProps(filters, cursor);
    const items  = (result.docs ?? []).map(normalizeDoc);

    return NextResponse.json({
      items,
      total:  items.length,
      cursor: result.lastVisible ? result.lastVisible.id : null,
    });
  } catch (error: any) {
    console.error('[API/props] error:', error.message, filters);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}