console.log("📍 enrichProps.ts module loaded");

import type { NFLProp } from './types';
import { db } from '@/lib/firebase/admin';
import { normalizeProp, getOpponent, normalizePlayerName, splitComboProp } from './normalize';
import { fetchSeasonLog, getPfrId, calculateAvg, calculateHitPct } from './pfr';
import { fetchAllDefenseStats, lookupDefenseStats, lookupComboDefenseStats } from './defense';
import { computeScoring, pickBestOdds } from './scoring';
import { getPropsForWeek, updateProps, getPfrIdMap, savePfrId, getPlayerTeamMap, updateAllProps, getPlayerSeasonAvg, getTeamDefenseStats } from './firestore';

export type DefenseMap = Record<string, Record<string, { rank: number; avg: number }>>;

export interface EnrichOptions {
  week:          number;
  season:        number;
  skipEnriched?: boolean;
}

// ─────────────────────────────────────────────────────────────────────────────
// enrichPropsForWeek — fills weeklyProps_{season} for a given week
// ─────────────────────────────────────────────────────────────────────────────
export async function enrichPropsForWeek(options: EnrichOptions): Promise<number> {
  const { week, season, skipEnriched = true } = options;

  console.log(`\n🏈 Enriching Week ${week} (season ${season})`);
  console.log('='.repeat(55));

  const [props, pfrIdMap, playerTeamMap, defenseMap] = await Promise.all([
    getPropsForWeek(season, week),
    getPfrIdMap(),
    getPlayerTeamMap(),
    fetchAllDefenseStats(season),
  ]);

  console.log(`📋 ${props.length} props | 🛡️ ${Object.keys(defenseMap).length} defense entries`);
  if (!props.length) return 0;

  const pfrCache = new Map<string, any[]>();

  async function getLogs(playerName: string, pfrSeason: number = season) {
    if (!playerName) return [];
    const cacheKey = `${playerName}::${pfrSeason}`;
    if (pfrCache.has(cacheKey)) return pfrCache.get(cacheKey)!;
    const pfrId = await getPfrId(playerName, pfrIdMap);
    if (!pfrId) { pfrCache.set(cacheKey, []); return []; }
    if (!pfrIdMap[playerName]) { pfrIdMap[playerName] = pfrId; await savePfrId(playerName, pfrId); }
    const logs = await fetchSeasonLog(playerName, pfrId, pfrSeason);
    pfrCache.set(cacheKey, logs);
    return logs;
  }

  const updates: Array<{ id: string; season: number; week: number; data: Partial<NFLProp> }> = [];
  const playerAvgCache = new Map<string, Record<string, number>>();
  const defCache = new Map<string, Record<string, { rank: number; avg: number }>>();

  console.log('\n📊 Pass 1: Standard props...');
  let pass1 = 0;

  for (const prop of props) {
    if (!prop.id) continue;
    if (skipEnriched && prop.playerAvg != null) continue;

    const propNorm      = normalizeProp(prop.prop ?? '');
    if (propNorm.includes('+')) continue;

    const update: Partial<NFLProp> = {};
    const playerName    = prop.player ?? '';
    const gameDate      = prop.gameDate || undefined;
    const isEarlySeason = week <= 3;
    const priorSeason   = season - 1;

    if (!prop.team && playerName) {
      const t = playerTeamMap[normalizePlayerName(playerName)];
      if (t) update.team = t;
    }

    // 1. Player average — prior season for weeks 1-3, rookie fallback to current
    let avg: number;
    if (isEarlySeason) {
      const priorAvg = await getPlayerSeasonAvg(playerName, propNorm, priorSeason);
      if (priorAvg != null) {
        avg = priorAvg;
      } else {
        // Rookie/new player — fall back to current season PFR logs
        const currentLogs = await getLogs(playerName, season);
        avg = currentLogs.length > 0 ? calculateAvg(currentLogs, propNorm, week, gameDate) : 0;
      }
    } else {
      const logs = await getLogs(playerName, season);
      avg = calculateAvg(logs, propNorm, week, gameDate);
    }
    update.playerAvg = avg;
    if (!playerAvgCache.has(playerName)) playerAvgCache.set(playerName, {});
    playerAvgCache.get(playerName)![propNorm] = avg;

    // 2. Season hit % — prior season for weeks 1-3, rookie fallback to current
    if (prop.overUnder) {
      if (isEarlySeason) {
        const priorLogs = await getLogs(playerName, priorSeason);
        const logsToUse = priorLogs.length > 0 ? priorLogs : await getLogs(playerName, season);
        if (logsToUse.length > 0) {
          const usePrior = priorLogs.length > 0;
          const hitPct = usePrior
            ? calculateHitPct(logsToUse, propNorm, prop.line ?? 0, prop.overUnder)
            : calculateHitPct(logsToUse, propNorm, prop.line ?? 0, prop.overUnder, week, gameDate);
          if (hitPct != null) update.seasonHitPct = hitPct;
        }
      } else {
        const logs = await getLogs(playerName, season);
        if (logs.length > 0) {
          const hitPct = calculateHitPct(logs, propNorm, prop.line ?? 0, prop.overUnder, week, gameDate);
          if (hitPct != null) update.seasonHitPct = hitPct;
        }
      }
    }

    // 3. Defense stats — prior season for weeks 1-3
    const team = update.team ?? prop.team ?? '';
    if (team && prop.matchup) {
      const opponent = getOpponent(team, prop.matchup);
      if (opponent) {
        const def = isEarlySeason
          ? await getTeamDefenseStats(opponent, propNorm, priorSeason)
          : lookupDefenseStats(defenseMap, propNorm, opponent);
        if (def) {
          update.opponentRank      = def.rank;
          update.opponentAvgVsStat = def.avg;
          if (!defCache.has(team)) defCache.set(team, {});
          defCache.get(team)![propNorm] = def;
        }
      }
    }

    // 4. Scoring — runs even if avg=0, skips only if truly missing
    const pAvg    = update.playerAvg ?? 0;
    const oppRank = update.opponentRank ?? prop.opponentRank;
    const oppAvg  = update.opponentAvgVsStat ?? prop.opponentAvgVsStat;

    if (oppRank != null && oppAvg != null) {
      const best    = pickBestOdds(prop.fdOdds, prop.dkOdds);
      const scoring = computeScoring({
        playerAvg: pAvg, opponentRank: oppRank, opponentAvgVsStat: oppAvg,
        line: prop.line ?? 0, seasonHitPct: update.seasonHitPct ?? prop.seasonHitPct ?? null,
        odds: best.odds, propNorm,
      });
      Object.assign(update, scoring);
      if (best.odds != null) { update.bestOdds = best.odds; update.bestBook = best.book ?? undefined; }
    } else {
      console.log(`  ⚠️  ${playerName} ${propNorm}: missing ${[
        oppRank == null ? 'opponentRank' : null,
        oppAvg  == null ? 'opponentAvg'  : null,
      ].filter(Boolean).join(', ')}`);
    }

    updates.push({ id: prop.id, season, week, data: update });
    pass1++;
  }
  console.log(`✅ Pass 1: ${pass1} props queued`);

  // ── PASS 2: Combo props ────────────────────────────────────────────────────
  console.log('\n📊 Pass 2: Combo props...');
  let pass2 = 0;

  for (const prop of props) {
    if (!prop.id) continue;
    const propNorm = normalizeProp(prop.prop ?? '');
    if (!propNorm.includes('+')) continue;
    if (skipEnriched && prop.playerAvg != null) continue;

    const components    = splitComboProp(propNorm);
    const playerName    = prop.player ?? '';
    const playerAvgs    = playerAvgCache.get(playerName);
    const gameDate      = prop.gameDate || undefined;
    const isEarlySeason = week <= 3;
    const priorSeason   = season - 1;

    if (!components || !playerAvgs || !components.every(c => playerAvgs[c] !== undefined)) {
      console.log(`  ⚠️  Combo skip ${playerName} ${propNorm}: missing component averages`);
      continue;
    }

    const update: Partial<NFLProp> = {};
    const comboAvg = Math.round(components.reduce((s, c) => s + (playerAvgs[c] ?? 0), 0) * 10) / 10;
    update.playerAvg = comboAvg;

    const team    = prop.team ?? '';
    const teamDef = defCache.get(team);
    if (teamDef) {
      const compDefs = components.map(c => teamDef[c]).filter(Boolean);
      if (compDefs.length === components.length) {
        update.opponentRank      = Math.ceil(compDefs.reduce((s, d) => s + d.rank, 0) / compDefs.length);
        update.opponentAvgVsStat = Math.round(compDefs.reduce((s, d) => s + d.avg, 0) * 10) / 10;
      }
    }
    if (update.opponentRank == null && team && prop.matchup) {
      const opponent = getOpponent(team, prop.matchup);
      if (opponent) {
        const def = lookupComboDefenseStats(defenseMap, propNorm, opponent);
        if (def) { update.opponentRank = def.rank; update.opponentAvgVsStat = def.avg; }
      }
    }

    if (prop.overUnder) {
      if (isEarlySeason) {
        const priorLogs = await getLogs(playerName, priorSeason);
        const logsToUse = priorLogs.length > 0 ? priorLogs : await getLogs(playerName, season);
        if (logsToUse.length > 0) {
          const hitPct = priorLogs.length > 0
            ? calculateHitPct(logsToUse, propNorm, prop.line ?? 0, prop.overUnder)
            : calculateHitPct(logsToUse, propNorm, prop.line ?? 0, prop.overUnder, week, gameDate);
          if (hitPct != null) update.seasonHitPct = hitPct;
        }
      } else {
        const logs = await getLogs(playerName, season);
        if (logs.length > 0) {
          const hitPct = calculateHitPct(logs, propNorm, prop.line ?? 0, prop.overUnder, week, gameDate);
          if (hitPct != null) update.seasonHitPct = hitPct;
        }
      }
    }

    const oppRank = update.opponentRank ?? prop.opponentRank;
    const oppAvg  = update.opponentAvgVsStat ?? prop.opponentAvgVsStat;
    if (oppRank != null && oppAvg != null) {
      const best = pickBestOdds(prop.fdOdds, prop.dkOdds);
      Object.assign(update, computeScoring({ playerAvg: comboAvg, opponentRank: oppRank, opponentAvgVsStat: oppAvg, line: prop.line ?? 0, seasonHitPct: update.seasonHitPct ?? prop.seasonHitPct ?? null, odds: best.odds, propNorm }));
      if (best.odds != null) { update.bestOdds = best.odds; update.bestBook = best.book ?? undefined; }
    }

    updates.push({ id: prop.id, season, week, data: update });
    pass2++;
  }
  console.log(`✅ Pass 2: ${pass2} combo props queued`);
  if (updates.length > 0) await updateProps(updates);
  console.log(`\n✅ Enrichment complete: ${updates.length} props updated`);
  return updates.length;
}

