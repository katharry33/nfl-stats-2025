// src/lib/enrichment/nba/defense.ts
// NBA opponent defense stats from TeamRankings — mirrors nfl/defense.ts exactly.
// Fetches per-stat opponent averages and ranks for all 30 NBA teams.

import type { DefenseMap } from '@/lib/types';

// ---------------------------------------------------------------------------
// Config — one entry per prop we want opponent context for
// ---------------------------------------------------------------------------
// TeamRankings NBA stat URLs follow the pattern:
//   https://www.teamrankings.com/nba/stat/<stat-slug>
// Each URL returns a table with all 30 teams ranked by that opponent stat.
// ---------------------------------------------------------------------------

const NBA_TEAMRANKINGS_CONFIG = [
  {
    propNorm: 'points',
    url: 'https://www.teamrankings.com/nba/stat/opponent-points-per-game',
  },
  {
    propNorm: 'rebounds',
    url: 'https://www.teamrankings.com/nba/stat/opponent-total-rebounds-per-game',
  },
  {
    propNorm: 'assists',
    url: 'https://www.teamrankings.com/nba/stat/opponent-assists-per-game',
  },
  {
    propNorm: 'steals',
    url: 'https://www.teamrankings.com/nba/stat/opponent-steals-per-game',
  },
  {
    propNorm: 'blocks',
    url: 'https://www.teamrankings.com/nba/stat/opponent-blocks-per-game',
  },
  {
    propNorm: 'threes',
    url: 'https://www.teamrankings.com/nba/stat/opponent-three-pointers-made-per-game',
  },
  {
    propNorm: 'turnovers',
    url: 'https://www.teamrankings.com/nba/stat/opponent-turnovers-per-game',
  },
  // ── Combo props — TeamRankings has no direct combo page, so we derive
  //    these at lookup time by averaging components (see lookupNBAComboDefenseStats).
  //    But we still need the individual components loaded above, which they are.
] as const;

// ---------------------------------------------------------------------------
// Season dates
// ---------------------------------------------------------------------------
// Passing ?date=YYYY-MM-DD freezes the rankings to that point in the season,
// preventing off-season / pre-season numbers from polluting historical enrichment.
// Use the Finals end date for completed seasons; leave undefined for current.
// ---------------------------------------------------------------------------

