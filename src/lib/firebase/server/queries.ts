// src/lib/firebase/server/queries.ts
import { adminDb } from "../admin";
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';

export async function getStaticData(collectionName: string, limit: number = 500, lastId?: string) {
  try {
    let query = adminDb.collection(collectionName).limit(limit);

    // Basic ordering to ensure pagination works
    // Note: Some static collections might not have "Week", so we fallback to __name__
    query = query.orderBy("__name__", "desc");

    if (lastId) {
      const lastDoc = await adminDb.collection(collectionName).doc(lastId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();
    
    return snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`❌ Error fetching ${collectionName}:`, error);
    throw error;
  }
}

export async function getStaticSchedule() {
  const snap = await adminDb.collection('static_schedule').orderBy('week').get();
  return snap.docs.map((d: QueryDocumentSnapshot) => ({ id: d.id, ...d.data() }));
}
