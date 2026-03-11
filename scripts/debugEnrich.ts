import 'dotenv/config';
import { db } from '@/lib/firebase/admin';
import { getPfrIdMap, getPlayerTeamMap } from '@/lib/enrichment/firestore';
import { getPfrId, fetchSeasonLog, calculateAvg, calculateHitPct } from '@/lib/enrichment/pfr';
import { fetchAllDefenseStats, lookupDefenseStats } from '@/lib/enrichment/defense';
import { normalizeProp, getOpponent } from '@/lib/enrichment/normalize';
import { computeScoring, pickBestOdds } from '@/lib/enrichment/scoring';

const args = process.argv.slice(2);
const WEEK = parseInt(args.find(a => a.startsWith('--week='))?.split('=')[1] ?? '22', 10);
const SEASON = parseInt(args.find(a => a.startsWith('--season='))?.split('=')[1] ?? '2025', 10);
const PFR_SEASON = SEASON;
const COLL = args.includes('--all') ? `allProps_${SEASON}` : `weeklyProps_${SEASON}`;

async function main() {
  console.log(`\n${'='.repeat(55)}\n🔍 Debug | ${COLL} | Week ${WEEK} | PFR ${PFR_SEASON}\n${'='.repeat(55)}`);

  // Step 1: DB + collection exists?
  if (!db) throw new Error('db undefined — check FIREBASE_SERVICE_ACCOUNT_KEY');
  console.log('\n⏳ Step 1: Collection access...');
  const ping = await db.collection(COLL).limit(1).get();
  console.log(`✅ Collection "${COLL}" — ${ping.size} doc(s) returned`);
  if (ping.empty) { console.error(`❌ Collection empty or not found`); process.exit(1); }

  // Step 2: Sample prop for week
  console.log(`\n⏳ Step 2: Sample prop week ${WEEK}...`);
  const weekSnap = await db.collection(COLL).where('week', '==', WEEK).limit(1).get();
  const docSnap = weekSnap.empty ? ping.docs[0] : weekSnap.docs[0];
  const r = docSnap.data() as Record<string, any>;
  const pick = (...keys: string[]) => { for (const k of keys) { const v = r[k]; if (v != null && v !== '') return v; } return null; };
  const prop: any = {
    id:        docSnap.id,
    player:    pick('Player','player')                       ?? '',
    prop:      pick('Prop','prop')                           ?? '',
    line:      pick('Line','line')                           ?? 0,
    team:      pick('Team','team')                           ?? '',
    matchup:   pick('Matchup','matchup')                     ?? '',
    week:      pick('Week','week'),
    season:    pick('Season','season'),
    overUnder: pick('Over/Under?','Over/Under','overUnder')  ?? '',
    fdOdds:    pick('FdOdds','fdOdds'),
    dkOdds:    pick('DkOdds','dkOdds'),
    gameDate:  pick('Game Date','gameDate')                  ?? '',
    playerAvg: pick('Player Avg','playerAvg'),
    opponentRank: pick('Opponent Rank','opponentRank'),
    confidenceScore: pick('Confidence Score','confidenceScore'),
  };
  console.log(`✅ ${prop.player} | ${prop.prop} ${prop.line} ${prop.overUnder} | Week ${prop.week}`);
  console.log(`   matchup=${prop.matchup} team=${prop.team} fdOdds=${prop.fdOdds} dkOdds=${prop.dkOdds}`);
  console.log(`   existing: avg=${prop.playerAvg} oppRank=${prop.opponentRank} conf=${prop.confidenceScore}`);

  // Step 3: PFR ID map
  console.log('\n⏳ Step 3: PFR ID map...');
  const pfrIdMap = await getPfrIdMap();
  console.log(`✅ ${Object.keys(pfrIdMap).length} entries`);
  console.log('   Sample keys:', Object.keys(pfrIdMap).slice(0, 5));

  // Step 4: PFR ID lookup
  console.log(`\n⏳ Step 4: PFR ID for "${prop.player}"...`);
  const pfrId = await getPfrId(prop.player, pfrIdMap);
  if (!pfrId) { console.error(`❌ No PFR ID — add to static_pfrIdMap`); process.exit(1); }
  console.log(`✅ ${pfrId}`);

  // Step 5: Season logs
  console.log(`\n⏳ Step 5: Season logs (PFR ${PFR_SEASON})...`);
  const logs = await fetchSeasonLog(prop.player, pfrId, PFR_SEASON);
  console.log(`✅ ${logs.length} games`);
  if (!logs.length) { console.warn('⚠️  No logs — avg will be 0'); }

  // Step 6: Avg
  const propNorm = normalizeProp(prop.prop ?? '');
  console.log(`\n⏳ Step 6: Avg (norm="${propNorm}")...`);
  const avg = calculateAvg(logs, propNorm, WEEK);
  console.log(`✅ ${avg}`);

  // Step 7: Hit %
  console.log('\n⏳ Step 7: Hit %...');
  const hitPct = (!prop.overUnder || !logs.length) ? null
    : calculateHitPct(logs, propNorm, prop.line ?? 0, prop.overUnder, WEEK);
  console.log(`✅ ${hitPct != null ? (hitPct*100).toFixed(1)+'%' : '—'}`);

  // Step 8: Defense
  console.log(`\n⏳ Step 8: Defense stats (season ${PFR_SEASON})...`);
  const defMap = await fetchAllDefenseStats(PFR_SEASON);
  console.log(`✅ ${Object.keys(defMap).length} categories`);
  const opponent = (prop.team && prop.matchup) ? getOpponent(prop.team, prop.matchup) : null;
  console.log(`   Opponent: ${opponent ?? '(none)'}`);
  let oppRank = null, oppAvg = null;
  if (opponent) {
    const def = lookupDefenseStats(defMap, propNorm, opponent);
    if (def) { oppRank = def.rank; oppAvg = def.avg; console.log(`   Rank #${oppRank} Avg ${oppAvg}`); }
    else console.warn(`   ⚠️  No defense entry for "${opponent}" prop="${propNorm}"`);
  }

  // Step 9: Scoring
  console.log('\n⏳ Step 9: Scoring...');
  if (avg == null || oppRank == null || oppAvg == null) {
    console.error(`❌ Missing inputs: avg=${avg} oppRank=${oppRank} oppAvg=${oppAvg}`);
  } else {
    const best = pickBestOdds(prop.fdOdds, prop.dkOdds);
    const s = computeScoring({ playerAvg: avg, opponentRank: oppRank, opponentAvgVsStat: oppAvg,
      line: prop.line ?? 0, seasonHitPct: hitPct, odds: best.odds, propNorm });
    console.log('✅ Scoring output:');
    Object.entries(s).forEach(([k,v]) => console.log(`   ${k}: ${v}`));
  }

  console.log(`\n${'='.repeat(55)}\nDone. Run full enrich:\n  pnpm exec tsx scripts/enrich.ts --all --week=${WEEK} --force\n${'='.repeat(55)}`);
}

main().catch(e => { console.error('❌', e); process.exit(1); });
