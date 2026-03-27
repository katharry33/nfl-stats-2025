import type { BRGame } from '../types';
import { normalizeNBAProp, splitNBACombo } from './normalize-nba';

//
// ─────────────────────────────────────────────────────────────
//   IN‑MEMORY CACHE
// ─────────────────────────────────────────────────────────────
//
const BR_CACHE = new Map<string, BRGame[]>();

//
// ─────────────────────────────────────────────────────────────
//   FETCH SEASON LOG FROM BASKETBALL REFERENCE
// ─────────────────────────────────────────────────────────────
//
export async function fetchNBASeasonLog(
  playerName: string,
  brId: string,
  passedSeason: number | string
): Promise<BRGame[]> {
  const cacheKey = `${brId}:${passedSeason}`;
  if (BR_CACHE.has(cacheKey)) return BR_CACHE.get(cacheKey)!;

  // BBRef uses the YEAR THE SEASON ENDS
  let brYear = Number(passedSeason);
  if (brYear === 2025) brYear = 2026;

  const url = `https://www.basketball-reference.com/players/${brId[0].toLowerCase()}/${brId}/gamelog/${brYear}/`;

  console.log(`[NBA ENRICH] Fetching ${playerName} logs → ${url}`);

  try {
    const res = await fetchWithRetry(url);
    if (!res || res.status !== 200) {
      console.warn(`⚠️ BBRef returned ${res?.status} for ${playerName}`);
      BR_CACHE.set(cacheKey, []);
      return [];
    }

    const html = await res.text();
    const games = parseBRGameLog(html);

    BR_CACHE.set(cacheKey, games);
    console.log(`NBA: ${playerName} → ${games.length} games parsed`);

    return games;
  } catch (err) {
    console.error(`❌ BBRef error for ${playerName}:`, err);
    BR_CACHE.set(cacheKey, []);
    return [];
  }
}

//
// ─────────────────────────────────────────────────────────────
//   PARSE BBREF GAME LOG HTML
// ─────────────────────────────────────────────────────────────
//
function parseBRGameLog(html: string): BRGame[] {
  const games: BRGame[] = [];

  // Try normal table, then commented-out table
  const tableMatch =
    html.match(/<table[^>]*id="player_game_log_reg"[^>]*>([\s\S]*?)<\/table>/i) ||
    html.match(/<table[^>]*id="player_game_log"[^>]*>([\s\S]*?)<\/table>/i) ||
    html.match(/<!--\s*<table[^>]*>([\s\S]*?)<\/table>\s*-->/i);

  if (!tableMatch) return [];

  const tableHtml = tableMatch[1];
  const rowRegex = /<tr\b[^>]*>([\s\S]*?)<\/tr>/gi;

  let rowMatch;
  while ((rowMatch = rowRegex.exec(tableHtml)) !== null) {
    const row = rowMatch[1];

    // Skip headers + DNP rows
    if (
      row.includes('class="thead"') ||
      row.includes('over_header') ||
      row.includes('Did Not Play')
    ) {
      continue;
    }

    const getVal = (stat: string) => {
      const m = row.match(new RegExp(`data-stat="${stat}"[^>]*>([\\s\\S]*?)<\/`, 'i'));
      if (!m) return '';
      return m[1].replace(/<[^>]+>/g, '').trim();
    };

    const date = getVal('date_game') || getVal('date');
    const mp = getVal('mp');

    if (!date || !mp || mp === '0:00' || !mp.includes(':')) continue;

    games.push({
      gameNum: Number(getVal('ranker')) || 0,
      date,
      pts: Number(getVal('pts')) || 0,
      ast: Number(getVal('ast')) || 0,
      reb: Number(getVal('trb')) || 0,
      stl: Number(getVal('stl')) || 0,
      blk: Number(getVal('blk')) || 0,
      tov: Number(getVal('tov')) || 0,
      fg3m: Number(getVal('fg3')) || 0,
      mp,
    });
  }

  return games;
}

//
// ─────────────────────────────────────────────────────────────
//   STAT EXTRACTOR
// ─────────────────────────────────────────────────────────────
//
export function getNBAStatFromGame(game: BRGame, propRaw: string): number | null {
  const p = normalizeNBAProp(propRaw);
  const val = (v: any) => (v == null ? 0 : Number(v));

  switch (p) {
    case 'points': return val(game.pts);
    case 'assists': return val(game.ast);
    case 'rebounds': return val(game.reb);
    case 'steals': return val(game.stl);
    case 'blocks': return val(game.blk);
    case 'threes': return val(game.fg3m);
    case 'turnovers': return val(game.tov);
    default:
      const parts = splitNBACombo(p);
      if (!parts) return null;
      return parts.reduce((sum, part) => sum + (getNBAStatFromGame(game, part) || 0), 0);
  }
}

//
// ─────────────────────────────────────────────────────────────
//   AVERAGE + HIT %
// ─────────────────────────────────────────────────────────────
//
export function calculateNBAAvg(
  games: BRGame[],
  propNorm: string,
  limit = 999,
  beforeDate?: string
): number | null {
  const eligible = beforeDate ? games.filter(g => g.date < beforeDate) : games;
  const slice = eligible.slice(-limit);
  if (!slice.length) return null;

  const total = slice.reduce((sum, g) => sum + (getNBAStatFromGame(g, propNorm) || 0), 0);
  return Number((total / slice.length).toFixed(1));
}

export function calculateNBAHitPct(
  games: BRGame[],
  propNorm: string,
  line: number,
  overUnder: string,
  limit = 999,
  beforeDate?: string
): number | null {
  const eligible = beforeDate ? games.filter(g => g.date < beforeDate) : games;
  const slice = eligible.slice(-limit);
  if (!slice.length) return null;

  const isOver = overUnder.toLowerCase().includes('over');

  const wins = slice.filter(g => {
    const stat = getNBAStatFromGame(g, propNorm);
    return stat != null && (isOver ? stat > line : stat < line);
  }).length;

  return Math.round((wins / slice.length) * 100);
}

//
// ─────────────────────────────────────────────────────────────
//   FETCH WITH RETRY
// ─────────────────────────────────────────────────────────────
//
async function fetchWithRetry(url: string, maxRetries = 2): Promise<Response | null> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await new Promise(r => setTimeout(r, 1500 + Math.random() * 1500));
      const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
      if (res.status === 429) continue;
      return res;
    } catch (e) {
      if (i === maxRetries - 1) throw e;
    }
  }
  return null;
}
