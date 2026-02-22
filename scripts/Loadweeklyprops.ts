#!/usr/bin/env npx tsx
// scripts/loadWeeklyProps.ts
//
// Full weekly prop enrichment pipeline:
//   Step 1  → Scrape props from BettingPros
//   Step 2  → Match player → team from static_playerTeamMapping
//   Step 3  → Load schedule from Firestore to get matchup + gameDate
//   Step 4  → Load player season avg from PFR game log
//   Step 5  → Load defense stats from TeamRankings
//   Step 6  → Apply Run-1 formulas (yardsScore → projWinPct)
//   Step 7  → Calculate season hit % from PFR game log
//   Step 8  → Apply Run-2 formulas (avgWinProb → confidenceScore)
//   Step 9  → Save to allProps_2025
//
// Usage:
//   cd ~/project
//   npx tsx scripts/loadWeeklyProps.ts --week=22
//   npx tsx scripts/loadWeeklyProps.ts --week=22 --dry-run
//   npx tsx scripts/loadWeeklyProps.ts --week=22 --post-game   ← fills gameStat/actualResult

import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';

// ── Firebase ─────────────────────────────────────────────────────────────────
if (!getApps().length) {
  const key = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  initializeApp(key ? { credential: cert(JSON.parse(key)) } : undefined);
}
const db = getFirestore();

// ── CLI args ──────────────────────────────────────────────────────────────────
const ARGS       = process.argv.slice(2);
const WEEK       = parseInt(ARGS.find(a => a.startsWith('--week='))?.split('=')[1] ?? '22');
const SEASON     = parseInt(ARGS.find(a => a.startsWith('--season='))?.split('=')[1] ?? '2025');
const DRY_RUN    = ARGS.includes('--dry-run');
const POST_GAME  = ARGS.includes('--post-game');
const COLLECTION = `allProps_${SEASON}`;

// ── TeamRankings prop → URL map ───────────────────────────────────────────────
const TR_URLS: Record<string, string> = {
  'pass yds':    'https://www.teamrankings.com/nfl/stat/opponent-passing-yards-per-game',
  'pass att':    'https://www.teamrankings.com/nfl/stat/opponent-pass-attempts-per-game',
  'pass cmp':    'https://www.teamrankings.com/nfl/stat/opponent-pass-completions-per-game',
  'pass tds':    'https://www.teamrankings.com/nfl/stat/opponent-passing-touchdowns-per-game',
  'rush yds':    'https://www.teamrankings.com/nfl/stat/opponent-rushing-yards-per-game',
  'rush att':    'https://www.teamrankings.com/nfl/stat/opponent-rush-attempts-per-game',
  'rush tds':    'https://www.teamrankings.com/nfl/stat/opponent-rushing-touchdowns-per-game',
  'rec yds':     'https://www.teamrankings.com/nfl/stat/opponent-receiving-yards-per-game',
  'recs':        'https://www.teamrankings.com/nfl/stat/opponent-receptions-per-game',
  'rec tds':     'https://www.teamrankings.com/nfl/stat/opponent-receiving-touchdowns-per-game',
  'ints':        'https://www.teamrankings.com/nfl/stat/opponent-interceptions-thrown-per-game',
  'rush+rec yds':'https://www.teamrankings.com/nfl/stat/opponent-rushing-yards-per-game', // averaged w/ rec
  'pass+rush yds':'https://www.teamrankings.com/nfl/stat/opponent-total-yards-per-game',
};

// BettingPros prop label → normalized prop name
const BP_TO_NORM: Record<string, string> = {
  'passing yards':           'Pass Yards',
  'pass yards':              'Pass Yards',
  'passing attempts':        'Pass Attempts',
  'pass attempts':           'Pass Attempts',
  'pass completions':        'Pass Completions',
  'passing completions':     'Pass Completions',
  'passing touchdowns':      'Pass TDs',
  'pass touchdowns':         'Pass TDs',
  'pass tds':                'Pass TDs',
  'rushing yards':           'Rush Yards',
  'rush yards':              'Rush Yards',
  'rushing attempts':        'Rush Attempts',
  'rush attempts':           'Rush Attempts',
  'rushing touchdowns':      'Rush TDs',
  'rush touchdowns':         'Rush TDs',
  'receiving yards':         'Rec Yards',
  'rec yards':               'Rec Yards',
  'receptions':              'Receptions',
  'receiving touchdowns':    'Rec TDs',
  'rec touchdowns':          'Rec TDs',
  'anytime touchdown scorer':'Anytime TD',
  'anytime td':              'Anytime TD',
  'rush + rec yards':        'Rush + Rec Yards',
  'rush+rec yards':          'Rush + Rec Yards',
  'pass + rush yards':       'Pass + Rush Yards',
  'pass+rush yards':         'Pass + Rush Yards',
  'interceptions':           'Interceptions',
  'interceptions thrown':    'Interceptions',
};