const NBA_SEASON_END_DATES: Record<number, string> = {
  2023: '2023-06-12', // 2022-23 Finals end
  2024: '2024-06-17', // 2023-24 Finals end
  2025: '2025-06-22', // 2024-25 projected — update when confirmed
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Fetch opponent defense stats for all tracked NBA props from TeamRankings.
 * Returns a DefenseMap keyed as  "propNorm||TEAM_ABBR"  →  { rank, avg }.
 *
 * Pass the season ending year, e.g. 2025 for the 2024-25 season.
 * For the live current season, the ?date= param is omitted so you get live rankings.
 */
export async function fetchAllNBADefenseStats(season: number): Promise<DefenseMap> {
  const dateParam = NBA_SEASON_END_DATES[season];
  const defMap: DefenseMap = {};

  for (const config of NBA_TEAMRANKINGS_CONFIG) {
    const url = dateParam ? `${config.url}?date=${dateParam}` : config.url;

    try {
      const html = await fetchHtml(url);
      if (!html) {
        console.warn(`⚠️ NBA Defense: empty response for ${config.propNorm}`);
        continue;
      }

      const parsed = parseTeamRankingsTable(html);
      const teamCount = Object.keys(parsed).length;

      if (teamCount === 0) {
        console.warn(`⚠️ NBA Defense: 0 teams parsed for ${config.propNorm} — check URL or table structure`);
        continue;
      }

      for (const [teamAbbr, stats] of Object.entries(parsed)) {
        defMap[`${config.propNorm}||${teamAbbr}`] = stats;
      }

      console.log(`✅ NBA Defense: ${config.propNorm} — ${teamCount} teams`);
      await sleep(600); // polite delay between TeamRankings requests
    } catch (err) {
      console.warn(`❌ NBA Defense: fetch failed for ${config.propNorm}:`, err);
    }
  }

  return defMap;
}

/**
 * Look up a single team's opponent stats for a given prop.
 *
 * @param defMap   - Result of fetchAllNBADefenseStats()
 * @param propNorm - Canonical prop name e.g. "points", "threes", "pts_ast_reb"
 * @param opponent - Team abbreviation e.g. "GSW", "LAL", "OKC"
 *
 * For base props, returns the direct lookup.
 * For combo props (underscore-joined), delegates to lookupNBAComboDefenseStats.
 * Returns null when data is unavailable (off-season, team not found, etc.)
 */
export function lookupNBADefenseStats(
  defMap:   DefenseMap,
  propNorm: string,
  opponent: string,
): { rank: number; avg: number } | null {
  // Combo prop — derive from components
  if (propNorm.includes('_')) {
    return lookupNBAComboDefenseStats(defMap, propNorm, opponent);
  }
  return defMap[`${propNorm}||${opponent.toUpperCase()}`] ?? null;
}

/**
 * Derive composite opponent stats for multi-stat props (pts_ast_reb, stl_blk, etc.)
 * by summing component averages and averaging component ranks.
 *
 * E.g. for "pts_ast_reb" against OKC:
 *   avg  = opp_pts_avg + opp_reb_avg + opp_ast_avg
 *   rank = mean(opp_pts_rank, opp_reb_rank, opp_ast_rank)
 */
export function lookupNBAComboDefenseStats(
  defMap:   DefenseMap,
  propNorm: string,
  opponent: string,
): { rank: number; avg: number } | null {
  // Map combo prop keys back to their base components
  const componentMap: Record<string, string[]> = {
    'pts_ast':           ['points', 'assists'],
    'pts_reb':           ['points', 'rebounds'],
    'ast_reb':           ['assists', 'rebounds'],
    'pts_ast_reb':       ['points', 'assists', 'rebounds'],
    'stl_blk':           ['steals', 'blocks'],
    'pts_ast_reb_stl_blk': ['points', 'assists', 'rebounds', 'steals', 'blocks'],
  };

  const components = componentMap[propNorm];

  // Unknown combo — try splitting by underscore as fallback
  const parts = components ?? propNorm.split('_').filter(Boolean);
  if (parts.length < 2) return null;

  const stats = parts.map(c => lookupNBADefenseStats(defMap, c, opponent));
  if (stats.some(s => s === null)) return null;

  const nonNull = stats as Array<{ rank: number; avg: number }>;
  return {
    rank: Math.ceil(nonNull.reduce((s, x) => s + x.rank, 0) / nonNull.length),
    avg:  Math.round(nonNull.reduce((s, x) => s + x.avg, 0) * 10) / 10,
  };
}

// ---------------------------------------------------------------------------
// HTML parsing — identical logic to nfl/defense.ts, shared by copy
// ---------------------------------------------------------------------------
// TeamRankings uses the same table structure across NFL and NBA, so this
// parser works unchanged. The only sport-specific part is mapNBATeamName.
// ---------------------------------------------------------------------------

function parseTeamRankingsTable(
  html: string,
): Record<string, { rank: number; avg: number }> {
  const result: Record<string, { rank: number; avg: number }> = {};

  const tableMatch = html.match(
    /<table[^>]*class="[^"]*tr-table[^"]*"[^>]*>([\s\S]*?)<\/table>/i,
  );
  if (!tableMatch) {
    console.warn('❌ NBA Defense: tr-table not found in HTML');
    return result;
  }

  const tableHtml = tableMatch[1];
  const rowRegex  = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  let rank = 0;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const rowHtml = rowMatch[1];

    // Skip header rows
    if (rowHtml.includes('<th') || !rowHtml.includes('<td')) continue;
    rank++;

    // First <td> contains the team name wrapped in an <a> tag
    const teamMatch = rowHtml.match(/<td[^>]*>\s*<a[^>]*>([^<]+)<\/a>/i);
    if (!teamMatch) continue;

    const teamAbbr = mapNBATeamName(teamMatch[1].trim());
    if (!teamAbbr) {
      console.warn(`⚠️ NBA Defense: unmapped team name "${teamMatch[1].trim()}"`);
      continue;
    }

    // Second <td> is the current-season average value
    const tdMatches = [...rowHtml.matchAll(/<td[^>]*>([^<]*)<\/td>/gi)];
    if (tdMatches.length < 2) continue;

    const avg = parseFloat(tdMatches[1][1].trim());
    if (isNaN(avg)) continue;

    result[teamAbbr] = { rank, avg };
  }

  return result;
}

