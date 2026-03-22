// src/lib/enrichment/nba/bball.ts
// Basketball Reference scraper — NBA equivalent of pfr.ts.
// Uses Node 18+ native fetch. No external deps.

import type { BRGame } from '../types';
import { normalizeNBAProp, splitNBACombo } from './normalize-nba';

const BR_CACHE = new Map<string, BRGame[]>();

// ---------------------------------------------------------------------------
// BR ID Resolution
// ---------------------------------------------------------------------------

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
    if (res.status === 302) {
      const location = res.headers.get('location') ?? '';
      const match = location.match(/\/players\/[a-z]\/(.+?)\.html/i);
      if (match) { console.log(`✅ BR ID (redirect): ${match[1]} for ${playerName}`); return match[1]; }
    }
    if (res.status === 200) {
      const html = await res.text();
      const match = html.match(/\/players\/[a-z]\/([a-z0-9]+)\.html/i);
      if (match) { console.log(`✅ BR ID (search): ${match[1]} for ${playerName}`); return match[1]; }
    }
  } catch (err) {
    console.warn(`⚠️ BR ID scrape failed for ${playerName}:`, err);
  }
  return null;
}

// ---------------------------------------------------------------------------
// Season Log Fetching
// ---------------------------------------------------------------------------

export async function fetchNBASeasonLog(
  playerName: string,
  brId: string,
  season: number
): Promise<BRGame[]> {
  const cacheKey = `${brId}:${season}`;
  if (BR_CACHE.has(cacheKey)) return BR_CACHE.get(cacheKey)!;

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
// BBRef changed table ID from "pgl_basic" to "player_game_log_reg" in 2024.
// Field names also changed: "date_game" -> "date", "game_season" -> "player_game_num_career"
// ---------------------------------------------------------------------------

function parseBRGameLog(html: string): BRGame[] {
  const games: BRGame[] = [];
  let tableHtml: string | null = null;

  // Strategy 1: new table ID (2024+)
  const t1 = html.match(/<table[^>]*id="player_game_log_reg"[^>]*>([\s\S]*?)<\/table>/i);
  if (t1) tableHtml = t1[1];

  // Strategy 2: old table ID
  if (!tableHtml) {
    const t2 = html.match(/<table[^>]*id="pgl_basic"[^>]*>([\s\S]*?)<\/table>/i);
    if (t2) tableHtml = t2[1];
  }

  // Strategy 3: either ID inside an HTML comment
  if (!tableHtml) {
    const commentRegex = /<!--([\s\S]*?)-->/g;
    let cm: RegExpExecArray | null;
    while ((cm = commentRegex.exec(html)) !== null) {
      if (
        cm[1].includes('player_game_log_reg') ||
        cm[1].includes('pgl_basic') ||
        (cm[1].includes('data-stat="date"') && cm[1].includes('data-stat="pts"') && cm[1].includes('data-stat="mp"'))
      ) {
        tableHtml = cm[1];
        break;
      }
    }
  }

  // Strategy 4: scan all tables for one with game log columns
  if (!tableHtml) {
    const lines = html.split('\n');
    let inTable = false, depth = 0, buffer = '';
    for (const line of lines) {
      if (!inTable) {
        if (line.includes('<table')) { inTable = true; depth = (line.match(/<table/gi) ?? []).length; buffer = line; }
      } else {
        buffer += '\n' + line;
        depth += (line.match(/<table/gi)  ?? []).length;
        depth -= (line.match(/<\/table>/gi) ?? []).length;
        if (depth <= 0) {
          if (
            buffer.includes('data-stat="pts"') &&
            buffer.includes('data-stat="mp"') &&
            (buffer.includes('data-stat="date"') || buffer.includes('data-stat="date_game"'))
          ) {
            tableHtml = buffer;
            break;
          }
          inTable = false; buffer = ''; depth = 0;
        }
      }
    }
  }

  if (!tableHtml) {
    console.warn('❌ BBRef: No game log table found (tried player_game_log_reg, pgl_basic, comment, scan)');
    return games;
  }

  const rowRegex = /(<tr\b[^>]*>)([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const trAttrs = rowMatch[1];
    const rowHtml = rowMatch[2];

    if (trAttrs.includes('class="thead"') || trAttrs.includes('over_header')) continue;
    if (rowHtml.includes('<th') && !rowHtml.includes('<td')) continue;
    if (rowHtml.includes('<table')) continue;

    const cell = (stat: string): string => {
      const pattern = new RegExp(
        `<(?:td|th)[^>]*data-stat="${stat}"[^>]*>([\\s\\S]*?)<\\/(?:td|th)>`, 'i'
      );
      const m = rowHtml.match(pattern);
      if (!m) return '';
      const val  = m[1];
      const link = val.match(/<a[^>]*>([^<]+)<\/a>/i);
      return (link ? link[1] : val).replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    };

    const reason = cell('reason');
    if (reason && reason.trim().length > 0) continue;

    // Try new field name first, fall back to old
    const dateRaw = cell('date') || cell('date_game');
    if (!dateRaw || !/\d{4}-\d{2}-\d{2}/.test(dateRaw)) continue;

    const mp = cell('mp');
    if (!mp || mp.trim() === '' || mp.includes('Did Not') || mp.includes('Inactive')) continue;

    // Try all known game number field names
    const gnStr = cell('player_game_num_career') || cell('team_game_num_season') ||
                  cell('game_season') || cell('ranker');
    const gameNum = parseInt(gnStr, 10);
    if (isNaN(gameNum) || gameNum < 1) continue;

    games.push({
      gameNum,
      date: dateRaw,
      pts:  parseFloat(cell('pts'))  || 0,
      ast:  parseFloat(cell('ast'))  || 0,
      reb:  parseFloat(cell('trb'))  || 0,
      orb:  parseFloat(cell('orb'))  || 0,
      drb:  parseFloat(cell('drb'))  || 0,
      stl:  parseFloat(cell('stl'))  || 0,
      blk:  parseFloat(cell('blk'))  || 0,
      tov:  parseFloat(cell('tov'))  || 0,
      fg3m: parseFloat(cell('fg3'))  || 0,
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

export function getNBAStatFromGame(game: BRGame, propRaw: string): number | null {
  const p = normalizeNBAProp(propRaw).replace(/ /g, '_');

  switch (p) {
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
    case 'pts_ast':             return game.pts + game.ast;
    case 'pts_reb':             return game.pts + game.reb;
    case 'ast_reb':             return game.ast + game.reb;
    case 'pts_ast_reb':         return game.pts + game.ast + game.reb;
    case 'stl_blk':             return game.stl + game.blk;
    case 'pts_ast_reb_stl_blk': return game.pts + game.ast + game.reb + game.stl + game.blk;
    default: {
      const components = splitNBACombo(p);
      if (components) {
        let total = 0;
        for (const c of components) {
          const v = getNBAStatFromGame(game, c);
          if (v === null) return null;
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
  let total = 0, count = 0;
  for (const g of eligible) {
    const stat = getNBAStatFromGame(g, propNorm);
    if (stat === null) continue;
    total += stat; count++;
  }
  return count === 0 ? null : Math.round((total / count) * 10) / 10;
}

// ---------------------------------------------------------------------------
// Season Hit %
// ---------------------------------------------------------------------------

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
  let wins = 0, total = 0;
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
// Fetch Utility
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
    'Accept':                    'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language':           'en-US,en;q=0.9',
    'Accept-Encoding':           'gzip, deflate, br',
    'Cache-Control':             'no-cache',
    'Pragma':                    'no-cache',
    'Sec-Fetch-Dest':            'document',
    'Sec-Fetch-Mode':            'navigate',
    'Sec-Fetch-Site':            'none',
    'Upgrade-Insecure-Requests': '1',
    ...(options.headers as Record<string, string> ?? {}),
  };
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = 3000 * Math.pow(2, attempt - 1);
      console.log(`⏳ Retry ${attempt + 1} in ${delay}ms...`);
      await sleep(delay);
    } else if (url.includes('basketball-reference')) {
      await sleep(2000 + Math.random() * 1500);
    }
    try {
      const res = await fetch(url, { ...options, headers });
      if (res.ok || res.status === 302 || res.status === 404) return res;
      if (res.status === 403) { await sleep(8000 * (attempt + 1)); continue; }
      if (res.status === 429 || res.status >= 500) { await sleep(5000 * Math.pow(2, attempt)); continue; }
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