// NFL team name → abbreviation (for TeamRankings matching)
const TEAM_NAME_TO_ABBR: Record<string, string> = {
  'Arizona Cardinals': 'ARI', 'Atlanta Falcons': 'ATL', 'Baltimore Ravens': 'BAL',
  'Buffalo Bills': 'BUF', 'Carolina Panthers': 'CAR', 'Chicago Bears': 'CHI',
  'Cincinnati Bengals': 'CIN', 'Cleveland Browns': 'CLE', 'Dallas Cowboys': 'DAL',
  'Denver Broncos': 'DEN', 'Detroit Lions': 'DET', 'Green Bay Packers': 'GB',
  'Houston Texans': 'HOU', 'Indianapolis Colts': 'IND', 'Jacksonville Jaguars': 'JAX',
  'Kansas City Chiefs': 'KC', 'Los Angeles Chargers': 'LAC', 'Los Angeles Rams': 'LAR',
  'Las Vegas Raiders': 'LV', 'Miami Dolphins': 'MIA', 'Minnesota Vikings': 'MIN',
  'New England Patriots': 'NE', 'New Orleans Saints': 'NO', 'New York Giants': 'NYG',
  'New York Jets': 'NYJ', 'Philadelphia Eagles': 'PHI', 'Pittsburgh Steelers': 'PIT',
  'Seattle Seahawks': 'SEA', 'San Francisco 49ers': 'SF', 'Tampa Bay Buccaneers': 'TB',
  'Tennessee Titans': 'TEN', 'Washington Commanders': 'WAS',
  // Short forms also
  'Cardinals': 'ARI', 'Falcons': 'ATL', 'Ravens': 'BAL', 'Bills': 'BUF',
  'Panthers': 'CAR', 'Bears': 'CHI', 'Bengals': 'CIN', 'Browns': 'CLE',
  'Cowboys': 'DAL', 'Broncos': 'DEN', 'Lions': 'DET', 'Packers': 'GB',
  'Texans': 'HOU', 'Colts': 'IND', 'Jaguars': 'JAX', 'Chiefs': 'KC',
  'Chargers': 'LAC', 'Rams': 'LAR', 'Raiders': 'LV', 'Dolphins': 'MIA',
  'Vikings': 'MIN', 'Patriots': 'NE', 'Saints': 'NO', 'Giants': 'NYG',
  'Jets': 'NYJ', 'Eagles': 'PHI', 'Steelers': 'PIT', 'Seahawks': 'SEA',
  '49ers': 'SF', 'Buccaneers': 'TB', 'Titans': 'TEN', 'Commanders': 'WAS',
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface RawProp {
  player: string;
  prop: string;       // normalized label e.g. "Rush Yards"
  propNorm: string;   // lowercase key e.g. "rush yds"
  line: number;
  overunder: string;  // "Over" | "Under"
  odds: number;       // American odds for the listed side
  source: string;     // "bettingpros"
}

interface EnrichedProp extends RawProp {
  team: string;
  matchup: string;
  gameDate: string;
  playerAvg: number | null;
  opponentRank: number | null;
  opponentAvgVsStat: number | null;
  // Run-1
  yardsScore: number | null;
  rankScore: number | null;
  totalScore: number | null;
  scoreDiff: number | null;
  scalingFactor: number | null;
  winProbability: number | null;
  recommendedSide: string | null;
  projWinPct: number | null;
  // Run-2
  seasonHitPct: number | null;
  avgWinProb: number | null;
  impliedProb: number | null;
  bestEdgePct: number | null;
  expectedValue: number | null;
  kellyPct: number | null;
  valueIcon: string | null;
  confidenceScore: number | null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 1 — Scrape BettingPros
// ═══════════════════════════════════════════════════════════════════════════════

async function scrapeBettingPros(week: number, season: number): Promise<RawProp[]> {
  console.log(`\n📡 Step 1: Scraping BettingPros (Week ${week})...`);

  // BettingPros exposes a JSON API that the page calls.
  // Primary endpoint — try with Accept: application/json header
  const urls = [
    `https://api.bettingpros.com/v3/picks?sport=NFL&week=${week}&season=${season}&category=player-props&limit=500`,
    `https://www.bettingpros.com/api/v3/picks?sport=NFL&week=${week}&season=${season}&category=player-props`,
  ];

  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': `https://www.bettingpros.com/nfl/picks/prop-bets/?week=${week}`,
    'Origin': 'https://www.bettingpros.com',
    'x-api-key': 'CHi8Hy5CEE4khd46XNYL23dCFX96oUdw8Tp7umSc', // public key used by their web app
  };

  for (const url of urls) {
    try {
      console.log(`   Trying: ${url}`);
      const res = await fetchWithRetry(url, { headers });
      if (!res || !res.ok) continue;

      const data = await res.json() as any;
      const props = parseBettingProsResponse(data);
      if (props.length > 0) {
        console.log(`   ✅ Got ${props.length} props from BettingPros API`);
        return props;
      }
    } catch (err) {
      console.warn(`   ⚠️  API attempt failed:`, (err as Error).message);
    }
  }

  // Fallback: try scraping the HTML page (will only work if not JS-rendered)
  console.log('   Falling back to HTML scrape...');
  const htmlProps = await scrapeBettingProsHTML(week);
  if (htmlProps.length > 0) return htmlProps;

  console.warn(`
  ⚠️  BettingPros requires a JavaScript-rendered browser to scrape.
     Options:
     1) Install puppeteer: npm add -D puppeteer
        Then run: npx tsx scripts/loadWeeklyProps.ts --week=${week} --use-puppeteer
     2) Manually export props to a CSV and use: --from-csv=props.csv
     3) Use the manual fallback below (paste props directly into the script)

  Using SAMPLE DATA for Week ${week} testing...`);

  return getSampleProps(week);
}

function parseBettingProsResponse(data: any): RawProp[] {
  const props: RawProp[] = [];
  const picks = data?.picks ?? data?.data ?? data?.results ?? [];

  for (const pick of picks) {
    try {
      const playerName = pick?.player?.full_name ?? pick?.name ?? pick?.player_name ?? '';
      const propLabel = pick?.market?.name ?? pick?.prop_type ?? pick?.category ?? '';
      const line = parseFloat(pick?.line ?? pick?.value ?? '0');
      const side = pick?.side ?? pick?.pick ?? 'Over'; // Over/Under
      const odds = parseInt(pick?.odds ?? pick?.line_odds ?? '-110');

      if (!playerName || !propLabel || isNaN(line)) continue;

      const propNorm = normalizePropLabel(propLabel);
      const normalized = BP_TO_NORM[propNorm] ?? propLabel;

      props.push({
        player: toTitleCase(playerName),
        prop: normalized,
        propNorm: toPropNormKey(normalized),
        line,
        overunder: side.includes('Under') ? 'Under' : 'Over',
        odds,
        source: 'bettingpros',
      });
    } catch { /* skip bad rows */ }
  }

  return props;
}

async function scrapeBettingProsHTML(week: number): Promise<RawProp[]> {
  const url = `https://www.bettingpros.com/nfl/picks/prop-bets/?week=${week}`;
  const res = await fetchWithRetry(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      'Accept': 'text/html',
    }
  });
  if (!res || !res.ok) return [];

  const html = await res.text();

  // BettingPros sometimes embeds __NEXT_DATA__ JSON
  const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
  if (nextDataMatch) {
    try {
      const nextData = JSON.parse(nextDataMatch[1]);
      const pageProps = nextData?.props?.pageProps;
      const picks = pageProps?.picks ?? pageProps?.initialData?.picks ?? [];
      if (picks.length > 0) return parseBettingProsResponse({ picks });
    } catch { /* not parseable */ }
  }

  return [];
}

