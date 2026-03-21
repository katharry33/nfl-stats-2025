// src/lib/enrichment/nba/enrichNBAProps.ts
//
// Two public entry points:
//   enrichNBAPropsForDate()      → nbaProps_{season}  (live TeamRankings defense)
//   enrichAllNBAPropsCollection()→ nbaProps_{season}  (static Firestore defense + full scan)
//
// Both delegate to runNBAEnrichmentBatch() → enrichNBAPropCore() / enrichNBAComboPropCore()
// Mirrors enrichProps.ts exactly — only the data sources swap (BBRef vs PFR, NBA vs NFL).

import { adminDb as db } from '@/lib/firebase/admin';
import {
  getBrId,
  fetchNBASeasonLog,
  calculateNBAAvg,
  calculateNBAHitPct,
} from './bball';
import {
  fetchAllNBADefenseStats,
  lookupNBADefenseStats,
} from './defense';
import { normalizeNBAProp, splitNBACombo } from './normalize-nba';
import { computeScoring, pickBestOdds } from '../shared/scoring';
import type { BRGame } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface NBADefStat { rank: number; avg: number; }

/** Normalised shape fed into the core enrichment helpers. */
interface NBAPropInput {
  id:                 string;
  player:             string;
  prop:               string;
  propNorm:           string;
  line:               number;
  overUnder:          string;
  team:               string;
  matchup:            string;
  gameDate:           string;
  season:             number;
  odds?:              number | null;
  // existing — used to skip already-enriched docs
  playerAvg?:         number | null;
  opponentRank?:      number | null;
  opponentAvgVsStat?: number | null;
  seasonHitPct?:      number | null;
  confidenceScore?:   number | null;
}

interface NBAEnrichContext {
  getLogs:         (player: string, season: number) => Promise<BRGame[]>;
  getDefense:      (opponent: string, stat: string)  => Promise<NBADefStat | null>;
  playerAvgCache:  Map<string, Record<string, number>>;
  defCache:        Map<string, Record<string, NBADefStat>>;
}

// ─── Helper: resolve opponent from matchup ────────────────────────────────────

function resolveOpponent(matchup: string, playerTeam: string): string | null {
  if (!matchup.includes('@')) return null;
  const [away, home] = matchup.split('@').map(s => s.trim().toUpperCase());
  if (!playerTeam) return home;
  return playerTeam.toUpperCase() === away ? home : away;
}

// ─── Core: single standard prop ───────────────────────────────────────────────

