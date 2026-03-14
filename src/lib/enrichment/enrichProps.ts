// src/lib/enrichment/enrichProps.ts
//
// Two public entry points:
//   enrichPropsForWeek()      → weeklyProps_{season}  (live TeamRankings defense)
//   enrichAllPropsCollection() → allProps_{season}     (static Firestore defense)
//
// Both delegate to runEnrichmentBatch() → enrichPropCore() / enrichComboPropCore()
// to eliminate the previous ~250-line duplication.

import type { NFLProp } from './types';
import { db } from '@/lib/firebase/admin';
import {
  normalizeProp, getOpponent, normalizePlayerName, splitComboProp,
} from './normalize';
import { fetchSeasonLog, getPfrId, calculateAvg, calculateHitPct } from './pfr';
import { fetchAllDefenseStats, lookupDefenseStats } from './defense';
import { computeScoring, pickBestOdds } from './scoring';
import {
  getPropsForWeek, updateProps, getPfrIdMap, savePfrId,
  getPlayerTeamMap, updateAllProps, getPlayerSeasonAvg, getTeamDefenseStats,
} from './firestore';
import type { PFRGame } from './types';

// ─── Shared types ─────────────────────────────────────────────────────────────

/** Normalised shape fed into the core enrichment helpers. */
interface PropInput {
  id:                 string;
  player:             string;
  prop:               string;
  /** Normalised prop string (e.g. "rush_yds", "rec_yds+rec") */
  propNorm:           string;
  line:               number;
  overUnder:          string;
  team:               string;
  matchup:            string;
  week:               number;
  season:             number;
  gameDate?:          string;
  fdOdds?:            number | null;
  dkOdds?:            number | null;
  // Existing values — used to decide whether to skip enrichment
  playerAvg?:         number | null;
  opponentRank?:      number | null;
  opponentAvgVsStat?: number | null;
  seasonHitPct?:      number | null;
  confidenceScore?:   number | null;
}

interface DefStat { rank: number; avg: number; }

/** Shared runtime context injected into core helpers. */
interface EnrichContext {
  /**
   * Fetch PFR game logs for (player, season).
   * Results are cached — safe to call multiple times.
   */
  getLogs:         (player: string, season: number) => Promise<PFRGame[]>;
  /**
   * Look up opponent defensive strength for (opponent, stat, season).
   * Weekly enrichment uses live TeamRankings; allProps uses static Firestore.
   */
  getDefense:      (opponent: string, stat: string, season: number) => Promise<DefStat | null>;
  playerTeamMap:   Record<string, string>;
  /** Accumulates per-player averages so combo-prop Pass 2 can read them. */
  playerAvgCache:  Map<string, Record<string, number>>;
  /** Accumulates per-team defense so combo-prop Pass 2 can read them. */
  defCache:        Map<string, Record<string, DefStat>>;
}

// ─── Core: single standard prop ───────────────────────────────────────────────

/**
 * Build the Firestore update object for one non-combo prop.
 * Returns null when nothing needs updating (all fields present + skipEnriched=true).
 */
