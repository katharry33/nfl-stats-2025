// src/lib/enrichment/enrichProps.ts
// Main enrichment orchestrator

import type { NFLProp, DefenseMap } from './types';
import { normalizeProp, getOpponent, normalizePlayerName, splitComboProp } from './normalize';
import { fetchSeasonLog, getPfrId, calculateAvg, calculateHitPct } from './pfr';
import { fetchAllDefenseStats, lookupDefenseStats, lookupComboDefenseStats } from './defense';
import { computeScoring, pickBestOdds } from './scoring';
import { getPropsForWeek, updateProps, getPfrIdMap, savePfrId, getPlayerTeamMap } from './firestore';

export interface EnrichOptions {
  week: number;
  season: number;
  skipEnriched?: boolean; // skip rows already having playerAvg
}

export async function enrichPropsForWeek(options: EnrichOptions): Promise<number> {
  const { week, season, skipEnriched = true } = options;
  const seasonToUse = week <= 3 ? season - 1 : season;

  console.log(`\n🏈 Enriching Week ${week} (season ${season}, using PFR season ${seasonToUse})`);

  const [props, pfrIdMap, playerTeamMap, defenseMap] = await Promise.all([
    getPropsForWeek(season, week),
    getPfrIdMap(),
    getPlayerTeamMap(),
    fetchAllDefenseStats(seasonToUse),
  ]);

  console.log(`📋 ${props.length} props | 🛡️ ${Object.keys(defenseMap).length} defense entries`);
  if (!props.length) return 0;

  // PFR logs cache (one fetch per unique player)
  const pfrCache = new Map<string, Awaited<ReturnType<typeof fetchSeasonLog>>>();

  async function getLogs(playerName: string) {
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

  // Track standard prop averages per player so combo pass can sum them
  const playerAvgCache = new Map<string, Record<string, number>>();

  // ── Pass 1: Standard props ──────────────────────────────────────────────
  for (const prop of props) {
    if (!prop.id) continue;
    if (skipEnriched && prop.playerAvg != null) continue;

    const propNorm = normalizeProp(prop.prop);
    if (propNorm.includes('+')) continue;

    const update: Partial<NFLProp> = {};

    // Team resolution from player-team map
    if (!prop.team && prop.player) {
      const team = playerTeamMap[normalizePlayerName(prop.player)];
      if (team) update.team = team;
    }

    // Player average
    const logs = await getLogs(prop.player);
    const avg = calculateAvg(logs, propNorm, week);
    update.playerAvg = avg;

    if (!playerAvgCache.has(prop.player)) playerAvgCache.set(prop.player, {});
    playerAvgCache.get(prop.player)![propNorm] = avg;

    // Season hit %
    if (prop.overUnder) {
      const hitPct = calculateHitPct(logs, propNorm, prop.line, prop.overUnder, week);
      if (hitPct !== null) update.seasonHitPct = hitPct;
    }

    // Defense stats
    const team = update.team ?? prop.team;
    if (team && prop.matchup) {
      const opponent = getOpponent(team, prop.matchup);
      if (opponent) {
        const def = lookupDefenseStats(defenseMap, propNorm, opponent);
        if (def) { update.opponentRank = def.rank; update.opponentAvgVsStat = def.avg; }
      }
    }

    // Scoring model
    if (update.playerAvg != null && update.opponentRank != null && update.opponentAvgVsStat != null) {
      const best = pickBestOdds(prop.fdOdds, prop.dkOdds);
      const scoring = computeScoring({
        playerAvg: update.playerAvg,
        opponentRank: update.opponentRank,
        opponentAvgVsStat: update.opponentAvgVsStat,
        line: prop.line,
        seasonHitPct: update.seasonHitPct ?? prop.seasonHitPct ?? null,
        odds: best.odds,
        propNorm,
      });
      Object.assign(update, scoring);
      if (best.odds !== null) { update.bestOdds = best.odds; update.bestBook = best.book; }
    }

    if (Object.keys(update).length > 0) {
      updates.push({ id: prop.id, season, week, data: update });
    }
  }

  console.log(`✅ Pass 1 (standard): ${updates.length} queued`);

  // ── Pass 2: Combo props ─────────────────────────────────────────────────
  let comboCount = 0;

  for (const prop of props) {
    if (!prop.id) continue;
    const propNorm = normalizeProp(prop.prop);
    if (!propNorm.includes('+')) continue;
    if (skipEnriched && prop.playerAvg != null) continue;

    const components = splitComboProp(propNorm);
    if (!components) continue;

    const playerAvgs = playerAvgCache.get(prop.player);
    if (!playerAvgs || !components.every(c => playerAvgs[c] !== undefined)) continue;

    const comboAvg = Math.round(components.reduce((s, c) => s + playerAvgs[c], 0) * 10) / 10;
    const update: Partial<NFLProp> = { playerAvg: comboAvg };

    const team = prop.team;
    if (team && prop.matchup) {
      const opponent = getOpponent(team, prop.matchup);
      if (opponent) {
        const def = lookupComboDefenseStats(defenseMap, propNorm, opponent);
        if (def) { update.opponentRank = def.rank; update.opponentAvgVsStat = def.avg; }
      }
    }

    const logs = await getLogs(prop.player);
    if (prop.overUnder && logs.length > 0) {
      const hitPct = calculateHitPct(logs, propNorm, prop.line, prop.overUnder, week);
      if (hitPct !== null) update.seasonHitPct = hitPct;
    }

    if (update.playerAvg != null && update.opponentRank != null && update.opponentAvgVsStat != null) {
      const best = pickBestOdds(prop.fdOdds, prop.dkOdds);
      Object.assign(update, computeScoring({
        playerAvg: update.playerAvg,
        opponentRank: update.opponentRank,
        opponentAvgVsStat: update.opponentAvgVsStat,
        line: prop.line,
        seasonHitPct: update.seasonHitPct ?? null,
        odds: best.odds,
        propNorm,
      }));
    }

    updates.push({ id: prop.id, season, week, data: update });
    comboCount++;
  }

  console.log(`✅ Pass 2 (combos): ${comboCount} queued`);

  if (updates.length > 0) await updateProps(updates);

  console.log(`\n✅ Done: ${updates.length} props enriched`);
  return updates.length;
}