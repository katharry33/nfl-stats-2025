import { computeScoring } from './scoring';
// import { calculateRecommendation } from './kelly';
// import { 
//   getNFLStat, fetchNFLLogs, 
//   getNBAStat, fetchNBALogs 
// } from './sports-adapters';
// import { 
//   getStaticBdlId, 
//   getStaticPlayerTeam 
// } from './firestore-static';

export interface EnrichmentResult {
  recommendedWager: number;
  kellyFraction: number;
  edge: number;
  avgWinProb: number;
  confidenceScore: number;
  [key: string]: any; 
}

/**
 * Universal Enrichment Engine
 * Detects sport and applies the correct BDL data adapters.
 */
export async function enrichSingleProp(
  prop: any, 
  balance: number, 
  sport: 'nfl' | 'nba' = 'nfl'
): Promise<EnrichmentResult | any> {
  
  const { player, propNorm, season, line, bestOdds } = prop;

  // 1. DATA ACQUISITION
  // const bdlId = await getStaticBdlId(player, sport);
  // if (!bdlId) {
  //   console.warn(`⚠️ No BDL ID found for ${player}.`);
  //   return prop;
  // }

  // // 2. FETCH LOGS VIA SPORT ADAPTER
  // const logs = sport === 'nfl' 
  //   ? await fetchNFLLogs(bdlId, season) 
  //   : await fetchNBALogs(bdlId, season);

  // if (!logs || logs.length === 0) return prop;

  // // 3. CALCULATE AVERAGES & HIT RATES
  // const getStat = sport === 'nfl' ? getNFLStat : getNBAStat;
  
  // const values = logs
  //   .map((game: any) => getStat(game, propNorm))
  //   .filter((v: number | null) => v !== null) as number[];

  // if (values.length === 0) return prop;

  // const avg = values.reduce((a, b) => a + b, 0) / values.length;
  // const hitCount = values.filter(v => prop.overUnder === 'Over' ? v > line : v < line).length;
  // const hitRate = hitCount / values.length;

  // // 4. RUN THE MATH MODEL
  // // We pass 'sport' here so scoring knows if it's a 30 or 32 team league
  // const scoring = computeScoring({
  //   playerAvg: avg,
  //   seasonHitPct: hitRate,
  //   opponentRank: prop.opponentRank || 16,
  //   opponentAvgVsStat: prop.opponentAvgVsStat || avg,
  //   line: line,
  //   odds: bestOdds || -110,
  //   propNorm: propNorm
  // }, sport);

  // // 5. CALCULATE KELLY RECOMMENDATION
  // // Fallback to 50% if avgWinProb is somehow missing to prevent crash
  // const winProbForKelly = 0.5 * 100;
  
  // const rec = calculateRecommendation(
  //   winProbForKelly, 
  //   String(bestOdds || -110), 
  //   balance
  // );

  // // 6. RETURN STANDARDIZED PROP OBJECT
  // return {
  //   ...prop,
  //   ...scoring,
  //   playerAvg: Math.round(avg * 10) / 10,
  //   seasonHitPct: Math.round(hitRate * 1000) / 1000,
  //   recommendedWager: rec.recommendedWager,
  //   kellyFraction: rec.kellyFraction,
  //   edge: scoring.bestEdgePct,
  //   lastEnriched: new Date().toISOString()
  // };
  return prop
}