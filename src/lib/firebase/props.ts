import { adminDb } from "@/lib/firebase/admin";
import { Prop } from "@/lib/types";

/**
 * Server-side fetch for all player props
 */
export async function getAllProps(): Promise<Prop[]> {
  try {
    const db = adminDb;
    const snapshot = await db.collection("props").get();

    // FIXED: Added : any to clear TS7006
    return snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    })) as Prop[];
  } catch (error) {
    console.error("Error fetching props:", error);
    return [];
  }
}

/**
 * Server-side fetch for player props by week
 */
export async function getPropsByWeek(week: number): Promise<Prop[]> {
    try {
        const db = adminDb;
        const snapshot = await db.collection("props").where("Week", "==", week).get();

        return snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
        })) as Prop[];
    } catch (error) {
        console.error(`Error fetching props for week ${week}:`, error);
        return [];
    }
}
