// src/lib/services/props-service.ts
import { db } from '@/lib/firebase/config';
import { collection, query, where, limit, getDocs, startAfter, orderBy } from 'firebase/firestore';
import { hydrateProp } from '@/lib/enrichment/shared/normalize';

export async function fetchPaginatedProps(filters: any, pageParam: any) {
  const { league, season, date, week, vaultMode } = filters;
  
  const collectionName = vaultMode 
    ? (league === 'nfl' ? 'allProps' : 'nbaProps_2025') 
    : 'props';
  
  const constraints: any[] = [];

  // Season match (Ensure UI '2025' matches DB 2025)
  if (season) constraints.push(where('season', '==', Number(season)));

  // NFL Week Filter
  if (league === 'nfl' && week && week !== 'All') {
    constraints.push(where('week', '==', Number(week)));
  }

  // NBA Date Filter
  if (league === 'nba' && date) {
    constraints.push(where('gameDate', '==', String(date))); 
  }

  // ORDERING - This is the primary cause of empty results if indexes are missing.
  constraints.push(orderBy('gameDate', 'desc'));

  // PAGINATION
  if (pageParam) constraints.push(startAfter(pageParam));
  constraints.push(limit(40)); 

  const q = query(collection(db, collectionName), ...constraints);
  const snapshot = await getDocs(q);

  return {
    docs: snapshot.docs.map(doc => hydrateProp(doc.data(), doc.id)),
    lastVisible: snapshot.docs[snapshot.docs.length - 1] || null
  };
}