// Sample data for Week 22 (Super Bowl LIX - Eagles vs Chiefs expected)
function getSampleProps(week: number): RawProp[] {
  console.log(`\n  📋 Using sample Super Bowl Week ${week} props for testing pipeline...`);
  return [
    // Eagles
    { player: 'Jalen Hurts',     prop: 'Pass Yards',    propNorm: 'pass yds',    line: 247.5, overunder: 'Over',  odds: -115, source: 'sample' },
    { player: 'Jalen Hurts',     prop: 'Rush Yards',    propNorm: 'rush yds',    line: 42.5,  overunder: 'Over',  odds: -110, source: 'sample' },
    { player: 'Jalen Hurts',     prop: 'Pass TDs',      propNorm: 'pass tds',    line: 1.5,   overunder: 'Over',  odds: -130, source: 'sample' },
    { player: 'Saquon Barkley',  prop: 'Rush Yards',    propNorm: 'rush yds',    line: 78.5,  overunder: 'Over',  odds: -120, source: 'sample' },
    { player: 'Saquon Barkley',  prop: 'Receptions',    propNorm: 'recs',        line: 2.5,   overunder: 'Over',  odds: -140, source: 'sample' },
    { player: 'A.J. Brown',      prop: 'Rec Yards',     propNorm: 'rec yds',     line: 72.5,  overunder: 'Over',  odds: -110, source: 'sample' },
    { player: 'DeVonta Smith',   prop: 'Rec Yards',     propNorm: 'rec yds',     line: 58.5,  overunder: 'Over',  odds: -110, source: 'sample' },
    { player: 'Dallas Goedert',  prop: 'Rec Yards',     propNorm: 'rec yds',     line: 42.5,  overunder: 'Over',  odds: -110, source: 'sample' },
    // Chiefs
    { player: 'Patrick Mahomes', prop: 'Pass Yards',    propNorm: 'pass yds',    line: 282.5, overunder: 'Over',  odds: -115, source: 'sample' },
    { player: 'Patrick Mahomes', prop: 'Pass TDs',      propNorm: 'pass tds',    line: 1.5,   overunder: 'Over',  odds: -150, source: 'sample' },
    { player: 'Patrick Mahomes', prop: 'Pass Attempts', propNorm: 'pass att',    line: 39.5,  overunder: 'Over',  odds: -110, source: 'sample' },
    { player: 'Isiah Pacheco',   prop: 'Rush Yards',    propNorm: 'rush yds',    line: 52.5,  overunder: 'Over',  odds: -110, source: 'sample' },
    { player: 'Travis Kelce',    prop: 'Rec Yards',     propNorm: 'rec yds',     line: 52.5,  overunder: 'Over',  odds: -110, source: 'sample' },
    { player: 'Travis Kelce',    prop: 'Receptions',    propNorm: 'recs',        line: 4.5,   overunder: 'Over',  odds: -120, source: 'sample' },
    { player: 'Xavier Worthy',   prop: 'Rec Yards',     propNorm: 'rec yds',     line: 38.5,  overunder: 'Over',  odds: -110, source: 'sample' },
    { player: 'Rashee Rice',     prop: 'Rec Yards',     propNorm: 'rec yds',     line: 48.5,  overunder: 'Over',  odds: -115, source: 'sample' },
  ];
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 2 — Load player → team map from Firestore
// ═══════════════════════════════════════════════════════════════════════════════

async function loadPlayerTeamMap(): Promise<Record<string, string>> {
  console.log('\n👥 Step 2: Loading player → team map...');
  const snap = await db.collection('static_playerTeamMapping').get();
  const map: Record<string, string> = {};
  snap.docs.forEach(d => {
    const data = d.data();
    const name = (data.playerName || data.player || '').toLowerCase().trim();
    const team = (data.team || '').toUpperCase();
    if (name && team) map[name] = team;
  });
  console.log(`   ✅ ${Object.keys(map).length} player → team entries`);
  return map;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 3 — Load schedule from Firestore
// ═══════════════════════════════════════════════════════════════════════════════

interface ScheduleGame {
  week: number;
  gameDate: string;
  gameTime: string;
  homeTeam: string;
  awayTeam: string;
  matchup: string;
}

async function loadSchedule(week: number, season: number): Promise<ScheduleGame[]> {
  console.log('\n📅 Step 3: Loading schedule...');
  const snap = await db.collection('schedule')
    .where('week', '==', week)
    .where('season', '==', season)
    .get();

  if (snap.empty) {
    // Week 22 fallback — Super Bowl LIX
    console.log('   ⚠️  No schedule in Firestore for this week. Using hardcoded Super Bowl fallback.');
    return [{
      week: 22,
      gameDate: '2026-02-08',
      gameTime: '6:30 PM',
      homeTeam: 'NO',     // Caesars Superdome (neutral site)
      awayTeam: 'PHI',    // Will be updated based on actual matchup
      matchup: 'PHI @ KC', // placeholder — update after conference championships
    }];
  }

  const games = snap.docs.map(d => d.data() as ScheduleGame);
  console.log(`   ✅ ${games.length} game(s) found for Week ${week}`);
  return games;
}

function getMatchupForTeam(team: string, games: ScheduleGame[]): ScheduleGame | null {
  return games.find(g =>
    g.homeTeam?.toUpperCase() === team ||
    g.awayTeam?.toUpperCase() === team ||
    g.matchup?.toUpperCase().includes(team)
  ) ?? null;
}

function getOpponentFromMatchup(team: string, matchup: string): string {
  // matchup format: "ARI @ PHI" or "PHI vs ARI"
  const parts = matchup.toUpperCase().replace(' VS ', ' @ ').split(' @ ');
  if (parts.length !== 2) return '';
  return parts[0].trim() === team ? parts[1].trim() : parts[0].trim();
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 4 — Load PFR player season average + game logs
// ═══════════════════════════════════════════════════════════════════════════════

interface PFRGame {
  week: number;
  date: string;
  passYds: number; passAtt: number; passCmp: number; passTds: number; passInts: number;
  rushYds: number; rushAtt: number; rushTds: number;
  receptions: number; recYds: number; recTds: number;
}

const PFR_CACHE = new Map<string, PFRGame[]>();

async function loadPfrIdMap(): Promise<Record<string, string>> {
  console.log('\n🔑 Step 4: Loading PFR ID map from static_pfrIdMap...');
  
  // Explicitly point to your confirmed collection name
  const snap = await db.collection('static_pfrIdMap').get();
  const map: Record<string, string> = {};

  if (snap.empty) {
    console.warn('   ⚠️  Collection "static_pfrIdMap" is empty in Firestore!');
    return map;
  }

  snap.docs.forEach(d => {
    const data = d.data();
    
    // 🔥 CRITICAL: Match your confirmed Firestore field names exactly
    // You confirmed the fields are 'player' and 'pfrid'
    const name = (data.player || '').toLowerCase().trim();
    const id   = data.pfrid || ''; 

    if (name && id) {
      map[name] = id;
    }
  });

  console.log(`   ✅ ${snap.size} total documents found in static_pfrIdMap`);
  console.log(`   ✅ ${Object.keys(map).length} PFR IDs successfully mapped to memory`);
  
  // Debug check: See if Jalen Hurts is actually in the map we just built
  if (map['jalen hurts']) {
    console.log(`   📍 Found Jalen Hurts in map: ${map['jalen hurts']}`);
  } else {
    console.log(`   ❌ Jalen Hurts NOT found in the mapped names.`);
  }

  return map;
}

async function fetchPfrGameLog(pfrId: string, season: number): Promise<PFRGame[]> {
  const cacheKey = `${pfrId}:${season}`;
  if (PFR_CACHE.has(cacheKey)) return PFR_CACHE.get(cacheKey)!;

  const url = `https://www.pro-football-reference.com/players/${pfrId[0]}/${pfrId}/gamelog/${season}/`;
  await sleep(600); // polite rate limit

  const res = await fetchWithRetry(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Accept': 'text/html',
      'Accept-Language': 'en-US,en;q=0.9',
    }
  });

  if (!res || !res.ok) { PFR_CACHE.set(cacheKey, []); return []; }

  const html = await res.text();
  const games = parsePfrGameLog(html);
  PFR_CACHE.set(cacheKey, games);
  return games;
}

function parsePfrGameLog(html: string): PFRGame[] {
  const games: PFRGame[] = [];

  // PFR hides stats inside HTML comment wrapper
  const commentMatch = html.match(/<!--([\s\S]*?id="stats"[\s\S]*?)-->/i);
  const tableHtml = commentMatch
    ? commentMatch[1]
    : html.match(/<table[^>]*id="stats"[^>]*>([\s\S]*?)<\/table>/i)?.[1];

  if (!tableHtml) return games;

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;

  while ((m = rowRegex.exec(tableHtml)) !== null) {
    const row = m[1];
    if (row.includes('<th') && !row.includes('<td')) continue;

    const cell = (stat: string): string => {
      const pat = new RegExp(`<(?:td|th)[^>]*data-stat="${stat}"[^>]*>([\\s\\S]*?)<\\/(?:td|th)>`, 'i');
      const cm = row.match(pat);
      if (!cm) return '';
      let val = cm[1];
      if (stat === 'game_date') { const csk = cm[0].match(/data-csk="([^"]+)"/); if (csk) val = csk[1]; }
      const link = val.match(/<a[^>]*>([^<]+)<\/a>/i);
      if (link) val = link[1];
      return val.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim();
    };

    const weekNum = parseInt(cell('week_num'), 10);
    if (isNaN(weekNum)) continue;

    games.push({
      week:       weekNum,
      date:       cell('game_date'),
      passYds:    parseFloat(cell('pass_yds'))  || 0,
      passAtt:    parseFloat(cell('pass_att'))  || 0,
      passCmp:    parseFloat(cell('pass_cmp'))  || 0,
      passTds:    parseFloat(cell('pass_td'))   || 0,
      passInts:   parseFloat(cell('pass_int'))  || 0,
      rushYds:    parseFloat(cell('rush_yds'))  || 0,
      rushAtt:    parseFloat(cell('rush_att'))  || 0,
      rushTds:    parseFloat(cell('rush_td'))   || 0,
      receptions: parseFloat(cell('rec'))       || 0,
      recYds:     parseFloat(cell('rec_yds'))   || 0,
      recTds:     parseFloat(cell('rec_td'))    || 0,
    });
  }

  return games;
}

function getStatFromGame(game: PFRGame, propNormKey: string): number | null {
  switch (propNormKey) {
    case 'pass yds':     return game.passYds;
    case 'pass att':     return game.passAtt;
    case 'pass cmp':     return game.passCmp;
    case 'pass tds':     return game.passTds;
    case 'ints':         return game.passInts;
    case 'rush yds':     return game.rushYds;
    case 'rush att':     return game.rushAtt;
    case 'rush tds':     return game.rushTds;
    case 'rec yds':      return game.recYds;
    case 'recs':         return game.receptions;
    case 'rec tds':      return game.recTds;
    case 'anytime td':   return (game.passTds + game.rushTds + game.recTds) > 0 ? 1 : 0;
    case 'rush+rec yds': return game.rushYds + game.recYds;
    case 'pass+rush yds':return game.passYds + game.rushYds;
    default:             return null;
  }
}

function calculatePlayerAvg(games: PFRGame[], propNormKey: string, beforeWeek: number): number | null {
  const eligible = games.filter(g => g.week < beforeWeek);
  if (!eligible.length) return null;

  let total = 0, count = 0;
  for (const g of eligible) {
    const stat = getStatFromGame(g, propNormKey);
    if (stat === null) continue;
    if (propNormKey === 'anytime td' && g.passAtt === 0 && g.rushAtt === 0 && g.receptions === 0) continue;
    total += stat;
    count++;
  }
  return count > 0 ? Math.round((total / count) * 10) / 10 : null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 5 — Load TeamRankings defense stats
// ═══════════════════════════════════════════════════════════════════════════════

interface DefenseEntry { rank: number; avg: number; }
type DefenseMap = Record<string, Record<string, DefenseEntry>>; // propNorm → teamAbbr → stats

const TR_CACHE = new Map<string, DefenseMap>();

async function loadAllDefenseStats(): Promise<DefenseMap> {
  const cacheKey = 'all';
  if (TR_CACHE.has(cacheKey)) return TR_CACHE.get(cacheKey)!;

  console.log('\n🛡️  Step 5: Loading TeamRankings defense stats...');
  const defenseMap: DefenseMap = {};

  for (const [propNorm, url] of Object.entries(TR_URLS)) {
    try {
      await sleep(400);
      const res = await fetchWithRetry(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
          'Accept': 'text/html',
        }
      });
      if (!res || !res.ok) { console.warn(`   ⚠️  TR fetch failed for ${propNorm}`); continue; }

      const html = await res.text();
      const entries = parseTeamRankingsTable(html);
      defenseMap[propNorm] = entries;
      console.log(`   ✅ ${propNorm}: ${Object.keys(entries).length} teams`);
    } catch (err) {
      console.warn(`   ⚠️  Error loading ${propNorm}:`, (err as Error).message);
    }
  }

  TR_CACHE.set(cacheKey, defenseMap);
  return defenseMap;
}

