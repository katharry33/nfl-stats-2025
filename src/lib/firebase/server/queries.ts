import { adminDb } from "../index"; 
import { Bet, BetLeg, BetStatus } from "@/lib/types";

export async function getBettingLog(userId: string, limit: number = 50): Promise<Bet[]> {
  try {
    const snapshot = await adminDb
      .collection('bettingLog')
      .where('userId', '==', userId)
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    if (snapshot.empty) return [];

    const grouped = snapshot.docs.reduce((acc: Record<string, Bet>, doc) => {
      const data = doc.data();
      const key = data.parlayid || doc.id;

      if (!acc[key]) {
        acc[key] = {
          id: key,
          userId: data.userId,
          createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
          status: (data.status || 'pending') as BetStatus,
          stake: Number(data.stake) || 0,
          odds: Number(data.odds) || 0,
          payout: Number(data.payout) || 0,
          betType: data.bettype || 'straight',
          boost: !!data.boost && data.boost !== "None",
          legs: [],
          boostPercentage: Number(data.boostPercentage) || 0,
          isLive: !!data.isLive 
        };
      }

      const leg: BetLeg = {
        id: doc.id,
        propId: data.propId || doc.id,
        player: data.playerteam || data.player || 'Unknown',
        prop: data.prop || '',
        line: data.line || '',
        selection: data.selection || '',
        odds: Number(data.odds) || 0,
        status: (data.status || 'pending') as BetStatus,
        matchup: data.matchup || "",
        team: data.team || "",
        week: data.week || ""
      };

      acc[key].legs.push(leg);
      return acc;
    }, {});

    return Object.values(grouped);
  } catch (error) {
    console.error('Error in getBettingLog:', error);
    return [];
  }
}