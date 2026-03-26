// src/lib/enrichment/nba/recalculate.ts

interface ScoringOutput {
  playerAvg: number;
  statsCount: number;
  modelProb: number;
  winProb?: number;
  bestEdge: number;
  conf?: number;
  expectedValue?: number;
}

import { adminDb } from '@/lib/firebase/admin';
import { computeScoring } from '../shared/scoring';

const BATCH_SIZE = 25;
const MATH_VERSION = '1.1'; // Increment this to force re-enrichment of everything

const propToStatMap: Record<string, string> = {
  '3pts': '3P',
  'Blk': 'BLK',
  'Pts': 'PTS',
  'Reb': 'TRB',
  'Ast': 'AST',
  'Stl': 'STL'
};

/**
 * Calculates the total for a given prop (single or combo)
 * from a single historical game log document.
 */
function getStatTotal(logData: any, propName: string): number {
  const parts = propName.split(' + ');
  
  return parts.reduce((sum, part) => {
    const key = propToStatMap[part] || part.toUpperCase();
    const value = logData[key];
    
    return sum + (Number(value) || 0);
  }, 0);
}

export async function recalculateExistingProps(season: number, date: string) {
  try {
    const propsQuery = adminDb.collection(`nbaProps_2025`).where('gameDate', '==', date);
    const snapshot = await propsQuery.get();

    const allUnenriched = snapshot.docs.filter(doc => {
      const data = doc.data();
      return !data.enriched || isNaN(data.playerAvg) || data.playerAvg === null || data.mathVersion !== MATH_VERSION;
    });

    if (allUnenriched.length === 0) {
      return { updated: 0, remaining: 0, total: snapshot.size };
    }

    const totalRemaining = allUnenriched.length;
    const batchDocs = allUnenriched.slice(0, BATCH_SIZE);
    const batch = adminDb.batch();
    let updateCount = 0;

    for (const doc of batchDocs) {
      try {
        const data = doc.data();
        const { brid, player, prop: propName, line, gameDate, odds, opponentRank, opponentAvgVsStat, seasonHitPct } = data;

        if (!brid) {
          console.warn(`⚠️ MISSING BRID: [${player}] - Cannot fetch stats. Marking as enriched to prevent loop.`);
          batch.update(doc.ref, { 
            playerAvg: 0, modelProb: 0, bestEdge: 0, confidenceScore: 0, diff: 0, enriched: true, 
            statsCount: 0, lastEnriched: new Date().toISOString(), error: 'Missing BRID', mathVersion: MATH_VERSION
          });
          updateCount++;
          continue;
        }

        const history = await adminDb.collection('nbaProps_2025')
          .where('brid', '==', brid)
          .where('gameDate', '<', gameDate)
          .where('type', '==', 'stat_log')
          .get();

        const statsCount = history.size;
        console.log(`[ENRICH] ${player} (${brid}): Found ${statsCount} games for ${propName}`);

        const total = history.docs.reduce((sum, d) => sum + getStatTotal(d.data(), propName), 0);
        const playerAvg = statsCount > 0 ? total / statsCount : 0;

        const lineValue = Number(line) || 0;

        const math = computeScoring({
          playerAvg,
          opponentRank: opponentRank ?? 15, 
          opponentAvgVsStat: opponentAvgVsStat ?? lineValue,
          line: lineValue,
          seasonHitPct: seasonHitPct ?? 0.5,
          odds: odds ?? -110,
          propNorm: propName
        }, 'nba');
        
        const modelProb = Number(math.modelProb);
        const bestEdge = playerAvg - lineValue;

        if (isNaN(playerAvg) || isNaN(bestEdge) || isNaN(modelProb)) {
          console.error(`❌ MATH ERROR: [${player}] | Prop: ${propName} | BRID: ${brid}`);
          console.error(`   - Avg: ${playerAvg}, Line: ${lineValue}, Edge: ${bestEdge}, Prob: ${modelProb}`);
        }

        batch.update(doc.ref, { 
          playerAvg: isNaN(playerAvg) ? 0 : Number(playerAvg.toFixed(2)),
          modelProb: isNaN(modelProb) ? 0 : Number(modelProb.toFixed(4)),
          bestEdge: isNaN(bestEdge) ? 0 : Number(bestEdge.toFixed(2)),
          diff: isNaN(bestEdge) ? 0 : Number(bestEdge.toFixed(2)),
          confidenceScore: playerAvg > 0 ? (isNaN(Number(math.conf)) ? 0 : Number(math.conf)) : 0,
          statsCount, 
          enriched: true, 
          lastEnriched: new Date().toISOString(),
          mathVersion: MATH_VERSION
        });

        updateCount++;

      } catch (e: any) {
        console.error(`Failed during enrichment for prop ${doc.id}:`, e);
      }
    }

    await batch.commit();

    return { 
      updated: updateCount, 
      remaining: totalRemaining - updateCount 
    };

  } catch (globalError: any) {
    console.error("Critical error in recalculateExistingProps:", globalError);
    throw globalError;
  }
}
