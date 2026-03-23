import { NextRequest, NextResponse } from 'next/server';
import { adminDb as db } from '@/lib/firebase/admin';
import { FieldPath } from 'firebase-admin/firestore';

export const dynamic     = 'force-dynamic';
export const maxDuration = 120;

// ─── 1. CONFIG & CONSTANTS ──────────────────────────────────────────────────
const ODDS_API_KEY = process.env.THE_ODDS_API_KEY ?? '';
const ODDS_BASE    = 'https://api.the-odds-api.com/v4';
const REGION       = 'us';
const ODDS_FORMAT  = 'american';

const MARKETS_BATCH_1 = ['player_points','player_rebounds','player_assists','player_threes','player_steals','player_blocks','player_turnovers'].join(',');
const MARKETS_BATCH_2 = ['player_points_rebounds_assists','player_points_rebounds', 'player_points_assists','player_assists_rebounds','player_blocks_steals'].join(',');

// ─── 2. INTERFACES ──────────────────────────────────────────────────────────
interface Accumulator {
    playerName: string; propNorm: string; line: number; overUnder: string;
    homeTeam: string; awayTeam: string; gameDate: string; eventId: string;
    bestOdds: number; bestBook: string;
    fdOdds: number | null; dkOdds: number | null;
}

// ─── 3. HELPER FUNCTIONS (Moved up for scope) ────────────────────────────────
function impliedProbFrom(odds: number): number {
  return odds > 0 ? 100 / (odds + 100) : Math.abs(odds) / (Math.abs(odds) + 100);
}

function normalizeTeamName(fullName: string): string {
  const TEAM_NAME_MAP: Record<string, string> = { 'atlanta hawks': 'ATL', 'boston celtics': 'BOS', 'brooklyn nets': 'BKN', 'charlotte hornets': 'CHA', 'chicago bulls': 'CHI', 'cleveland cavaliers': 'CLE', 'dallas mavericks': 'DAL', 'denver nuggets': 'DEN', 'detroit pistons': 'DET', 'golden state warriors': 'GSW', 'houston rockets': 'HOU', 'indiana pacers': 'IND', 'los angeles clippers': 'LAC', 'los angeles lakers': 'LAL', 'memphis grizzlies': 'MEM', 'miami heat': 'MIA', 'milwaukee bucks': 'MIL', 'minnesota timberwolves': 'MIN', 'new orleans pelicans': 'NOP', 'new york knicks': 'NYK', 'oklahoma city thunder': 'OKC', 'orlando magic': 'ORL', 'philadelphia 76ers': 'PHI', 'phoenix suns': 'PHX', 'portland trail blazers': 'POR', 'sacramento kings': 'SAC', 'san antonio spurs': 'SAS', 'toronto raptors': 'TOR', 'utah jazz': 'UTA', 'washington wizards': 'WAS' };
  return TEAM_NAME_MAP[fullName.toLowerCase().trim()] ?? fullName.toUpperCase().trim();
}

function normalizePropKey(marketKey: string): string {
  const PROP_KEY_MAP: Record<string, string> = { player_points: 'points', player_rebounds: 'rebounds', player_assists: 'assists', player_threes: 'threes', player_steals: 'steals', player_blocks: 'blocks', player_turnovers: 'turnovers', player_points_rebounds_assists: 'pts_ast_reb', player_points_rebounds: 'pts_reb', player_points_assists: 'pts_ast', player_assists_rebounds: 'ast_reb', player_blocks_steals: 'stl_blk' };
  return PROP_KEY_MAP[marketKey] ?? marketKey.replace('player_', '');
}

function formatDoc(acc: any, bdlIdMap: any, brIdMap: any, playerTeamMap: any, season: number) {
  const playerKey = acc.playerName.toLowerCase().trim();
  return {
    ...acc,
    league: 'nba',
    season,
    team: playerTeamMap[playerKey] ?? null,
    bdlId: bdlIdMap[playerKey] ?? null,
    brid: brIdMap[playerKey] ?? null,
    impliedProb: Math.round(impliedProbFrom(acc.bestOdds) * 10000) / 10000,
    updatedAt: new Date().toISOString(),
  };
}

