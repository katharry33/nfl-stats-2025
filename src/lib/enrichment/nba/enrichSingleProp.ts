// src/lib/enrichment/nba/enrichSingleProp.ts

import { adminDb } from '@/lib/firebase/admin';
import { fetchNBASeasonLog, calculateNBAAvg, calculateNBAHitPct } from './bball';
import { fetchNbaDefenseStats, lookupNbaDefense } from './defense';
import { normalizeNBAProp } from './normalize-nba';
import { computeScoring } from '../shared/scoring';
import type { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import { generateNBABrId } from './utils';

export async function enrichSingleNBAProp(doc: QueryDocumentSnapshot) {
  const data = doc.data();

  const {
    player,
    prop: rawProp,
    line,
    overUnder,
    opponent,
    gameDate,
    season,
    brid: rawBrId,
    odds,
  } = data;

  // Basic validation
  if (!player || !rawProp || !line || !opponent || !gameDate || !season) {
    console.warn(`Skipping incomplete prop: ${doc.id}`);
    return;
  }

  // Normalize prop
  const propNorm = normalizeNBAProp(rawProp);

  // Determine BR ID (fallback if missing)
  const brid = rawBrId || generateNBABrId(player);

  // Fetch logs (cached inside bball.ts)
  const logs = await fetchNBASeasonLog(player, brid, season);

  if (!logs || logs.length === 0) {
    console.warn(`No logs found for ${player} (${brid})`);
    await doc.ref.update({
      enriched: false,
      error: 'NO_LOGS_FOUND',
      lastEnriched: new Date().toISOString(),
    });
    return;
  }

  // Compute averages + hit %
  const playerAvg = calculateNBAAvg(logs, propNorm, 999, gameDate);
  const seasonHitPct = calculateNBAHitPct(
    logs,
    propNorm,
    Number(line),
    overUnder || 'over',
    999,
    gameDate
  );

  // Fetch defense map (cached inside defense.ts)
  const defMap = await fetchNbaDefenseStats();
  const def = lookupNbaDefense(defMap, propNorm, opponent);

  const opponentRank = def?.rank ?? null;
  const opponentAvgVsStat = def?.avg ?? null;

  // Compute scoring (new signature: only 1 argument)
  const math = computeScoring({
    playerAvg,
    opponentRank,
    opponentAvgVsStat,
    line: Number(line),
    seasonHitPct: seasonHitPct ? seasonHitPct / 100 : null,
    odds: Number(odds) || -110,
    propNorm,
  });

  // Write enriched fields
  await doc.ref.update({
    enriched: true,
    lastEnriched: new Date().toISOString(),
    playerAvg,
    seasonHitPct,
    opponentRank,
    opponentAvgVsStat,
    ...math,
  });
}