function parseTeamRankingsTable(html: string): Record<string, DefenseEntry> {
  const entries: Record<string, DefenseEntry> = {};

  // TeamRankings table: <tr><td>1</td><td><a>Team Name</a></td><td>value</td>...
  const tableMatch = html.match(/<table[^>]*class="[^"]*tr-table[^"]*"[^>]*>([\s\S]*?)<\/table>/i)
    ?? html.match(/<table[^>]*>([\s\S]*?)<\/table>/i);
  if (!tableMatch) return entries;

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let m: RegExpExecArray | null;
  let rankCounter = 0;

  while ((m = rowRegex.exec(tableMatch[1])) !== null) {
    const row = m[1];
    if (row.includes('<th')) continue;

    // Extract cells
    const cells = [...row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)]
      .map(c => c[1].replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim());

    if (cells.length < 3) continue;

    // Rank is usually first cell or counter
    const rankCell = parseInt(cells[0]);
    const rank = isNaN(rankCell) ? ++rankCounter : rankCell;

    // Team name is usually second cell (may have link)
    const teamRaw = cells[1];
    const avg = parseFloat(cells[2]);
    if (!teamRaw || isNaN(avg)) continue;

    // Try to find abbreviation
    const abbr = TEAM_NAME_TO_ABBR[teamRaw] ?? teamRaw.toUpperCase().slice(0, 3);
    entries[abbr] = { rank, avg };
  }

  return entries;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 6 — Run-1 Formulas
