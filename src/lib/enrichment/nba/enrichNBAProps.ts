import { adminDb as db } from '@/lib/firebase/admin';
// ✅ Use absolute paths (@/) to ensure the build finds these files regardless of depth
import { fetchNBASeasonLog, getNBAStatFromGame, calculateNBAHitPct } from '@/lib/enrichment/nba/bball';
import { fetchAllNBADefenseStats, lookupNBADefenseStats } from '@/lib/enrichment/nba/defense';
import { normalizeNBAProp } from '@/lib/enrichment/nba/normalize-nba';

// ✅ Pointing to the 'shared' subfolder as requested
import { computeScoring } from '@/lib/enrichment/shared/scoring'; 

async function getBrIdMap(): Promise<Record<string, string>> {
  const brIdMap: Record<string, string> = {};
  const staticBrIdSnap = await db.collection('static_brIdMap').get();
  staticBrIdSnap.docs.forEach(d => {
    const r = d.data();
    const key = (r.player ?? '').toLowerCase().trim();
    if (key && r.brid) brIdMap[key] = r.brid;
  });
  return brIdMap;
}

export async function enrichNBAPropsForDate({
  gameDate,
  season,
  skipEnriched,
}: {
  gameDate: string;
  season: number;
  skipEnriched: boolean;
}): Promise<number> {
  const colName = `nbaProps_${season}`;
  const propsCollection = db.collection(colName);
  const snapshot = await propsCollection.where('gameDate', '==', gameDate).get();

  if (snapshot.empty) return 0;

  const brIdMap = await getBrIdMap();
  const defMap = await fetchAllNBADefenseStats(season);
  
  let enrichedCount = 0;

  const promises = snapshot.docs.map(async (doc) => {
    const data = doc.data();
    if (skipEnriched && data.confidenceScore != null) return;

    const playerName = data.player.toLowerCase().trim();
    const brid = data.brid ?? brIdMap[playerName];
    if (!brid || brid === 'VERIFY') return;

    // 1. Fetch Logs
    const gameLog = await fetchNBASeasonLog(data.player, brid, season);
    if (!gameLog || gameLog.length === 0) return;

    const propNorm = normalizeNBAProp(data.prop);
    
    // 2. Calculate Averages & Hit Rates
    const seasonAvg = gameLog.reduce((acc, g) => acc + (getNBAStatFromGame(g, propNorm) || 0), 0) / gameLog.length;
    const hitPctRaw = calculateNBAHitPct(gameLog, propNorm, Number(data.line), data.overUnder || 'Over', 999, gameDate);

    // 3. Defense Context
    const def = lookupNBADefenseStats(defMap, propNorm, data.opponent || '');

    // 4. Run through Scoring Brain (from shared/scoring.ts)
    const scoringInput = {
      playerAvg: seasonAvg,
      opponentRank: def?.rank || 15.5,
      opponentAvgVsStat: def?.avg || seasonAvg,
      line: Number(data.line),
      seasonHitPct: hitPctRaw ? hitPctRaw / 100 : null,
      odds: data.odds || -110,
      propNorm: propNorm
    };

    const math = computeScoring(scoringInput, 'nba');

    // 5. Update Doc
    await doc.ref.update({
      ...math,
      playerAvg: Math.round(seasonAvg * 10) / 10,
      seasonHitPct: hitPctRaw,
      oppRank: def?.rank || null,
      oppAvg: def?.avg || null,
      brid,
      enrichedAt: new Date().toISOString(),
    });

    enrichedCount++;
  });

  await Promise.all(promises);
  return enrichedCount;
}

export async function enrichAllNBAPropsCollection({ season, skipEnriched }: { season: number, skipEnriched: boolean }) {
  const colName = `nbaProps_${season}`;
  const allDocs = await db.collection(colName).select('gameDate').get();
  const uniqueDates = Array.from(new Set(allDocs.docs.map(d => d.data().gameDate))).filter(Boolean) as string[];
  
  let total = 0;
  for (const date of uniqueDates) {
    total += await enrichNBAPropsForDate({ gameDate: date, season, skipEnriched });
  }
  return total;
}