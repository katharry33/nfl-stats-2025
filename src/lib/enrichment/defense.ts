// src/lib/enrichment/defense.ts

import type { DefenseMap } from './types';

const TEAM_RANKINGS_CONFIG = [
  { propNorm: 'pass yds', url: 'https://www.teamrankings.com/nfl/stat/opponent-passing-yards-per-game' },
  { propNorm: 'pass att', url: 'https://www.teamrankings.com/nfl/stat/opponent-pass-attempts-per-game' },
  { propNorm: 'pass cmp', url: 'https://www.teamrankings.com/nfl/stat/opponent-completions-per-game' },
  { propNorm: 'pass tds', url: 'https://www.teamrankings.com/nfl/stat/opponent-passing-touchdowns-per-game' },
  { propNorm: 'rush yds', url: 'https://www.teamrankings.com/nfl/stat/opponent-rushing-yards-per-game' },
  { propNorm: 'rush att', url: 'https://www.teamrankings.com/nfl/stat/opponent-rushing-attempts-per-game' },
  { propNorm: 'rush tds', url: 'https://www.teamrankings.com/nfl/stat/opponent-rushing-touchdowns-per-game' },
  { propNorm: 'rec yds',  url: 'https://www.teamrankings.com/nfl/stat/opponent-passing-yards-per-game' },
  { propNorm: 'recs',     url: 'https://www.teamrankings.com/nfl/stat/opponent-completions-per-game' },
  { propNorm: 'anytime td', url: 'https://www.teamrankings.com/nfl/stat/opponent-touchdowns-per-game' },
] as const;

const SEASON_END_DATES: Record<number, string> = {
  2024: '2025-02-10',
  2025: '2026-02-09',
  2026: '2027-02-08',
};

export async function fetchAllDefenseStats(season: number): Promise<DefenseMap> {
  const dateParam = SEASON_END_DATES[season];
  const defMap: DefenseMap = {};

  for (const config of TEAM_RANKINGS_CONFIG) {
    const url = dateParam ? `${config.url}?date=${dateParam}` : config.url;
    try {
      const html = await fetchHtml(url);
      if (!html) continue;

      const parsed = parseTeamRankingsTable(html);
      for (const [teamAbbr, stats] of Object.entries(parsed)) {
        defMap[`${config.propNorm}||${teamAbbr}`] = stats;
      }
      console.log(`✅ Defense: ${config.propNorm} — ${Object.keys(parsed).length} teams`);
      await sleep(500);
    } catch (err) {
      console.warn(`❌ Defense fetch failed for ${config.propNorm}:`, err);
    }
  }

  return defMap;
}

export function lookupDefenseStats(
  defMap: DefenseMap,
  propNorm: string,
  opponent: string
): { rank: number; avg: number } | null {
  return defMap[`${propNorm}||${opponent.toUpperCase()}`] ?? null;
}

export function lookupComboDefenseStats(
  defMap: DefenseMap,
  propNorm: string,
  opponent: string
): { rank: number; avg: number } | null {
  if (!propNorm.includes('+')) return null;
  const components = propNorm.split('+').map(p => p.trim());
  const stats = components.map(c => lookupDefenseStats(defMap, c, opponent));
  if (stats.some(s => s === null)) return null;
  const nonNull = stats as Array<{ rank: number; avg: number }>;
  return {
    rank: Math.ceil(nonNull.reduce((s, x) => s + x.rank, 0) / nonNull.length),
    avg: Math.round(nonNull.reduce((s, x) => s + x.avg, 0) * 10) / 10,
  };
}

// ---------------------------------------------------------------------------
// HTML parsing (no cheerio — pure regex, same as Apps Script)
// ---------------------------------------------------------------------------

function parseTeamRankingsTable(html: string): Record<string, { rank: number; avg: number }> {
  const result: Record<string, { rank: number; avg: number }> = {};
  const tableMatch = html.match(/<table[^>]*class="[^"]*tr-table[^"]*"[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return result;

  const tableHtml = tableMatch[1];
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;
  let rank = 0;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const rowHtml = rowMatch[1];
    if (rowHtml.includes('<th') || !rowHtml.includes('<td')) continue;
    rank++;

    const teamMatch = rowHtml.match(/<td[^>]*>\s*<a[^>]*>([^<]+)<\/a>/i);
    if (!teamMatch) continue;
    const teamAbbr = mapTeamName(teamMatch[1].trim());
    if (!teamAbbr) continue;

    const tdMatches = [...rowHtml.matchAll(/<td[^>]*>([^<]*)<\/td>/gi)];
    if (tdMatches.length < 2) continue;
    const avg = parseFloat(tdMatches[1][1].trim());
    if (isNaN(avg)) continue;

    result[teamAbbr] = { rank, avg };
  }

  return result;
}

function mapTeamName(name: string): string | null {
  const clean = name.split('(')[0].trim().toLowerCase();
  const map: Record<string, string> = {
    'arizona': 'ARI', 'arizona cardinals': 'ARI',
    'atlanta': 'ATL', 'atlanta falcons': 'ATL',
    'baltimore': 'BAL', 'baltimore ravens': 'BAL',
    'buffalo': 'BUF', 'buffalo bills': 'BUF',
    'carolina': 'CAR', 'carolina panthers': 'CAR',
    'chicago': 'CHI', 'chicago bears': 'CHI',
    'cincinnati': 'CIN', 'cincinnati bengals': 'CIN',
    'cleveland': 'CLE', 'cleveland browns': 'CLE',
    'dallas': 'DAL', 'dallas cowboys': 'DAL',
    'denver': 'DEN', 'denver broncos': 'DEN',
    'detroit': 'DET', 'detroit lions': 'DET',
    'green bay': 'GB', 'green bay packers': 'GB',
    'houston': 'HOU', 'houston texans': 'HOU',
    'indianapolis': 'IND', 'indianapolis colts': 'IND',
    'jacksonville': 'JAX', 'jacksonville jaguars': 'JAX',
    'kansas city': 'KC', 'kansas city chiefs': 'KC',
    'las vegas': 'LV', 'las vegas raiders': 'LV',
    'la rams': 'LAR', 'los angeles rams': 'LAR',
    'la chargers': 'LAC', 'los angeles chargers': 'LAC',
    'miami': 'MIA', 'miami dolphins': 'MIA',
    'minnesota': 'MIN', 'minnesota vikings': 'MIN',
    'new england': 'NE', 'new england patriots': 'NE',
    'new orleans': 'NO', 'new orleans saints': 'NO',
    'ny giants': 'NYG', 'new york giants': 'NYG',
    'ny jets': 'NYJ', 'new york jets': 'NYJ',
    'philadelphia': 'PHI', 'philadelphia eagles': 'PHI',
    'pittsburgh': 'PIT', 'pittsburgh steelers': 'PIT',
    'san francisco': 'SF', 'san francisco 49ers': 'SF',
    'seattle': 'SEA', 'seattle seahawks': 'SEA',
    'tampa bay': 'TB', 'tampa bay buccaneers': 'TB',
    'tennessee': 'TEN', 'tennessee titans': 'TEN',
    'washington': 'WAS', 'washington commanders': 'WAS',
  };
  return map[clean] ?? null;
}

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Referer': 'https://www.teamrankings.com/nfl/',
      },
    });
    return res.ok ? res.text() : null;
  } catch { return null; }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}