async function enrichNBAPropCore(
  prop:         NBAPropInput,
  ctx:          NBAEnrichContext,
  skipEnriched: boolean,
): Promise<Record<string, any> | null> {
  const { getLogs, getDefense, playerAvgCache, defCache } = ctx;
  const { propNorm, player, season, gameDate } = prop;

  const needsAvg   = prop.playerAvg         == null;
  const needsDef   = prop.opponentRank       == null || prop.opponentAvgVsStat == null;
  const needsHit   = prop.seasonHitPct       == null;
  const needsScore = prop.confidenceScore    == null;

  if (skipEnriched && !needsAvg && !needsDef && !needsHit && !needsScore) return null;

  const update: Record<string, any> = {};

  // ── 1. Game logs ──────────────────────────────────────────────────────────
  const logs = await getLogs(player, season);

  // ── 2. Player average ────────────────────────────────────────────────────
  // calculateNBAAvg returns null (never 0) when no qualifying games exist —
  // "no data" stays null so it's not confused with genuine 0 production.
  if (needsAvg || !skipEnriched) {
    // gameNum=0 means "use date-based filter exclusively" when gameDate is present
    const avg = calculateNBAAvg(logs, propNorm, 0, gameDate || undefined);
    if (avg != null) update.playerAvg = avg;

    // Populate cache for Pass 2 (combo props)
    const cached = avg ?? prop.playerAvg ?? 0;
    if (!playerAvgCache.has(player)) playerAvgCache.set(player, {});
    playerAvgCache.get(player)![propNorm] = cached;
  } else {
    if (!playerAvgCache.has(player)) playerAvgCache.set(player, {});
    playerAvgCache.get(player)![propNorm] = prop.playerAvg!;
  }

  // ── 3. overUnder resolution ──────────────────────────────────────────────
  // NBA props from The Odds API always supply overUnder ("Over"/"Under") so
  // inference is rarely needed — but we keep it as a safety net for manual entry.
  const resolvedAvg = update.playerAvg ?? prop.playerAvg ?? null;
  let resolvedOU: 'Over' | 'Under' | null =
    prop.overUnder === 'Over' || prop.overUnder === 'Under'
      ? (prop.overUnder as 'Over' | 'Under')
      : null;

  if (!resolvedOU && resolvedAvg != null) {
    resolvedOU = resolvedAvg > prop.line ? 'Over' : 'Under';
    update.overUnder = resolvedOU;
  }

  // ── 4. Season hit % ──────────────────────────────────────────────────────
  if ((needsHit || !skipEnriched) && resolvedOU && logs.length > 0) {
    const hitPct = calculateNBAHitPct(
      logs, propNorm, prop.line, resolvedOU,
      undefined,          // excludeGameNum — unused when beforeDate is supplied
      gameDate || undefined,
    );
    // 0 almost always means "no qualifying games" — treat as missing
    if (hitPct != null && hitPct > 0) update.seasonHitPct = hitPct;
  }

  // ── 5. Defense stats ─────────────────────────────────────────────────────
  if (needsDef || !skipEnriched) {
    const opponent = resolveOpponent(prop.matchup, prop.team);
    if (opponent) {
      const def = await getDefense(opponent, propNorm);
      if (def) {
        update.opponentRank      = def.rank;
        update.opponentAvgVsStat = def.avg;
        const team = prop.team.toUpperCase();
        if (!defCache.has(team)) defCache.set(team, {});
        defCache.get(team)![propNorm] = def;
      }
    }
  }

  // ── 6. Scoring ───────────────────────────────────────────────────────────
  if (needsScore || !skipEnriched) {
    const pAvg   = update.playerAvg         ?? prop.playerAvg         ?? null;
    const oppRnk = update.opponentRank      ?? prop.opponentRank      ?? null;
    const oppAvg = update.opponentAvgVsStat ?? prop.opponentAvgVsStat ?? null;

    if (pAvg != null && oppRnk != null && oppAvg != null) {
      const best = pickBestOdds(prop.odds ?? null, null);
      Object.assign(update, computeScoring({
        playerAvg:         pAvg,
        opponentRank:      oppRnk,
        opponentAvgVsStat: oppAvg,
        line:              prop.line,
        seasonHitPct:      update.seasonHitPct ?? prop.seasonHitPct ?? null,
        odds:              best.odds,
        propNorm,
      }, 'nba'));
      if (best.odds != null) {
        update.bestOdds = best.odds;
        update.bestBook = best.book ?? undefined;
      }
    } else {
      console.log(`  ⚠️  ${player} ${propNorm}: scoring skipped — missing ${[
        pAvg   == null ? 'playerAvg'    : null,
        oppRnk == null ? 'opponentRank' : null,
        oppAvg == null ? 'opponentAvg'  : null,
      ].filter(Boolean).join(', ')}`);
    }
  }

  return Object.keys(update).length > 0 ? update : null;
}

// ─── Core: combo prop (e.g. "pts_ast_reb") ───────────────────────────────────

