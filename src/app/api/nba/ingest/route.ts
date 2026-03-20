// src/app/api/nba/ingest/route.ts
//
// Fetches today's NBA player prop odds from The Odds API and writes them
// to nbaProps_{season} in Firestore.
//
// GET /api/nba/ingest                         → ingest today's slate
// GET /api/nba/ingest?date=YYYY-MM-DD         → ingest a specific date's events
// GET /api/nba/ingest?force=true              → overwrite already-ingested props

import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

export const dynamic     = 'force-dynamic';
export const maxDuration = 120;

// ─── Config ───────────────────────────────────────────────────────────────────

const ODDS_API_KEY = process.env.THE_ODDS_API_KEY ?? '';
const ODDS_BASE    = 'https://api.the-odds-api.com/v4';
const REGION       = 'us';
const ODDS_FORMAT  = 'american';

const MARKETS = [
  'player_points',
  'player_rebounds',
  'player_assists',
  'player_threes',
  'player_steals',
  'player_blocks',
  'player_turnovers',
  'player_points_rebounds_assists',
  'player_points_rebounds',
  'player_points_assists',
  'player_assists_rebounds',
  'player_blocks_steals',
].join(',');

// ─── Prop key normalizer ──────────────────────────────────────────────────────
// Must stay in sync with normalizeNBAProp() in normalize-nba.ts.

const PROP_KEY_MAP: Record<string, string> = {
  player_points:                  'points',
  player_rebounds:                'rebounds',
  player_assists:                 'assists',
  player_threes:                  'threes',
  player_steals:                  'steals',
  player_blocks:                  'blocks',
  player_turnovers:               'turnovers',
  player_points_rebounds_assists: 'pts_ast_reb',
  player_points_rebounds:         'pts_reb',
  player_points_assists:          'pts_ast',
  player_assists_rebounds:        'ast_reb',
  player_blocks_steals:           'stl_blk',
};

function normalizePropKey(marketKey: string): string {
  return PROP_KEY_MAP[marketKey] ?? marketKey.replace('player_', '');
}

// ─── Team name normalizer ─────────────────────────────────────────────────────

const TEAM_NAME_MAP: Record<string, string> = {
  'atlanta hawks': 'ATL', 'boston celtics': 'BOS', 'brooklyn nets': 'BKN',
  'charlotte hornets': 'CHA', 'chicago bulls': 'CHI', 'cleveland cavaliers': 'CLE',
  'dallas mavericks': 'DAL', 'denver nuggets': 'DEN', 'detroit pistons': 'DET',
  'golden state warriors': 'GSW', 'houston rockets': 'HOU', 'indiana pacers': 'IND',
  'los angeles clippers': 'LAC', 'los angeles lakers': 'LAL', 'memphis grizzlies': 'MEM',
  'miami heat': 'MIA', 'milwaukee bucks': 'MIL', 'minnesota timberwolves': 'MIN',
  'new orleans pelicans': 'NOP', 'new york knicks': 'NYK', 'oklahoma city thunder': 'OKC',
  'orlando magic': 'ORL', 'philadelphia 76ers': 'PHI', 'phoenix suns': 'PHX',
  'portland trail blazers': 'POR', 'sacramento kings': 'SAC', 'san antonio spurs': 'SAS',
  'toronto raptors': 'TOR', 'utah jazz': 'UTA', 'washington wizards': 'WAS',
};

function normalizeTeamName(fullName: string): string {
  return TEAM_NAME_MAP[fullName.toLowerCase().trim()] ?? fullName.toUpperCase().trim();
}

// ─── Odds helpers ─────────────────────────────────────────────────────────────

function isBetterOdds(challenger: number, current: number): boolean {
  const payoutOf = (o: number) => o > 0 ? o / 100 : 100 / Math.abs(o);
  return payoutOf(challenger) > payoutOf(current);
}

function impliedProbFrom(odds: number): number {
  return odds > 0
    ? 100 / (odds + 100)
    : Math.abs(odds) / (Math.abs(odds) + 100);
}

// ─── ID map loaders ───────────────────────────────────────────────────────────

