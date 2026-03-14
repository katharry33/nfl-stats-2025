
import 'dotenv/config';
import { db } from '@/lib/firebase/admin';
import { getPfrIdMap, getPlayerTeamMap, getPlayerSeasonAvg, getTeamDefenseStats } from '@/lib/enrichment/firestore';
import { getPfrId, fetchSeasonLog, calculateAvg, calculateHitPct } from '@/lib/enrichment/pfr';
import { fetchAllDefenseStats, lookupDefenseStats } from '@/lib/enrichment/defense';
import { normalizeProp, getOpponent, normalizePlayerName } from '@/lib/enrichment/normalize';
import { computeScoring, pickBestOdds } from '@/lib/enrichment/scoring';

const args      = process.argv.slice(2);
const WEEK      = parseInt(args.find(a => a.startsWith('--week='))?.split('=')[1] ?? '1', 10);
const SEASON    = parseInt(args.find(a => a.startsWith('--season='))?.split('=')[1] ?? '2025', 10);
const COLL      = args.includes('--all') ? `allProps_${SEASON}` : `weeklyProps_${SEASON}`;
const IS_EARLY  = WEEK <= 3;
const PRIOR     = SEASON - 1;

async function main() {
  console.log(`\n${'='.repeat(55)}\n🔍 Debug | ${COLL} | Week ${WEEK} | ${IS_EARLY ? `EARLY — using ${PRIOR} prior season data` : `PFR ${SEASON}`}\n${'='.repeat(55)}`);

  if (!db) throw new Error('db undefined');

  console.log('\n⏳ Step 1: Collection access...');
  const ping = await db.collection(COLL).limit(1).get();
  console.log(`✅ Collection "${COLL}" — ${ping.size} doc(s) returned`);
  if (ping.empty) { console.error('❌ Collection empty'); process.exit(1); }

  console.log(`\n⏳ Step 2: Sample prop week ${WEEK}...`);
  const weekSnap = await db.collection(COLL).where('week', '==', WEEK).limit(1).get();
  const docSnap  = weekSnap.empty ? ping.docs[0] : weekSnap.docs[0];
  const r        = docSnap.data() as Record<string, any>;
  const pick     = (...keys: string[]) => { for (const k of keys) { const v = r[k]; if (v != null && v !== '') return v; } return null; };

  const player    = pick('Player', 'player') ?? '';
  const prop      = pick('Prop', 'prop') ?? '';
  const matchup   = pick('Matchup', 'matchup') ?? '';
  const line      = pick('Line', 'line') ?? 0;
  const overUnder = pick('Over/Under?', 'Over/Under', 'overUnder') ?? '';
  const gameDate  = pick('Game Date', 'gameDate') ?? '';
  const fdOdds    = pick('FdOdds', 'fdOdds');
  const dkOdds    = pick('DkOdds', 'dkOdds');
  let   team      = pick('Team', 'team') ?? '';
  console.log(`✅ ${player} | ${prop} ${line} | Week ${WEEK}`);
  console.log(`   matchup=${matchup} team=${team} fdOdds=${fdOdds} dkOdds=${dkOdds}`);
  console.log(`   existing: avg=${pick('playerAvg')} oppRank=${pick('opponentRank')} conf=${pick('confidenceScore')}`);

  const propNorm = normalizeProp(prop);
  console.log(`   propNorm="${propNorm}"`);

  console.log('\n⏳ Step 3: PFR ID map...');
  const pfrIdMap = await getPfrIdMap();
  console.log(`✅ ${Object.keys(pfrIdMap).length} entries`);

  console.log('\n⏳ Step 4: Player team map...');
  const teamMap = await getPlayerTeamMap();
  if (!team) {
    team = teamMap[normalizePlayerName(player)] ?? teamMap[player.toLowerCase().trim()] ?? '';
    console.log(`✅ Team resolved from map: "${team}"`);
  } else {
    console.log(`✅ Team from doc: "${team}"`);
  }
  const opponent = getOpponent(team, matchup);
  console.log(`   Opponent: ${opponent ?? '(none)'}`);

  if (IS_EARLY) {
    console.log(`\n⏳ Step 5: Prior season avg from static_playerSeasonStats (${PRIOR})...`);
    const avg = await getPlayerSeasonAvg(player, propNorm, PRIOR);
    console.log(`✅ playerSeasonAvg (${PRIOR}): ${avg ?? 'NOT FOUND'}`);

    console.log(`\n⏳ Step 6: Prior season PFR logs for hit % (${PRIOR})...`);
    const pfrId = await getPfrId(player, pfrIdMap);
    console.log(`   PFR ID: ${pfrId ?? 'NOT FOUND'}`);
    if (pfrId) {
      const logs = await fetchSeasonLog(player, pfrId, PRIOR);
      console.log(`✅ ${logs.length} games (${PRIOR})`);
      if (logs.length > 0 && overUnder) {
        const hitPct = calculateHitPct(logs, propNorm, line, overUnder);
        console.log(`✅ Hit %: ${hitPct ?? '—'}`);
      }
    }

    console.log(`\n⏳ Step 7: Prior season defense stats (${PRIOR})...`);
    if (opponent) {
      const def = await getTeamDefenseStats(opponent, propNorm, PRIOR);
      console.log(`✅ ${opponent} ${propNorm}: rank=${def?.rank ?? 'NOT FOUND'} avg=${def?.avg ?? 'NOT FOUND'}`);

      if (avg != null && def) {
        const best    = pickBestOdds(fdOdds, dkOdds);
        const scoring = computeScoring({ playerAvg: avg, opponentRank: def.rank, opponentAvgVsStat: def.avg, line, seasonHitPct: null, odds: best.odds, propNorm });
        console.log(`\n✅ Scoring: conf=${scoring.confidenceScore} ev=${scoring.expectedValue} kelly=${scoring.kellyPct}`);
      } else {
        console.log(`\n❌ Missing: avg=${avg} def=${JSON.stringify(def)}`);
      }
    } else {
      console.log(`❌ No opponent — check team "${team}" / matchup "${matchup}"`);
    }

  } else {
    console.log(`\n⏳ Step 5: Season logs (PFR ${SEASON})...`);
    const pfrId = await getPfrId(player, pfrIdMap);
    console.log(`   PFR ID: ${pfrId ?? 'NOT FOUND'}`);
    if (pfrId) {
      const logs = await fetchSeasonLog(player, pfrId, SEASON);
      console.log(`✅ ${logs.length} games`);
      const avg = calculateAvg(logs, propNorm, WEEK, gameDate);
      console.log(`✅ Avg (norm="${propNorm}"): ${avg}`);
      if (overUnder) {
        const hitPct = calculateHitPct(logs, propNorm, line, overUnder, WEEK, gameDate);
        console.log(`✅ Hit %: ${hitPct ?? '—'}`);
      }
    }

    console.log(`\n⏳ Step 6: Defense stats (season ${SEASON})...`);
    const defMap = await fetchAllDefenseStats(SEASON);
    console.log(`✅ ${Object.values(defMap).reduce((s, v) => s + Object.keys(v).length, 0)} categories`);
    if (opponent) {
      const def = lookupDefenseStats(defMap, propNorm, opponent);
      console.log(`✅ ${opponent} ${propNorm}: rank=${def?.rank ?? 'NOT FOUND'} avg=${def?.avg ?? 'NOT FOUND'}`);
    } else {
      console.log(`❌ No opponent — team="${team}" matchup="${matchup}"`);
    }
  }

  console.log(`\n${'='.repeat(55)}\nDone.\n${'='.repeat(55)}`);
}

main().catch(e => { console.error('❌', e); process.exit(1); });