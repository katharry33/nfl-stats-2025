// src/lib/enrichment/firestore.ts

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
    scoreDiff:         pick('Score Diff', 'scoreDiff'),
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
      batch.set(col.doc(id), { ...data, _updatedAt: new Date().toISOString() }, { merge: true });
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
export async function getPfrIdMap(): Promise<Record<string, string>> {
  const snapshot = await db.collection('static_pfrIdMap').get();
  const map: Record<string, string> = {};
  snapshot.docs.forEach(doc => {
    const data = doc.data() as Record<string, any>;
    const player = data.player ?? doc.id.replace(/_/g, ' ');
    const pfrid  = data.pfrid ?? data.pfrId;
    if (player && pfrid) map[player] = pfrid;
  });
  return map;
}

export async function savePfrId(playerName: string, pfrId: string): Promise<void> {
  const docId = playerName.replace(/\s+/g, '_');
  await db.collection('static_pfrIdMap').doc(docId).set(
    { player: playerName, pfrid: pfrId, _updatedAt: new Date().toISOString() },
    { merge: true }
  );
}

// ─── Player/Team map ──────────────────────────────────────────────────────────
export async function getPlayerTeamMap(): Promise<Record<string, string>> {
  const snapshot = await db.collection('player_team_map').get();
  const map: Record<string, string> = {};
  snapshot.docs.forEach(doc => {
    const data = doc.data() as { playerName: string; team: string };
    map[data.playerName.toLowerCase().trim()] = data.team.toUpperCase();
  });
  return map;
}
