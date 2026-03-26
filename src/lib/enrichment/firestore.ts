import { Timestamp } from 'firebase-admin/firestore';
import { db } from '@/lib/firebase/admin';
import type { NFLProp } from '@/lib/types';

// ─── Collection refs ──────────────────────────────────────────────────────────
export function weeklyPropsRef(season: number) {
  return db.collection(`weeklyProps_${season}`);
}

function allPropsRef(season: number) {
  return db.collection(`allProps_${season}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dupKey(p: { player?: string; prop?: string; matchup?: string; week?: number | null }): string {
  return `${p.player ?? ''}||${p.prop ?? ''}||${p.matchup ?? ''}||${p.week ?? ''}`.toLowerCase();
}

// ─── normalizeDoc ─────────────────────────────────────────────────────────────
// Reads BOTH PascalCase-with-spaces (old loader) AND camelCase (new enrich)
// Prefers the non-null value — whichever was populated last
function normalizeDoc(d: FirebaseFirestore.QueryDocumentSnapshot): NFLProp & { id: string } {
  const r = d.data() as Record<string, any>;

  // Helper: pick first non-null value from a list of field names
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = r[k];
      if (v !== null && v !== undefined && v !== '') return v;
    }
    return null;
  };

  return {
    id:                d.id,
    player:            pick('Player', 'player')            ?? '',
    prop:              pick('Prop', 'prop')                ?? '',
    line:              pick('Line', 'line')                ?? 0,
    team:              pick('Team', 'team')                ?? '',
    matchup:           pick('Matchup', 'matchup')          ?? '',
    gameDate:          pick('Game Date', 'gameDate')       ?? '',
    gameTime:          pick('Game Time', 'gameTime'),
    week:              pick('Week', 'week'),
    season:            pick('Season', 'season'),
    overUnder:         pick('Over/Under?', 'Over/Under', 'overUnder', 'over_under'),
    odds:              pick('Odds', 'odds'),
    fdOdds:            pick('FdOdds', 'fdOdds'),
    dkOdds:            pick('DkOdds', 'dkOdds'),
    bestOdds:          pick('Best Odds', 'bestOdds'),

    // Enrichment — player
    playerAvg:         pick('Player Avg', 'playerAvg'),
    seasonHitPct:      pick('Season Hit %', 'seasonHitPct'),

    // Enrichment — defense
    opponentRank:      pick('Opponent Rank', 'opponentRank'),
    opponentAvgVsStat: pick('Opponent Avg vs Stat', 'opponentAvgVsStat'),

    // Scoring model
    yardsScore:        pick('Yards Score', 'yardsScore'),
    rankScore:         pick('Rank Score', 'rankScore'),
    totalScore:        pick('Total Score', 'totalScore'),
    scoreDiff:         pick('prop.scoreDiff', 'scoreDiff'),
    scalingFactor:     pick('Scaling Factor', 'scalingFactor'),
    winProbability:    pick('Win Probability', 'winProbability'),
    projWinPct:        pick('Proj Win %', 'projWinPct'),
    avgWinProb:        pick('Avg Win Prob', 'avgWinProb'),
    impliedProb:       pick('Implied Prob', 'impliedProb'),
    bestEdgePct:       pick('Best Edge %', 'bestEdgePct'),
    expectedValue:     pick('Expected Value', 'expectedValue'),
    kellyPct:          pick('Kelly %', 'kellyPct'),
    valueIcon:         pick('Value Icon', 'valueIcon'),
    confidenceScore:   pick('Confidence Score', 'confidenceScore'),

    // Post-game
    gameStat:     pick('Game Stat', 'gameStat'),
    actualResult: pick('actualResult') ?? 'pending',
  };
}

// ─── getPropsForWeek ──────────────────────────────────────────────────────────
export async function getPropsForWeek(
  season: number,
  week: number
): Promise<Array<NFLProp & { id: string }>> {
  const ref = weeklyPropsRef(season);

  console.log(`📋 Querying weeklyProps_${season} week ${week}...`);

  const [capSnap, lowerSnap] = await Promise.all([
    ref.where('Week', '==', week).get(),
    ref.where('week', '==', week).get(),
  ]);

  const seen = new Set<string>();
  const results: Array<NFLProp & { id: string }> = [];

  for (const snap of [capSnap, lowerSnap]) {
    for (const d of snap.docs) {
      if (seen.has(d.id)) continue;
      seen.add(d.id);
      results.push(normalizeDoc(d));
    }
  }

  console.log(`📋 Found ${results.length} props in weeklyProps_${season} week ${week}`);
  return results;
}

// ─── getAllProps ───────────────────────────────────────────────────────────────
// Used by /api/all-props for the Historical Props page
export async function getAllProps(
  week: number | null,
  _bust: boolean = false
): Promise<Array<NFLProp & { id: string }>> {
  const season = 2026;
  const ref = allPropsRef(season);

  if (week) {
    const [capSnap, lowerSnap] = await Promise.all([
      ref.where('Week', '==', week).get(),
      ref.where('week', '==', week).get(),
    ]);
    const seen = new Set<string>();
    const results: Array<NFLProp & { id: string }> = [];
    for (const snap of [capSnap, lowerSnap]) {
      for (const d of snap.docs) {
        if (seen.has(d.id)) continue;
        seen.add(d.id);
        results.push(normalizeDoc(d));
      }
    }
    return results;
  }

  const snapshot = await ref.get();
  return snapshot.docs.map(normalizeDoc);
}

// ─── saveProps ────────────────────────────────────────────────────────────────
export async function saveProps(props: NFLProp[]): Promise<number> {
  if (!props.length) return 0;
  const season = Number(props[0].season);
  const week   = props[0].week!;
  const ref    = weeklyPropsRef(season);

  const [capSnap, lowerSnap] = await Promise.all([
    ref.where('Week', '==', week).select('player', 'Player', 'prop', 'Prop', 'matchup', 'Matchup').get(),
    ref.where('week', '==', week).select('player', 'Player', 'prop', 'Prop', 'matchup', 'Matchup').get(),
  ]);

  const existingKeys = new Set<string>();
  for (const snap of [capSnap, lowerSnap]) {
    snap.docs.forEach(d => {
      const r = d.data() as any;
      existingKeys.add(dupKey({
        player:  r.Player  ?? r.player,
        prop:    r.Prop    ?? r.prop,
        matchup: r.Matchup ?? r.matchup,
        week,
      }));
    });
  }

  const BATCH_SIZE = 500;
  let added = 0;

  for (let i = 0; i < props.length; i += BATCH_SIZE) {
    const chunk = props.slice(i, i + BATCH_SIZE);
    const batch = db.batch();
    let batchCount = 0;

    chunk.forEach(prop => {
      const key = dupKey(prop);
      if (existingKeys.has(key)) return;
      const { id: _id, ...propData } = prop;
      batch.set(ref.doc(), {
        ...propData,
        Week:      week,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      existingKeys.add(key);
      batchCount++;
    });

    if (batchCount > 0) { await batch.commit(); added += batchCount; }
  }

  console.log(`✅ ${added} props saved to weeklyProps_${season} week ${week} (${props.length - added} skipped)`);
  return added;
}

// ─── updateProps ──────────────────────────────────────────────────────────────
// Writes camelCase enrichment fields back to weeklyProps docs
export async function updateProps(
  updates: Array<{ id: string; season: number; week: number; data: Partial<NFLProp> }>
): Promise<void> {
  if (!updates.length) return;
  const { season } = updates[0];
  const ref = weeklyPropsRef(season);
  const BATCH_SIZE = 500;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = db.batch();
    updates.slice(i, i + BATCH_SIZE).forEach(u => {
      batch.update(ref.doc(u.id), { ...u.data, updatedAt: Timestamp.now() });
    });
    await batch.commit();
  }
  console.log(`✅ ${updates.length} props updated in weeklyProps_${season}`);
}

// ─── updateAllProps ───────────────────────────────────────────────────────────
export async function updateAllProps(
  season: number,
  updates: Array<{ id: string; data: Partial<NFLProp> }>
): Promise<void> {
  if (!updates.length) return;
  const col = db.collection(`allProps_${season}`);
  const BATCH_SIZE = 400;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = db.batch();
    const chunk = updates.slice(i, i + BATCH_SIZE);
    for (const { id, data } of chunk) {
      batch.set(col.doc(id), { ...data, updatedAt: new Date().toISOString() }, { merge: true });
    }
    await batch.commit();
    console.log(`   ✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${chunk.length} docs → allProps_${season}`);
  }
}

// ─── movePropsToAllProps ──────────────────────────────────────────────────────
export async function movePropsToAllProps(
  season: number,
  week: number
): Promise<{ moved: number; skipped: number }> {
  const [capSnap, lowerSnap] = await Promise.all([
    weeklyPropsRef(season).where('Week', '==', week).get(),
    weeklyPropsRef(season).where('week', '==', week).get(),
  ]);

  const seen = new Set<string>();
  const allDocs = [...capSnap.docs, ...lowerSnap.docs].filter(d => {
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });

  if (!allDocs.length) {
    console.log(`⚠️  No weekly props for season ${season} week ${week}`);
    return { moved: 0, skipped: 0 };
  }

  const destRef = allPropsRef(season);
  const existingSnap = await destRef.where('week', '==', week)
    .select('player', 'prop', 'matchup', 'week').get();
  const existingKeys = new Set(existingSnap.docs.map(d => dupKey(d.data() as NFLProp)));

  const BATCH_SIZE = 500;
  let moved = 0, skipped = 0;

  for (let i = 0; i < allDocs.length; i += BATCH_SIZE) {
    const chunk = allDocs.slice(i, i + BATCH_SIZE);
    const writeBatch = db.batch();
    const deleteBatch = db.batch();
    let chunkMoved = 0;

    chunk.forEach(doc => {
      const normalized = normalizeDoc(doc);
      const { id: _id, ...data } = normalized;
      const key = dupKey({ ...data, week });
      deleteBatch.delete(doc.ref);
      if (existingKeys.has(key)) { skipped++; return; }
      writeBatch.set(destRef.doc(), { ...data, week, season, finalizedAt: Timestamp.now() });
      existingKeys.add(key);
      chunkMoved++;
    });

    if (chunkMoved > 0) await writeBatch.commit();
    await deleteBatch.commit();
    moved += chunkMoved;
  }

  console.log(`✅ Moved ${moved} → allProps_${season} (${skipped} skipped)`);
  return { moved, skipped };
}

// ─── getTopValueBets ──────────────────────────────────────────────────────────
export async function getTopValueBets(
  season: number, week: number, minEdge = 0.05, limit = 25
): Promise<Array<NFLProp & { id: string }>> {
  const props = await getPropsForWeek(season, week);
  return props
    .filter(p => (p.bestEdgePct ?? 0) > minEdge)
    .sort((a, b) => (b.bestEdgePct ?? 0) - (a.bestEdgePct ?? 0))
    .slice(0, limit);
}

// ─── PFR ID map ───────────────────────────────────────────────────────────────
// Collection: static_pfrIdMap
// Doc shape:  { player: "AJ Barner", pfrid: "BarnAJ00", _updatedat: "..." }
//             NOTE: field is "pfrid" (all lowercase), not "pfrId"

export async function getPfrIdMap(): Promise<Record<string, string>> {
  const snap = await db.collection('static_pfrIdMap').get();
  const map: Record<string, string> = {};
  for (const doc of snap.docs) {
    const r = doc.data();
    // "pfrid" is the canonical field name in Firestore
    const id     = r.pfrid ?? r.pfrId ?? r.PfrId ?? null;
    const player = r.player ?? doc.id;
    if (id && player) map[player] = id;
  }
  return map;
}

export async function savePfrId(playerName: string, pfrId: string): Promise<void> {
  const docId = playerName.replace(/\s+/g, '_');
  await db.collection('static_pfrIdMap').doc(docId).set(
    { player: playerName, pfrid: pfrId, updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

// ─── Player → Team map ────────────────────────────────────────────────────────
// Collection: static_playerTeamMapping
// Doc shape:  { player: "Josh Allen", team: "BUF", _updatedat: "..." }

export async function getPlayerTeamMap(): Promise<Record<string, string>> {
  const snap = await db.collection('static_playerTeamMapping').get();
  const map: Record<string, string> = {};
  for (const doc of snap.docs) {
    const r      = doc.data();
    const player = r.player ?? doc.id;
    const team   = r.team ?? r.Team;
    if (player && team) map[player.toLowerCase().trim()] = team;
  }
  return map;
}

// ─── nameToDocKey ─────────────────────────────────────────────────────────────
// Converts a player name to the doc ID format used by scrapeSeasonStats.ts
// "A.J. Brown" → "A_J__Brown"  |  "Derrick Henry" → "Derrick_Henry"
// "Ja'Marr Chase" → "JaMarr_Chase"
function nameToDocKey(name: string): string {
  return name
    .replace(/'/g, '')          // remove apostrophes
    .replace(/\./g, '_')        // dots → underscore
    .replace(/\s+/g, '_')       // spaces → underscore
    .replace(/__+/g, '__');     // collapse 3+ underscores to double
}

// ─── Player season avg (from static_playerSeasonStats) ───────────────────────
// Collection: static_playerSeasonStats
// Doc shape:  { player, team, season, rec_yds, recs, rush_yds, rush_att, games }
//
// Used for early-season enrichment (weeks 1-3) as prior-year average fallback.

export async function getPlayerSeasonAvg(
  playerName: string,
  propNorm:   string,
  season:     number,
): Promise<number | null> {
  const statKey = propNorm.trim().replace(/ /g, '_').toLowerCase();

  try {
    const snap = await db.collection('static_playerSeasonStats')
      .where('player', '==', playerName)
      .where('season', '==', season)
      .limit(1)
      .get();

    if (snap.empty) return null;

    const r     = snap.docs[0].data();
    const total = r[statKey] ?? null;
    const games = r.games    ?? null;

    if (total == null || !games || games === 0) return null;

    return Math.round((Number(total) / Number(games)) * 10) / 10;
  } catch {
    return null;
  }
}

// ─── Team defense stats ───────────────────────────────────────────────────────
// Collection: static_teamDefenseStats
// Doc shape:  { team: "ARI", season: 2024, pass_yds_rank: 15, pass_yds_avg: 216.1, ... }
//
// Field naming convention: {propNorm_with_underscores}_{rank|avg}
// normalizeProp produces space-separated ("pass yds") so we convert to underscores.

export async function getTeamDefenseStats(
  opponent: string,
  propNorm: string,
  season:   number,
): Promise<{ rank: number; avg: number } | null> {
  // Convert propNorm spaces to underscores to match Firestore field names
  // "pass yds" → "pass_yds",  "rec yds" → "rec_yds",  "recs" → "recs"
  const statKey = propNorm.trim().replace(/ /g, '_').toLowerCase();

  try {
    const snap = await db.collection('static_teamDefenseStats')
      .where('team',   '==', opponent.toUpperCase())
      .where('season', '==', season)
      .limit(1)
      .get();

    if (snap.empty) return null;

    const r    = snap.docs[0].data();
    const rank = r[`${statKey}_rank`] ?? null;
    const avg  = r[`${statKey}_avg`]  ?? null;

    if (rank == null || avg == null) {
      // Stat key not found — log available keys so you can debug new prop types
      const availableStats = Object.keys(r)
        .filter(k => k.endsWith('_rank'))
        .map(k => k.replace('_rank', ''));
      console.log(`  ⚠️  No defense stat "${statKey}" for ${opponent} ${season}. Available: ${availableStats.join(', ')}`);
      return null;
    }

    return { rank: Number(rank), avg: Number(avg) };
  } catch (err: any) {
    console.warn(`  ⚠️  getTeamDefenseStats failed for ${opponent} ${propNorm} ${season}:`, err.message);
    return null;
  }
}
