import { NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase/admin';

// Constants
const WALLET_COLLECTION = 'wallet';
const USER_WALLET_DOC = 'dev-wallet';

/**
 * GET /api/wallet
 * Fetches the user's wallet or initializes it if it doesn't exist.
 */
export async function GET() {
  try {
    // 1. Validate Firebase Admin initialized
    if (!adminDb) {
      throw new Error("Firebase Admin DB not initialized");
    }

    const docRef = adminDb.collection(WALLET_COLLECTION).doc(USER_WALLET_DOC);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      const defaultWallet = { 
        bankroll: 1000, 
        bonusBalance: 250,
        updatedAt: new Date().toISOString() 
      };
      
      await docRef.set(defaultWallet);
      return NextResponse.json(defaultWallet);
    }

    const walletData = docSnap.data();
    
    // 2. Return data with safe fallbacks
    return NextResponse.json({
      bankroll: walletData?.bankroll ?? 0,
      bonusBalance: walletData?.bonusBalance ?? 0,
    });

  } catch (error: any) {
    console.error("API GET Wallet Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message }, 
      { status: 500 }
    );
  }
}

// Optional: Prevent caching for wallet balances
export const dynamic = 'force-dynamic';