// ---------------------------------------------------------------------------
// NBA team name → abbreviation map
// ---------------------------------------------------------------------------
// Covers both full names and the shortened forms TeamRankings uses in links.
// Abbreviations match the three-letter codes used in nbaProps documents so
// lookups don't require any downstream transformation.
// ---------------------------------------------------------------------------

function mapNBATeamName(name: string): string | null {
  const clean = name.split('(')[0].trim().toLowerCase();

  const map: Record<string, string> = {
    // Atlanta
    'atlanta':                    'ATL',
    'atlanta hawks':              'ATL',
    // Boston
    'boston':                     'BOS',
    'boston celtics':             'BOS',
    // Brooklyn
    'brooklyn':                   'BKN',
    'brooklyn nets':              'BKN',
    // Charlotte
    'charlotte':                  'CHA',
    'charlotte hornets':          'CHA',
    // Chicago
    'chicago':                    'CHI',
    'chicago bulls':              'CHI',
    // Cleveland
    'cleveland':                  'CLE',
    'cleveland cavaliers':        'CLE',
    // Dallas
    'dallas':                     'DAL',
    'dallas mavericks':           'DAL',
    // Denver
    'denver':                     'DEN',
    'denver nuggets':             'DEN',
    // Detroit
    'detroit':                    'DET',
    'detroit pistons':            'DET',
    // Golden State
    'golden state':               'GSW',
    'golden state warriors':      'GSW',
    'gs warriors':                'GSW',
    // Houston
    'houston':                    'HOU',
    'houston rockets':            'HOU',
    // Indiana
    'indiana':                    'IND',
    'indiana pacers':             'IND',
    // LA Clippers
    'la clippers':                'LAC',
    'los angeles clippers':       'LAC',
    'l.a. clippers':              'LAC',
    // LA Lakers
    'la lakers':                  'LAL',
    'los angeles lakers':         'LAL',
    'l.a. lakers':                'LAL',
    // Memphis
    'memphis':                    'MEM',
    'memphis grizzlies':          'MEM',
    // Miami
    'miami':                      'MIA',
    'miami heat':                 'MIA',
    // Milwaukee
    'milwaukee':                  'MIL',
    'milwaukee bucks':            'MIL',
    // Minnesota
    'minnesota':                  'MIN',
    'minnesota timberwolves':     'MIN',
    // New Orleans
    'new orleans':                'NOP',
    'new orleans pelicans':       'NOP',
    // New York
    'new york':                   'NYK',
    'new york knicks':            'NYK',
    'ny knicks':                  'NYK',
    // Oklahoma City
    'oklahoma city':              'OKC',
    'oklahoma city thunder':      'OKC',
    'okc thunder':                'OKC',
    'okla city':                  'OKC', // TeamRankings shortened form
    // Orlando
    'orlando':                    'ORL',
    'orlando magic':              'ORL',
    // Philadelphia
    'philadelphia':               'PHI',
    'philadelphia 76ers':         'PHI',
    'philadelphia sixers':        'PHI',
    // Phoenix
    'phoenix':                    'PHX',
    'phoenix suns':               'PHX',
    // Portland
    'portland':                   'POR',
    'portland trail blazers':     'POR',
    // Sacramento
    'sacramento':                 'SAC',
    'sacramento kings':           'SAC',
    // San Antonio
    'san antonio':                'SAS',
    'san antonio spurs':          'SAS',
    // Toronto
    'toronto':                    'TOR',
    'toronto raptors':            'TOR',
    // Utah
    'utah':                       'UTA',
    'utah jazz':                  'UTA',
    // Washington
    'washington':                 'WAS',
    'washington wizards':         'WAS',
  };

  return map[clean] ?? null;
}

// ---------------------------------------------------------------------------
// Fetch utility
// ---------------------------------------------------------------------------

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept':     'text/html,application/xhtml+xml',
        'Referer':    'https://www.teamrankings.com/nba/',
      },
    });
    if (!res.ok) {
      console.warn(`⚠️ NBA Defense: HTTP ${res.status} for ${url}`);
      return null;
    }
    return res.text();
  } catch (err) {
    console.warn(`❌ NBA Defense: network error for ${url}:`, err);
    return null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}