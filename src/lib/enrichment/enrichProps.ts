console.log("📍 enrichProps.ts module loaded");

import type { NFLProp } from './types';
import { db } from '@/lib/firebase/admin';
import { normalizeProp, getOpponent, normalizePlayerName, splitComboProp } from './normalize';
import { fetchSeasonLog, getPfrId, calculateAvg, calculateHitPct } from './pfr';
import { fetchAllDefenseStats, lookupDefenseStats, lookupComboDefenseStats } from './defense';
import { computeScoring, pickBestOdds } from './scoring';
import { getPropsForWeek, updateProps, getPfrIdMap, savePfrId, getPlayerTeamMap, updateAllProps } from './firestore';

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
  const seasonToUse = week <= 3 ? season - 1 : season;

  console.log(`\n🏈 Enriching Week ${week} (season ${season}, PFR season ${seasonToUse})`);
  console.log('='.repeat(55));

  const [props, pfrIdMap, playerTeamMap, defenseMap] = await Promise.all([
    getPropsForWeek(season, week),
    getPfrIdMap(),
    getPlayerTeamMap(),
    fetchAllDefenseStats(seasonToUse),
  ]);

  console.log(`📋 ${props.length} props | 🛡️ ${Object.keys(defenseMap).length} defense entries`);
  if (!props.length) return 0;

  const pfrCache = new Map<string, any[]>();

  async function getLogs(playerName: string) {
    if (!playerName) return [];
    if (pfrCache.has(playerName)) return pfrCache.get(playerName)!;
    const pfrId = await getPfrId(playerName, pfrIdMap);
    if (!pfrId) { pfrCache.set(playerName, []); return []; }
    if (!pfrIdMap[playerName]) {
      pfrIdMap[playerName] = pfrId;
      await savePfrId(playerName, pfrId);
    }
    const logs = await fetchSeasonLog(playerName, pfrId, seasonToUse);
    pfrCache.set(playerName, logs);
    return logs;
  }

  const updates: Array<{ id: string; season: number; week: number; data: Partial<NFLProp> }> = [];
  const playerAvgCache = new Map<string, Record<string, number>>();
  const defCache = new Map<string, Record<string, { rank: number; avg: number }>>();

  // ── PASS 1: Standard props ─────────────────────────────────────────────────
  console.log('\n📊 Pass 1: Standard props...');
  let pass1 = 0;

  for (const prop of props) {
    if (!prop.id) continue;
    if (skipEnriched && prop.playerAvg != null) continue;

    const propNorm = normalizeProp(prop.prop ?? '');
    if (propNorm.includes('+')) continue;

    const update: Partial<NFLProp> = {};
    const playerName = prop.player ?? '';
    const gameDate   = prop.gameDate || undefined; // "YYYY-MM-DD" or undefined

    // Team resolution
    if (!prop.team && playerName) {
      const t = playerTeamMap[normalizePlayerName(playerName)];
      if (t) update.team = t;
    }

    // 1. Player average — use game date for accurate cutoff
    const logs = await getLogs(playerName);
    const avg  = calculateAvg(logs, propNorm, week, gameDate);
    update.playerAvg = avg;
    if (!playerAvgCache.has(playerName)) playerAvgCache.set(playerName, {});
    playerAvgCache.get(playerName)![propNorm] = avg;

    // 2. Defense stats
    const team = update.team ?? prop.team ?? '';
    if (team && prop.matchup) {
      const opponent = getOpponent(team, prop.matchup);
      if (opponent) {
        const def = lookupDefenseStats(defenseMap, propNorm, opponent);
        if (def) {
          update.opponentRank      = def.rank;
          update.opponentAvgVsStat = def.avg;
          if (!defCache.has(team)) defCache.set(team, {});
          defCache.get(team)![propNorm] = def;
        }
      }
    }

    // 3. Season hit % — games before this prop's game date
    if (prop.overUnder && logs.length > 0) {
      const hitPct = calculateHitPct(logs, propNorm, prop.line ?? 0, prop.overUnder, week, gameDate);
      if (hitPct != null) update.seasonHitPct = hitPct;
    }

    // 4. Scoring formulas
    const pAvg    = update.playerAvg;
    const oppRank = update.opponentRank ?? prop.opponentRank;
    const oppAvg  = update.opponentAvgVsStat ?? prop.opponentAvgVsStat;

    if (pAvg != null && oppRank != null && oppAvg != null) {
      const best    = pickBestOdds(prop.fdOdds, prop.dkOdds);
      const scoring = computeScoring({
        playerAvg:         pAvg,
        opponentRank:      oppRank,
        opponentAvgVsStat: oppAvg,
        line:              prop.line ?? 0,
        seasonHitPct:      update.seasonHitPct ?? prop.seasonHitPct ?? null,
        odds:              best.odds,
        propNorm,
      });
      Object.assign(update, scoring);
      if (best.odds != null) {
        update.bestOdds = best.odds;
        update.bestBook = best.book ?? undefined;
      }
    } else {
      console.log(`  ⚠️  ${playerName} ${propNorm}: missing ${[
        pAvg    == null ? 'playerAvg'         : null,
        oppRank == null ? 'opponentRank'      : null,
        oppAvg  == null ? 'opponentAvgVsStat' : null,
      ].filter(Boolean).join(', ')} — skipping scoring`);
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

    const components = splitComboProp(propNorm);
    const playerName = prop.player ?? '';
    const playerAvgs = playerAvgCache.get(playerName);
    const gameDate   = prop.gameDate || undefined;

    if (!components || !playerAvgs || !components.every(c => playerAvgs[c] !== undefined)) {
      console.log(`  ⚠️  Combo skip ${playerName} ${propNorm}: missing component averages`);
      continue;
    }

    const update: Partial<NFLProp> = {};

    // 1. Combo avg
    const comboAvg = Math.round(
      components.reduce((s, c) => s + (playerAvgs[c] ?? 0), 0) * 10
    ) / 10;
    update.playerAvg = comboAvg;

    // 2. Combo defense — average rank/avg across components from cache
    const team    = prop.team ?? '';
    const teamDef = defCache.get(team);
    if (teamDef) {
      const compDefs = components.map(c => teamDef[c]).filter(Boolean);
      if (compDefs.length === components.length) {
        update.opponentRank      = Math.ceil(compDefs.reduce((s, d) => s + d.rank, 0) / compDefs.length);
        update.opponentAvgVsStat = Math.round(compDefs.reduce((s, d) => s + d.avg, 0) * 10) / 10;
      }
    }

    // Fallback: combo lookup
    if (update.opponentRank == null && team && prop.matchup) {
      const opponent = getOpponent(team, prop.matchup);
      if (opponent) {
        const def = lookupComboDefenseStats(defenseMap, propNorm, opponent);
        if (def) { update.opponentRank = def.rank; update.opponentAvgVsStat = def.avg; }
      }
    }

    // 3. Season hit %
    const logs = await getLogs(playerName);
    if (prop.overUnder && logs.length > 0) {
      const hitPct = calculateHitPct(logs, propNorm, prop.line ?? 0, prop.overUnder, week, gameDate);
      if (hitPct != null) update.seasonHitPct = hitPct;
    }

    // 4. Scoring formulas
    const oppRank = update.opponentRank ?? prop.opponentRank;
    const oppAvg  = update.opponentAvgVsStat ?? prop.opponentAvgVsStat;

    if (comboAvg != null && oppRank != null && oppAvg != null) {
      const best    = pickBestOdds(prop.fdOdds, prop.dkOdds);
      const scoring = computeScoring({
        playerAvg:         comboAvg,
        opponentRank:      oppRank,
        opponentAvgVsStat: oppAvg,
        line:              prop.line ?? 0,
        seasonHitPct:      update.seasonHitPct ?? prop.seasonHitPct ?? null,
        odds:              best.odds,
        propNorm,
      });
      Object.assign(update, scoring);
      if (best.odds != null) {
        update.bestOdds = best.odds;
        update.bestBook = best.book ?? undefined;
      }
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
// enrichAllPropsCollection — fills missing fields in allProps_{season}
// Called by: tsx scripts/enrich.ts --all [--week=14] [--force]
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

    if (!db) {
      console.error("❌ DB is undefined inside enrichAllPropsCollection");
      return 0;
    }

    const query = week
      ? db.collection(colName).where('week', '==', week)
      : db.collection(colName);

    const snapshot = await query.get();
    console.log(`📸 Snapshot received. Size: ${snapshot.size}`);
    if (snapshot.empty) return 0;

    // Normalize raw Firestore docs (handles both PascalCase and camelCase fields)
    const props = snapshot.docs.map(d => {
      const r = d.data() as Record<string, any>;
      const pick = (...keys: string[]) => {
        for (const k of keys) {
          const v = r[k];
          if (v != null && v !== '') return v;
        }
        return null;
      };
      return {
        id:                d.id,
        player:            pick('Player', 'player')                         ?? '',
        prop:              pick('Prop', 'prop')                             ?? '',
        line:              pick('Line', 'line')                             ?? 0,
        team:              pick('Team', 'team')                             ?? '',
        matchup:           pick('Matchup', 'matchup')                       ?? '',
        week:              pick('Week', 'week'),
        season:            pick('Season', 'season'),
        overUnder:         pick('Over/Under?', 'Over/Under', 'overUnder')   ?? '',
        fdOdds:            pick('FdOdds', 'fdOdds'),
        dkOdds:            pick('DkOdds', 'dkOdds'),
        playerAvg:         pick('Player Avg', 'playerAvg'),
        opponentRank:      pick('Opponent Rank', 'opponentRank'),
        opponentAvgVsStat: pick('Opponent Avg vs Stat', 'opponentAvgVsStat'),
        seasonHitPct:      pick('Season Hit %', 'seasonHitPct'),
        confidenceScore:   pick('Confidence Score', 'confidenceScore'),
        gameDate:          pick('Game Date', 'gameDate')                    ?? '',
      } as NFLProp & { id: string };
    });

    console.log(`📋 ${props.length} props loaded from allProps_${season}`);
    if (!props.length) return 0;

    // Determine which PFR seasons are needed
    const seasonsNeeded = new Set(
      props.map(p => {
        const w = p.week ?? week ?? 10;
        return w <= 3 ? season - 1 : season;
      })
    );

    // Fetch defense maps per season
    const defenseMaps = new Map<number, DefenseMap>();
    for (const s of seasonsNeeded) {
      console.log(`🛡️  Fetching defense stats for season ${s}...`);
      defenseMaps.set(s, await fetchAllDefenseStats(s));
    }

    const [pfrIdMap, playerTeamMap] = await Promise.all([getPfrIdMap(), getPlayerTeamMap()]);

    const pfrCache = new Map<string, any[]>();

    async function getLogs(playerName: string, pfrSeason: number) {
      const cacheKey = `${playerName}::${pfrSeason}`;
      if (pfrCache.has(cacheKey)) return pfrCache.get(cacheKey)!;
      const pfrId = await getPfrId(playerName, pfrIdMap);
      if (!pfrId) { pfrCache.set(cacheKey, []); return []; }
      if (!pfrIdMap[playerName]) {
        pfrIdMap[playerName] = pfrId;
        await savePfrId(playerName, pfrId);
      }
      const logs = await fetchSeasonLog(playerName, pfrId, pfrSeason);
      pfrCache.set(cacheKey, logs);
      return logs;
    }

    const updates: Array<{ id: string; data: Partial<NFLProp> }> = [];
    const playerAvgCache = new Map<string, Record<string, number>>();
    let skipped = 0;

    // ── PASS 1: Standard props ───────────────────────────────────────────────
    console.log('\n📊 Pass 1: Standard props...');

    for (const prop of props) {
      if (!prop.id) continue;

      const w         = prop.week ?? week ?? 10;
      const pfrSeason = w <= 3 ? season - 1 : season;
      const defMap    = defenseMaps.get(pfrSeason)!;
      const propNorm  = normalizeProp(prop.prop ?? '');
      const gameDate  = prop.gameDate || undefined;

      if (propNorm.includes('+')) continue;

      const needsAvg   = prop.playerAvg == null;
      const needsDef   = prop.opponentRank == null || prop.opponentAvgVsStat == null;
      const needsHit   = prop.seasonHitPct == null;
      const needsScore = prop.confidenceScore == null;

      if (skipEnriched && !needsAvg && !needsDef && !needsHit && !needsScore) {
        skipped++;
        continue;
      }

      const update: Partial<NFLProp> = {};
      const playerName = prop.player ?? '';

      // Team
      if (!prop.team && playerName) {
        const t = playerTeamMap[normalizePlayerName(playerName)];
        if (t) update.team = t;
      }

      // 1. Player average — filtered by game date for accuracy
      if (needsAvg || !skipEnriched) {
        const logs = await getLogs(playerName, pfrSeason);
        const avg  = calculateAvg(logs, propNorm, w, gameDate);
        update.playerAvg = avg;
        if (!playerAvgCache.has(playerName)) playerAvgCache.set(playerName, {});
        playerAvgCache.get(playerName)![propNorm] = avg;

        // Season hit %
        if ((needsHit || !skipEnriched) && prop.overUnder && logs.length > 0) {
          const hitPct = calculateHitPct(logs, propNorm, prop.line ?? 0, prop.overUnder, w, gameDate);
          if (hitPct != null) update.seasonHitPct = hitPct;
        }
      } else {
        // Cache existing avg for combo pass
        if (!playerAvgCache.has(playerName)) playerAvgCache.set(playerName, {});
        playerAvgCache.get(playerName)![propNorm] = prop.playerAvg!;
      }

      // 2. Defense stats
      if (needsDef || !skipEnriched) {
        const team = update.team ?? prop.team ?? '';
        if (team && prop.matchup) {
          const opponent = getOpponent(team, prop.matchup);
          if (opponent) {
            const def = lookupDefenseStats(defMap, propNorm, opponent);
            if (def) {
              update.opponentRank      = def.rank;
              update.opponentAvgVsStat = def.avg;
            }
          }
        }
      }

      // 3. Scoring formulas
      if (needsScore || !skipEnriched) {
        const pAvg    = update.playerAvg    ?? prop.playerAvg;
        const oppRank = update.opponentRank ?? prop.opponentRank;
        const oppAvg  = update.opponentAvgVsStat ?? prop.opponentAvgVsStat;

        if (pAvg != null && oppRank != null && oppAvg != null) {
          const best    = pickBestOdds(prop.fdOdds, prop.dkOdds);
          const scoring = computeScoring({
            playerAvg:         pAvg,
            opponentRank:      oppRank,
            opponentAvgVsStat: oppAvg,
            line:              prop.line ?? 0,
            seasonHitPct:      update.seasonHitPct ?? prop.seasonHitPct ?? null,
            odds:              best.odds,
            propNorm,
          });
          Object.assign(update, scoring);
          if (best.odds != null) {
            update.bestOdds = best.odds;
            update.bestBook = best.book ?? undefined;
          }
        }
      }

      if (Object.keys(update).length > 0) updates.push({ id: prop.id, data: update });
    }

    console.log(`✅ Pass 1 queued: ${updates.length}`);

    // ── PASS 2: Combo props ──────────────────────────────────────────────────
    console.log('\n📊 Pass 2: Combo props...');
    let pass2 = 0;

    for (const prop of props) {
      if (!prop.id) continue;
      const propNorm = normalizeProp(prop.prop ?? '');
      if (!propNorm.includes('+')) continue;
      if (skipEnriched && prop.playerAvg != null && prop.confidenceScore != null) continue;

      const w          = prop.week ?? week ?? 10;
      const pfrSeason  = w <= 3 ? season - 1 : season;
      const defMap     = defenseMaps.get(pfrSeason)!;
      const components = splitComboProp(propNorm);
      const playerName = prop.player ?? '';
      const playerAvgs = playerAvgCache.get(playerName);
      const gameDate   = prop.gameDate || undefined;

      if (!components || !playerAvgs || !components.every(c => playerAvgs[c] !== undefined)) continue;

      const update: Partial<NFLProp> = {};
      const comboAvg = Math.round(
        components.reduce((s, c) => s + (playerAvgs[c] ?? 0), 0) * 10
      ) / 10;
      update.playerAvg = comboAvg;

      const team = prop.team ?? '';
      if (team && prop.matchup) {
        const opponent = getOpponent(team, prop.matchup);
        if (opponent) {
          const def = lookupComboDefenseStats(defMap, propNorm, opponent);
          if (def) { update.opponentRank = def.rank; update.opponentAvgVsStat = def.avg; }
        }
      }

      const logs = await getLogs(playerName, pfrSeason);
      if (prop.overUnder && logs.length > 0) {
        const hitPct = calculateHitPct(logs, propNorm, prop.line ?? 0, prop.overUnder, w, gameDate);
        if (hitPct != null) update.seasonHitPct = hitPct;
      }

      const oppRank = update.opponentRank ?? prop.opponentRank;
      const oppAvg  = update.opponentAvgVsStat ?? prop.opponentAvgVsStat;

      if (comboAvg != null && oppRank != null && oppAvg != null) {
        const best = pickBestOdds(prop.fdOdds, prop.dkOdds);
        Object.assign(update, computeScoring({
          playerAvg:         comboAvg,
          opponentRank:      oppRank,
          opponentAvgVsStat: oppAvg,
          line:              prop.line ?? 0,
          seasonHitPct:      update.seasonHitPct ?? prop.seasonHitPct ?? null,
          odds:              best.odds,
          propNorm,
        }));
        if (best.odds != null) {
          update.bestOdds = best.odds;
          update.bestBook = best.book ?? undefined;
        }
      }

      updates.push({ id: prop.id, data: update });
      pass2++;
    }

    console.log(`✅ Pass 2 queued: ${pass2} combo props`);
    console.log(`   Skipped (already enriched): ${skipped}`);

    if (updates.length > 0) {
      await updateAllProps(season, updates);
    }

    console.log(`\n✅ allProps enrichment complete: ${updates.length} props updated`);
    return updates.length;

  } catch (e) {
    console.error("❌ CRASH inside enrichAllPropsCollection:", e);
    throw e;
  }
}