async function loadIdMaps(): Promise<{
  bdlIdMap:      Record<string, number>;
  brIdMap:       Record<string, string>;
  playerTeamMap: Record<string, string>;
}> {
  const [nbaIdSnap, brIdSnap] = await Promise.all([
    adminDb.collection('static_nbaIdMap').get(),
    adminDb.collection('static_brIdMap').get(),
  ]);

  const bdlIdMap:      Record<string, number> = {};
  const playerTeamMap: Record<string, string> = {};

  nbaIdSnap.docs.forEach(d => {
    const r = d.data();
    const key = (r.player ?? '').toLowerCase().trim();
    if (!key) return;
    if (r.bdlId != null) bdlIdMap[key]      = Number(r.bdlId);
    if (r.team)          playerTeamMap[key] = normalizeTeamName(r.team);
  });

  const brIdMap: Record<string, string> = {};
  brIdSnap.docs.forEach(d => {
    const r = d.data();
    const key = (r.player ?? '').toLowerCase().trim();
    if (key && r.brid) brIdMap[key] = r.brid;
  });

  return { bdlIdMap, brIdMap, playerTeamMap };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  if (!ODDS_API_KEY) {
    return NextResponse.json({ error: 'THE_ODDS_API_KEY not configured' }, { status: 500 });
  }

  const { searchParams } = req.nextUrl;
  const season    = parseInt(searchParams.get('season') ?? '2025', 10);
  const dateParam = searchParams.get('date') ?? '';
  const force     = searchParams.get('force') === 'true';
  const colName   = `nbaProps_${season}`;

  try {
    // ── 1. Load ID maps ─────────────────────────────────────────────────────
    const { bdlIdMap, brIdMap, playerTeamMap } = await loadIdMaps();
    console.log(`🔑 BDL: ${Object.keys(bdlIdMap).length}  BR: ${Object.keys(brIdMap).length}  teams: ${Object.keys(playerTeamMap).length}`);

    // ── 2. Fetch events ─────────────────────────────────────────────────────
    const eventsUrl = new URL(`${ODDS_BASE}/sports/basketball_nba/events`);
    eventsUrl.searchParams.set('apiKey', ODDS_API_KEY);
    if (dateParam) {
      eventsUrl.searchParams.set('commenceTimeFrom', `${dateParam}T00:00:00Z`);
      eventsUrl.searchParams.set('commenceTimeTo',   `${dateParam}T23:59:59Z`);
    }

    const eventsRes = await fetch(eventsUrl.toString());
    if (!eventsRes.ok) {
      return NextResponse.json(
        { error: `Odds API events failed: ${eventsRes.status}` },
        { status: 502 },
      );
    }

    const events: any[] = await eventsRes.json();
    console.log(`📅 ${events.length} NBA events`);
    if (events.length === 0) {
      return NextResponse.json({ success: true, ingested: 0, message: 'No events found' });
    }

    // ── 3. Fetch + accumulate props across all bookmakers ───────────────────
    // Key: "playerName||propNorm||line||overUnder"
    // We keep ONE doc per player/prop/line/overUnder combination and store the
    // best odds from any book, plus FD/DK specifically.

    interface Accumulator {
      playerName: string; propNorm: string; line: number; overUnder: string;
      homeTeam: string; awayTeam: string; gameDate: string; eventId: string;
      bestOdds: number; bestBook: string;
      fdOdds: number | null; dkOdds: number | null;
    }

    const accumulator = new Map<string, Accumulator>();
    let apiRequests   = 0;

    for (let i = 0; i < events.length; i++) {
      const event    = events[i];
      const homeTeam = normalizeTeamName(event.home_team ?? '');
      const awayTeam = normalizeTeamName(event.away_team ?? '');
      const gameDate = (event.commence_time ?? '').split('T')[0];

      const propsUrl = new URL(`${ODDS_BASE}/sports/basketball_nba/events/${event.id}/odds`);
      propsUrl.searchParams.set('apiKey',     ODDS_API_KEY);
      propsUrl.searchParams.set('regions',    REGION);
      propsUrl.searchParams.set('markets',    MARKETS);
      propsUrl.searchParams.set('oddsFormat', ODDS_FORMAT);

      const propsRes = await fetch(propsUrl.toString());
      apiRequests++;

      if (!propsRes.ok) {
        console.warn(`⚠️  Event ${event.id} props: HTTP ${propsRes.status}`);
        continue;
      }

      const propsData: any = await propsRes.json();

      for (const book of propsData.bookmakers ?? []) {
        const bookName: string = book.title ?? '';

        for (const market of book.markets ?? []) {
          const propNorm = normalizePropKey(market.key);

          for (const outcome of market.outcomes ?? []) {
            const playerName: string = (outcome.description ?? '').trim();
            if (!playerName) continue;

            const overUnder: string = outcome.name ?? ''; // "Over" | "Under"
            const line:      number = Number(outcome.point ?? 0);
            const odds:      number = Number(outcome.price ?? -110);

            if (!['Over', 'Under'].includes(overUnder)) continue;
            if (line <= 0) continue;

            const key = `${playerName}||${propNorm}||${line}||${overUnder}`;

            if (!accumulator.has(key)) {
              accumulator.set(key, {
                playerName, propNorm, line, overUnder,
                homeTeam, awayTeam, gameDate, eventId: event.id,
                bestOdds: odds, bestBook: bookName,
                fdOdds: null, dkOdds: null,
              });
            } else {
              const acc = accumulator.get(key)!;
              if (isBetterOdds(odds, acc.bestOdds)) {
                acc.bestOdds = odds;
                acc.bestBook = bookName;
              }
            }

            // Always capture the first FD/DK line we see for each key
            const acc = accumulator.get(key)!;
            const bl  = bookName.toLowerCase();
            if (bl.includes('fanduel')    && acc.fdOdds === null) acc.fdOdds = odds;
            if (bl.includes('draftkings') && acc.dkOdds === null) acc.dkOdds = odds;
          }
        }
      }

      if (i < events.length - 1) await new Promise(r => setTimeout(r, 250));
    }

    console.log(`📊 ${accumulator.size} unique prop lines | ${apiRequests} API calls used`);

    // ── 4. Write to Firestore ───────────────────────────────────────────────

    let batch      = adminDb.batch();
    let batchCount = 0;
    let ingested   = 0;
    let skipped    = 0;
    const committed: string[] = [];

    for (const [, acc] of accumulator) {
      const {
        playerName, propNorm, line, overUnder,
        homeTeam, awayTeam, gameDate, eventId,
        bestOdds, bestBook, fdOdds, dkOdds,
      } = acc;

      const playerKey = playerName.toLowerCase().trim();
      const bdlId     = bdlIdMap[playerKey]      ?? null;
      const brid      = brIdMap[playerKey]       ?? null;
      const team      = playerTeamMap[playerKey] ?? null;
      const matchup   = `${awayTeam} @ ${homeTeam}`;

      // Deterministic doc ID — stable across re-runs
      const slug  = playerKey.replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
      const docId = `nba-${slug}-${propNorm}-${line}-${overUnder.toLowerCase()}-${gameDate}`;
      const ref   = adminDb.collection(colName).doc(docId);

      if (!force) {
        const existing = await ref.get();
        if (existing.exists) { skipped++; continue; }
      }

      const doc: Record<string, any> = {
        // Identity
        league:   'nba',
        season,
        player:   playerName,
        team,           // null if not in static_nbaIdMap; enrichment fills it from BBRef
        prop:     propNorm,
        line,
        overUnder,      // always "Over" or "Under" — never null for Odds API props
        matchup,
        gameDate,

        // IDs
        bdlId,          // for postGameNBA.ts grading
        brid,           // for enrichNBAProps.ts BBRef fetching

        // Odds
        odds:        bestOdds,
        bestOdds,
        bestBook:    bestBook || null,
        fdOdds:      fdOdds  ?? null,
        dkOdds:      dkOdds  ?? null,
        impliedProb: Math.round(impliedProbFrom(bestOdds) * 10000) / 10000,

        // Enrichment fields — populated by /api/nba/enrich
        playerAvg:         null,
        seasonHitPct:      null,
        opponentRank:      null,
        opponentAvgVsStat: null,
        scoreDiff:         null,
        confidenceScore:   null,
        projWinPct:        null,
        avgWinProb:        null,
        bestEdgePct:       null,
        expectedValue:     null,
        kellyPct:          null,
        valueIcon:         null,

        // Post-game fields — populated by postGameNBA.ts
        gameStat:     null,
        actualResult: null,

        // Meta
        eventId,
        updatedAt: new Date().toISOString(),
      };

      // merge: true preserves enrichment fields on re-ingest (without force)
      // merge: false when force=true to fully reset the doc
      batch.set(ref, doc, { merge: !force });
      batchCount++;
      ingested++;
      committed.push(docId);

      if (batchCount >= 490) {
        await batch.commit();
        console.log(`  💾 Committed ${ingested} so far…`);
        batch      = adminDb.batch();
        batchCount = 0;
      }
    }

    if (batchCount > 0) await batch.commit();

    // Log any players with no IDs for easy follow-up
    const noId = [...new Set(
      committed
        .map(id => {
          const name = id.replace(/^nba-/, '').split('-').slice(0, -4).join(' ');
          return (bdlIdMap[name] == null || brIdMap[name] == null) ? name : null;
        })
        .filter(Boolean),
    )];
    if (noId.length > 0) {
      console.log(`⚠️  ${noId.length} players missing BDL or BR ID — check static_nbaIdMap / static_brIdMap`);
    }

    return NextResponse.json({
      success:        true,
      ingested,
      skipped,
      total:          accumulator.size,
      events:         events.length,
      apiRequests,
      season,
      date:           dateParam || 'today',
      collectionName: colName,
      ...(noId.length > 0 ? { missingIds: noId.slice(0, 20) } : {}),
    });

  } catch (err: any) {
    console.error('❌ NBA ingest error:', err);
    return NextResponse.json({ error: err.message ?? 'Ingest failed' }, { status: 500 });
  }
}