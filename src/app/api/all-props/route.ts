// src/app/api/all-props/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

// ─── In-memory cache ──────────────────────────────────────────────────────────
// allProps is static reference data — no need to hit Firestore on every request.
// Cache busts after 5 minutes or on manual revalidation.
let cachedProps: NormalizedProp[] | null = null;
let cachedPropTypes: string[] | null = null;
let cacheTime = 0;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function isCacheValid() {
  return cachedProps !== null && Date.now() - cacheTime < CACHE_TTL_MS;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface NormalizedProp {
  id: string;
  player: string;
  playerLower: string; // for fast filtering
  prop: string;
  propLower: string;
  line: number;
  week: number | null;
  matchup: string;
  team: string;
  overUnder: string;
  gameDate: string | null;
  gameTime: string;
  season: number | null;
  migratedFrom: string;
  actualResult: string;
  playerAvg: any;
  opponentRank: any;
  seasonHitPct: any;
  projWinPct: any;
  confidenceScore: any;
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
  const season = seasonMatch ? parseInt(seasonMatch[1]) : null;
  const prop      = pick(data, 'prop', 'Prop') ?? '';
  const overUnder = pick(data, 'over under', 'overunder', 'overUnder', 'Over/Under?') ?? '';
  const player    = pick(data, 'player', 'Player') ?? '';

  return {
    id:        docId,
    player,
    playerLower: player.toLowerCase(),
    prop,
    propLower:   prop.toLowerCase(),
    line:      pick(data, 'line', 'Line') ?? 0,
    week:      pick(data, 'week', 'Week') ? Number(pick(data, 'week', 'Week')) : null,
    matchup:   pick(data, 'matchup', 'Matchup') ?? '',
    team:      pick(data, 'team', 'Team') ?? '',
    overUnder,
    gameDate:  pick(data, 'game date', 'gamedate', 'gameDate', 'date', 'Game Date') ?? null,
    gameTime:  pick(data, 'game time', 'gametime', 'gameTime', 'Game Time') ?? '',
    season,
    migratedFrom,
    actualResult:    pick(data, 'actual stats', 'actualstats', 'actualResult') ?? '',
    playerAvg:       pick(data, 'player avg', 'playeravg', 'playerAvg') ?? null,
    opponentRank:    pick(data, 'opponent rank', 'opponentrank', 'opponentRank') ?? null,
    seasonHitPct:    pick(data, 'season hit %', 'seasonhit', 'seasonHitPct') ?? null,
    projWinPct:      pick(data, 'proj win %', 'projwin', 'projWinPct') ?? null,
    confidenceScore: pick(data, 'confidence score', 'confidencescore', 'confidenceScore') ?? null,
  };
}

// ─── Load all props into cache ────────────────────────────────────────────────
async function loadCache(): Promise<void> {
  console.log('🔄 allProps: loading from Firestore...');
  const snap = await adminDb.collection('allProps').limit(10000).get();
  const props = snap.docs.map(doc => normalizeProp(doc.data(), doc.id));
  const propTypes = [...new Set(props.map(p => p.prop).filter(Boolean))].sort();

  cachedProps    = props;
  cachedPropTypes = propTypes;
  cacheTime      = Date.now();
  console.log(`✅ allProps cache loaded: ${props.length} docs`);
}

// ─── GET ──────────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const playerQ  = (searchParams.get('player') ?? '').trim().toLowerCase();
    const propQ    = (searchParams.get('prop')   ?? '').trim().toLowerCase();
    const weekQ    =  searchParams.get('week')   ?? '';
    const seasonQ  =  searchParams.get('season') ?? 'all';
    const bust     =  searchParams.get('bust')   === '1'; // ?bust=1 forces reload

    // Load/refresh cache
    if (bust || !isCacheValid()) {
      await loadCache();
    }

    let props = cachedProps!;

    // ── Filters applied to in-memory cache (very fast) ────────────────────────

    // Week filter — strict numeric equality
    if (weekQ && weekQ !== 'all') {
      const weekNum = parseInt(weekQ, 10);
      if (!isNaN(weekNum)) {
        props = props.filter(p => p.week === weekNum);
      }
    }

    // Season filter
    if (seasonQ !== 'all') {
      const seasonNum = parseInt(seasonQ, 10);
      props = props.filter(p => p.season === seasonNum);
    }

    // Prop type filter
    if (propQ) {
      props = props.filter(p => p.propLower.includes(propQ));
    }

    // Player filter
    if (playerQ) {
      props = props.filter(p => p.playerLower.includes(playerQ));
    }

    // Sort: week desc, then player asc
    props = [...props].sort((a, b) => {
      const wDiff = (b.week ?? 0) - (a.week ?? 0);
      return wDiff !== 0 ? wDiff : a.player.localeCompare(b.player);
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