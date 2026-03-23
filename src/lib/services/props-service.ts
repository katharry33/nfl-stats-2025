import { 
  collection, query, where, getDocs, limit, 
  startAfter, orderBy, QueryConstraint 
} from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function fetchPaginatedProps(filters: any, lastDoc: any = null) {
  const { league, season, week, date, collection: colName, limit: pageSize = 50 } = filters;
  const constraints: QueryConstraint[] = [];

  // 1. Determine Collection
  const targetCollection = colName || (league === 'nba' ? 'nbaProps_2025' : 'allProps');

  // 2. Season Filter
  if (season) constraints.push(where('season', '==', season));
  
  // 3. NFL Week Filter (Handles both String and Number just in case)
  if (league === 'nfl' && week) {
    // If your DB has strings, remove the Number() wrapper
    constraints.push(where('week', '==', week.toString())); 
  }

  // 4. NBA Date Filter (CRITICAL: Ensure field name matches your Firestore)
  if (league === 'nba' && date) {
    // Check your Firestore: is the field 'gameDate' or just 'date'?
    constraints.push(where('date', '==', date)); 
  }

  // 5. Ordering & Pagination
  // NOTE: If you get a "Requires Index" error in the console, 
  // you MUST click the link provided in the error to create the composite index.
  constraints.push(orderBy('createdAt', 'desc'));

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }
  
  constraints.push(limit(pageSize));

  console.log(`[Firestore] Querying ${targetCollection}`, { filters });

  try {
    const q = query(collection(db, targetCollection), ...constraints);
    const snapshot = await getDocs(q);
    
    const docs = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));

    return {
      docs,
      lastVisible: snapshot.docs[snapshot.docs.length - 1] || null
    };
  } catch (error: any) {
    console.error("Firestore Query Failed:", error.message);
    // If it's an index error, the link will be in error.message
    return { docs: [], lastVisible: null };
  }
}