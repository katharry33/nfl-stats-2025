import { adminDb } from "../admin"; // Using the exported adminDb from your admin.ts
import { Prop, Bet, ScheduleEntry, SearchCriteria } from "../../types";
import type { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore';

// ============================================================================
// PROPS QUERIES
// ============================================================================

export async function getAllPropsFlexible(
  criteria?: SearchCriteria, 
  limitSize: number = 100
): Promise<Prop[]> {
  // Use adminDb.collection (not db.collection)
  let query: Query = adminDb.collection('allProps_2025');

  if (criteria) {
    // 1. Fix Week Filter: Avoid "number vs string" comparison error
    if (criteria.week !== undefined && criteria.week !== null) {
      const weekVal = typeof criteria.week === 'string' ? parseInt(criteria.week, 10) : criteria.week;
      if (!isNaN(weekVal)) {
        query = query.where('week', '==', weekVal);
      }
    }

    // 2. Fix Loop: Explicitly cast keys to string to satisfy Firestore where()
    const filterKeys: Array<keyof SearchCriteria> = ['player', 'prop', 'team', 'matchup'];
    
    for (const key of filterKeys) {
      const value = criteria[key];
      // Convert key to string to avoid "Type number is not assignable to string" error
      const fieldName = String(key);

      if (value && value !== '') {
        if (fieldName === 'player') {
          query = query.where('player', '>=', value).where('player', '<=', value + '\uf8ff');
        } else if (fieldName !== 'week') { // week handled separately above
          query = query.where(fieldName, '==', value);
        }
      }
    }
  }

  try {
    // Requires composite index for 7000+ docs when filtering and ordering
    const snapshot = await query
      .orderBy('week', 'desc')
      .limit(limitSize)
      .get();

    return snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
      id: doc.id,
      ...(doc.data() as any)
    })) as Prop[];
  } catch (error: any) {
    console.error("❌ Firestore Query Error:", error.message);
    return [];
  }
}

// ============================================================================
// BETTING LOG QUERIES
// ============================================================================

export async function getBettingLog(userId: string, limit: number = 50): Promise<Bet[]> {
  try {
    const snapshot = await adminDb
      .collection('bettingLog')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
      id: doc.id,
      ...(doc.data() as any)
    })) as Bet[];
  } catch (error) {
    console.error('Error fetching betting log:', error);
    return [];
  }
}

// ============================================================================
// SCHEDULE QUERIES
// ============================================================================

export async function getStaticSchedule(criteria?: {
  season?: string | null;
  week?: number;
  league?: string;
}): Promise<ScheduleEntry[]> {
  try {
    let query: Query = adminDb.collection('static_schedule');

    if (criteria?.season) query = query.where('season', '==', criteria.season);
    if (criteria?.week) query = query.where('week', '==', Number(criteria.week));
    if (criteria?.league) query = query.where('league', '==', criteria.league);

    query = query.orderBy('week').orderBy('gameTime', 'asc');

    const snapshot = await query.get();

    return snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
      id: doc.id,
      ...(doc.data() as any)
    })) as ScheduleEntry[];
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return [];
  }
}