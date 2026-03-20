import { adminDb } from '@/lib/firebase/admin';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore'; // Add this import

/**
 * Helper to resolve the collection name based on sport and season.
 */
function getCollectionName(sport: string, season: number) {
  const s = sport.toLowerCase();
  // Matches your current logic: NFL = allProps, NBA = nbaProps
  const prefix = s === 'nba' ? 'nbaProps' : 'allProps';
  return `${prefix}_${season}`;
}

export async function getPropsByLeague(league: string, season: number = 2025, week?: number) {
  const colName = getCollectionName(league, season);
  let query: any = adminDb.collection(colName);

  // If a week is provided, filter for it
  if (week) {
    query = query.where('week', '==', Number(week));
  }

  // Use confidenceScore for sorting (Ensure NFL/NBA docs have this field!)
  const snapshot = await query
    .orderBy('confidenceScore', 'desc')
    .limit(200)
    .get();

  // FIX: Type the 'doc' parameter
  return snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
    id: doc.id,
    league, // Inject league for frontend consistency
    ...doc.data(),
  }));
}

export async function getTopValueBets(league: string, season: number = 2025) {
  const colName = getCollectionName(league, season);
  
  const snapshot = await adminDb
    .collection(colName)
    .where('bestEdgePct', '>', 0.05)
    .orderBy('bestEdgePct', 'desc')
    .limit(20)
    .get();

  // FIX: Type the 'doc' parameter
  return snapshot.docs.map((doc: QueryDocumentSnapshot) => ({ 
    id: doc.id, 
    league,
    ...doc.data() 
  }));
}

export async function updateProps(updates: any[], sport: string, season: number) {
  const batch = adminDb.batch();
  const collectionName = getCollectionName(sport, season);
  
  updates.forEach(({ id, data }) => {
    const ref = adminDb.collection(collectionName).doc(id);
    batch.set(ref, {
      ...data,
      updatedAt: new Date().toISOString()
    }, { merge: true });
  });

  return batch.commit();
}
