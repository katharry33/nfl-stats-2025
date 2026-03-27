// src/lib/services/props-service.ts
import { db } from '@/lib/firebase/config';
import { 
  collection, query, where, limit, getDocs, 
  startAfter, orderBy, doc, getDoc 
} from 'firebase/firestore';

const getCollectionPath = (league: 'nba' | 'nfl', season: number) => {
  if (league === 'nba') return `nbaProps_${season}`;
  if (league === 'nfl') return `nflProps_${season}`;
  return 'allProps';
};

export async function fetchPaginatedProps(filters: any, pageParam: any) {
  const { league, season, date, week, pageSize = 40 } = filters;
  const collectionName = getCollectionPath(league, season);
  const constraints: any[] = [];

  // NFL season filter (NBA is already season-scoped)
  if (league === 'nfl') {
    constraints.push(where('season', '==', Number(season)));
  }

  // NFL week filter
  if (league === 'nfl' && week && week !== 'All') {
    constraints.push(where('week', '==', Number(week)));
  }

  // NBA date filter
  if (league === 'nba' && date) {
    constraints.push(where('gameDate', '==', String(date)));
  }

  // Ordering
  constraints.push(orderBy('gameDate', 'desc'));

  // Pagination cursor
  if (pageParam) {
    const docRef = doc(db, collectionName, pageParam);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      constraints.push(startAfter(docSnap));
    }
  }

  constraints.push(limit(pageSize));

  try {
    const q = query(collection(db, collectionName), ...constraints);
    const snapshot = await getDocs(q);

    return {
      docs: snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      })),
      lastVisible: snapshot.docs[snapshot.docs.length - 1] || null
    };
  } catch (error: any) {
    console.error("Firestore Query Failed:", error.message);
    throw error;
  }
}
