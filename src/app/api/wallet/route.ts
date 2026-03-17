import { NextResponse } from 'next/server';
import { adminDb, adminAuth } from '@/lib/firebase/admin';
import { cookies } from 'next/headers';

const WALLET_COLLECTION = 'wallets';

export async function GET() {
  try {
    // 1. Authenticate the User (Assuming you use a session cookie or Bearer token)
    // For now, we'll mimic the logic to fetch via your auth provider
    const sessionCookie = cookies().get('__session')?.value;
    if (!sessionCookie) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const decodedToken = await adminAuth.verifySessionCookie(sessionCookie);
    const uid = decodedToken.uid;

    const docRef = adminDb.collection(WALLET_COLLECTION).doc(uid);

    // 2. Use a Transaction to ensure data integrity during initialization
    const walletData = await adminDb.runTransaction(async (transaction) => {
      const docSnap = await transaction.get(docRef);

      if (!docSnap.exists) {
        const defaultWallet = {
          userId: uid,
          bankroll: 1000,
          bonusBalance: 250,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        transaction.set(docRef, defaultWallet);
        return defaultWallet;
      }

      return docSnap.data();
    });

    return NextResponse.json({
      bankroll: walletData?.bankroll ?? 0,
      bonusBalance: walletData?.bonusBalance ?? 0,
    });

  } catch (error: any) {
    console.error("API GET Wallet Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}