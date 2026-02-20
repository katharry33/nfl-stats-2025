// src/pfr.ts
// Pro Football Reference scraper - ported from Apps Script
// Uses Node 18+ native fetch. No external deps needed.

import type { PFRGame } from './types.js';
import { normalizeProp, splitComboProp } from './normalize.js';

const PFR_CACHE = new Map<string, PFRGame[]>();

// ---------------------------------------------------------------------------
// PFR ID Resolution
// ---------------------------------------------------------------------------

/**
 * Looks up PFR ID from a simple JSON map file.
 * In production, back this with Firestore's pfr_id_map collection.
 */
export async function getPfrId(
  playerName: string,
  pfrIdMap: Record<string, string>
): Promise<string | null> {
  const norm = playerName.toLowerCase().trim();

  for (const [name, id] of Object.entries(pfrIdMap)) {
    if (name.toLowerCase().trim() === norm) return id;
  }

  // Fallback: scrape PFR search
  return scrapePfrId(playerName);
}

async function scrapePfrId(playerName: string): Promise<string | null> {
  const url = `https://www.pro-football-reference.com/search/search.fcgi?search=${encodeURIComponent(playerName)}`;

  try {
    const res = await fetchWithRetry(url, { redirect: 'manual' });
    if (!res) return null;

    // Direct match → 302 redirect to player page
    if (res.status === 302) {
      const location = res.headers.get('location') ?? '';
      const match = location.match(/\/players\/[A-Z]\/(.+?)\.htm/);
      if (match) {
        console.log(`✅ PFR ID (redirect): ${match[1]} for ${playerName}`);
        return match[1];
      }
    }

    if (res.status === 200) {
      const html = await res.text();
      const match = html.match(/\/players\/[A-Z]\/(.+?)\.htm/);
      if (match) {
        console.log(`✅ PFR ID (search): ${match[1]} for ${playerName}`);
        return match[1];
      }
    }
  } catch (err) {
    console.warn(`⚠️ PFR ID scrape failed for ${playerName}:`, err);
  }

  return null;
}

// ---------------------------------------------------------------------------
// Season Log Fetching
// ---------------------------------------------------------------------------

export async function fetchSeasonLog(
  playerName: string,
  pfrId: string,
  season: number
): Promise<PFRGame[]> {
  const cacheKey = `${pfrId}:${season}`;
  if (PFR_CACHE.has(cacheKey)) return PFR_CACHE.get(cacheKey)!;

  const url = `https://www.pro-football-reference.com/players/${pfrId[0]}/${pfrId}/gamelog/${season}/`;
  console.log(`📥 PFR: ${playerName} (${season}): ${url}`);

  try {
    const res = await fetchWithRetry(url);
    if (!res || res.status !== 200) {
      console.warn(`❌ PFR fetch failed (${res?.status}) for ${playerName}`);
      PFR_CACHE.set(cacheKey, []);
      return [];
    }

    const html = await res.text();
    const games = parsePfrGameLog(html);

    PFR_CACHE.set(cacheKey, games);
    console.log(`✅ PFR: ${games.length} games for ${playerName} (${season})`);
    return games;
  } catch (err) {
    console.warn(`❌ PFR error for ${playerName}:`, err);
    PFR_CACHE.set(cacheKey, []);
    return [];
  }
}

// ---------------------------------------------------------------------------
// HTML Parsing
// ---------------------------------------------------------------------------

function parsePfrGameLog(html: string): PFRGame[] {
  const games: PFRGame[] = [];

  // PFR hides stats table inside HTML comment — extract it first
  const commentMatch = html.match(/<!--([\s\S]*?id="stats"[\s\S]*?)-->/i);
  const tableHtml = commentMatch
    ? commentMatch[1]
    : html.match(/<table[^>]*id="stats"[^>]*>([\s\S]*?)<\/table>/i)?.[1];

  if (!tableHtml) {
    console.warn('❌ PFR: No stats table found');
    return games;
  }

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch: RegExpExecArray | null;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const rowHtml = rowMatch[1];
    if (rowHtml.includes('<th') && !rowHtml.includes('<td')) continue;

    const cell = (stat: string): string => {
      // Try data-csk first (sortable date), then link text, then plain text
      const pattern = new RegExp(
        `<(?:td|th)[^>]*data-stat="${stat}"[^>]*>([\\s\\S]*?)<\/(?:td|th)>`,
        'i'
      );
      const m = rowHtml.match(pattern);
      if (!m) return '';
      let val = m[1];

      if (stat === 'game_date') {
        const csk = m[0].match(/data-csk="([^"]+)"/);
        if (csk) val = csk[1];
      }

      const link = val.match(/<a[^>]*>([^<]+)<\/a>/i);
      if (link) val = link[1];

      return val.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    };

    const weekNum = parseInt(cell('week_num'), 10);
    if (isNaN(weekNum)) continue;

    games.push({
      week: weekNum,
      date: cell('game_date'),
      passAtt: parseFloat(cell('pass_att')) || 0,
      passYds: parseFloat(cell('pass_yds')) || 0,
      passTds: parseFloat(cell('pass_td')) || 0,
      passCmp: parseFloat(cell('pass_cmp')) || 0,
      rushAtt: parseFloat(cell('rush_att')) || 0,
      rushYds: parseFloat(cell('rush_yds')) || 0,
      rushTds: parseFloat(cell('rush_td')) || 0,
      receptions: parseFloat(cell('rec')) || 0,
      recYds: parseFloat(cell('rec_yds')) || 0,
      recTds: parseFloat(cell('rec_td')) || 0,
    });
  }

  return games;
}

