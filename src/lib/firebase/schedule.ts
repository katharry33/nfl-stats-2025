import { collection, getDocs, query, where, orderBy } from "firebase/firestore";
import { db } from "./client"; // Import from client
import type { ScheduleEntry } from "@/lib/types";

// MOVED: Declare constant before using it
const STATIC_SCHEDULE_COLLECTION = "schedule";

/**
 * Fetch schedule entries from Firestore (client-side)
 */
export async function getSchedule(
  weekFilter?: number,
  leagueFilter?: string
): Promise<ScheduleEntry[]> {
  try {
    const scheduleRef = collection(db, STATIC_SCHEDULE_COLLECTION);
    let q = query(scheduleRef, orderBy("gameTime", "asc"));
    
    if (weekFilter) {
      q = query(q, where("week", "==", weekFilter));
    }
    
    if (leagueFilter) {
      q = query(q, where("league", "==", leagueFilter));
    }
    
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as ScheduleEntry[];
  } catch (error) {
    console.error("Error fetching schedule:", error);
    return [];
  }
}