async function enrichNBAComboPropCore(
  prop:         NBAPropInput,
  ctx:          NBAEnrichContext,
  skipEnriched: boolean,
): Promise<Record<string, any> | null> {
  const { playerAvgCache, defCache, getLogs, getDefense } = ctx;
  const { propNorm, player, season, gameDate } = prop;

  if (skipEnriched && prop.playerAvg != null && prop.confidenceScore != null) return null;

  const components = splitNBACombo(propNorm);
  const playerAvgs = playerAvgCache.get(player);

  if (!components || !playerAvgs || !components.every(c => playerAvgs[c] !== undefined)) {
    console.log(`  ⚠️  Combo skip ${player} ${propNorm}: missing component averages`);
    return null;
  }

  const update: Record<string, any> = {};

  // Combo avg = sum of component averages
  const comboAvg = Math.round(
    components.reduce((s, c) => s + (playerAvgs[c] ?? 0), 0) * 10,
  ) / 10;
  update.playerAvg = comboAvg;

  // Defense — try cached per-team stats first, then live lookup
  const team    = prop.team.toUpperCase();
  const teamDef = defCache.get(team);
  if (teamDef) {
    const compDefs = components.map(c => teamDef[c]).filter(Boolean) as NBADefStat[];
    if (compDefs.length === components.length) {
      update.opponentRank      = Math.ceil(compDefs.reduce((s, d) => s + d.rank, 0) / compDefs.length);
      update.opponentAvgVsStat = Math.round(compDefs.reduce((s, d) => s + d.avg,  0) * 10) / 10;
    }
  }

  if (update.opponentRank == null && prop.matchup) {
    const opponent = resolveOpponent(prop.matchup, prop.team);
    if (opponent) {
      const compDefs = await Promise.all(components.map(c => getDefense(opponent, c)));
      const valid    = compDefs.filter(Boolean) as NBADefStat[];
      if (valid.length === components.length) {
        update.opponentRank      = Math.ceil(valid.reduce((s, d) => s + d.rank, 0) / valid.length);
        update.opponentAvgVsStat = Math.round(valid.reduce((s, d) => s + d.avg,  0) * 10) / 10;
      }
    }
  }

  // Hit % on the combo — calculateNBAHitPct handles combo props via splitNBACombo internally
  if (prop.overUnder) {
    const logs = await getLogs(player, season);
    if (logs.length > 0) {
      const hitPct = calculateNBAHitPct(
        logs, propNorm, prop.line,
        prop.overUnder as 'Over' | 'Under',
        undefined, gameDate || undefined,
      );
      if (hitPct != null && hitPct > 0) update.seasonHitPct = hitPct;
    }
  }

  // Scoring
  const oppRnk = update.opponentRank      ?? prop.opponentRank      ?? null;
  const oppAvg = update.opponentAvgVsStat ?? prop.opponentAvgVsStat ?? null;
  if (oppRnk != null && oppAvg != null) {
    const best = pickBestOdds(prop.odds ?? null, null);
    Object.assign(update, computeScoring({
      playerAvg: comboAvg, opponentRank: oppRnk, opponentAvgVsStat: oppAvg,
      line: prop.line, seasonHitPct: update.seasonHitPct ?? prop.seasonHitPct ?? null,
      odds: best.odds, propNorm,
    }, 'nba'));
    if (best.odds != null) { update.bestOdds = best.odds; update.bestBook = best.book ?? undefined; }
  }

  return Object.keys(update).length > 0 ? update : null;
}

// ─── Batch runner ─────────────────────────────────────────────────────────────

interface NBABatchOptions {
  rawDocs:      Array<Record<string, any> & { id: string }>;
  brIdMap:      Record<string, string>;   // player → brid; mutated on new discoveries
  getDefense:   (opp: string, stat: string) => Promise<NBADefStat | null>;
  skipEnriched: boolean;
  season:       number;
  writeUpdates: (updates: Array<{ id: string; data: Record<string, any> }>) => Promise<void>;
}

