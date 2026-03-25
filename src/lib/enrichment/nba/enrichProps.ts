
import { db } from '@/lib/firebase/admin';
import { 
  fetchNBASeasonLog, 
  getNBAStatFromGame, 
  calculateNBAHitPct 
} from './bball';
import { fetchAllNBADefenseStats, lookupNBADefenseStats } from './defense';
import { normalizeNBAProp } from './normalize-nba';
import { computeScoring } from '../shared/scoring';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';

async function enrichSingleProp(doc: QueryDocumentSnapshot) {
    const prop = doc.data();
    const { player, prop: propName, line, overUnder, opponent, gameDate, season, brid } = prop;

    if (!player || !propName || !line || !opponent || !gameDate || !season || !brid) {
        console.log('Skipping due to missing fields', prop);
        return;
    }

    const propNorm = normalizeNBAProp(propName);
    const defMap = await fetchAllNBADefenseStats(season);
    const gameLog = await fetchNBASeasonLog(player, brid, season);
    
    const seasonAvg = gameLog.reduce((acc, g) => acc + (getNBAStatFromGame(g, propNorm) || 0), 0) / gameLog.length;
    const hitPctRaw = calculateNBAHitPct(gameLog, propNorm, Number(line), overUnder || 'Over', 999, gameDate);
    const def = lookupNBADefenseStats(defMap, propNorm, opponent || '');

    const math = computeScoring({
        playerAvg: seasonAvg,
        opponentRank: def?.rank || 15.5,
        opponentAvgVsStat: def?.avg || seasonAvg,
        line: Number(line),
        seasonHitPct: hitPctRaw ? hitPctRaw / 100 : null,
        odds: Number(prop.odds) || -110,
        propNorm
    }, 'nba');

    await doc.ref.update({
        ...math,
        playerAvg: Math.round(seasonAvg * 10) / 10,
        seasonHitPct: hitPctRaw,
        opponentRank: def?.rank || null,
        opponentAvgVsStat: def?.avg || null,
        enrichedAt: new Date().toISOString(),
        needsReview: false
    });
}

export async function enrichAllPropsCollection(collectionName: string) {
    const snapshot = await db.collection(collectionName).where('needsReview', '==', true).get();
    const promises = snapshot.docs.map(doc => enrichSingleProp(doc));
    await Promise.all(promises);
    return promises.length;
}
