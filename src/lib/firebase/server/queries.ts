import { adminDb } from "../index"; 
import { Bet } from "@/lib/types";

export async function getStaticSchedule() {
  // Your logic here
  return []; 
}

export async function getBettingLog(limit: number = 100): Promise<Bet[]> {
  try {
    console.log('Fetching master betting log from "bettingLog" collection...');
    const snapshot = await adminDb
      .collection('bettingLog')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const rawBets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log(`Fetched ${rawBets.length} raw documents for grouping.`);
    
    const groupedBets: { [key: string]: Bet } = {};

    rawBets.forEach((item: any) => {
      // If it has a parlayId, it's a legacy parlay leg. Group it.
      if (item.parlayId) {
        // If we haven't seen this parlayId yet, create the main parlay entry.
        if (!groupedBets[item.parlayId]) {
          groupedBets[item.parlayId] = {
            ...item, // Use the first leg's data as a base for the parlay
            id: item.parlayId, // The main ID is the parlayId
            betType: 'parlay',
            legs: [] // Initialize the legs array
          };
        }
        // Add the current item as a leg to its corresponding parlay.
        groupedBets[item.parlayId].legs.push({
          id: item.id,
          player: item.player || item.playerName,
          prop: item.prop || item.category,
          line: item.line,
          selection: item.selection,
          odds: item.odds,
          status: item.status,
          matchup: item.matchup,
          team: item.team,
        });
      } else {
        // This is a straight bet or a modern bet with a legs array.
        groupedBets[item.id] = {
          ...item,
          betType: item.betType || 'straight',
          // If legs don't exist, create a single-leg array for consistency.
          legs: item.legs || [{ ...item }] 
        };
      }
    });

    const result = Object.values(groupedBets);
    console.log(`Returning ${result.length} grouped bets.`);
    return result;

  } catch (error) {
    console.error('Error in getBettingLog:', error);
    return [];
  }
}
