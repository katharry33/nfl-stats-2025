import { adminDb } from "../admin";
import type { Wallet } from "@/lib/types";

const WALLET_COLLECTION = "wallets"; // Use plural to match your other routes

export async function getWallet(uid: string): Promise<Wallet | null> {
  const docRef = adminDb.collection(WALLET_COLLECTION).doc(uid);
  const docSnap = await docRef.get();
  
  if (docSnap.exists) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      balance: data?.balance || 0,
      bonusBalance: data?.bonusBalance || 0,
      // Admin SDK timestamps have a .toDate() method
      updatedAt: data?.updatedAt?.toDate() || new Date(),
      lastUpdated: data?.lastUpdated?.toDate() || new Date(),
    } as unknown as Wallet;
  }
  
  return null;
}

export async function updateWallet(
  uid: string,
  updates: Partial<Omit<Wallet, 'id'>>
): Promise<void> {
  const docRef = adminDb.collection(WALLET_COLLECTION).doc(uid);
  
  const cleanUpdates = {
    ...updates,
    lastUpdated: new Date(), // Automatically set server-side timestamp
  };

  // .set with { merge: true } is safe, but .update is more standard for existing docs
  await docRef.set(cleanUpdates, { merge: true });
}