// ═══════════════════════════════════════════════════════════════════════════════

interface Run1Result {
  yardsScore: number;
  rankScore: number;
  totalScore: number;
  scoreDiff: number;
  scalingFactor: number;
  winProbability: number;
  recommendedSide: 'Over' | 'Under' | '';
  projWinPct: number;
}

function applyRun1(
  playerAvg: number,
  opponentRank: number,
  opponentAvgVsStat: number,
  line: number
): Run1Result {
  // Yards Score = playerAvg + (oppAvgVsStat / 100)
  const yardsScore = playerAvg + (opponentAvgVsStat / 100);

  // Rank Score = (oppRank / 32) * 10
  const rankScore = (opponentRank / 32) * 10;

  // Total Score = yardsScore - rankScore
  const totalScore = yardsScore - rankScore;

  // Score Diff = totalScore - line
  const scoreDiff = totalScore - line;

  // Scaling Factor = scoreDiff / 10
  const scalingFactor = scoreDiff / 10;

  // Win Probability = 1 / (1 + e^(-scalingFactor))   [logistic function]
  const expFn = Math.exp(-scalingFactor);
  const winProbability = 1 / (1 + expFn);

  // Recommended side
  const recommendedSide: 'Over' | 'Under' | '' =
    scoreDiff > 0 ? 'Over' : scoreDiff < 0 ? 'Under' : '';

  // Proj Win % = winProbability if Over, (1 - winProbability) if Under
  const projWinPct = recommendedSide === 'Over'
    ? winProbability
    : recommendedSide === 'Under'
      ? 1 - winProbability
      : 0;

  return { yardsScore, rankScore, totalScore, scoreDiff, scalingFactor, winProbability, recommendedSide, projWinPct };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 7 — Season Hit %
// ═══════════════════════════════════════════════════════════════════════════════

function calculateSeasonHitPct(
  games: PFRGame[],
  propNormKey: string,
  line: number,
  overunder: string,
  excludeWeek: number
): number | null {
  const isOver  = overunder.toLowerCase() === 'over';
  const isUnder = overunder.toLowerCase() === 'under';
  if (!isOver && !isUnder) return null;

  let wins = 0, total = 0;

  for (const g of games) {
    if (g.week >= excludeWeek) continue; // only games BEFORE current week
    const stat = getStatFromGame(g, propNormKey);
    if (stat === null) continue;
    total++;
    if (isOver  && stat > line) wins++;
    if (isUnder && stat < line) wins++;
  }

  return total >= 3 ? wins / total : null; // need at least 3 games for meaningful %
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 8 — Run-2 Formulas
// ═══════════════════════════════════════════════════════════════════════════════

interface Run2Result {
  avgWinProb: number;
  impliedProb: number | null;
  bestEdgePct: number | null;
  expectedValue: number | null;
  kellyPct: number | null;
  valueIcon: string;
  confidenceScore: number | null;
}

function applyRun2(
  projWinPct: number,
  seasonHitPct: number | null,
  odds: number,           // American odds (already loaded from BettingPros)
  propNormKey: string
): Run2Result {
  // Avg Win Prob = average of projWinPct and seasonHitPct (if available)
  const avgWinProb = seasonHitPct !== null
    ? (projWinPct + seasonHitPct) / 2
    : projWinPct;

  // Implied Probability from American odds
  const impliedProb = odds !== 0
    ? (odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100))
    : null;

  // Best Edge % = avgWinProb - impliedProb
  const bestEdgePct = impliedProb !== null ? avgWinProb - impliedProb : null;

  // Expected Value
  let expectedValue: number | null = null;
  let kellyPct: number | null = null;

  if (impliedProb !== null && bestEdgePct !== null) {
    // Decimal payout multiplier (profit per unit)
    const b = odds > 0 ? odds / 100 : 100 / Math.abs(odds);
    expectedValue = Math.min(avgWinProb * b - (1 - avgWinProb), 2);

    // Kelly Criterion
    if (bestEdgePct > 0) {
      const kelly = (b * avgWinProb - (1 - avgWinProb)) / b;
      const cap = propNormKey === 'anytime td' ? 0.02 : propNormKey === 'pass tds' ? 0.05 : 0.10;
      kellyPct = Math.min(Math.max(kelly, 0), cap);
    }
  }

  // Value Icon
  const valueIcon = bestEdgePct !== null
    ? (bestEdgePct > 0.10 ? '🔥' : bestEdgePct > 0.05 ? '⚠️' : '❄️')
    : '';

  // Confidence Score = 0.5 * projWinPct + 0.3 * seasonHitPct + 0.2 * avgWinProb
  const confidenceScore = seasonHitPct !== null
    ? 0.5 * projWinPct + 0.3 * seasonHitPct + 0.2 * avgWinProb
    : null;

  return { avgWinProb, impliedProb, bestEdgePct, expectedValue, kellyPct, valueIcon, confidenceScore };
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP 9 — Post-game: fill gameStat + actualResult
// ═══════════════════════════════════════════════════════════════════════════════

async function runPostGame(week: number, season: number, pfrIdMap: Record<string, string>) {
  console.log(`\n🏆 Post-Game: Loading actual results for Week ${week}...`);
  const snap = await db.collection(COLLECTION).where('week', '==', week).get();
  const props = snap.docs.map(d => ({ id: d.id, ...d.data() as any }));
  console.log(`   ${props.length} props to update`);

  const gameCache = new Map<string, PFRGame | null>();

  const updates: Array<{ id: string; data: any }> = [];

  for (const prop of props) {
    const playerNorm = (prop.player || '').toLowerCase().trim();
    const pfrId = pfrIdMap[playerNorm];
    if (!pfrId) continue;

    const cacheKey = `${pfrId}:${week}`;
    if (!gameCache.has(cacheKey)) {
      const games = await fetchPfrGameLog(pfrId, season);
      gameCache.set(cacheKey, games.find(g => g.week === week) ?? null);
    }

    const game = gameCache.get(cacheKey);
    if (!game) continue;

    const propNormKey = prop.propNorm || toPropNormKey(prop.prop || '');
    const stat = getStatFromGame(game, propNormKey);
    if (stat === null) continue;

    const ou = (prop.overunder || '').toLowerCase();
    let actualResult: 'Win' | 'Loss' | 'Push' | null = null;
    if (ou && stat !== prop.line) {
      actualResult = (ou === 'over' ? stat > prop.line : stat < prop.line) ? 'Win' : 'Loss';
    } else if (ou && stat === prop.line) {
      actualResult = 'Push';
    }

    updates.push({ id: prop.id, data: { gameStat: stat, actualResult, updatedAt: Timestamp.now() } });
    console.log(`   ${prop.player} ${prop.prop} ${prop.line} → actual: ${stat} → ${actualResult ?? 'N/A'}`);
  }

  if (!DRY_RUN && updates.length > 0) {
    const BATCH = 400;
    for (let i = 0; i < updates.length; i += BATCH) {
      const batch = db.batch();
      updates.slice(i, i + BATCH).forEach(u => batch.update(db.collection(COLLECTION).doc(u.id), u.data));
      await batch.commit();
    }
  }

  const wins   = updates.filter(u => u.data.actualResult === 'Win').length;
  const losses = updates.filter(u => u.data.actualResult === 'Loss').length;
  const pushes = updates.filter(u => u.data.actualResult === 'Push').length;
  console.log(`\n   ✅ ${updates.length} updated | W:${wins} L:${losses} P:${pushes}`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN PIPELINE
// ═══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`🏈 NFL Props Pipeline — Week ${WEEK}, Season ${SEASON}`);
  console.log(`   Collection: ${COLLECTION}`);
  console.log(`   Mode: ${DRY_RUN ? '🔍 DRY RUN' : POST_GAME ? '🏆 POST-GAME' : '✍️  LIVE'}`);
  console.log(`${'═'.repeat(60)}`);

  // ── Load static data ──────────────────────────────────────────────────────
  const [playerTeamMap, pfrIdMap] = await Promise.all([
    loadPlayerTeamMap(),
    loadPfrIdMap(),
  ]);

  // ── Post-game mode ────────────────────────────────────────────────────────
  if (POST_GAME) {
    await runPostGame(WEEK, SEASON, pfrIdMap);
    return;
  }

  // ── Step 1: Scrape BettingPros ────────────────────────────────────────────
  const rawProps = await scrapeBettingPros(WEEK, SEASON);
  console.log(`\n   📋 ${rawProps.length} raw props scraped`);

  // ── Step 3: Load schedule ─────────────────────────────────────────────────
  const schedule = await loadSchedule(WEEK, SEASON);

  // ── Step 5: Load defense stats ────────────────────────────────────────────
  const defenseMap = await loadAllDefenseStats();

  // ── Steps 2 + 4 + 6 + 7 + 8: Enrich each prop ───────────────────────────
  console.log(`\n⚙️  Enriching ${rawProps.length} props...`);
  const enriched: EnrichedProp[] = [];

  for (const raw of rawProps) {
    const playerNorm = raw.player.toLowerCase().trim();

    // ── Step 2: Team ─────────────────────────────────────────────────────────
    let team = playerTeamMap[playerNorm] ?? '';
    if (!team) {
      // Fuzzy: last name match
      const lastName = playerNorm.split(' ').pop() ?? '';
      team = Object.entries(playerTeamMap).find(([n]) => n.endsWith(lastName))?.[1] ?? '';
    }

    // ── Step 3: Matchup + game date ───────────────────────────────────────────
    const game = team ? getMatchupForTeam(team, schedule) : schedule[0] ?? null;
    const matchup  = game?.matchup  ?? '';
    const gameDate = game?.gameDate ?? '';
    const opponent = team && matchup ? getOpponentFromMatchup(team, matchup) : '';

    // ── Step 4: PFR player avg ────────────────────────────────────────────────
    const pfrId = pfrIdMap[playerNorm]
      ?? Object.entries(pfrIdMap).find(([n]) => n.endsWith(playerNorm.split(' ').pop() ?? ''))?.[1];

    const seasonToUse = WEEK <= 3 ? SEASON - 1 : SEASON;
    let games: PFRGame[] = [];
    let playerAvg: number | null = null;

    if (pfrId) {
      process.stdout.write(`   📊 ${raw.player} (${raw.prop})... `);
      games = await fetchPfrGameLog(pfrId, seasonToUse);
      playerAvg = calculatePlayerAvg(games, raw.propNorm, WEEK);
      process.stdout.write(`avg=${playerAvg ?? 'N/A'}\n`);
    } else {
      console.log(`   ⚠️  No PFR ID: ${raw.player}`);
    }

    // ── Step 5: Defense stats ─────────────────────────────────────────────────
    const defProp  = defenseMap[raw.propNorm];
    const defStats = opponent && defProp ? (defProp[opponent] ?? null) : null;
    const opponentRank       = defStats?.rank ?? null;
    const opponentAvgVsStat  = defStats?.avg  ?? null;

    // ── Step 6: Run-1 formulas ────────────────────────────────────────────────
    let run1: Run1Result | null = null;
    if (playerAvg !== null && opponentRank !== null && opponentAvgVsStat !== null) {
      run1 = applyRun1(playerAvg, opponentRank, opponentAvgVsStat, raw.line);
    }

    // ── Step 7: Season hit % ──────────────────────────────────────────────────
    let seasonHitPct: number | null = null;
    if (games.length > 0) {
      seasonHitPct = calculateSeasonHitPct(games, raw.propNorm, raw.line, raw.overunder, WEEK);
    }

    // ── Step 8: Run-2 formulas ────────────────────────────────────────────────
    // NOTE: Run-2 NEVER overwrites Run-1 fields — it only adds new columns
    let run2: Run2Result | null = null;
    if (run1 && raw.odds !== 0) {
      run2 = applyRun2(run1.projWinPct, seasonHitPct, raw.odds, raw.propNorm);
    }

    const ep: EnrichedProp = {
      ...raw,
      team,
      matchup,
      gameDate,
      playerAvg,
      opponentRank,
      opponentAvgVsStat,
      // Run-1
      yardsScore:      run1?.yardsScore      ?? null,
      rankScore:       run1?.rankScore       ?? null,
      totalScore:      run1?.totalScore      ?? null,
      scoreDiff:       run1?.scoreDiff       ?? null,
      scalingFactor:   run1?.scalingFactor   ?? null,
      winProbability:  run1?.winProbability  ?? null,
      recommendedSide: run1?.recommendedSide ?? null,
      projWinPct:      run1?.projWinPct      ?? null,
      // Step 7
      seasonHitPct,
      // Run-2 (never null if run1 succeeded + odds present)
      avgWinProb:      run2?.avgWinProb      ?? null,
      impliedProb:     run2?.impliedProb     ?? null,
      bestEdgePct:     run2?.bestEdgePct     ?? null,
      expectedValue:   run2?.expectedValue   ?? null,
      kellyPct:        run2?.kellyPct        ?? null,
      valueIcon:       run2?.valueIcon       ?? null,
      confidenceScore: run2?.confidenceScore ?? null,
    };

    enriched.push(ep);
  }

  // ── Print summary table ───────────────────────────────────────────────────
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`📊 ENRICHMENT SUMMARY — Week ${WEEK}`);
  console.log(`${'═'.repeat(60)}`);
  console.log(`${'Player'.padEnd(22)} ${'Prop'.padEnd(14)} ${'Line'.padStart(6)}  ${'Side'.padEnd(6)} ${'Odds'.padStart(5)}  ${'Avg'.padStart(6)}  ${'Hit%'.padStart(5)}  ${'Edge%'.padStart(6)}  ${'Conf'.padStart(5)}  ${'Icon'}`);
  console.log('─'.repeat(110));

  const sorted = [...enriched].sort((a, b) => (b.confidenceScore ?? 0) - (a.confidenceScore ?? 0));
  for (const p of sorted) {
    const hit  = p.seasonHitPct  !== null ? `${(p.seasonHitPct * 100).toFixed(0)}%` : '  —';
    const edge = p.bestEdgePct   !== null ? `${(p.bestEdgePct * 100).toFixed(1)}%` : '   —';
    const conf = p.confidenceScore !== null ? p.confidenceScore.toFixed(3) : '   —';
    const avg  = p.playerAvg     !== null ? p.playerAvg.toFixed(1) : '   —';
    console.log(
      `${p.player.padEnd(22)} ${p.prop.padEnd(14)} ${String(p.line).padStart(6)}  ${p.overunder.padEnd(6)} ${String(p.odds).padStart(5)}  ${avg.padStart(6)}  ${hit.padStart(5)}  ${edge.padStart(6)}  ${conf.padStart(5)}  ${p.valueIcon ?? ''}`
    );
  }

  // ── Step 9: Save to Firestore ─────────────────────────────────────────────
  if (DRY_RUN) {
    console.log(`\n🔍 DRY RUN — ${enriched.length} props would be saved to ${COLLECTION}`);
    return;
  }

  console.log(`\n💾 Saving ${enriched.length} props to ${COLLECTION}...`);

  // Check for existing docs this week to avoid duplicates
  const existingSnap = await db.collection(COLLECTION)
    .where('week', '==', WEEK)
    .select('player', 'prop', 'overunder')
    .get();

  const existingKeys = new Set(
    existingSnap.docs.map(d => {
      const data = d.data();
      return `${data.player}||${data.prop}||${data.overunder}`.toLowerCase();
    })
  );

  let added = 0, skipped = 0;
  const BATCH_SIZE = 400;

  for (let i = 0; i < enriched.length; i += BATCH_SIZE) {
    const batch = db.batch();
    let batchCount = 0;

    for (const p of enriched.slice(i, i + BATCH_SIZE)) {
      const key = `${p.player}||${p.prop}||${p.overunder}`.toLowerCase();
      if (existingKeys.has(key)) { skipped++; continue; }

      const doc: Record<string, any> = {
        week:    WEEK,
        season:  SEASON,
        source:  p.source,
        player:  p.player,
        team:    p.team,
        prop:    p.prop,
        propNorm: p.propNorm,
        line:    p.line,
        overunder: p.overunder,
        odds:    p.odds,
        matchup: p.matchup,
        gameDate: p.gameDate,
        // Step 4
        playerAvg:         p.playerAvg,
        // Step 5
        opponentRank:      p.opponentRank,
        opponentAvgVsStat: p.opponentAvgVsStat,
        // Run-1
        yardsScore:        p.yardsScore,
        rankScore:         p.rankScore,
        totalScore:        p.totalScore,
        scoreDiff:         p.scoreDiff,
        scalingFactor:     p.scalingFactor,
        winProbability:    p.winProbability,
        recommendedSide:   p.recommendedSide,
        projWinPct:        p.projWinPct,
        // Step 7
        seasonHitPct:      p.seasonHitPct,
        // Run-2
        avgWinProb:        p.avgWinProb,
        impliedProb:       p.impliedProb,
        bestEdgePct:       p.bestEdgePct,
        expectedValue:     p.expectedValue,
        kellyPct:          p.kellyPct,
        valueIcon:         p.valueIcon,
        confidenceScore:   p.confidenceScore,
        // Post-game (empty until filled)
        gameStat:    null,
        actualResult: null,
        createdAt:   Timestamp.now(),
        updatedAt:   Timestamp.now(),
      };

      // Strip nulls to keep docs clean
      const clean = Object.fromEntries(Object.entries(doc).filter(([, v]) => v !== null));

      batch.set(db.collection(COLLECTION).doc(), clean);
      existingKeys.add(key);
      batchCount++;
      added++;
    }

    if (batchCount > 0) await batch.commit();
    process.stdout.write(`\r   ✍️  ${added} saved...`);
  }

  console.log(`\n\n${'═'.repeat(60)}`);
  console.log(`✅  Pipeline complete!`);
  console.log(`   Saved:   ${added}`);
  console.log(`   Skipped: ${skipped} (duplicates)`);
  console.log(`   Collection: ${COLLECTION}`);
  console.log(`\n💡 After the games, run:`);
  console.log(`   npx tsx scripts/loadWeeklyProps.ts --week=${WEEK} --post-game`);
  console.log(`${'═'.repeat(60)}\n`);
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITIES
// ═══════════════════════════════════════════════════════════════════════════════

function normalizePropLabel(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, ' ').trim();
}

function toPropNormKey(label: string): string {
  return label.toLowerCase()
    .replace(/passing/g, 'pass').replace(/rushing/g, 'rush').replace(/receiving/g, 'rec')
    .replace(/yards?/g, 'yds').replace(/touchdowns?/g, 'tds').replace(/attempts?/g, 'att')
    .replace(/completions?/g, 'cmp').replace(/receptions?/, 'recs').replace(/interceptions?/, 'ints')
    .replace(/anytime touchdown scorer/, 'anytime td').replace(/anytime td/, 'anytime td')
    .replace(/rush \+ rec yds/, 'rush+rec yds').replace(/pass \+ rush yds/, 'pass+rush yds')
    .replace(/\s+/g, ' ').trim();
}

function toTitleCase(str: string): string {
  return str.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

async function fetchWithRetry(url: string, options: RequestInit = {}, maxRetries = 3): Promise<Response | null> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) return res;
      if (res.status === 404) return res;
      if (res.status === 429 || res.status >= 500) {
        await sleep(1000 * Math.pow(2, i));
        continue;
      }
      return res;
    } catch (err) {
      if (i === maxRetries - 1) throw err;
      await sleep(1000 * Math.pow(2, i));
    }
  }
  return null;
}

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

// ── Run ───────────────────────────────────────────────────────────────────────
main().catch(err => { console.error('❌ Fatal:', err); process.exit(1); });
