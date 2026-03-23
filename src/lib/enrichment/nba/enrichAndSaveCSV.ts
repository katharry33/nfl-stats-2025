import { adminDb as db } from '@/lib/firebase/admin';
import { fetchAllNBADefenseStats, lookupNBADefenseStats } from './defense';
import { computeScoring } from '../shared/scoring';
import { fetchNBASeasonLog, getNBAStatFromGame, calculateNBAHitPct } from './bball';
import { normalizeNBAProp } from './normalize-nba';

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export async function enrichAndSaveCSVProps(props: any[], season: number) {
  const colName = `nbaProps_${season}`;
  const results = { success: 0, skipped: 0, errors: [] as string[] };
  const dateStr = new Date().toLocaleDateString('en-CA', { timeZone: 'America/New_York' });

  // 1. PRE-FETCH ID MAP
  const idMapSnap = await db.collection('static_brIdMap').get();
  const nameToIdMap = new Map<string, string>();
  idMapSnap.docs.forEach(doc => {
    const data = doc.data();
    if (data?.player) nameToIdMap.set(data.player.toLowerCase().trim(), doc.id);
  });

  const defMap = await fetchAllNBADefenseStats(season);

  for (const raw of props) {
    try {
      if (!raw.player || typeof raw.player !== 'string') continue;
      const playerName = raw.player.trim();
      const propNorm = normalizeNBAProp(raw.prop);
      
      // UNIQUE DOC ID
      const docId = `${playerName}_${propNorm}_${dateStr}`.replace(/\s+/g, '_');
      const docRef = db.collection(colName).doc(docId);

      // --- SMART RESUME CHECK ---
      // Check if this specific prop for this player on this date is already done
      const existing = await docRef.get();
      if (existing.exists && existing.data()?.math) {
        console.log(`⏩ Skipping ${playerName} (${propNorm}): Already Enriched.`);
        results.success++;
        continue; 
      }

      // 2. ID LOOKUP / GUESS
      let brid = nameToIdMap.get(playerName.toLowerCase()) || 
                 `${playerName.split(' ').pop()?.toLowerCase().substring(0, 5)}${playerName.toLowerCase().substring(0, 2)}01`;

      // 3. RATE LIMIT PROTECTION (2 seconds)
      // We only sleep if we actually need to hit the scraper!
      await sleep(2000); 

      // 4. FETCH LOGS
      const gameLog = await fetchNBASeasonLog(playerName, brid, season);
      
      if (!gameLog || gameLog.length === 0) {
        results.errors.push(`${playerName}: 403 or No Logs.`);
        results.skipped++;
        continue;
      }

      // 5. MATH & TEAM LOGIC
      const teamMatch = raw.team?.match(/\/([A-Z]{3})\.webp$/);
      const playerTeam = teamMatch ? teamMatch[1] : (raw.team?.toUpperCase() || 'UNK');
      const opponent = raw.matchup?.split(/ @ | vs /i).find((t: string) => t.trim().toUpperCase() !== playerTeam) || 'UNK';
      
      let odds = parseInt(String(raw.odds || '').replace(/[()]/g, ''), 10) || -110;
      const line = parseFloat(raw.line) || 0;

      const defStats = lookupNBADefenseStats(defMap, propNorm, opponent);
      const seasonAvg = gameLog.reduce((acc, g) => acc + (getNBAStatFromGame(g, propNorm) || 0), 0) / gameLog.length;
      const hitPct = calculateNBAHitPct(gameLog, propNorm, line, raw.overUnder || 'Over', 999)
      
      const math = computeScoring({
        playerAvg: seasonAvg,
        opponentRank: defStats?.rank ?? 15,
        opponentAvgVsStat: defStats?.avg ?? seasonAvg,
        line,
        seasonHitPct: hitPct ? hitPct / 100: 0,
        odds,
        propNorm
      }, 'nba');

      // 6. IMMEDIATE SAVE
      await docRef.set({
        ...raw,
        brid,
        opponent,
        odds,
        line,
        ...math,
        gameDate: dateStr,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 7. AUTO-UPDATE MAP
      if (!nameToIdMap.has(playerName.toLowerCase())) {
        await db.collection('static_brIdMap').doc(brid).set({ player: playerName }, { merge: true });
        nameToIdMap.set(playerName.toLowerCase(), brid);
      }

      results.success++;
      console.log(`✅ Processed & Saved: ${playerName} (${propNorm})`);

    } catch (e: any) {
      results.errors.push(`Error on ${raw.player}: ${e.message}`);
      results.skipped++;
    }
  }

  return results;
}