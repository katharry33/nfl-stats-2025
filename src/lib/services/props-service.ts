import { 
  collection, query, where, getDocs, limit, 
  startAfter, orderBy, QueryConstraint 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function fetchPaginatedProps(filters: any, lastDoc: any = null) {
  // Destructure with default values
  const { 
    league, 
    season, 
    date, 
    collection: colName, 
    limit: pageSize = 50 
  } = filters;

  const constraints: QueryConstraint[] = [];
  const targetCollection = colName || `nbaProps_${season || '2025'}`;

  // 1. League Filter (Matches your 'nba' string in DB)
  if (league) {
    constraints.push(where('league', '==', league));
  }

  // 2. Season Filter (Ensures it is a Number to match int64)
  if (season) {
    constraints.push(where('season', '==', Number(season)));
  }
  
  // 3. Date Filter (Matches "2026-03-23")
  if (date) {
    constraints.push(where('date', '==', date)); 
  }

  // 4. Ordering (Must match 'updatedAt' which exists in your docs)
  constraints.push(orderBy('updatedAt', 'desc'));

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }
  
  constraints.push(limit(pageSize));

  try {
    const q = query(collection(db, targetCollection), ...constraints);
    const snapshot = await getDocs(q);
    
    console.log(`[Firestore] Found ${snapshot.docs.length} docs for ${date}`);

    return {
      docs: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
      lastVisible: snapshot.docs[snapshot.docs.length - 1] || null
    };
  } catch (error: any) {
    // Check your browser console for an "Index Link" here!
    console.error("Firestore Query Failed:", error.message);
    return { docs: [], lastVisible: null };
  }
}