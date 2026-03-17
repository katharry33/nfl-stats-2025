import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';

export async function POST(req: Request) {
  try {
    const { selections, stake, totalOdds, expectedValue, uid } = await req.json();

    const result = await adminDb.runTransaction(async (transaction) => {
      const walletRef = adminDb.collection('wallets').doc(uid);
      const walletSnap = await transaction.get(walletRef);

      if (!walletSnap.exists) throw new Error("Wallet not found");
      
      const { bankroll, bonusBalance } = walletSnap.data()!;
      const totalAvailable = bankroll + bonusBalance;

      if (stake > totalAvailable) throw new Error("Insufficient funds");

      // 1. Calculate Deduction (Bonus First Logic)
      const bonusDeduction = Math.min(stake, bonusBalance);
      const cashDeduction = stake - bonusDeduction;

      // 2. Update Wallet
      transaction.update(walletRef, {
        bankroll: adminDb.FieldValue.increment(-cashDeduction),
        bonusBalance: adminDb.FieldValue.increment(-bonusDeduction),
        lastUpdated: new Date().toISOString()
      });

      // 3. Create Betting Log Entry
      const betRef = adminDb.collection('bettingLog').doc();
      transaction.set(betRef, {
        id: betRef.id,
        userId: uid,
        selections,
        stake,
        cashStake: cashDeduction,
        bonusStake: bonusDeduction,
        totalOdds,
        expectedValue,
        status: 'pending',
        timestamp: new Date().toISOString()
      });

      return { bonusDeduction, cashDeduction };
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}