async function runNBAEnrichmentBatch(opts: NBABatchOptions): Promise<number> {
  const { rawDocs, brIdMap, getDefense, skipEnriched, season, writeUpdates } = opts;

  const brCache        = new Map<string, BRGame[]>();
  const playerAvgCache = new Map<string, Record<string, number>>();
  const defCache       = new Map<string, Record<string, NBADefStat>>();

  // Cached log fetcher — resolves brid on first call, caches per player+season
  async function getLogs(playerName: string, logSeason: number): Promise<BRGame[]> {
    const cacheKey = `${playerName}::${logSeason}`;
    if (brCache.has(cacheKey)) return brCache.get(cacheKey)!;

    const brid = await getBrId(playerName, brIdMap);
    if (!brid) {
      console.log(`  ⚠️  No brid for "${playerName}" — skipping log fetch`);
      brCache.set(cacheKey, []);
      return [];
    }

    // Persist any newly discovered brid back to static_brIdMap
    if (!brIdMap[playerName]) {
      brIdMap[playerName] = brid;
      try {
        await db.collection('static_brIdMap').doc(playerName).set(
          { player: playerName, brid, updatedAt: new Date().toISOString() },
          { merge: true },
        );
        console.log(`  💾 Saved new brid: ${playerName} → ${brid}`);
      } catch (err) {
        console.warn(`  ⚠️  Could not save brid for ${playerName}:`, err);
      }
    }

    const logs = await fetchNBASeasonLog(playerName, brid, logSeason);
    brCache.set(cacheKey, logs);
    return logs;
  }

  const ctx: NBAEnrichContext = { getLogs, getDefense, playerAvgCache, defCache };
  const updates: Array<{ id: string; data: Record<string, any> }> = [];

  // Normalise raw docs into NBAPropInput
  const pick = (r: Record<string, any>, ...keys: string[]): any => {
    for (const k of keys) { const v = r[k]; if (v != null && v !== '') return v; }
    return null;
  };

  const allInputs: NBAPropInput[] = rawDocs
    .filter(d => d.id && pick(d, 'player') && pick(d, 'prop'))
    .map(d => ({
      id:                d.id,
      player:            pick(d, 'player')             ?? '',
      prop:              pick(d, 'prop')               ?? '',
      propNorm:          normalizeNBAProp(pick(d, 'prop') ?? ''),
      line:              Number(pick(d, 'line')         ?? 0),
      overUnder:         pick(d, 'overUnder')          ?? '',
      team:              pick(d, 'team')               ?? '',
      matchup:           pick(d, 'matchup')            ?? '',
      gameDate:          pick(d, 'gameDate')           ?? '',
      season:            Number(pick(d, 'season')       ?? season),
      odds:              pick(d, 'odds', 'bestOdds')   ?? null,
      playerAvg:         pick(d, 'playerAvg')          ?? null,
      opponentRank:      pick(d, 'opponentRank')       ?? null,
      opponentAvgVsStat: pick(d, 'opponentAvgVsStat')  ?? null,
      seasonHitPct:      pick(d, 'seasonHitPct')       ?? null,
      confidenceScore:   pick(d, 'confidenceScore')    ?? null,
    }));

  // ── Pass 1: Standard props ────────────────────────────────────────────────
  // A "standard" NBA prop has no underscore-joined components that are themselves
  // base stats — i.e. "points", "rebounds", "threes" but NOT "pts_ast_reb".
  // We detect combos by checking if splitNBACombo returns non-null.
  console.log('\n📊 Pass 1: Standard props…');
  const standardProps = allInputs.filter(p => splitNBACombo(p.propNorm) === null);

  for (const input of standardProps) {
    const enriched = await enrichNBAPropCore(input, ctx, skipEnriched);
    if (enriched) updates.push({ id: input.id, data: enriched });
  }
  console.log(`✅ Pass 1: ${updates.length} queued`);

  // ── Pass 2: Combo props ───────────────────────────────────────────────────
  console.log('\n📊 Pass 2: Combo props…');
  const comboProps = allInputs.filter(p => splitNBACombo(p.propNorm) !== null);
  const pass2Start = updates.length;

  for (const input of comboProps) {
    const enriched = await enrichNBAComboPropCore(input, ctx, skipEnriched);
    if (enriched) updates.push({ id: input.id, data: enriched });
  }
  console.log(`✅ Pass 2: ${updates.length - pass2Start} combo props queued`);

  if (updates.length > 0) await writeUpdates(updates);
  console.log(`\n✅ NBA enrichment complete: ${updates.length} props updated`);
  return updates.length;
}

// ─── Public: enrich by date (Bet Builder / live flow) ────────────────────────

export interface EnrichNBAByDateOptions {
  gameDate:      string;  // "YYYY-MM-DD"
  season:        number;
  skipEnriched?: boolean;
}

/**
 * Enrich nbaProps_{season} for a specific game date.
 * Uses live TeamRankings defense data.
 * Called by  GET /api/nba/enrich?date=YYYY-MM-DD
 */
export async function enrichNBAPropsForDate(opts: EnrichNBAByDateOptions): Promise<number> {
  const { gameDate, season, skipEnriched = true } = opts;
  console.log(`\n🏀 NBA Enrichment — ${gameDate} (season ${season})`);
  console.log('='.repeat(55));

  // Load brIdMap + defense in parallel
  const [brMapSnap, defenseMap] = await Promise.all([
    db.collection('static_brIdMap').get(),
    fetchAllNBADefenseStats(season),
  ]);

  const brIdMap: Record<string, string> = {};
  brMapSnap.docs.forEach(d => {
    const data = d.data();
    brIdMap[data.player] = data.brid;
  });

  console.log(`🔑 ${Object.keys(brIdMap).length} BR IDs loaded`);
  console.log(`🛡️  ${Object.keys(defenseMap).length} defense entries loaded`);

  // Query props for this date
  const snap = await db.collection(`nbaProps_${season}`)
    .where('gameDate', '==', gameDate)
    .get();

  console.log(`📋 ${snap.size} props for ${gameDate}`);
  if (snap.empty) return 0;

  const rawDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  return runNBAEnrichmentBatch({
    rawDocs,
    brIdMap,
    getDefense: async (opp, stat) =>
      lookupNBADefenseStats(defenseMap, stat, opp) ?? null,
    skipEnriched,
    season,
    writeUpdates: async updates => {
      for (let i = 0; i < updates.length; i += 400) {
        const batch = db.batch();
        for (const { id, data } of updates.slice(i, i + 400)) {
          batch.update(db.collection(`nbaProps_${season}`).doc(id), data);
        }
        await batch.commit();
      }
    },
  });
}

