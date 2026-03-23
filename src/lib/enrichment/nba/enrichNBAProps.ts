
import { adminDb as db } from '@/lib/firebase/admin';
import { 
  fetchNBASeasonLog, 
  getNBAStatFromGame, 
  calculateNBAHitPct 
} from './bball';
import { fetchAllNBADefenseStats, lookupNBADefenseStats } from './defense';
import { normalizeNBAProp } from './normalize-nba';
import { computeScoring } from '../shared/scoring';

export async function enrichAndSaveCSVProps(props: any[], season: number) {
  const colName = `nbaProps_${season}`;
  const batch = db.batch();
  const defMap = await fetchAllNBADefenseStats(season);
  
  // We process these in a loop. 
  // Note: CSVs usually don't have 'brid', so we'd need a map or 
  // assume the CSV has a 'brid' column.
  for (const rawProp of props) {
    const propNorm = normalizeNBAProp(rawProp.prop);
    const playerName = rawProp.player;
    const brid = rawProp.brid; // Ensure your CSV has a 'brid' column!

    if (!brid) continue;

    const gameLog = await fetchNBASeasonLog(playerName, brid, season);
    const seasonAvg = gameLog.reduce((acc, g) => acc + (getNBAStatFromGame(g, propNorm) || 0), 0) / gameLog.length;
    const hitPctRaw = calculateNBAHitPct(gameLog, propNorm, Number(rawProp.line), rawProp.overUnder || 'Over', 999, rawProp.gameDate);
    const def = lookupNBADefenseStats(defMap, propNorm, rawProp.opponent || '');

    const math = computeScoring({
      playerAvg: seasonAvg,
      opponentRank: def?.rank || 15.5,
      opponentAvgVsStat: def?.avg || seasonAvg,
      line: Number(rawProp.line),
      seasonHitPct: hitPctRaw ? hitPctRaw / 100 : null,
      odds: Number(rawProp.odds) || -110,
      propNorm
    }, 'nba');

    // Create a unique ID for the doc (e.g., player_prop_date)
    const docId = `${playerName}_${rawProp.prop}_${rawProp.gameDate}`.replace(/\s+/g, '_');
    const docRef = db.collection(colName).doc(docId);

    batch.set(docRef, {
      ...rawProp,
      ...math,
      playerAvg: Math.round(seasonAvg * 10) / 10,
      seasonHitPct: hitPctRaw,
      opponentRank: def?.rank || null,
      opponentAvgVsStat: def?.avg || null,
      enrichedAt: new Date().toISOString(),
    }, { merge: true });
  }

  await batch.commit();
  return props.length;
}
