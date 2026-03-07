// src/app/api/all-props/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

// ─── In-memory cache ──────────────────────────────────────────────────────────
let cachedProps: NormalizedProp[] | null = null;
let cachedPropTypes: string[] | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000;

function isCacheValid() {
  return cachedProps !== null && Date.now() - cacheTime < CACHE_TTL_MS;
}

// ─── Type ─────────────────────────────────────────────────────────────────────
export interface NormalizedProp {
  id:               string;
  // fast-filter keys (lowercase, not sent to client)
  playerLower:      string;
  propLower:        string;
  // display fields
  player:           string;
  team:             string;
  prop:             string;
  line:             number;
  overUnder:        string;
  matchup:          string;
  week:             number | null;
  gameDate:         string | null;
  gameTime:         string;
  season:           number | null;
  // analytics
  playerAvg:        any;
  opponentRank:     any;
  opponentAvgVsStat:any;
  yardsScore:       any;
  rankScore:        any;
  totalScore:       any;
  scoreDiff:        any;
  scalingFactor:    any;
  winProbability:   any;
  projWinPct:       any;
  seasonHitPct:     any;
  avgWinProb:       any;
  odds:             any;
  impliedProb:      any;
  bestEdgePct:      any;
  expectedValue:    any;
  kellyPct:         any;
  valueIcon:        any;
  confidenceScore:  any;
  gameStats:        any;
  actualResult:     string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function pick(data: any, ...keys: string[]): any {
  for (const k of keys) {
    if (data[k] !== undefined && data[k] !== null && data[k] !== '') return data[k];
  }
  return null;
}

function normalizeProp(data: any, docId: string): NormalizedProp {
  const migratedFrom: string = data.migratedFrom ?? '';
  const seasonMatch = migratedFrom.match(/(\d{4})/);

  const player    = pick(data, 'player', 'Player') ?? '';
  const prop      = pick(data, 'prop', 'Prop') ?? '';
  const overUnder = pick(data, 'over under', 'overunder', 'overUnder', 'Over/Under?', 'over_under') ?? '';

  // Season: prefer explicit field, fall back to migratedFrom year
  const rawSeason = pick(data, 'season', 'Season');
  const season = rawSeason
    ? Number(rawSeason)
    : seasonMatch ? parseInt(seasonMatch[1]) : null;

  return {
    id:           docId,
    playerLower:  player.toLowerCase(),
    propLower:    prop.toLowerCase(),
    player,
    prop,
    team:         pick(data, 'team', 'Team') ?? '',
    line:         Number(pick(data, 'line', 'Line') ?? 0) || 0,
    overUnder,
    matchup:      pick(data, 'matchup', 'Matchup') ?? '',
    week:         pick(data, 'week', 'Week') != null ? Number(pick(data, 'week', 'Week')) : null,
    gameDate:     pick(data, 'game date', 'gameDate', 'gamedate', 'Game Date', 'date') ?? null,
    gameTime:     pick(data, 'game time', 'gameTime', 'gametime', 'Game Time') ?? '',
    season,

    // Analytics — pick every likely casing/spacing variant
    playerAvg:         pick(data, 'player avg', 'playerAvg', 'playeravg', 'Player Avg') ?? null,
    opponentRank:      pick(data, 'opponent rank', 'opponentRank', 'opponentrank', 'Opponent Rank') ?? null,
    opponentAvgVsStat: pick(data, 'opponent avg vs stat', 'opponentAvgVsStat', 'opponent_avg_vs_stat', 'Opponent Avg vs Stat') ?? null,
    yardsScore:        pick(data, 'yards score', 'yardsScore', 'yardscore', 'Yards Score') ?? null,
    rankScore:         pick(data, 'rank score', 'rankScore', 'rankscore', 'Rank Score') ?? null,
    totalScore:        pick(data, 'total score', 'totalScore', 'totalscore', 'Total Score') ?? null,
    scoreDiff:         pick(data, 'score diff', 'scoreDiff', 'scorediff', 'Score Diff') ?? null,
    scalingFactor:     pick(data, 'scaling factor', 'scalingFactor', 'scalingfactor', 'Scaling Factor') ?? null,
    winProbability:    pick(data, 'win probability', 'winProbability', 'winprobability', 'Win Probability', 'win prob') ?? null,
    projWinPct:        pick(data, 'proj win %', 'projWinPct', 'projwinpct', 'Proj Win %', 'proj_win_pct') ?? null,
    seasonHitPct:      pick(data, 'season hit %', 'seasonHitPct', 'seasonhitpct', 'Season Hit %', 'season_hit_pct') ?? null,
    avgWinProb:        pick(data, 'avg win prob', 'avgWinProb', 'avgwinprob', 'Avg Win Prob') ?? null,
    odds:              pick(data, 'odds', 'Odds') ?? null,
    impliedProb:       pick(data, 'implied prob', 'impliedProb', 'impliedprob', 'Implied Prob') ?? null,
    bestEdgePct:       pick(data, 'best edge %', 'bestEdgePct', 'bestedgepct', 'Best Edge %', 'best_edge_pct') ?? null,
    expectedValue:     pick(data, 'expected value', 'expectedValue', 'expectedvalue', 'Expected Value', 'EV', 'ev') ?? null,
    kellyPct:          pick(data, 'kelly %', 'kellyPct', 'kellypct', 'Kelly %', 'kelly_pct') ?? null,
    valueIcon:         pick(data, 'value icon', 'valueIcon', 'valueicon', 'Value Icon') ?? null,
    confidenceScore:   pick(data, 'confidence score', 'confidenceScore', 'confidencescore', 'Confidence Score') ?? null,
    gameStats:         pick(data, 'game stats', 'gameStats', 'gamestats', 'Game Stats') ?? null,
    actualResult:      pick(data, 'actual stats', 'actualStats', 'actualResult', 'actual result', 'Actual Stats') ?? '',
  };
}

// Dedup key: same player + prop + line + week + season = same prop
function dedupKey(p: NormalizedProp): string {
  return `${p.playerLower}|${p.propLower}|${p.line}|${p.week ?? ''}|${p.season ?? ''}`;
}

// ─── Cache loader ─────────────────────────────────────────────────────────────
async function loadCache(): Promise<void> {
  console.log('🔄 allProps: loading from Firestore...');
  const snap = await adminDb.collection('allProps').limit(10000).get();
  const raw  = snap.docs.map(doc => normalizeProp(doc.data(), doc.id));

  // Deduplicate — keep the richer doc (more non-null fields wins)
  const seen = new Map<string, NormalizedProp>();
  for (const p of raw) {
    const key = dedupKey(p);
    const existing = seen.get(key);
    if (!existing) {
      seen.set(key, p);
    } else {
      // Count non-null analytical fields; keep whichever has more
      const score = (x: NormalizedProp) =>
        [x.scoreDiff, x.seasonHitPct, x.avgWinProb, x.bestEdgePct, x.expectedValue,
         x.kellyPct, x.confidenceScore, x.gameStats, x.actualResult,
         x.opponentRank, x.projWinPct, x.yardsScore, x.totalScore]
          .filter(v => v != null && v !== '').length;
      if (score(p) > score(existing)) seen.set(key, p);
    }
  }

  const props     = Array.from(seen.values());
  const propTypes = [...new Set(props.map(p => p.prop).filter(Boolean))].sort();

  cachedProps     = props;
  cachedPropTypes = propTypes;
  cacheTime       = Date.now();
  console.log(`✅ allProps: ${snap.size} docs → ${props.length} after dedup`);
}

// ─── DELETE handler ───────────────────────────────────────────────────────────
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    await adminDb.collection('allProps').doc(id).delete();

