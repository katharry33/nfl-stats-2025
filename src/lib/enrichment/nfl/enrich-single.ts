// src/lib/enrichment/nfl/enrich-single.ts

import type { NFLPropDoc, PropDoc } from '@/lib/types';
import { getPfrId, fetchSeasonLog, calculateAvg, calculateHitPct } 
  from '@/lib/enrichment/nfl/pfr';
  import { fetchAllDefenseStats, lookupDefenseStats } 
  from '@/lib/enrichment/nfl/defense';
  import { computeScoring } from '@/lib/enrichment/shared/scoring';

export interface NFLEnrichmentContext {
  season: number;
  defenseMap: Awaited<ReturnType<typeof fetchAllDefenseStats>>;
  pfrIdMap: Record<string, string>;
}

export async function buildNFLEnrichmentContext(
  season: number,
  pfrIdMap: Record<string, string> = {}
): Promise<NFLEnrichmentContext> {
  const defenseMap = await fetchAllDefenseStats(season);
  return { season, defenseMap, pfrIdMap };
}

export async function enrichSingleNFLProp(
  prop: NFLPropDoc,
  ctx: NFLEnrichmentContext
): Promise<PropDoc> {
  const { season, defenseMap, pfrIdMap } = ctx;
  const { player, propNorm, line, overUnder, gameDate, opponent } = prop;

  try {
    const pfrId =
      pfrIdMap[player] ?? (await getPfrId(player, pfrIdMap));
    if (!pfrId) {
      return {
        ...prop,
        status: 'error',
        lastEnriched: new Date().toISOString(),
      };
    }

    const games = await fetchSeasonLog(player, pfrId, season);
    if (!games || games.length === 0) {
      return {
        ...prop,
        status: 'error',
        lastEnriched: new Date().toISOString(),
      };
    }

    const playerAvg = calculateAvg(
      games,
      propNorm,
      99,
      gameDate
    );

    const seasonHitPct = calculateHitPct(
      games,
      propNorm,
      line,
      overUnder,
      undefined,
      gameDate
    );

    let opponentRank: number | null = null;
    let opponentAvgVsStat: number | null = null;

    if (opponent) {
      const def = lookupDefenseStats(defenseMap, propNorm, opponent);
      if (def) {
        opponentRank = def.rank;
        opponentAvgVsStat = def.avg;
      }
    }

    const scoring = computeScoring({
      playerAvg: playerAvg ?? null,
      opponentRank,
      opponentAvgVsStat,
      line,
      seasonHitPct: seasonHitPct ?? null,
      odds: prop.odds ?? null,
      propNorm,
    });

    return {
      ...prop,
      playerAvg: playerAvg ?? null,
      seasonHitPct: seasonHitPct ?? null,
      opponentRank,
      opponentAvgVsStat,
      modelProb: scoring.modelProb,
      expectedValue: scoring.expectedValue,
      confidenceScore: scoring.confidenceScore,
      bestEdge: scoring.bestEdge,
      enriched: true,
      status: 'enriched',
      lastEnriched: new Date().toISOString(),
    };
  } catch (err) {
    console.error('NFL enrich error:', err);
    return {
      ...prop,
      status: 'error',
      lastEnriched: new Date().toISOString(),
    };
  }
}
