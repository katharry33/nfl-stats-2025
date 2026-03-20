// src/lib/enrichment/bball.ts
// Basketball Reference scraper — NBA equivalent of pfr.ts.
// Uses Node 18+ native fetch. No external deps.

import type { BRGame } from '../types/nba';
import { normalizeNBAProp, splitNBACombo } from '../shared/normalize-nba';

const BR_CACHE = new Map<string, BRGame[]>();

// ---------------------------------------------------------------------------
// BR ID Resolution
// ---------------------------------------------------------------------------

/**
 * Look up a player's Basketball Reference ID.
 * Checks the static map first; falls back to scraping BBRef search.
 */
export async function getBrId(
  playerName: string,
  brIdMap: Record<string, string>
): Promise<string | null> {
  const norm = playerName.toLowerCase().trim();

  for (const [name, id] of Object.entries(brIdMap)) {
    if (name.toLowerCase().trim() === norm) return id;
  }

  return scrapeBrId(playerName);
}

async function scrapeBrId(playerName: string): Promise<string | null> {
  const url = `https://www.basketball-reference.com/search/search.fcgi?search=${encodeURIComponent(playerName)}`;
  try {
    const res = await fetchWithRetry(url, { redirect: 'manual' });
    if (!res) return null;

    // Unique match → 302 redirect directly to player page
    if (res.status === 302) {
      const location = res.headers.get('location') ?? '';
      const match = location.match(/\/players\/[a-z]\/(.+?)\.html/i);
      if (match) {
        console.log(`✅ BR ID (redirect): ${match[1]} for ${playerName}`);
        return match[1];
      }
    }

    // Multiple matches → 200 search results page; grab first player link
    if (res.status === 200) {
      const html = await res.text();
      const match = html.match(/\/players\/[a-z]\/([a-z0-9]+)\.html/i);
      if (match) {
        console.log(`✅ BR ID (search): ${match[1]} for ${playerName}`);
        return match[1];
      }
    }
  } catch (err) {
    console.warn(`⚠️ BR ID scrape failed for ${playerName}:`, err);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Season Log Fetching
// ---------------------------------------------------------------------------

/**
 * Fetch a player's full game log for an NBA season from Basketball Reference.
 *
 * @param season - The **ending** calendar year of the season.
 *   e.g. pass `2025` for the 2024-25 season.
 */
export async function fetchNBASeasonLog(
  playerName: string,
  brId: string,
  season: number
): Promise<BRGame[]> {
  const cacheKey = `${brId}:${season}`;
  if (BR_CACHE.has(cacheKey)) return BR_CACHE.get(cacheKey)!;

  // BBRef URL uses the ending year: /players/g/gilgesh01/gamelog/2025/
  const url = `https://www.basketball-reference.com/players/${brId[0].toLowerCase()}/${brId}/gamelog/${season}/`;
  console.log(`📥 BBRef: ${playerName} (${season}): ${url}`);

  try {
    const res = await fetchWithRetry(url);
    if (!res || res.status !== 200) {
      console.warn(`❌ BBRef fetch failed (${res?.status}) for ${playerName}`);
      BR_CACHE.set(cacheKey, []);
      return [];
    }
    const html = await res.text();
    const games = parseBRGameLog(html);
    BR_CACHE.set(cacheKey, games);
    console.log(`✅ BBRef: ${games.length} games parsed for ${playerName} (${season})`);
    return games;
  } catch (err) {
    console.warn(`❌ BBRef error for ${playerName}:`, err);
    BR_CACHE.set(cacheKey, []);
    return [];
  }
}

// ---------------------------------------------------------------------------
// HTML Parsing
// ---------------------------------------------------------------------------

function parseBRGameLog(html: string): BRGame[] {
  const games: BRGame[] = [];

  // BBRef wraps some tables in HTML comments — try unwrapping first
  const commentMatch = html.match(/<!--([\s\S]*?id="pgl_basic"[\s\S]*?)-->/i);
  const tableHtml =
    commentMatch?.[1] ??
    html.match(/<table[^>]*id="pgl_basic"[^>]*>([\s\S]*?)<\/table>/i)?.[1];

  if (!tableHtml) {
    console.warn('❌ BBRef: No pgl_basic table found in HTML');
    return games;
  }

  // Capture the full <tr ...>...</tr> so we can inspect class attributes
  const rowRegex = /(<tr[^>]*>)([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const trTag   = rowMatch[1];
    const rowHtml = rowMatch[2];

    // Skip mid-table header rows that BBRef inserts every ~20 rows
    if (trTag.includes('class="thead"')) continue;

    // Skip pure header rows (no <td> cells)
    if (rowHtml.includes('<th') && !rowHtml.includes('<td')) continue;

    const cell = (stat: string): string => {
      const pattern = new RegExp(
        `<(?:td|th)[^>]*data-stat="${stat}"[^>]*>([\\s\\S]*?)<\\/(?:td|th)>`,
        'i'
      );
      const m = rowHtml.match(pattern);
      if (!m) return '';
      const val = m[1];
      const link = val.match(/<a[^>]*>([^<]+)<\/a>/i);
      return (link ? link[1] : val)
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .trim();
    };

    // Skip "Did Not Play", "Inactive", "Did Not Dress", "Coach's Decision", etc.
    const reason = cell('reason');
    if (reason && reason.trim().length > 0) continue;

    // game_season = the Nth game the player has appeared in this season
    const gameNum = parseInt(cell('game_season'), 10);
    if (isNaN(gameNum)) continue;

    const mp = cell('mp');
    // Skip rows where minutes are absent — player didn't actually play
    if (!mp || mp.trim() === '') continue;

    const dateRaw = cell('date_game');

    games.push({
      gameNum,
      date: dateRaw,            // "2024-10-22"
      pts:  parseFloat(cell('pts'))  || 0,
      ast:  parseFloat(cell('ast'))  || 0,
      reb:  parseFloat(cell('trb'))  || 0,  // total rebounds
      orb:  parseFloat(cell('orb'))  || 0,
      drb:  parseFloat(cell('drb'))  || 0,
      stl:  parseFloat(cell('stl'))  || 0,
      blk:  parseFloat(cell('blk'))  || 0,
      tov:  parseFloat(cell('tov'))  || 0,
      fg3m: parseFloat(cell('fg3'))  || 0,  // 3PM
      fg3a: parseFloat(cell('fg3a')) || 0,
      fgm:  parseFloat(cell('fg'))   || 0,
      fga:  parseFloat(cell('fga'))  || 0,
      ftm:  parseFloat(cell('ft'))   || 0,
      fta:  parseFloat(cell('fta'))  || 0,
      mp,
    });
  }

  return games;
}

// ---------------------------------------------------------------------------
// Stat Extraction
// ---------------------------------------------------------------------------

/**
 * Map a normalised NBA prop string to the numeric value from a BRGame row.
 *
 * Handles both sportsbook labels ("points", "rebounds") and BBRef stat codes
 * ("pts", "trb"). Combo props are resolved recursively via splitNBACombo.
 */
export function getNBAStatFromGame(game: BRGame, propRaw: string): number | null {
  const p = normalizeNBAProp(propRaw).replace(/ /g, '_');

  switch (p) {
    // ── Single-stat props ────────────────────────────────────────────────────
    case 'points':    return game.pts;
    case 'pts':       return game.pts;

    case 'assists':   return game.ast;
    case 'ast':       return game.ast;

    case 'rebounds':  return game.reb;
    case 'reb':       return game.reb;
    case 'trb':       return game.reb;

    case 'steals':    return game.stl;
    case 'stl':       return game.stl;

    case 'blocks':    return game.blk;
    case 'blk':       return game.blk;

    case 'threes':    return game.fg3m;
    case '3pm':       return game.fg3m;
    case 'fg3':       return game.fg3m;
    case 'three_pointers_made': return game.fg3m;

    case 'turnovers': return game.tov;
    case 'tov':       return game.tov;

    // ── Hard-coded combo props (avoid recursion overhead for common ones) ────
    case 'pts_ast':              return game.pts + game.ast;
    case 'pts_reb':              return game.pts + game.reb;
    case 'ast_reb':              return game.ast + game.reb;
    case 'pts_ast_reb':          return game.pts + game.ast + game.reb;
    case 'stl_blk':              return game.stl + game.blk;
    case 'pts_ast_reb_stl_blk':  return game.pts + game.ast + game.reb + game.stl + game.blk;

    default: {
      // Dynamic combo resolution — handles any "_"-joined prop string
      const components = splitNBACombo(p);
      if (components) {
        let total = 0;
        for (const c of components) {
          const v = getNBAStatFromGame(game, c);
          if (v === null) return null; // one missing component → whole combo null
          total += v;
        }
        return total;
      }

      console.warn(`⚠️ getNBAStatFromGame: unknown prop "${p}" (raw: "${propRaw}")`);
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Player Average
// ---------------------------------------------------------------------------

/**
 * Calculate a player's per-game average for a prop across games played
 * BEFORE a given date (preferred) or BEFORE a given game number.
 *
 * Returns **null** — not 0 — when no qualifying games are found.
 * Callers must guard: `if (avg == null)` means "no data", not "zero production."
 *
 * @param beforeDate - ISO date string "YYYY-MM-DD" of the game being bet on.
 *   All games strictly before this date are included.
 * @param beforeGameNum - Fallback: include only games with gameNum < this value.
 */
export function calculateNBAAvg(
  games:         BRGame[],
  propNorm:      string,
  beforeGameNum: number,
  beforeDate?:   string
): number | null {
  const eligible = beforeDate
    ? games.filter(g => g.date && g.date < beforeDate)
    : games.filter(g => g.gameNum < beforeGameNum);

  if (eligible.length === 0) return null;

  let total = 0;
  let count = 0;

  for (const g of eligible) {
    const stat = getNBAStatFromGame(g, propNorm);
    if (stat === null) continue;
    total += stat;
    count++;
  }

  return count === 0 ? null : Math.round((total / count) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Season Hit %
// ---------------------------------------------------------------------------

/**
 * Calculate what fraction of past games the player cleared (or stayed under)
 * a given line.
 *
 * Returns **null** when there are no qualifying games — never 0.
 * A genuine 0/N result returns `0`; treat stored `0` with a tiny sample the
 * same as `null` in the UI (show "—").
 *
 * Filtering priority:
 *   1. beforeDate — exclude all games on or after this date (most accurate)
 *   2. excludeGameNum — exclude exactly this game number (fallback)
 *   3. Neither — use all games (full-season backfill mode)
 */
export function calculateNBAHitPct(
  games:           BRGame[],
  propNorm:        string,
  line:            number,
  overUnder:       string,
  excludeGameNum?: number,
  beforeDate?:     string
): number | null {
  const isOver  = overUnder.toLowerCase().includes('over');
  const isUnder = overUnder.toLowerCase().includes('under');
  if (!isOver && !isUnder) return null;

  let wins  = 0;
  let total = 0;

  for (const g of games) {
    if (beforeDate) {
      if (!g.date || g.date >= beforeDate) continue;
    } else if (excludeGameNum != null) {
      if (g.gameNum === excludeGameNum) continue;
    }

    const stat = getNBAStatFromGame(g, propNorm);
    if (stat === null) continue;

    total++;
    if (isOver  && stat > line) wins++;
    if (isUnder && stat < line) wins++;
  }

  return total === 0 ? null : wins / total;
}

// ---------------------------------------------------------------------------
// Fetch Utility  (shared with pfr.ts — move to lib/utils/fetch.ts if preferred)
// ---------------------------------------------------------------------------

async function fetchWithRetry(
  url:        string,
  options:    RequestInit = {},
  maxRetries: number = 3
): Promise<Response | null> {
  const USER_AGENTS = [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  ];

  const headers = {
    'User-Agent':                USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
    'Accept':                    'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language':           'en-US,en;q=0.9',
    'Accept-Encoding':           'gzip, deflate, br',
    'Cache-Control':             'no-cache',
    'Pragma':                    'no-cache',
    'Sec-Fetch-Dest':            'document',
    'Sec-Fetch-Mode':            'navigate',
    'Sec-Fetch-Site':            'none',
    'Upgrade-Insecure-Requests': '1',
    ...options.headers,
  };

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = 3000 * Math.pow(2, attempt - 1); // 3s → 6s → 12s
      console.log(`⏳ Retry ${attempt + 1} in ${delay}ms...`);
      await sleep(delay);
    } else if (url.includes('basketball-reference')) {
      // Polite first-request delay — BBRef rate-limits aggressively
      await sleep(2000 + Math.random() * 1500);
    }

    try {
      const res = await fetch(url, { ...options, headers });

      if (res.ok || res.status === 302 || res.status === 404) return res;

      if (res.status === 403) {
        console.warn(`🚫 BBRef 403 (attempt ${attempt + 1}) — backing off...`);
        await sleep(8000 * (attempt + 1));
        continue;
      }

      if (res.status === 429 || res.status >= 500) {
        console.log(`⏳ Rate limited (${res.status}) — backing off...`);
        await sleep(5000 * Math.pow(2, attempt));
        continue;
      }

      return res;
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      await sleep(2000 * Math.pow(2, attempt));
    }
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}