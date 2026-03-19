// src/lib/enrichment/engine.ts

import { computeScoring } from './scoring';
import { calculateRecommendation } from './kelly'; // The code you just shared

export async function enrichSingleProp(prop: NFLProp, balance: number) {
  // 1. Get the pre-calculated stats from your new collections
  // This uses the "No-Scrape" BallDontLie data we discussed
  const stats = await getPlayerWeeklyStats(prop.player, prop.propNorm, prop.season, prop.week);
  
  if (!stats) return prop;

  // 2. Run the math model (Blended Averages + Defense Ranks)
  const scoring = computeScoring({
    playerAvg: stats.avg,
    seasonHitPct: stats.hitRate, // This is the 'estimatedHitRate'
    opponentRank: prop.opponentRank,
    opponentAvgVsStat: prop.opponentAvgVsStat,
    line: prop.line,
    odds: prop.bestOdds,
    propNorm: prop.propNorm
  });

  // 3. Calculate the actual Wager Recommendation
  // We use the 'avgWinProb' (the blend of your model + historical hit rate)
  const rec = calculateRecommendation(
    scoring.avgWinProb * 100, 
    String(prop.bestOdds || -110), 
    balance
  );

  return {
    ...prop,
    ...scoring,
    recommendedWager: rec.recommendedWager,
    kellyFraction: rec.kellyFraction,
    edge: scoring.bestEdgePct
  };
}