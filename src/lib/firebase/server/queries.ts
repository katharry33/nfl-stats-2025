import { adminDb } from "../admin";
import { Prop, Bet, ScheduleEntry, SearchCriteria, PropData } from "../../types";
import type { Query, QueryDocumentSnapshot } from 'firebase-admin/firestore';

// ============================================================================
// PROPS QUERIES
// ============================================================================

export async function getAllPropsFlexible(
  criteria?: SearchCriteria, 
  limitSize: number = 100
): Promise<PropData[]> {
  let query: Query = adminDb.collection('allProps_2025');

  if (criteria) {
    if (criteria.week !== undefined && criteria.week !== null && criteria.week !== 'all') {
      const weekVal = typeof criteria.week === 'string' ? parseInt(criteria.week, 10) : criteria.week;
      if (!isNaN(weekVal)) {
        query = query.where('week', '==', weekVal);
      }
    }
    if (criteria.player) {
      query = query
        .where('player', '>=', criteria.player)
        .where('player', '<=', criteria.player + '\uf8ff')
        .orderBy('player');
    }
    if (criteria.team) query = query.where('team', '==', criteria.team);
    if (criteria.prop) query = query.where('prop', '==', criteria.prop);
    if (criteria.matchup) query = query.where('matchup', '==', criteria.matchup);
  }

  try {
    if (!criteria?.player) {
      query = query.orderBy('week', 'desc');
    }

    const snapshot = await query.limit(limitSize).get();

    return snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
      id: doc.id,
      ...(doc.data() as any)
    })) as PropData[];
  } catch (error: any) {
    console.error("❌ Firestore Query Error:", error.message);
    return [];
  }
}

// Alias the function to satisfy the page's import.
export const fetchProps = getAllPropsFlexible;

// The function now fetches its own data and correctly filters the week values.
export async function getFilterOptions() {
  const props = await getAllPropsFlexible({}, 1000);
  
  return {
    teams: Array.from(new Set(props.map(p => p.team))).sort(),
    propTypes: Array.from(new Set(props.map(p => p.prop))).sort(),
    // .filter((w): w is number => typeof w === 'number') ensures undefined is removed
    weeks: Array.from(new Set(props.map(p => p.week)))
      .filter((w): w is number => typeof w === 'number') 
      .sort((a, b) => a - b)
  };
}


// ============================================================================
// BETTING LOG QUERIES
// ============================================================================

export async function getBettingLog(userId: string, limit: number = 50): Promise<Bet[]> {
  try {
    const snapshot = await adminDb
      .collection('user_bets')
      .where('userId', '==', userId)
      .orderBy('placedAt', 'desc')
      .limit(limit)
      .get();
    
    return snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
      id: doc.id,
      ...(doc.data() as any)
    })) as Bet[];
  } catch (error: any) {
    console.error('Error fetching betting log:', error.message);
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
    if (criteria?.week) {
        const weekNum = Number(criteria.week);
        if (!isNaN(weekNum)) query = query.where('week', '==', weekNum);
    }
    if (criteria?.league) query = query.where('league', '==', criteria.league);

    query = query.orderBy('week', 'asc').orderBy('gameTime', 'asc');

    const snapshot = await query.get();

    return snapshot.docs.map((doc: QueryDocumentSnapshot) => ({
      id: doc.id,
      ...(doc.data() as any)
    })) as ScheduleEntry[];
  } catch (error: any) {
    console.error('Error fetching schedule:', error.message);
    return [];
  }
}

// ============================================================================
// UTILITIES
// ============================================================================

export function getWeekFromParams(weekParam: string | undefined): number {
  const currentNFLWeek = 1; 
  if (!weekParam || weekParam === 'all') return currentNFLWeek;
  
  const week = parseInt(weekParam, 10);
  return (isNaN(week) || week < 1 || week > 22) ? currentNFLWeek : week;
}

export async function fetchWeeklyProps(week: number): Promise<Prop[]> {
  try {
      const snapshot = await adminDb.collection('allProps_2025')
        .where('week', '==', week)
        .limit(1000)
        .get();
        
      return snapshot.docs.map(doc => ({ id: doc.id, ...(doc.data() as any) })) as Prop[];
  } catch (e) {
      return [];
  }
}
