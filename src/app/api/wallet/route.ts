import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

const WALLET_COLLECTION = 'wallet';
const USER_WALLET_DOC = 'dev-wallet'; // Assuming a single wallet for our dev user

export async function GET() {
  try {
    const docRef = adminDb.collection(WALLET_COLLECTION).doc(USER_WALLET_DOC);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      // If wallet doesn't exist, create it with default values
      const defaultWallet = { bankroll: 1000, bonusBalance: 250 };
      await docRef.set(defaultWallet);
      return NextResponse.json(defaultWallet);
    }

    const walletData = docSnap.data();
    return NextResponse.json({
      bankroll: walletData?.bankroll ?? 0,
      bonusBalance: walletData?.bonusBalance ?? 0,
    });

  } catch (error: any) {
    console.error("API GET Wallet Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
