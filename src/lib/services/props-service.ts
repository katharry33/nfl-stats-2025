
import { db } from '@/lib/firebase';
import { collection, query, where, limit, getDocs, startAfter, orderBy } from 'firebase/firestore';

export async function fetchPaginatedProps(filters: any, pageParam: any) {
  const { league, season, date, week } = filters;
  
  // FIX: Ensure NFL points to allProps
  const collectionName = league === 'nfl' ? 'allProps' : 'nbaHistoricalProps';
  const propsRef = collection(db, collectionName);

  let constraints: any[] = [
    where('season', '==', Number(season)),
    limit(20) // Smaller chunks for faster loading
  ];

  // NFL Specifics
  if (league === 'nfl' && week && week !== 'All') {
    constraints.push(where('week', '==', Number(week)));
  }

  // NBA Specifics
  if (league === 'nba' && date) {
    constraints.push(where('date', '==', date));
  }

  // PAGINATION
  if (pageParam) {
    constraints.push(startAfter(pageParam));
  }

  /**
   * IMPORTANT: If you get 0 results for NFL, remove the line below.
   * Firestore requires a Composite Index for (season + week + playerName).
   * If you don't have that index yet, commenting out the orderBy will 
   * make the data reappear instantly (though it won't be alphabetical).
   */
  // constraints.push(orderBy('playerName', 'asc')); 

  const q = query(propsRef, ...constraints);
  const snapshot = await getDocs(q);

  return {
    docs: snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })),
    lastVisible: snapshot.docs[snapshot.docs.length - 1]
  };
}