// ─────────────────────────────────────────────────────────────────────────────
// enrichAllPropsCollection — fills allProps_{season}
// ─────────────────────────────────────────────────────────────────────────────
export interface EnrichAllOptions {
  season:        number;
  week?:         number;
  skipEnriched?: boolean;
}

export async function enrichAllPropsCollection({ season, week, skipEnriched }: EnrichAllOptions) {
  console.log("📍 enrichAllPropsCollection called with:", { season, week, skipEnriched });
  try {
    const colName = `allProps_${season}`;
    console.log(`📡 Fetching from: ${colName}`);
    if (!db) { console.error("❌ DB undefined"); return 0; }

    const query = week ? db.collection(colName).where('week', '==', week) : db.collection(colName);
    const snapshot = await query.get();
    console.log(`📸 Snapshot received. Size: ${snapshot.size}`);
    if (snapshot.empty) return 0;

    const props = snapshot.docs.map(d => {
      const r = d.data() as Record<string, any>;
      const pick = (...keys: string[]) => { for (const k of keys) { const v = r[k]; if (v != null && v !== '') return v; } return null; };
      return {
        id:                d.id,
        player:            pick('Player', 'player')                        ?? '',
        prop:              pick('Prop', 'prop')                            ?? '',
        line:              pick('Line', 'line')                            ?? 0,
        team:              pick('Team', 'team')                            ?? '',
        matchup:           pick('Matchup', 'matchup')                      ?? '',
        week:              pick('Week', 'week'),
        season:            pick('Season', 'season'),
        overUnder:         pick('Over/Under?', 'Over/Under', 'overUnder', 'over under', 'overunder', 'Over Under')  ?? '',
        fdOdds:            pick('FdOdds', 'fdOdds'),
        dkOdds:            pick('DkOdds', 'dkOdds'),
        playerAvg:         pick('Player Avg', 'playerAvg'),
        opponentRank:      pick('Opponent Rank', 'opponentRank'),
        opponentAvgVsStat: pick('Opponent Avg vs Stat', 'opponentAvgVsStat'),
        seasonHitPct:      pick('Season Hit %', 'seasonHitPct'),
        confidenceScore:   pick('Confidence Score', 'confidenceScore'),
        gameDate:          pick('Game Date', 'gameDate')                   ?? '',
      } as NFLProp & { id: string };
    });

    console.log(`📋 ${props.length} props loaded from allProps_${season}`);
    if (!props.length) return 0;

    console.log(`🛡️  Fetching defense stats for season ${season}...`);
    const defenseMap = await fetchAllDefenseStats(season);
    const [pfrIdMap, playerTeamMap] = await Promise.all([getPfrIdMap(), getPlayerTeamMap()]);

    const pfrCache = new Map<string, any[]>();
    async function getLogs(playerName: string, pfrSeason: number) {
      const cacheKey = `${playerName}::${pfrSeason}`;
      if (pfrCache.has(cacheKey)) return pfrCache.get(cacheKey)!;
      const pfrId = await getPfrId(playerName, pfrIdMap);
      if (!pfrId) { pfrCache.set(cacheKey, []); return []; }
      if (!pfrIdMap[playerName]) { pfrIdMap[playerName] = pfrId; await savePfrId(playerName, pfrId); }
      const logs = await fetchSeasonLog(playerName, pfrId, pfrSeason);
      pfrCache.set(cacheKey, logs);
      return logs;
    }

    const updates: Array<{ id: string; data: Partial<NFLProp> }> = [];
    const playerAvgCache = new Map<string, Record<string, number>>();
    const defCache       = new Map<string, Record<string, { rank: number; avg: number }>>();
    let skipped = 0;

    console.log('\n📊 Pass 1: Standard props...');

    for (const prop of props) {
      if (!prop.id) continue;
      const w             = prop.week ?? week ?? 10;
      const propNorm      = normalizeProp(prop.prop ?? '');
      const gameDate      = prop.gameDate || undefined;
      const isEarlySeason = w <= 3;
      const priorSeason   = season - 1;

      if (propNorm.includes('+')) continue;

      const needsAvg   = prop.playerAvg == null;
      const needsDef   = prop.opponentRank == null || prop.opponentAvgVsStat == null;
      const needsHit   = prop.seasonHitPct == null;
      const needsScore = prop.confidenceScore == null;

      if (skipEnriched && !needsAvg && !needsDef && !needsHit && !needsScore) { skipped++; continue; }

      const update: Partial<NFLProp> = {};
      const playerName = prop.player ?? '';

      if (!prop.team && playerName) {
        const t = playerTeamMap[normalizePlayerName(playerName)];
        if (t) update.team = t;
      }

      // 1. Player average — with rookie fallback
      if (needsAvg || !skipEnriched) {
        let avg: number;
        if (isEarlySeason) {
          const priorAvg = await getPlayerSeasonAvg(playerName, propNorm, priorSeason);
          if (priorAvg != null) {
            avg = priorAvg;
          } else {
            // Rookie/new player — try current season logs
            const currentLogs = await getLogs(playerName, season);
            avg = currentLogs.length > 0 ? calculateAvg(currentLogs, propNorm, w, gameDate) : 0;
          }
        } else {
          const logs = await getLogs(playerName, season);
          avg = calculateAvg(logs, propNorm, w, gameDate);
        }
        update.playerAvg = avg;
        if (!playerAvgCache.has(playerName)) playerAvgCache.set(playerName, {});
        playerAvgCache.get(playerName)![propNorm] = avg;
      } else {
        if (!playerAvgCache.has(playerName)) playerAvgCache.set(playerName, {});
        playerAvgCache.get(playerName)![propNorm] = prop.playerAvg!;
      }

      // 2. Season hit %
      if ((needsHit || !skipEnriched) && prop.overUnder) {
        if (isEarlySeason) {
          const priorLogs = await getLogs(playerName, priorSeason);
          const logsToUse = priorLogs.length > 0 ? priorLogs : await getLogs(playerName, season);
          if (logsToUse.length > 0) {
            const hitPct = priorLogs.length > 0
              ? calculateHitPct(logsToUse, propNorm, prop.line ?? 0, prop.overUnder)
              : calculateHitPct(logsToUse, propNorm, prop.line ?? 0, prop.overUnder, w, gameDate);
            if (hitPct != null) update.seasonHitPct = hitPct;
          }
        } else {
          const logs = await getLogs(playerName, season);
          if (logs.length > 0) {
            const hitPct = calculateHitPct(logs, propNorm, prop.line ?? 0, prop.overUnder, w, gameDate);
            if (hitPct != null) update.seasonHitPct = hitPct;
          }
        }
      }

      // 3. Defense stats
      if (needsDef || !skipEnriched) {
        const team = update.team ?? prop.team ?? '';
        if (team && prop.matchup) {
          const opponent = getOpponent(team, prop.matchup);
          if (opponent) {
            const def = isEarlySeason
              ? await getTeamDefenseStats(opponent, propNorm, priorSeason)
              : lookupDefenseStats(defenseMap, propNorm, opponent);
            if (def) {
              update.opponentRank      = def.rank;
              update.opponentAvgVsStat = def.avg;
              if (!defCache.has(team)) defCache.set(team, {});
              defCache.get(team)![propNorm] = def;
            }
          }
        }
      }

      // 4. Scoring — runs as long as defense is available (avg=0 is ok)
      if (needsScore || !skipEnriched) {
        const pAvg    = (update.playerAvg ?? prop.playerAvg) ?? 0;
        const oppRank = update.opponentRank ?? prop.opponentRank;
        const oppAvg  = update.opponentAvgVsStat ?? prop.opponentAvgVsStat;
        if (oppRank != null && oppAvg != null) {
          const best = pickBestOdds(prop.fdOdds, prop.dkOdds);
          Object.assign(update, computeScoring({ playerAvg: pAvg, opponentRank: oppRank, opponentAvgVsStat: oppAvg, line: prop.line ?? 0, seasonHitPct: update.seasonHitPct ?? prop.seasonHitPct ?? null, odds: best.odds, propNorm }));
          if (best.odds != null) { update.bestOdds = best.odds; update.bestBook = best.book ?? undefined; }
        }
      }

      if (Object.keys(update).length > 0) updates.push({ id: prop.id, data: update });
    }

    console.log(`✅ Pass 1 queued: ${updates.length}`);
    console.log('\n📊 Pass 2: Combo props...');
    let pass2 = 0;

    for (const prop of props) {
      if (!prop.id) continue;
      const propNorm = normalizeProp(prop.prop ?? '');
      if (!propNorm.includes('+')) continue;
      if (skipEnriched && prop.playerAvg != null && prop.confidenceScore != null) continue;

      const w             = prop.week ?? week ?? 10;
      const components    = splitComboProp(propNorm);
      const playerName    = prop.player ?? '';
      const playerAvgs    = playerAvgCache.get(playerName);
      const gameDate      = prop.gameDate || undefined;
      const isEarlySeason = w <= 3;
      const priorSeason   = season - 1;

      if (!components || !playerAvgs || !components.every(c => playerAvgs[c] !== undefined)) continue;

      const update: Partial<NFLProp> = {};
      const comboAvg = Math.round(components.reduce((s, c) => s + (playerAvgs[c] ?? 0), 0) * 10) / 10;
      update.playerAvg = comboAvg;

      const team    = prop.team ?? '';
      const teamDef = defCache.get(team);
      if (teamDef) {
        const compDefs = components.map(c => teamDef[c]).filter(Boolean);
        if (compDefs.length === components.length) {
          update.opponentRank      = Math.ceil(compDefs.reduce((s, d) => s + d.rank, 0) / compDefs.length);
          update.opponentAvgVsStat = Math.round(compDefs.reduce((s, d) => s + d.avg, 0) * 10) / 10;
        }
      }
      if (update.opponentRank == null && team && prop.matchup) {
        const opponent = getOpponent(team, prop.matchup);
        if (opponent) {
          const def = lookupComboDefenseStats(defenseMap, propNorm, opponent);
          if (def) { update.opponentRank = def.rank; update.opponentAvgVsStat = def.avg; }
        }
      }

      if (prop.overUnder) {
        if (isEarlySeason) {
          const priorLogs = await getLogs(playerName, priorSeason);
          const logsToUse = priorLogs.length > 0 ? priorLogs : await getLogs(playerName, season);
          if (logsToUse.length > 0) {
            const hitPct = priorLogs.length > 0
              ? calculateHitPct(logsToUse, propNorm, prop.line ?? 0, prop.overUnder)
              : calculateHitPct(logsToUse, propNorm, prop.line ?? 0, prop.overUnder, w, gameDate);
            if (hitPct != null) update.seasonHitPct = hitPct;
          }
        } else {
          const logs = await getLogs(playerName, season);
          if (logs.length > 0) {
            const hitPct = calculateHitPct(logs, propNorm, prop.line ?? 0, prop.overUnder, w, gameDate);
            if (hitPct != null) update.seasonHitPct = hitPct;
          }
        }
      }

      const oppRank = update.opponentRank ?? prop.opponentRank;
      const oppAvg  = update.opponentAvgVsStat ?? prop.opponentAvgVsStat;
      if (oppRank != null && oppAvg != null) {
        const best = pickBestOdds(prop.fdOdds, prop.dkOdds);
        Object.assign(update, computeScoring({ playerAvg: comboAvg, opponentRank: oppRank, opponentAvgVsStat: oppAvg, line: prop.line ?? 0, seasonHitPct: update.seasonHitPct ?? prop.seasonHitPct ?? null, odds: best.odds, propNorm }));
        if (best.odds != null) { update.bestOdds = best.odds; update.bestBook = best.book ?? undefined; }
      }

      updates.push({ id: prop.id, data: update });
      pass2++;
    }

    console.log(`✅ Pass 2 queued: ${pass2} combo props`);
    console.log(`   Skipped (already enriched): ${skipped}`);
    if (updates.length > 0) await updateAllProps(season, updates);
    console.log(`\n✅ allProps enrichment complete: ${updates.length} props updated`);
    return updates.length;

  } catch (e) {
    console.error("❌ CRASH inside enrichAllPropsCollection:", e);
    throw e;
  }
}