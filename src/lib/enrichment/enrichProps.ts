#!/usr/bin/env tsx
// src/lib/enrichment/enrichProps.ts
// Pipeline: player avg → defense stats → hit % → scoring formulas

import type { NFLProp } from './types';
import { normalizeProp, getOpponent, normalizePlayerName, splitComboProp } from './normalize';
import { fetchSeasonLog, getPfrId, calculateAvg, calculateHitPct } from './pfr';
import { fetchAllDefenseStats, lookupDefenseStats, lookupComboDefenseStats } from './defense';
import { computeScoring, pickBestOdds } from './scoring';
import { getPropsForWeek, updateProps, getPfrIdMap, savePfrId, getPlayerTeamMap } from './firestore';

export type DefenseMap = Record<string, Record<string, { rank: number; avg: number }>>;

export interface EnrichOptions {
  week:          number;
  season:        number;
  skipEnriched?: boolean;
}

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
  // defense cache for combo pass
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

    // Team resolution
    if (!prop.team && playerName) {
      const t = playerTeamMap[normalizePlayerName(playerName)];
      if (t) update.team = t;
    }

    // 1. Player average
    const logs = await getLogs(playerName);
    const avg = calculateAvg(logs, propNorm, week);
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

    // 3. Season hit %
    if (prop.overUnder && logs.length > 0) {
      const hitPct = calculateHitPct(logs, propNorm, prop.line ?? 0, prop.overUnder, week);
      if (hitPct != null) update.seasonHitPct = hitPct;
    }

    // 4. Scoring formulas — only run when we have the required inputs
    const pAvg    = update.playerAvg;
    const oppRank = update.opponentRank ?? prop.opponentRank;
    const oppAvg  = update.opponentAvgVsStat ?? prop.opponentAvgVsStat;

    if (pAvg != null && oppRank != null && oppAvg != null) {
      const best = pickBestOdds(prop.fdOdds, prop.dkOdds);
      const scoring = computeScoring({
        playerAvg:          pAvg,
        opponentRank:       oppRank,
        opponentAvgVsStat:  oppAvg,
        line:               prop.line ?? 0,
        seasonHitPct:       update.seasonHitPct ?? prop.seasonHitPct ?? null,
        // pass null not 0 so scoring knows odds are missing vs. zero
        odds:               best.odds,
        propNorm,
      });
      Object.assign(update, scoring);
      if (best.odds != null) {
        update.bestOdds = best.odds;
        update.bestBook = best.book ?? undefined;
      }
    } else {
      console.log(`  ⚠️  ${playerName} ${propNorm}: missing ${[
        pAvg    == null ? 'playerAvg' : null,
        oppRank == null ? 'opponentRank' : null,
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
    const team = prop.team ?? '';
    const teamDef = defCache.get(team);
    if (teamDef) {
      const compDefs = components.map(c => teamDef[c]).filter(Boolean);
      if (compDefs.length === components.length) {
        update.opponentRank      = Math.ceil(compDefs.reduce((s, d) => s + d.rank, 0) / compDefs.length);
        update.opponentAvgVsStat = Math.round(compDefs.reduce((s, d) => s + d.avg, 0) * 10) / 10;
      }
    }

    // Also try TeamRankings combo lookup as fallback
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
      const hitPct = calculateHitPct(logs, propNorm, prop.line ?? 0, prop.overUnder, week);
      if (hitPct != null) update.seasonHitPct = hitPct;
    }

    // 4. Scoring formulas
    const oppRank = update.opponentRank ?? prop.opponentRank;
    const oppAvg  = update.opponentAvgVsStat ?? prop.opponentAvgVsStat;

    if (comboAvg != null && oppRank != null && oppAvg != null) {
      const best = pickBestOdds(prop.fdOdds, prop.dkOdds);
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

import { getAllProps, updateAllProps } from './firestore';

export interface EnrichAllOptions {
  season:        number;
  week?:         number;   // optional — filter to one week
  skipEnriched?: boolean;
}

export async function enrichAllPropsCollection(options: EnrichAllOptions): Promise<number> {
  const { season, week, skipEnriched = true } = options;
  const label = week ? `Week ${week}` : 'all weeks';

  console.log(`\n📚 Enriching allProps_${season} — ${label}`);
  console.log('='.repeat(55));

  // getAllProps reads from allProps_{season}, optionally filtered by week
  const props = await getAllProps(season, week ? { week } : {});
  console.log(`📋 ${props.length} props loaded from allProps_${season}`);
  if (!props.length) return 0;

  // Determine which PFR season to use per prop (week <= 3 → prior season)
  const seasonsNeeded = new Set(
    props.map(p => {
      const w = p.week ?? week ?? 10;
      return w <= 3 ? season - 1 : season;
    })
  );

  // Fetch defense maps for each required season
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

    const w = prop.week ?? week ?? 10;
    const pfrSeason = w <= 3 ? season - 1 : season;
    const defMap = defenseMaps.get(pfrSeason)!;
    const propNorm = normalizeProp(prop.prop ?? '');
    if (propNorm.includes('+')) continue;

    // Determine which fields are missing
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

    // 1. Player average
    if (needsAvg || !skipEnriched) {
      const logs = await getLogs(playerName, pfrSeason);
      const avg  = calculateAvg(logs, propNorm, w);
      update.playerAvg = avg;
      if (!playerAvgCache.has(playerName)) playerAvgCache.set(playerName, {});
      playerAvgCache.get(playerName)![propNorm] = avg;

      // Season hit %
      if ((needsHit || !skipEnriched) && prop.overUnder && logs.length > 0) {
        const hitPct = calculateHitPct(logs, propNorm, prop.line ?? 0, prop.overUnder, w);
        if (hitPct != null) update.seasonHitPct = hitPct;
      }
    } else {
      // Still cache existing avg for combo pass
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
          if (def) { update.opponentRank = def.rank; update.opponentAvgVsStat = def.avg; }
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
        if (best.odds != null) { update.bestOdds = best.odds; update.bestBook = best.book ?? undefined; }
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

    if (!components || !playerAvgs || !components.every(c => playerAvgs[c] !== undefined)) continue;

    const update: Partial<NFLProp> = {};
    const comboAvg = Math.round(components.reduce((s, c) => s + (playerAvgs[c] ?? 0), 0) * 10) / 10;
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
      const hitPct = calculateHitPct(logs, propNorm, prop.line ?? 0, prop.overUnder, w);
      if (hitPct != null) update.seasonHitPct = hitPct;
    }

    const oppRank = update.opponentRank ?? prop.opponentRank;
    const oppAvg  = update.opponentAvgVsStat ?? prop.opponentAvgVsStat;
    if (comboAvg != null && oppRank != null && oppAvg != null) {
      const best = pickBestOdds(prop.fdOdds, prop.dkOdds);
      Object.assign(update, computeScoring({
        playerAvg: comboAvg, opponentRank: oppRank, opponentAvgVsStat: oppAvg,
        line: prop.line ?? 0, seasonHitPct: update.seasonHitPct ?? prop.seasonHitPct ?? null,
        odds: best.odds, propNorm,
      }));
      if (best.odds != null) { update.bestOdds = best.odds; update.bestBook = best.book ?? undefined; }
    }

    updates.push({ id: prop.id, data: update });
    pass2++;
  }

  console.log(`✅ Pass 2 queued: ${pass2} combo props`);
  console.log(`   Skipped (already enriched): ${skipped}`);

  if (updates.length > 0) {
    // updateAllProps writes to allProps_{season} (not weeklyProps)
    await updateAllProps(season, updates);
  }

  console.log(`\n✅ allProps enrichment complete: ${updates.length} props updated`);
  return updates.length;
}
