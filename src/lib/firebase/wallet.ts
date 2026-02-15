import { Firestore, doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import type { Wallet } from "@/lib/types";

// Using a dynamic ID or a subcollection is usually better for multi-user apps
const WALLET_COLLECTION = "wallet";
const DEFAULT_WALLET_ID = "main";

/**
 * Fetches the wallet. 
 * If no uid is provided, it defaults to the 'main' wallet.
 */
export async function getWallet(firestore: Firestore, uid: string = DEFAULT_WALLET_ID): Promise<Wallet | null> {
  const docRef = doc(firestore, WALLET_COLLECTION, uid);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      userId: data.userId,
      balance: data.balance || 0,
      bonusBalance: data.bonusBalance || 0, // Provide the missing required field
      lastUpdated: data.lastUpdated || new Date().toISOString(),
    } as Wallet;
  }
  
  // ADDED: Missing return statement for when wallet doesn't exist
  return null;
}

/**
 * Updates the wallet document.
 * Handles the date normalization to ensure 'lastUpdated' is always a valid JS Date or Timestamp.
 */
export async function updateWallet(
  firestore: Firestore, 
  updates: Partial<Omit<Wallet, 'id'>>,
  uid: string = DEFAULT_WALLET_ID
): Promise<void> {
  const docRef = doc(firestore, WALLET_COLLECTION, uid);
  
  // Logic fix: Check if updates contains lastUpdated, otherwise use current date
  // FIXED: Cast to any to access lastUpdated since TypeScript doesn't know about it in the Partial type
  const lastUpdatedValue = (updates as any).lastUpdated;
  
  const walletData = {
    ...updates,
    lastUpdated: (lastUpdatedValue && typeof (lastUpdatedValue as any).toDate === 'function') 
      ? (lastUpdatedValue as any).toDate() 
      : (lastUpdatedValue instanceof Date ? lastUpdatedValue : new Date()),
  };

  await setDoc(docRef, walletData, { merge: true });
}