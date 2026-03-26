// src/lib/services/props-service.ts
import { db } from '@/lib/firebase/config';
import { 
  collection, query, where, limit, getDocs, 
  startAfter, orderBy, doc, getDoc 
} from 'firebase/firestore';
import { hydrateProp } from '@/lib/enrichment/shared/normalize';

const getCollectionPath = (league: 'nba' | 'nfl', season: number) => {
  // Logic: 2025 NBA Season starts in 2025 but spans into 2026.
  // Data is stored in nbaProps_2025.
  if (league === 'nba') return `nbaProps_${season}`;
  if (league === 'nfl') return season === 2024 ? 'allProps' : `nflProps_${season}`;
  return 'allProps';
};

export async function fetchPaginatedProps(filters: any, pageParam: any) {
  const { league, season, date, week, pageSize = 40 } = filters;
  const collectionName = getCollectionPath(league, season);
  const constraints: any[] = [];

  // 1. Basic Filters
  if (season) constraints.push(where('season', '==', Number(season)));

  if (league === 'nfl' && week && week !== 'All') {
    constraints.push(where('week', '==', Number(week)));
  }

  if (league === 'nba' && date) {
    // Ensure date is string "YYYY-MM-DD"
    constraints.push(where('gameDate', '==', String(date))); 
  }

  // 2. Ordering - MUST HAVE COMPOSITE INDEX in Firebase
  constraints.push(orderBy('gameDate', 'desc'));

  // 3. Pagination Fix: Convert ID to DocumentSnapshot
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
      // Use doc.id for the hydrate helper to ensure keys are unique
      docs: snapshot.docs.map(d => ({ 
        ...hydrateProp(d.data(), d.id), 
        id: d.id 
      })),
      // Pass the DocumentSnapshot back for the next cursor
      lastVisible: snapshot.docs[snapshot.docs.length - 1] || null
    };
  } catch (error: any) {
    // If you see "The query requires an index" here, follow the link in the console!
    console.error("Firestore Query Failed:", error.message);
    throw error;
  }
}