// ---------------------------------------------------------------------------
// Stat Extraction
// ---------------------------------------------------------------------------

export function getStatFromGame(game: PFRGame, propNorm: string): number | null {
  const p = normalizeProp(propNorm);

  switch (p) {
    case 'pass yds':   return game.passYds;
    case 'pass att':   return game.passAtt;
    case 'pass cmp':   return game.passCmp;
    case 'pass tds':   return game.passTds;
    case 'rush yds':   return game.rushYds;
    case 'rush att':   return game.rushAtt;
    case 'rush tds':   return game.rushTds;
    case 'rec yds':    return game.recYds;
    case 'recs':       return game.receptions;
    case 'anytime td': return game.passTds + game.rushTds + game.recTds;
    case 'pass+rush yds': return game.passYds + game.rushYds;
    case 'rush+rec yds':  return game.rushYds + game.recYds;
    default: {
      const components = splitComboProp(p);
      if (components) {
        return components.reduce((sum, c) => sum + (getStatFromGame(game, c) ?? 0), 0);
      }
      console.warn(`⚠️ Unknown prop: "${p}"`);
      return null;
    }
  }
}

// ---------------------------------------------------------------------------
// Averages & Hit %
// ---------------------------------------------------------------------------

export function calculateAvg(
  games: PFRGame[],
  propNorm: string,
  beforeWeek: number
): number {
  const eligible = games.filter(g => g.week < beforeWeek);
  if (!eligible.length) return 0;

  let total = 0;
  let count = 0;

  for (const g of eligible) {
    const stat = getStatFromGame(g, propNorm);
    if (stat === null) continue;

    // For anytime TD, only count games where player was active
    if (propNorm === 'anytime td') {
      if (g.passAtt === 0 && g.rushAtt === 0 && g.receptions === 0) continue;
    }

    total += stat;
    count++;
  }

  return count > 0 ? Math.round((total / count) * 10) / 10 : 0;
}

export function calculateHitPct(
  games: PFRGame[],
  propNorm: string,
  line: number,
  overUnder: string,
  excludeWeek: number
): number | null {
  const isOver = overUnder.toLowerCase().includes('over');
  const isUnder = overUnder.toLowerCase().includes('under');
  if (!isOver && !isUnder) return null;

  let wins = 0;
  let total = 0;

  for (const g of games) {
    if (g.week === excludeWeek) continue;

    const stat = getStatFromGame(g, propNorm);
    if (stat === null) continue;

    total++;
    if (isOver && stat > line) wins++;
    if (isUnder && stat < line) wins++;
  }

  if (total === 0) return null;
  return wins / total;
}

// ---------------------------------------------------------------------------
// Fetch Utility
// ---------------------------------------------------------------------------

async function fetchWithRetry(
  url: string,
  options: RequestInit = {},
  maxRetries = 3
): Promise<Response | null> {
  const headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Accept': 'text/html,application/xhtml+xml',
    'Accept-Language': 'en-US,en;q=0.9',
    ...options.headers,
  };

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, { ...options, headers });

      if (res.ok || res.status === 302 || res.status === 404) return res;

      if (res.status === 429 || res.status >= 500) {
        const delay = 1000 * Math.pow(2, attempt);
        console.log(`⏳ Rate limited/error, retry ${attempt + 1} in ${delay}ms`);
        await sleep(delay);
        continue;
      }

      return res;
    } catch (err) {
      if (attempt === maxRetries - 1) throw err;
      await sleep(1000 * Math.pow(2, attempt));
    }
  }

  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}