async function enrichPropCore(
  prop:         PropInput,
  ctx:          EnrichContext,
  skipEnriched: boolean,
): Promise<Partial<NFLProp> | null> {
  const { getLogs, getDefense, playerTeamMap, playerAvgCache, defCache } = ctx;
  const { propNorm, player: playerName, week, season, gameDate } = prop;
  const isEarlySeason = week <= 3;
  const priorSeason   = season - 1;

  const needsAvg   = prop.playerAvg == null;
  const needsDef   = prop.opponentRank == null || prop.opponentAvgVsStat == null;
  const needsHit   = prop.seasonHitPct == null;
  const needsScore = prop.confidenceScore == null;

  if (skipEnriched && !needsAvg && !needsDef && !needsHit && !needsScore) return null;

  const update: Partial<NFLProp> = {};

  // ── 1. Team ──────────────────────────────────────────────────────────────
  if (!prop.team && playerName) {
    const t = playerTeamMap[normalizePlayerName(playerName)];
    if (t) update.team = t;
  }

  // ── 2. Player average ────────────────────────────────────────────────────
  if (needsAvg || !skipEnriched) {
    let avg: number | null = null;

    if (isEarlySeason) {
      // Prefer prior-season Firestore avg; fall back to current PFR logs (rookies)
      avg = await getPlayerSeasonAvg(playerName, propNorm, priorSeason);
      if (avg == null) {
        const logs = await getLogs(playerName, season);
        const c = logs.length > 0 ? calculateAvg(logs, propNorm, week, gameDate) : null;
        avg = c ?? null;
      }
    } else {
      const logs = await getLogs(playerName, season);
      const c    = calculateAvg(logs, propNorm, week, gameDate);
      avg = c > 0 ? c : logs.length > 0 ? c : null;
    }

    // Never overwrite with null/0 — missing data stays missing
    if (avg != null) update.playerAvg = avg;

    // Cache for Pass 2 (combo props) regardless of whether we wrote
    const cached = avg ?? prop.playerAvg ?? 0;
    if (!playerAvgCache.has(playerName)) playerAvgCache.set(playerName, {});
    playerAvgCache.get(playerName)![propNorm] = cached;
  } else {
    // Already enriched — just populate the cache
    if (!playerAvgCache.has(playerName)) playerAvgCache.set(playerName, {});
    playerAvgCache.get(playerName)![propNorm] = prop.playerAvg!;
  }

  // ── 3. Season hit % ──────────────────────────────────────────────────────
  if ((needsHit || !skipEnriched) && prop.overUnder) {
    const priorLogs   = isEarlySeason ? await getLogs(playerName, priorSeason) : [];
    const currentLogs = await getLogs(playerName, season);
    const logsToUse   = isEarlySeason
      ? (priorLogs.length > 0 ? priorLogs : currentLogs)
      : currentLogs;

    if (logsToUse.length > 0) {
      const usePriorStraight = isEarlySeason && priorLogs.length > 0;
      const hitPct = usePriorStraight
        ? calculateHitPct(logsToUse, propNorm, prop.line, prop.overUnder as 'Over' | 'Under')
        : calculateHitPct(logsToUse, propNorm, prop.line, prop.overUnder as 'Over' | 'Under', week, gameDate);

      // Only store genuinely computed values.
      // 0 almost always means "no qualifying games found" — treat as missing.
      if (hitPct != null && hitPct > 0) update.seasonHitPct = hitPct;
    }
  }

  // ── 4. Defense stats ─────────────────────────────────────────────────────
  if (needsDef || !skipEnriched) {
    const team     = (update.team ?? prop.team) || '';
    const opponent = team && prop.matchup ? getOpponent(team, prop.matchup) : null;

    if (opponent) {
      const defSeason = isEarlySeason ? priorSeason : season;
      const def       = await getDefense(opponent, propNorm, defSeason);
      if (def) {
        update.opponentRank      = def.rank;
        update.opponentAvgVsStat = def.avg;
        if (!defCache.has(team)) defCache.set(team, {});
        defCache.get(team)![propNorm] = def;
      }
    }
  }

  // ── 5. Scoring (EV, Kelly, confidence, etc.) ─────────────────────────────
  if (needsScore || !skipEnriched) {
    const pAvg    = (update.playerAvg ?? prop.playerAvg) ?? 0;
    const oppRank = update.opponentRank ?? prop.opponentRank;
    const oppAvg  = update.opponentAvgVsStat ?? prop.opponentAvgVsStat;

    if (oppRank != null && oppAvg != null) {
      const best = pickBestOdds(prop.fdOdds, prop.dkOdds);
      Object.assign(update, computeScoring({
        playerAvg:         pAvg,
        opponentRank:      oppRank,
        opponentAvgVsStat: oppAvg,
        line:              prop.line,
        seasonHitPct:      (update.seasonHitPct ?? prop.seasonHitPct) ?? null,
        odds:              best.odds,
        propNorm,
      }));
      if (best.odds != null) {
        update.bestOdds = best.odds;
        update.bestBook = best.book ?? undefined;
      }
    } else {
      console.log(`  ⚠️  ${playerName} ${propNorm}: scoring skipped — missing ${[
        oppRank == null ? 'opponentRank' : null,
        oppAvg  == null ? 'opponentAvg'  : null,
      ].filter(Boolean).join(', ')}`);
    }
  }

  return Object.keys(update).length > 0 ? update : null;
}

// ─── Core: combo prop (e.g. "rec_yds+rec") ────────────────────────────────────

