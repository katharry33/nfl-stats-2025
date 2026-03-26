// lib/enrichment/shared/engine.ts
import { computeScoring } from './scoring';
// Adapter imports should be implemented in your repo:
// import { getStaticBdlId, getStaticPlayerTeam } from './firestore-static';
// import { fetchNBALogs, fetchNFLLogs, getNBAStat, getNFLStat } from './sports-adapters';
// import { calculateRecommendation } from './kelly';

export interface EnrichmentResult {
  recommendedWager: number;
  kellyFraction: number;
  edge: number | null;
  avgWinProb: number | null;
  confidenceScore: number | null;
  [key: string]: any;
}

export async function enrichSingleProp(
  prop: any,
  balance = 1000,
  sport: 'nfl' | 'nba' = 'nfl'
): Promise<EnrichmentResult | any> {
  const { player, propNorm, season, line, bestOdds, overUnder } = prop;

  try {
    // Uncomment and implement adapters in your codebase
    // const bdlId = await getStaticBdlId(player, sport);
    // if (!bdlId) return { ...prop, status: 'unresolved', lastEnriched: new Date().toISOString() };

    // const logs = sport === 'nba' ? await fetchNBALogs(bdlId, season) : await fetchNFLLogs(bdlId, season);
    // if (!logs || logs.length === 0) return { ...prop, status: 'no_logs', lastEnriched: new Date().toISOString() };

    // const getStat = sport === 'nba' ? getNBAStat : getNFLStat;
    // const values = logs.map((g: any) => getStat(g, propNorm)).filter((v) => v != null) as number[];
    // if (values.length === 0) return { ...prop, status: 'no_values', lastEnriched: new Date().toISOString() };

    // const avg = values.reduce((a, b) => a + b, 0) / values.length;
    // const hitCount = values.filter((v) => (overUnder === 'Over' ? v > line : v < line)).length;
    // const hitRate = hitCount / values.length;

    // const scoring = computeScoring({
    //   playerAvg: avg,
    //   seasonHitPct: hitRate,
    //   opponentRank: prop.opponentRank || 16,
    //   opponentAvgVsStat: prop.opponentAvgVsStat || avg,
    //   line,
    //   odds: bestOdds ?? -110,
    //   propNorm
    // }, sport);

    // const rec = calculateRecommendation(hitRate ?? 0.5, String(bestOdds ?? -110), balance);

    // return {
    //   ...prop,
    //   ...scoring,
    //   playerAvg: Math.round(avg * 10) / 10,
    //   seasonHitPct: Math.round(hitRate * 1000) / 1000,
    //   recommendedWager: rec.recommendedWager,
    //   kellyFraction: rec.kellyFraction,
    //   edge: scoring.bestEdgePct,
    //   lastEnriched: new Date().toISOString(),
    //   status: 'enriched'
    // };

    // Placeholder until adapters are implemented:
    return {
      ...prop,
      lastEnriched: new Date().toISOString(),
      status: 'stubbed'
    };
  } catch (err: any) {
    return {
      ...prop,
      status: 'error',
      error: String(err),
      lastEnriched: new Date().toISOString()
    };
  }
}
