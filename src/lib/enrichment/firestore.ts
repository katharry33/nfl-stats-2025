// src/lib/enrichment/firestore.ts

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { NFLProp } from '@/lib/types';

const db = () => getFirestore();

const weeklyPropsRef = (season: number, week: number) =>
  db().collection(`weeklyProps_${season}`).doc(String(week)).collection('props');

const allPropsRef = (season: number) =>
  db().collection(`allProps_${season}`);

function dupKey(p: { player?: string; prop?: string; matchup?: string; week?: number | null }): string {
  return `${p.player ?? ''}||${p.prop ?? ''}||${p.matchup ?? ''}||${p.week ?? ''}`.toLowerCase();
}

export async function saveProps(props: NFLProp[]): Promise<number> {
  if (!props.length) return 0;
  const season = Number(props[0].season);
  const week   = props[0].week!;
  const ref    = weeklyPropsRef(season, week);

  const existing = await ref.select('player', 'prop', 'matchup', 'week').get();
  const existingKeys = new Set(existing.docs.map(d => dupKey(d.data() as NFLProp)));

  const BATCH_SIZE = 500;
  let added = 0;

  for (let i = 0; i < props.length; i += BATCH_SIZE) {
    const chunk = props.slice(i, i + BATCH_SIZE);
    const batch = db().batch();
    let batchCount = 0;
    chunk.forEach(prop => {
      const key = dupKey(prop);
      if (existingKeys.has(key)) return;
      batch.set(ref.doc(), { ...prop, createdAt: Timestamp.now(), updatedAt: Timestamp.now() });
      existingKeys.add(key);
      batchCount++;
    });
    if (batchCount > 0) { await batch.commit(); added += batchCount; }
  }

  console.log(`✅ ${added} props saved to weeklyProps_${season}/${week} (${props.length - added} skipped)`);
  return added;
}

export async function updateProps(
  updates: Array<{ id: string; season: number; week: number; data: Partial<NFLProp> }>
): Promise<void> {
  if (!updates.length) return;
  const { season, week } = updates[0];
  const ref = weeklyPropsRef(season, week);
  const BATCH_SIZE = 500;
  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = db().batch();
    updates.slice(i, i + BATCH_SIZE).forEach(u => {
      batch.update(ref.doc(u.id), { ...u.data, updatedAt: Timestamp.now() });
    });
    await batch.commit();
  }
  console.log(`✅ ${updates.length} props updated in weeklyProps_${season}/${week}`);
}

export async function getPropsForWeek(
  season: number, week: number
): Promise<Array<NFLProp & { id: string }>> {
  const snapshot = await weeklyPropsRef(season, week).orderBy('confidenceScore', 'desc').get();
  return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as NFLProp) }));
}

export async function getTopValueBets(
  season: number, week: number, minEdge = 0.05, limit = 25
): Promise<Array<NFLProp & { id: string }>> {
  const snapshot = await weeklyPropsRef(season, week)
    .where('bestEdgePct', '>', minEdge).orderBy('bestEdgePct', 'desc').limit(limit).get();
  return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as NFLProp) }));
}

export async function movePropsToAllProps(
  season: number, week: number
): Promise<{ moved: number; skipped: number }> {
  const weeklySnap = await weeklyPropsRef(season, week).get();
  if (weeklySnap.empty) {
    console.log(`⚠️  No weekly props for season ${season} week ${week}`);
    return { moved: 0, skipped: 0 };
  }

  const destRef = allPropsRef(season);
  const existingSnap = await destRef.where('week', '==', week)
    .select('player', 'prop', 'matchup', 'week').get();
  const existingKeys = new Set(existingSnap.docs.map(d => dupKey(d.data() as NFLProp)));

  const BATCH_SIZE = 500;
  let moved = 0; let skipped = 0;

  for (let i = 0; i < weeklySnap.docs.length; i += BATCH_SIZE) {
    const chunk = weeklySnap.docs.slice(i, i + BATCH_SIZE);
    const writeBatch = db().batch();
    const deleteBatch = db().batch();
    let chunkMoved = 0;

    chunk.forEach(doc => {
      const data = doc.data() as NFLProp;
      const key  = dupKey({ ...data, week });
      deleteBatch.delete(doc.ref);
      if (existingKeys.has(key)) { skipped++; return; }
      writeBatch.set(destRef.doc(), { ...data, week, season, finalizedAt: Timestamp.now(), updatedAt: Timestamp.now() });
      existingKeys.add(key);
      chunkMoved++;
    });

    if (chunkMoved > 0) await writeBatch.commit();
    await deleteBatch.commit();
    moved += chunkMoved;
  }

  console.log(`✅ Moved ${moved} → allProps_${season} (${skipped} duplicates skipped, weekly cleared)`);
  return { moved, skipped };
}

export async function getAllProps(
  season: number,
  filters: { week?: number; prop?: string; team?: string; minEdge?: number; valueOnly?: boolean; limit?: number } = {}
): Promise<Array<NFLProp & { id: string }>> {
  let query = allPropsRef(season).orderBy('confidenceScore', 'desc') as FirebaseFirestore.Query;
  if (filters.week)    query = query.where('week', '==', filters.week);
  if (filters.minEdge) query = query.where('bestEdgePct', '>', filters.minEdge);
  if (filters.limit)   query = query.limit(filters.limit);
  const snapshot = await query.get();
  let docs = snapshot.docs.map(d => ({ id: d.id, ...(d.data() as NFLProp) }));
  if (filters.prop)      docs = docs.filter(p => p.prop === filters.prop);
  if (filters.team)      docs = docs.filter(p => p.team === filters.team);
  if (filters.valueOnly) docs = docs.filter(p => ['🔥', '⚠️'].includes(p.valueIcon ?? ''));
  return docs;
}

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

export async function getPlayerTeamMap(): Promise<Record<string, string>> {
  const snapshot = await db().collection('player_team_map').get();
  const map: Record<string, string> = {};
  snapshot.docs.forEach(doc => {
    const data = doc.data() as { playerName: string; team: string };
    map[data.playerName.toLowerCase().trim()] = data.team.toUpperCase();
  });
  return map;
}