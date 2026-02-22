// src/lib/enrichment/firestore.ts
// Firestore read/write — uses firebase-admin (server-side only)
// Import this only in server components, API routes, or scripts

import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import type { NFLProp } from './types';

const db = () => getFirestore();

const propsRef = (season: number, week: number) =>
  db()
    .collection('seasons').doc(String(season))
    .collection('weeks').doc(String(week))
    .collection('props');

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

export async function saveProps(props: NFLProp[]): Promise<number> {
  if (!props.length) return 0;

  const { season, week } = props[0];
  const ref = propsRef(season, week);

  // Load existing keys to skip duplicates
  const existing = await ref.select('player', 'prop', 'matchup').get();
  const existingKeys = new Set(
    existing.docs.map(d => {
      const data = d.data();
      return `${data.player}||${data.prop}||${data.matchup}`.toLowerCase();
    })
  );

  const BATCH_SIZE = 500;
  let added = 0;

  for (let i = 0; i < props.length; i += BATCH_SIZE) {
    const chunk = props.slice(i, i + BATCH_SIZE);
    const batch = db().batch();
    let batchCount = 0;

    chunk.forEach(prop => {
      const key = `${prop.player}||${prop.prop}||${prop.matchup}`.toLowerCase();
      if (existingKeys.has(key)) return;

      batch.set(ref.doc(), {
        ...prop,
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      });
      existingKeys.add(key);
      batchCount++;
    });

    if (batchCount > 0) {
      await batch.commit();
      added += batchCount;
    }
  }

  console.log(`✅ Firestore: ${added} new props saved (${props.length - added} duplicates skipped)`);
  return added;
}

export async function updateProps(
  updates: Array<{ id: string; season: number; week: number; data: Partial<NFLProp> }>
): Promise<void> {
  if (!updates.length) return;
  const { season, week } = updates[0];
  const ref = propsRef(season, week);
  const BATCH_SIZE = 500;

  for (let i = 0; i < updates.length; i += BATCH_SIZE) {
    const batch = db().batch();
    const chunk = updates.slice(i, i + BATCH_SIZE);
    chunk.forEach(u => {
      batch.update(ref.doc(u.id), { ...u.data, updatedAt: Timestamp.now() });
    });
    await batch.commit();
  }

  console.log(`✅ Firestore: ${updates.length} props updated`);
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function getPropsForWeek(
  season: number,
  week: number
): Promise<Array<NFLProp & { id: string }>> {
  const snapshot = await propsRef(season, week).orderBy('confidenceScore', 'desc').get();
  return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as NFLProp) }));
}

export async function getTopValueBets(
  season: number,
  week: number,
  minEdge = 0.05,
  limit = 25
): Promise<Array<NFLProp & { id: string }>> {
  const snapshot = await propsRef(season, week)
    .where('bestEdgePct', '>', minEdge)
    .orderBy('bestEdgePct', 'desc')
    .limit(limit)
    .get();
  return snapshot.docs.map(d => ({ id: d.id, ...(d.data() as NFLProp) }));
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
