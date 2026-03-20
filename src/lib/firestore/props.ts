// apps/web/src/lib/firestore/props.ts
import { adminDb } from '@/lib/firebase/admin';

export async function getPropsForWeek(week: number, season: number = 2025) {
  const snapshot = await adminDb
    .collection('seasons').doc(String(season))
    .collection('weeks').doc(String(week))
    .collection('props')
    .orderBy('confidenceScore', 'desc')
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));
}

export async function getTopValueBets(week: number, season: number = 2025) {
  const snapshot = await adminDb
    .collection('seasons').doc(String(season))
    .collection('weeks').doc(String(week))
    .collection('props')
    .where('bestEdgePct', '>', 0.05)
    .orderBy('bestEdgePct', 'desc')
    .limit(20)
    .get();

  return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}
export async function updateProps(updates: any[], sport: string, season: number) {
  const batch = db.batch();
  const collectionName = `${sport}_props_${season}`;
  
  updates.forEach(({ id, data }) => {
    const ref = db.collection(collectionName).doc(id);
    batch.set(ref, data, { merge: true });
  });

  return batch.commit();
}