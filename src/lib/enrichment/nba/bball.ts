import type { BRGame } from '../types';
import { normalizeNBAProp, splitNBACombo } from './normalize-nba';

const BR_CACHE = new Map<string, BRGame[]>();

export async function fetchNBASeasonLog(
  playerName: string,
  brId: string,
  season: number
): Promise<BRGame[]> {
  const cacheKey = `${brId}:${season}`;
  if (BR_CACHE.has(cacheKey)) return BR_CACHE.get(cacheKey)!;

  const url = `https://www.basketball-reference.com/players/${brId[0].toLowerCase()}/${brId}/gamelog/${season}/`;
  
  try {
    const res = await fetchWithRetry(url);
    if (!res || res.status !== 200) {
      BR_CACHE.set(cacheKey, []);
      return [];
    }
    const html = await res.text();
    const games = parseBRGameLog(html);
    
    if (games.length > 0) BR_CACHE.set(cacheKey, games);
    return games;
  } catch (err) {
    console.warn(`❌ BBRef error for ${playerName}:`, err);
    return [];
  }
}

function parseBRGameLog(html: string): BRGame[] {
  const games: BRGame[] = [];
  let tableHtml = '';
  
  const tableMatch = html.match(/<table[^>]*id="player_game_log_reg"[^>]*>([\s\S]*?)<\/table>/i) 
                  || html.match(/<table[^>]*id="player_game_log"[^>]*>([\s\S]*?)<\/table>/i);

  if (tableMatch) {
    tableHtml = tableMatch[1];
  } else {
    // This regex looks for the table hidden inside HTML comments
    const commentMatch = html.match(/<!--\s*<table[^>]*>([\s\S]*?)<\/table>\s*-->/i);
    if (commentMatch) {
      tableHtml = commentMatch[1];
    }
  }

  if (!tableHtml) return [];

  const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const row = rowMatch[1];
    if (row.includes('class="thead"') || row.includes('over_header')) continue;

    const getVal = (stat: string) => {
      const m = row.match(new RegExp(`data-stat="${stat}"[^>]*>([\\s\\S]*?)<\\/`, 'i'));
      if (!m) return '';
      return m[1].replace(/<[^>]+>/g, '').trim();
    };

    const date = getVal('date_game') || getVal('date');
    const mp = getVal('mp');
    if (!date || !mp || !mp.includes(':')) continue;

    games.push({
      gameNum: parseInt(getVal('ranker'), 10) || 0,
      date,
      pts:  parseFloat(getVal('pts')) || 0,
      ast:  parseFloat(getVal('ast')) || 0,
      reb:  parseFloat(getVal('trb')) || 0,
      stl:  parseFloat(getVal('stl')) || 0,
      blk:  parseFloat(getVal('blk')) || 0,
      tov:  parseFloat(getVal('tov')) || 0,
      fg3m: parseFloat(getVal('fg3')) || 0,
      mp
    } as any);
  }
  return games;
}

export function getNBAStatFromGame(game: any, propRaw: string): number | null {
  const p = normalizeNBAProp(propRaw);
  switch (p) {
    case 'points': return game.pts;
    case 'assists': return game.ast;
    case 'rebounds': return game.reb;
    case 'steals': return game.stl;
    case 'blocks': return game.blk;
    case 'threes': return game.fg3m;
    case 'turnovers': return game.tov;
    default:
      const parts = splitNBACombo(p);
      if (parts) return parts.reduce((sum, part) => sum + (getNBAStatFromGame(game, part) || 0), 0);
      return null;
  }
}

export function calculateNBAAvg(games: any[], propNorm: string, limit: number = 999, beforeDate?: string): number | null {
  const eligible = beforeDate ? games.filter(g => g.date < beforeDate) : games;
  const slice = eligible.slice(-limit);
  if (!slice.length) return null;
  const total = slice.reduce((sum, g) => sum + (getNBAStatFromGame(g, propNorm) || 0), 0);
  return Math.round((total / slice.length) * 10) / 10;
}

export function calculateNBAHitPct(games: any[], propNorm: string, line: number, overUnder: string, limit: number = 999, beforeDate?: string): number | null {
  const isOver = overUnder.toLowerCase().includes('over');
  const eligible = beforeDate ? games.filter(g => g.date < beforeDate) : games;
  const slice = eligible.slice(-limit);
  if (!slice.length) return null;
  const wins = slice.filter(g => {
    const stat = getNBAStatFromGame(g, propNorm);
    return stat !== null && (isOver ? stat > line : stat < line);
  }).length;
  return Math.round((wins / slice.length) * 100);
}

async function fetchWithRetry(url: string, maxRetries = 2): Promise<Response | null> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise(r => setTimeout(r, 2000 + Math.random() * 2000));
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.status === 429) continue;
      return res;
    } catch (e) { if (i === maxRetries - 1) throw e; }
  }
  return null;
}
