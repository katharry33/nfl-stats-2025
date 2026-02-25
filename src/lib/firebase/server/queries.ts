// src/lib/firebase/server/queries.ts
import { getAdminDb } from "../admin";

export async function getStaticData(collectionName: string, limit: number = 500, lastId?: string) {
  try {
    const db = getAdminDb();
    let query = db.collection(collectionName).limit(limit);

    // Basic ordering to ensure pagination works
    // Note: Some static collections might not have "Week", so we fallback to __name__
    query = query.orderBy("__name__", "desc");

    if (lastId) {
      const lastDoc = await db.collection(collectionName).doc(lastId).get();
      if (lastDoc.exists) {
        query = query.startAfter(lastDoc);
      }
    }

    const snapshot = await query.get();
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    console.error(`❌ Error fetching ${collectionName}:`, error);
    throw error;
  }
}

// Added the missing function
export async function getStaticSchedule() {
  return getStaticData('schedule');
}