async function loadIdMaps() {
  const [nbaIdSnap, brIdSnap] = await Promise.all([
    db.collection('static_nbaIdMap').get(),
    db.collection('static_brIdMap').get(),
  ]);
  const bdlIdMap: Record<string, number> = {};
  const playerTeamMap: Record<string, string> = {};
  nbaIdSnap.docs.forEach((d) => {
    const r = d.data();
    const key = (r.player ?? '').toLowerCase().trim();
    if (r.bdlId != null) bdlIdMap[key] = Number(r.bdlId);
    if (r.team) playerTeamMap[key] = normalizeTeamName(r.team);
  });
  const brIdMap: Record<string, string> = {};
  brIdSnap.docs.forEach((d) => {
    const r = d.data();
    const key = (r.player ?? '').toLowerCase().trim();
    if (r.brid) brIdMap[key] = r.brid;
  });
  return { bdlIdMap, brIdMap, playerTeamMap };
}

// ─── 4. MAIN HANDLER ────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!ODDS_API_KEY) return NextResponse.json({ error: 'Missing API Key' }, { status: 500 });

  try {
    const { searchParams } = req.nextUrl;
    const season = parseInt(searchParams.get('season') ?? '2025', 10);
    const dateParam = searchParams.get('date') || new Date().toLocaleDateString('en-CA');
    const colName = `nbaProps_${season}`;

    const { bdlIdMap, brIdMap, playerTeamMap } = await loadIdMaps();
    const accumulator = new Map<string, Accumulator>();

    const batches = [MARKETS_BATCH_1, MARKETS_BATCH_2];

    for (const markets of batches) {
      const url = `${ODDS_BASE}/sports/basketball_nba/event-odds?apiKey=${ODDS_API_KEY}&regions=${REGION}&markets=${markets}&oddsFormat=${ODDS_FORMAT}`;
      const response = await fetch(url);

      if (response.status === 404) {
        return NextResponse.json({ 
          success: false, 
          error: "The Odds API has no player props listed for this date yet. Try again closer to game time." 
        }, { status: 404 });
      }

      if (!response.ok) continue;

      const events = await response.json();

      for (const event of events) {
        // ─── THE UTC-TO-EST FIX ──────────────────────────────────────────────────
        const commenceTime = new Date(event.commence_time);
        const gameDayEST = commenceTime.toLocaleDateString('en-CA', {
          timeZone: 'America/New_York'
        });
        if (gameDayEST !== dateParam) continue; 
        // ─────────────────────────────────────────────────────────────────────────

        const homeTeam = normalizeTeamName(event.home_team);
        const awayTeam = normalizeTeamName(event.away_team);

        for (const market of (event.bookmakers || [])) {
          const bookKey = market.key;
          
          for (const m of (market.markets || [])) {
            const propNorm = normalizePropKey(m.key);
            
            for (const outcome of (m.outcomes || [])) {
              const playerName = outcome.description;
              const overUnder = outcome.name;
              
              const line = Number(outcome.point) || 0;
              const odds = Number(outcome.price) || -110;

              const key = `${playerName}-${propNorm}-${line}-${overUnder}-${gameDayEST}`.toLowerCase();
              
              const existing = accumulator.get(key) || {
                playerName, propNorm, line, overUnder,
                homeTeam, awayTeam, gameDate: gameDayEST, eventId: event.id,
                bestOdds: -999, bestBook: '',
                fdOdds: null, dkOdds: null
              };

              if (bookKey === 'fanduel') existing.fdOdds = odds;
              if (bookKey === 'draftkings') existing.dkOdds = odds;

              if (odds > existing.bestOdds) {
                existing.bestOdds = odds;
                existing.bestBook = bookKey;
              }

              accumulator.set(key, existing);
            }
          }
        }
      }
    }

    const updates = Array.from(accumulator.values());
    let ingested = 0;
    let batch = db.batch();
    let count = 0;

    for (const item of updates) {
      const slug = item.playerName.toLowerCase().replace(/[^a-z0-9]/g, '-');
      const docId = `nba-${slug}-${item.propNorm}-${item.line}-${item.overUnder.toLowerCase()}-${item.gameDate}`;
      const ref = db.collection(colName).doc(docId);
      
      const finalDoc = formatDoc(item, bdlIdMap, brIdMap, playerTeamMap, season);
      batch.set(ref, finalDoc, { merge: true });
      
      count++;
      ingested++;
      if (count >= 450) {
        await batch.commit();
        batch = db.batch();
        count = 0;
      }
    }

    if (count > 0) await batch.commit();
    return NextResponse.json({ success: true, ingested, date: dateParam });

  } catch (err: any) {
    console.error("Ingest Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}