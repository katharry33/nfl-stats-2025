// src/app/api/props/route.ts
import { adminDb } from '../../../lib/firebase/admin';
import { QueryDocumentSnapshot } from 'firebase-admin/firestore';
import * as admin from 'firebase-admin';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const league = (searchParams.get('league') || 'nfl').toLowerCase();
  
  const seasonParam = searchParams.get('season');
  const seasonValue = seasonParam ? Number(seasonParam) : 2025; 

  const cursor = searchParams.get('cursor');
  const limitNum = 50; // Set a page size for pagination

  const collectionPath = league === 'nba' 
    ? `nbaProps_${seasonValue}` 
    : 'allProps';
    let query: admin.firestore.Query<admin.firestore.DocumentData> = adminDb.collection(collectionPath);
    
  if (league === 'nfl') {
    query = query.where('season', '==', seasonValue);
  }

  const week = searchParams.get('week');
  if (league === 'nfl' && week && week !== 'All') {
    query = query.where('week', '==', Number(week));
  }

  const date = searchParams.get('date');
  if (league === 'nba' && date && date !== 'All') {
    query = query.where('gameDate', '==', date);
  }

  query = query.orderBy(admin.firestore.FieldPath.documentId()).limit(limitNum);

  if (cursor) {
    query = query.startAfter(cursor);
  }

  const snapshot = await query.get();
  
  const docs = snapshot.docs.map((doc: QueryDocumentSnapshot) => {
    const d = doc.data();
    return {
      id: doc.id,
      player: d.player ?? d.brid,
      matchup: d.matchup ?? 'N/A',
      prop: d.prop,
      line: d.line,
      avg: d.playerAvg ?? '—',
      oppRnk: d.opponentRank ? `#${d.opponentRank}` : '#—',
      ev: d.expectedValue ? d.expectedValue.toFixed(2) : '—',
      conf: d.confidenceScore ? `${d.confidenceScore.toFixed(1)}%` : '—',
      edge: isNaN(parseFloat(d.bestEdge)) ? 0 : d.bestEdge,
      winProb: d.winprobability ?? d.modelProb ?? 0,
      gameDate: d.gameDate ?? d.date ?? '',
      status: d.status ?? d.result ?? 'pending'
    };
  });

  const lastVisible = snapshot.docs[snapshot.docs.length - 1];
  const nextCursor = lastVisible ? lastVisible.id : null;

  return Response.json({ docs, nextCursor });
}