// ─── Public: enrich full collection (historical / backfill) ──────────────────

export interface EnrichAllNBAOptions {
  season:        number;
  gameDate?:     string;  // optional filter — enrich only this date
  skipEnriched?: boolean;
}

/**
 * Full-scan enrichment of nbaProps_{season}.
 * Mirrors enrichAllPropsCollection() for NFL.
 * Uses static Firestore defense (getTeamNBADefenseStats) for historical safety.
 * Called by  GET /api/nba/enrich?mode=all  or directly from scripts/enrichNBA.ts
 */
export async function enrichAllNBAPropsCollection(opts: EnrichAllNBAOptions): Promise<number> {
  const { season, gameDate, skipEnriched = true } = opts;
  console.log(`\n📍 enrichAllNBAPropsCollection: season=${season} date=${gameDate ?? 'all'} skipEnriched=${skipEnriched}`);

  const colName = `nbaProps_${season}`;
  const snapshot = await db.collection(colName).get();

  let docs = snapshot.docs;
  if (gameDate) {
    docs = docs.filter(d => (d.data().gameDate ?? '').startsWith(gameDate));
  }

  console.log(`📸 ${docs.length} docs in ${colName}${gameDate ? ` (date=${gameDate})` : ''}`);
  if (docs.length === 0) { console.log('Nothing to enrich.'); return 0; }

  // ── Cleanup: remove docs missing player or prop ───────────────────────────
  const validDocs: typeof docs = [];
  const deleteBatch = db.batch();
  let deleteCount = 0;

  for (const doc of docs) {
    const r = doc.data();
    const player = r.player ?? '';
    const prop   = r.prop   ?? '';
    if (!player.trim() || !prop.trim()) {
      deleteBatch.delete(db.collection(colName).doc(doc.id));
      deleteCount++;
    } else {
      validDocs.push(doc);
    }
  }
  if (deleteCount > 0) {
    await deleteBatch.commit();
    console.log(`🧹 Removed ${deleteCount} malformed docs`);
  }

  // Load brIdMap
  const brMapSnap = await db.collection('static_brIdMap').get();
  const brIdMap: Record<string, string> = {};
  brMapSnap.docs.forEach(d => {
    const data = d.data();
    brIdMap[data.player] = data.brid;
  });

  const rawDocs = validDocs.map(d => ({ id: d.id, ...d.data() }));

  // For historical enrichment, load defense from Firestore static store
  // (mirrors getTeamDefenseStats in the NFL pipeline)
  const defSnap = await db.collection('static_nbaTeamDefenseStats')
    .where('season', '==', season)
    .get();
  const staticDefMap: Record<string, Record<string, any>> = {};
  defSnap.docs.forEach(d => {
    const r = d.data();
    if (r.team) staticDefMap[r.team.toUpperCase()] = r;
  });
  console.log(`🛡️  ${defSnap.size} static defense docs loaded`);

  // If no static defense data exists yet, fall back to live TeamRankings fetch
  let liveDefenseMap: Awaited<ReturnType<typeof fetchAllNBADefenseStats>> | null = null;
  if (defSnap.empty) {
    console.log('⚠️  No static defense data — fetching live from TeamRankings…');
    liveDefenseMap = await fetchAllNBADefenseStats(season);
  }

  return runNBAEnrichmentBatch({
    rawDocs,
    brIdMap,
    getDefense: async (opp, stat) => {
      // Try static Firestore first
      if (!defSnap.empty) {
        const team = staticDefMap[opp.toUpperCase()];
        if (team) {
          const rank = team[`${stat}_rank`] ?? null;
          const avg  = team[`${stat}_avg`]  ?? null;
          if (rank != null && avg != null) return { rank: Number(rank), avg: Number(avg) };
        }
        return null;
      }
      // Fallback: live defense map
      if (liveDefenseMap) {
        return lookupNBADefenseStats(liveDefenseMap, stat, opp) ?? null;
      }
      return null;
    },
    skipEnriched,
    season,
    writeUpdates: async updates => {
      for (let i = 0; i < updates.length; i += 400) {
        const batch = db.batch();
        for (const { id, data } of updates.slice(i, i + 400)) {
          batch.update(db.collection(colName).doc(id), data);
        }
        await batch.commit();
      }
    },
  });
}