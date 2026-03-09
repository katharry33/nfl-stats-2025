// src/lib/enrichment/firestore.ts

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { adminDb } from '@/lib/firebase/admin';
import type { NFLProp } from '@/lib/types';

// ─── DB accessor ──────────────────────────────────────────────────────────────
// adminDb is already initialized — use it directly
function db() {
  return adminDb;
}

// ─── Collection refs ──────────────────────────────────────────────────────────
// FLAT collections — weeklyProps_2025 and allProps_2025
// Props have PascalCase Week field from the loader, so we query both

export function weeklyPropsRef(season: number) {
  return db().collection(`weeklyProps_${season}`);
}

function allPropsRef(season: number) {
  return db().collection(`allProps_${season}`);
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function dupKey(p: { player?: string; prop?: string; matchup?: string; week?: number | null }): string {
  return `${p.player ?? ''}||${p.prop ?? ''}||${p.matchup ?? ''}||${p.week ?? ''}`.toLowerCase();
}

function docWithId(d: FirebaseFirestore.QueryDocumentSnapshot): NFLProp & { id: string } {
  const { id: _ignored, ...rest } = d.data() as NFLProp & { id?: string };
  return { id: d.id, ...rest };
}

// ─── saveProps ────────────────────────────────────────────────────────────────
// Writes to flat weeklyProps_{season}, PascalCase Week field
export async function saveProps(props: NFLProp[]): Promise<number> {
  if (!props.length) return 0;
  const season = Number(props[0].season);
  const week   = props[0].week!;
  const ref    = weeklyPropsRef(season);

  // Check for existing docs this week (handle both field name cases)
  const [capSnap, lowerSnap] = await Promise.all([
    ref.where('Week', '==', week).select('player', 'prop', 'matchup').get(),
    ref.where('week', '==', week).select('player', 'prop', 'matchup').get(),
  ]);
  const existingKeys = new Set([
    ...capSnap.docs.map(d => dupKey({ ...d.data() as any, week })),
    ...lowerSnap.docs.map(d => dupKey({ ...d.data() as any, week })),
  ]);

  const BATCH_SIZE = 500;
  let added = 0;

  for (let i = 0; i < props.length; i += BATCH_SIZE) {
    const chunk = props.slice(i, i + BATCH_SIZE);
    const batch = db().batch();
    let batchCount = 0;

    chunk.forEach(prop => {
      const key = dupKey(prop);
      if (existingKeys.has(key)) return;
      const { id: _id, ...propData } = prop;
      // Store with PascalCase Week to match existing data
      batch.set(ref.doc(), {
        ...propData,
        Week: week,
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
export async function updateProps(
  updates: Array<{ id: string; season: number; week: number; data: Partial<NFLProp> }>
): Promise<void> {
  if (!updates.length) return;
  const { season } = updates[0];
  const ref = weeklyPropsRef(season);
  const BATCH_SIZE = 500;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = db().batch();
    updates.slice(i, i + BATCH_SIZE).forEach(u => {
      batch.update(ref.doc(u.id), { ...u.data, updatedAt: Timestamp.now() });
    });
    await batch.commit();
  }
  console.log(`✅ ${updates.length} props updated in weeklyProps_${season}`);
}

// ─── getPropsForWeek ──────────────────────────────────────────────────────────
// Queries flat weeklyProps_{season}, handles both Week and week field names
export async function getPropsForWeek(
  season: number,
  week: number
): Promise<Array<NFLProp & { id: string }>> {
  const ref = weeklyPropsRef(season);

  console.log(`📋 Querying weeklyProps_${season} for week ${week}...`);

  // Try PascalCase Week first (how loader saves it), fall back to lowercase
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
      const raw = d.data() as any;
      // Normalize PascalCase → camelCase for enrichment
      results.push({
        id:       d.id,
        player:   raw.Player   ?? raw.player   ?? '',
        prop:     raw.Prop     ?? raw.prop     ?? '',
        line:     raw.Line     ?? raw.line     ?? 0,
        team:     raw.Team     ?? raw.team     ?? '',
        matchup:  raw.Matchup  ?? raw.matchup  ?? '',
        gameDate: raw.GameDate ?? raw.gameDate ?? '',
        week:     raw.Week     ?? raw.week     ?? week,
        season:   raw.Season   ?? raw.season   ?? season,
        overUnder: raw.OverUnder ?? raw.overUnder ?? raw.over_under,
        fdOdds:   raw.FdOdds  ?? raw.fdOdds,
        dkOdds:   raw.DkOdds  ?? raw.dkOdds,
        // enrichment fields (may already exist)
        playerAvg:         raw.playerAvg         ?? null,
        seasonHitPct:      raw.seasonHitPct      ?? null,
        opponentRank:      raw.opponentRank      ?? null,
        opponentAvgVsStat: raw.opponentAvgVsStat ?? null,
        confidenceScore:   raw.confidenceScore   ?? null,
        bestEdgePct:       raw.bestEdgePct       ?? null,
        expectedValue:     raw.expectedValue     ?? null,
        kellyPct:          raw.kellyPct          ?? null,
        valueIcon:         raw.valueIcon         ?? null,
        actualResult:      raw.actualResult      ?? 'pending',
      });
    }
  }

  console.log(`📋 Found ${results.length} props in weeklyProps_${season} week ${week}`);
  return results;
}

// ─── getAllProps ───────────────────────────────────────────────────────────────
// Used by /api/all-props route — reads from allProps_{season}
// week param filters if provided; bust param bypasses any caching
export async function getAllProps(
  week: number | null,
  bust: boolean = false
): Promise<Array<NFLProp & { id: string }>> {
  // Determine season from week — week 1-3 may be prior season but default to 2025
  const season = 2025;
  const ref = allPropsRef(season);

  let query: FirebaseFirestore.Query = ref;
  if (week) {
    // Try both field name cases
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
        results.push(docWithId(d));
      }
    }
    return results;
  }

  const snapshot = await query.limit(5000).get();
  return snapshot.docs.map(docWithId);
}

// ─── getTopValueBets ──────────────────────────────────────────────────────────
export async function getTopValueBets(
  season: number,
  week: number,
  minEdge = 0.05,
  limit = 25
): Promise<Array<NFLProp & { id: string }>> {
  const props = await getPropsForWeek(season, week);
  return props
    .filter(p => (p.bestEdgePct ?? 0) > minEdge)
    .sort((a, b) => (b.bestEdgePct ?? 0) - (a.bestEdgePct ?? 0))
    .slice(0, limit);
}

// ─── movePropsToAllProps ──────────────────────────────────────────────────────
export async function movePropsToAllProps(
  season: number,
  week: number
): Promise<{ moved: number; skipped: number }> {
  const weeklySnap = await weeklyPropsRef(season).where('Week', '==', week).get();
  const weeklyLowerSnap = await weeklyPropsRef(season).where('week', '==', week).get();

  const allDocs = [...weeklySnap.docs, ...weeklyLowerSnap.docs];
  const seen = new Set<string>();
  const uniqueDocs = allDocs.filter(d => { if (seen.has(d.id)) return false; seen.add(d.id); return true; });

  if (!uniqueDocs.length) {
    console.log(`⚠️  No weekly props for season ${season} week ${week}`);
    return { moved: 0, skipped: 0 };
  }

  const destRef = allPropsRef(season);
  const existingSnap = await destRef.where('week', '==', week)
    .select('player', 'prop', 'matchup', 'week').get();
  const existingKeys = new Set(existingSnap.docs.map(d => dupKey(d.data() as NFLProp)));

  const BATCH_SIZE = 500;
  let moved = 0; let skipped = 0;

  for (let i = 0; i < uniqueDocs.length; i += BATCH_SIZE) {
    const chunk = uniqueDocs.slice(i, i + BATCH_SIZE);
    const writeBatch = db().batch();
    const deleteBatch = db().batch();
    let chunkMoved = 0;

    chunk.forEach(doc => {
      const { id: _id, ...data } = doc.data() as NFLProp & { id?: string };
      const key = dupKey({ ...data, week });
      deleteBatch.delete(doc.ref);
      if (existingKeys.has(key)) { skipped++; return; }
      writeBatch.set(destRef.doc(), {
        ...data,
        week,
        season,
        finalizedAt: Timestamp.now(),
        updatedAt:   Timestamp.now(),
      });
      existingKeys.add(key);
      chunkMoved++;
    });

    if (chunkMoved > 0) await writeBatch.commit();
    await deleteBatch.commit();
    moved += chunkMoved;
  }

  console.log(`✅ Moved ${moved} → allProps_${season} (${skipped} duplicates skipped)`);
  return { moved, skipped };
}

// ─── updateAllProps ───────────────────────────────────────────────────────────
export async function updateAllProps(
  season: number,
  updates: Array<{ id: string; data: Partial<NFLProp> }>
): Promise<void> {
  if (!updates.length) return;
  const col = db().collection(`allProps_${season}`);
  const BATCH_SIZE = 400;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = db().batch();
    const chunk = updates.slice(i, i + BATCH_SIZE);
    for (const { id, data } of chunk) {
      batch.set(col.doc(id), { ...data, _updatedAt: new Date().toISOString() }, { merge: true });
    }
    await batch.commit();
    console.log(`   ✅ Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${chunk.length} docs written to allProps_${season}`);
  }
}

// ─── PFR ID map ───────────────────────────────────────────────────────────────
export async function getPfrIdMap(): Promise<Record<string, string>> {
  const snapshot = await db().collection('pfr_id_map').get();
  const map: Record<string, string> = {};
  snapshot.docs.forEach(doc => {
    const data = doc.data() as { playerName: string; pfrId: string };
    map[data.playerName] = data.pfrId;
  });
  return map;
}

export async function savePfrId(playerName: string, pfrId: string): Promise<void> {
  await db().collection('pfr_id_map').add({ playerName, pfrId, createdAt: Timestamp.now() });
}

// ─── Player/Team map ──────────────────────────────────────────────────────────
export async function getPlayerTeamMap(): Promise<Record<string, string>> {
  const snapshot = await db().collection('player_team_map').get();
  const map: Record<string, string> = {};
  snapshot.docs.forEach(doc => {
    const data = doc.data() as { playerName: string; team: string };
    map[data.playerName.toLowerCase().trim()] = data.team.toUpperCase();
  });
  return map;
}