async function enrichComboPropCore(
  prop:         PropInput,
  ctx:          EnrichContext,
  skipEnriched: boolean,
): Promise<Partial<NFLProp> | null> {
  const { playerAvgCache, defCache, getLogs, getDefense } = ctx;
  const { propNorm, player: playerName, week, season, gameDate } = prop;
  const isEarlySeason = week <= 3;
  const priorSeason   = season - 1;

  if (skipEnriched && prop.playerAvg != null && prop.confidenceScore != null) return null;

  const components = splitComboProp(propNorm);
  const playerAvgs = playerAvgCache.get(playerName);

  if (!components || !playerAvgs || !components.every(c => playerAvgs[c] !== undefined)) {
    console.log(`  ⚠️  Combo skip ${playerName} ${propNorm}: missing component averages`);
    return null;
  }

  const update: Partial<NFLProp> = {};
  const comboAvg = Math.round(
    components.reduce((s, c) => s + (playerAvgs[c] ?? 0), 0) * 10,
  ) / 10;
  update.playerAvg = comboAvg;

  // Defense — try the cached per-team stats first, then fall back to live lookup
  const team    = prop.team ?? '';
  const teamDef = defCache.get(team);
  if (teamDef) {
    const compDefs = components.map(c => teamDef[c]).filter(Boolean) as DefStat[];
    if (compDefs.length === components.length) {
      update.opponentRank      = Math.ceil(compDefs.reduce((s, d) => s + d.rank, 0) / compDefs.length);
      update.opponentAvgVsStat = Math.round(compDefs.reduce((s, d) => s + d.avg,  0) * 10) / 10;
    }
  }
  if (update.opponentRank == null && team && prop.matchup) {
    const opponent  = getOpponent(team, prop.matchup);
    const defSeason = isEarlySeason ? priorSeason : season;
    if (opponent) {
      const compDefs = await Promise.all(
        components.map(c => getDefense(opponent, c, defSeason)),
      );
      const valid = compDefs.filter(Boolean) as DefStat[];
      if (valid.length === components.length) {
        update.opponentRank      = Math.ceil(valid.reduce((s, d) => s + d.rank, 0) / valid.length);
        update.opponentAvgVsStat = Math.round(valid.reduce((s, d) => s + d.avg,  0) * 10) / 10;
      }
    }
  }

  // Season hit %
  if (prop.overUnder) {
    const priorLogs   = isEarlySeason ? await getLogs(playerName, priorSeason) : [];
    const currentLogs = await getLogs(playerName, season);
    const logsToUse   = isEarlySeason
      ? (priorLogs.length > 0 ? priorLogs : currentLogs)
      : currentLogs;

    if (logsToUse.length > 0) {
      const usePrior = isEarlySeason && priorLogs.length > 0;
      const hitPct   = usePrior
        ? calculateHitPct(logsToUse, propNorm, prop.line, prop.overUnder as 'Over' | 'Under')
        : calculateHitPct(logsToUse, propNorm, prop.line, prop.overUnder as 'Over' | 'Under', week, gameDate);
      if (hitPct != null && hitPct > 0) update.seasonHitPct = hitPct;
    }
  }

  // Scoring
  const oppRank = update.opponentRank ?? prop.opponentRank;
  const oppAvg  = update.opponentAvgVsStat ?? prop.opponentAvgVsStat;
  if (oppRank != null && oppAvg != null) {
    const best = pickBestOdds(prop.fdOdds, prop.dkOdds);
    Object.assign(update, computeScoring({
      playerAvg: comboAvg, opponentRank: oppRank, opponentAvgVsStat: oppAvg,
      line: prop.line, seasonHitPct: (update.seasonHitPct ?? prop.seasonHitPct) ?? null,
      odds: best.odds, propNorm,
    }));
    if (best.odds != null) { update.bestOdds = best.odds; update.bestBook = best.book ?? undefined; }
  }

  return Object.keys(update).length > 0 ? update : null;
}

// ─── Shared batch runner ──────────────────────────────────────────────────────

interface BatchOptions {
  rawProps:     (NFLProp & { id: string })[];
  /** Pre-loaded pfrId map; will be mutated with any new ids found. */
  pfrIdMap:     Record<string, string>;
  playerTeamMap:Record<string, string>;
  /**
   * Defense lookup abstraction.
   * weeklyProps:  lookupDefenseStats (in-memory TeamRankings map) + getTeamDefenseStats fallback
   * allProps:     getTeamDefenseStats (static Firestore)
   */
  getDefense:   (opp: string, stat: string, season: number) => Promise<DefStat | null>;
  skipEnriched: boolean;
  season:       number;
  /** Default week used when a prop has no week field (allProps backfill only). */
  defaultWeek?: number;
  /** Write the batch of updates to Firestore. */
  writeUpdates: (updates: Array<{ id: string; data: Partial<NFLProp> }>) => Promise<void>;
}