    // Bust cache so the deleted doc doesn't reappear
    cachedProps = null;

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerQ  = (searchParams.get('player') ?? '').trim().toLowerCase();
    const propQ    = (searchParams.get('prop')   ?? '').trim().toLowerCase();
    const weekQ    =  searchParams.get('week')   ?? '';
    const seasonQ  =  searchParams.get('season') ?? 'all';
    const bust     =  searchParams.get('bust')   === '1';

    if (bust || !isCacheValid()) await loadCache();

    let props = cachedProps!;

    if (weekQ && weekQ !== 'all') {
      const wn = parseInt(weekQ, 10);
      if (!isNaN(wn)) props = props.filter(p => p.week === wn);
    }
    if (seasonQ !== 'all') {
      const sn = parseInt(seasonQ, 10);
      props = props.filter(p => p.season === sn);
    }
    if (propQ)   props = props.filter(p => p.propLower.includes(propQ));
    if (playerQ) props = props.filter(p => p.playerLower.includes(playerQ));

    // Sort: week desc, then player asc
    props = [...props].sort((a, b) => {
      const wd = (b.week ?? 0) - (a.week ?? 0);
      return wd !== 0 ? wd : a.player.localeCompare(b.player);
    });

    return NextResponse.json({
      props,
      propTypes: cachedPropTypes,
      total: props.length,
      cached: true,
      cacheAge: Math.round((Date.now() - cacheTime) / 1000),
    });
  } catch (error: any) {
    console.error('❌ all-props route:', error);
    return NextResponse.json(
      { error: error.message ?? 'Internal server error', props: [], propTypes: [] },
      { status: 500 }
    );
  }
}