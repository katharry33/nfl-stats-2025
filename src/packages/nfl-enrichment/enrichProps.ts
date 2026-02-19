// packages/nfl-enrichment/src/enrichProps.ts
// Port of your loadPlayerAverages + loadDefenseStats + fillPropHitPercent

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';

const db = getFirestore();

export async function enrichPropsForWeek(week: number, season: number = 2025) {
  const ref = db
    .collection('seasons').doc(String(season))
    .collection('weeks').doc(String(week))
    .collection('props');

  const snapshot = await ref.get();
  const props = snapshot.docs.map(d => ({ id: d.id, ...d.data() as any }));

  console.log(`Enriching ${props.length} props for Week ${week}`);

  // 1. Fetch defense stats (TeamRankings) — one fetch per prop type
  const defenseStats = await fetchAllDefenseStats(season);

  // 2. Enrich each prop
  const pfrCache: Record<string, any[]> = {};

  for (const prop of props) {
    const updates: Record<string, any> = {};

    // Player Average
    if (prop.player && prop.prop) {
      const seasonToUse = week <= 3 ? season - 1 : season;
      
      if (!pfrCache[prop.player]) {
        pfrCache[prop.player] = await fetchPfrSeasonLog(prop.player, seasonToUse);
      }
      
      const logs = pfrCache[prop.player];
      const propNorm = normalizeProp(prop.prop);
      updates.playerAvg = calculateAvg(logs, propNorm, week);
      updates.seasonHitPct = calculateHitPct(logs, propNorm, prop.line, week);
    }

    // Defense Stats
    if (prop.matchup && prop.team) {
      const opponent = getOpponent(prop.team, prop.matchup);
      const propNorm = normalizeProp(prop.prop);
      
      if (opponent && defenseStats[propNorm]?.[opponent]) {
        updates.opponentRank = defenseStats[propNorm][opponent].rank;
        updates.opponentAvgVsStat = defenseStats[propNorm][opponent].avg;
      }
    }

    // Scoring formulas (port of your applyEnhancedFormulas)
    if (updates.playerAvg && updates.opponentAvgVsStat) {
      const scoring = computeScoring(
        updates.playerAvg,
        updates.opponentRank,
        updates.opponentAvgVsStat,
        prop.line,
        updates.seasonHitPct,
        prop.fdOdds || prop.dkOdds
      );
      Object.assign(updates, scoring);
    }

    updates.updatedAt = Timestamp.now();

    await ref.doc(prop.id).update(updates);
  }

  console.log(`✅ Enriched ${props.length} props`);
}

function computeScoring(
  playerAvg: number,
  oppRank: number,
  oppAvg: number,
  line: number,
  seasonHitPct: number,
  odds: number
) {
  // Port of your formula columns L–AB
  const yardsScore = playerAvg + (oppAvg / 100);
  const rankScore = (oppRank / 32) * 10;
  const totalScore = yardsScore - rankScore;
  const scoreDiff = totalScore - line;
  const adjustedScore = scoreDiff / 10;
  const expFn = Math.exp(-adjustedScore);
  const overUnder = scoreDiff > 0 ? 'Over' : 'Under';
  
  const projWinPct = overUnder === 'Over'
    ? 1 / (1 + expFn)
    : expFn / (1 + expFn);
  
  const avgWinProb = seasonHitPct 
    ? (projWinPct + seasonHitPct) / 2
    : projWinPct;

  const confidenceScore = seasonHitPct
    ? 0.5 * projWinPct + 0.3 * seasonHitPct + 0.2 * avgWinProb
    : null;

  let bestEdgePct = null;
  if (odds && avgWinProb) {
    const impliedProb = odds > 0 
      ? 100 / (odds + 100) 
      : Math.abs(odds) / (Math.abs(odds) + 100);
    bestEdgePct = avgWinProb - impliedProb;
  }

  return {
    overUnder,
    projWinPct,
    avgWinProb,
    confidenceScore,
    bestEdgePct,
  };
}