async function runEnrichmentBatch(opts: BatchOptions): Promise<number> {
  const {
    rawProps, pfrIdMap, playerTeamMap, getDefense,
    skipEnriched, season, defaultWeek = 10, writeUpdates,
  } = opts;

  const pfrCache       = new Map<string, PFRGame[]>();
  const playerAvgCache = new Map<string, Record<string, number>>();
  const defCache       = new Map<string, Record<string, DefStat>>();

  async function getLogs(playerName: string, pfrSeason: number): Promise<PFRGame[]> {
    const key = `${playerName}::${pfrSeason}`;
    if (pfrCache.has(key)) return pfrCache.get(key)!;
    const pfrId = await getPfrId(playerName, pfrIdMap);
    if (!pfrId) { pfrCache.set(key, []); return []; }
    if (!pfrIdMap[playerName]) {
      pfrIdMap[playerName] = pfrId;
      await savePfrId(playerName, pfrId);
    }
    const logs = await fetchSeasonLog(playerName, pfrId, pfrSeason);
    pfrCache.set(key, logs);
    return logs;
  }

  const ctx: EnrichContext = { getLogs, getDefense, playerTeamMap, playerAvgCache, defCache };
  const updates: Array<{ id: string; data: Partial<NFLProp> }> = [];

  // ── Pass 1: Standard props ────────────────────────────────────────────────
  console.log('\n📊 Pass 1: Standard props…');
  const standardProps = rawProps.filter(p => p.id && !normalizeProp(p.prop ?? '').includes('+'));

  for (const raw of standardProps) {
    const propNorm = normalizeProp(raw.prop ?? '');
    const input: PropInput = {
      id:                raw.id,
      player:            raw.player ?? '',
      prop:              raw.prop ?? '',
      propNorm,
      line:              raw.line ?? 0,
      overUnder:         raw.overUnder ?? '',
      team:              raw.team ?? '',
      matchup:           raw.matchup ?? '',
      week:              (raw.week as number) ?? defaultWeek,
      season:            (raw.season as number) ?? season,
      gameDate:          (raw.gameDate as string) || undefined,
      fdOdds:            raw.fdOdds ?? null,
      dkOdds:            raw.dkOdds ?? null,
      playerAvg:         raw.playerAvg ?? null,
      opponentRank:      raw.opponentRank ?? null,
      opponentAvgVsStat: raw.opponentAvgVsStat ?? null,
      seasonHitPct:      raw.seasonHitPct ?? null,
      confidenceScore:   raw.confidenceScore ?? null,
    };

    const enriched = await enrichPropCore(input, ctx, skipEnriched);
    if (enriched) updates.push({ id: raw.id, data: enriched });
  }
  console.log(`✅ Pass 1: ${updates.length} queued`);

  // ── Pass 2: Combo props ───────────────────────────────────────────────────
  console.log('\n📊 Pass 2: Combo props…');
  const comboProps = rawProps.filter(p => p.id && normalizeProp(p.prop ?? '').includes('+'));
  let pass2 = 0;

  for (const raw of comboProps) {
    const propNorm = normalizeProp(raw.prop ?? '');
    const input: PropInput = {
      id:                raw.id,
      player:            raw.player ?? '',
      prop:              raw.prop ?? '',
      propNorm,
      line:              raw.line ?? 0,
      overUnder:         raw.overUnder ?? '',
      team:              raw.team ?? '',
      matchup:           raw.matchup ?? '',
      week:              (raw.week as number) ?? defaultWeek,
      season:            (raw.season as number) ?? season,
      gameDate:          (raw.gameDate as string) || undefined,
      fdOdds:            raw.fdOdds ?? null,
      dkOdds:            raw.dkOdds ?? null,
      playerAvg:         raw.playerAvg ?? null,
      opponentRank:      raw.opponentRank ?? null,
      opponentAvgVsStat: raw.opponentAvgVsStat ?? null,
      seasonHitPct:      raw.seasonHitPct ?? null,
      confidenceScore:   raw.confidenceScore ?? null,
    };

    const enriched = await enrichComboPropCore(input, ctx, skipEnriched);
    if (enriched) { updates.push({ id: raw.id, data: enriched }); pass2++; }
  }
  console.log(`✅ Pass 2: ${pass2} combo props queued`);

  if (updates.length > 0) await writeUpdates(updates);
  console.log(`\n✅ Enrichment complete: ${updates.length} props updated`);
  return updates.length;
}

// ─── Public: weekly props ─────────────────────────────────────────────────────

export interface EnrichOptions {
  week:          number;
  season:        number;
  skipEnriched?: boolean;
}

/**
 * Enrich weeklyProps_{season} for a given week.
 * Uses live TeamRankings defense data scraped from the web.
 */
export async function enrichPropsForWeek(options: EnrichOptions): Promise<number> {
  const { week, season, skipEnriched = true } = options;
  console.log(`\n🏈 Enriching Week ${week} (season ${season})`);
  console.log('='.repeat(55));

  const [rawProps, pfrIdMap, playerTeamMap, defenseMap] = await Promise.all([
    getPropsForWeek(season, week),
    getPfrIdMap(),
    getPlayerTeamMap(),
    fetchAllDefenseStats(season),
  ]);

  console.log(`📋 ${rawProps.length} props | 🛡️ ${Object.keys(defenseMap).length} defense entries`);
  if (!rawProps.length) return 0;

  return runEnrichmentBatch({
    rawProps,
    pfrIdMap,
    playerTeamMap,
    // Current season: use live in-memory map; early-season prior year: fall back to Firestore
    getDefense: async (opp, stat, s) => {
      if (s === season) return lookupDefenseStats(defenseMap, stat, opp) ?? null;
      return getTeamDefenseStats(opp, stat, s);
    },
    skipEnriched,
    season,
    defaultWeek: week,
    writeUpdates: updates =>
      updateProps(updates.map(u => ({ ...u, season, week }))),
  });
}

// ─── Public: all-props collection ────────────────────────────────────────────

export interface EnrichAllOptions {
  season:        number;
  week?:         number;
  skipEnriched?: boolean;
}

/**
 * Enrich allProps_{season}, optionally filtered to a single week.
 * Always uses static Firestore defense data — safe for historical backfill
 * where live TeamRankings data is unavailable.
 */
export async function enrichAllPropsCollection(opts: EnrichAllOptions): Promise<number> {
  const { season, week, skipEnriched = true } = opts;
  console.log(`\n📍 enrichAllPropsCollection: season=${season} week=${week ?? 'all'}`);

  if (!db) { console.error('❌ DB undefined'); return 0; }

  const colName  = `allProps_${season}`;
  const query    = week
    ? db.collection(colName).where('week', '==', week)
    : db.collection(colName);
  const snapshot = await query.get();

  console.log(`📸 ${snapshot.size} docs in ${colName}${week ? ` week ${week}` : ''}`);
  if (snapshot.empty) return 0;

  // Normalise legacy field names on the way in
  const rawProps = snapshot.docs.map(d => {
    const r = d.data() as Record<string, any>;

    // Multi-key resolver — returns first non-null/empty value
    const pick = (...keys: string[]): any => {
      for (const k of keys) {
        const v = r[k];
        if (v != null && v !== '') return v;
      }
      return null;
    };

    return {
      id:                d.id,
      player:            pick('player', 'Player')                                    ?? '',
      prop:              pick('prop', 'Prop')                                        ?? '',
      line:              pick('line', 'Line')                                        ?? 0,
      team:              pick('team', 'Team')                                        ?? '',
      matchup:           pick('matchup', 'Matchup')                                  ?? '',
      week:              pick('week', 'Week'),
      season:            pick('season', 'Season'),
      overUnder:         pick('overUnder', 'Over/Under?', 'Over/Under', 'over under') ?? '',
      fdOdds:            pick('fdOdds', 'FdOdds'),
      dkOdds:            pick('dkOdds', 'DkOdds'),
      playerAvg:         pick('playerAvg', 'Player Avg'),
      opponentRank:      pick('opponentRank', 'Opponent Rank'),
      opponentAvgVsStat: pick('opponentAvgVsStat', 'Opponent Avg vs Stat'),
      // Note the canonical field name — NOT "prop.seasonHitPct%"
      seasonHitPct:      pick('seasonHitPct'),
      confidenceScore:   pick('confidenceScore', 'Confidence Score'),
      gameDate:          pick('gameDate', 'Game Date')                               ?? '',
    } as NFLProp & { id: string };
  });

  const [pfrIdMap, playerTeamMap] = await Promise.all([getPfrIdMap(), getPlayerTeamMap()]);

  return runEnrichmentBatch({
    rawProps,
    pfrIdMap,
    playerTeamMap,
    // Always use static Firestore defense for historical data
    getDefense: (opp, stat, s) => getTeamDefenseStats(opp, stat, s),
    skipEnriched,
    season,
    defaultWeek: week ?? 10,
    writeUpdates: updates => updateAllProps(season, updates),
  });
}