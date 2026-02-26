import { Firestore, doc, getDoc, setDoc, Timestamp } from "firebase/firestore";
import type { Wallet } from "@/lib/types";
import { resolveFirestoreDate } from "@/lib/types";

const WALLET_COLLECTION = "wallet";
const DEFAULT_WALLET_ID = "main";

export async function getWallet(firestore: Firestore, uid: string = DEFAULT_WALLET_ID): Promise<Wallet | null> {
  const docRef = doc(firestore, WALLET_COLLECTION, uid);
  const docSnap = await getDoc(docRef);
  
  if (docSnap.exists()) {
    const data = docSnap.data();
    // PATCH: Spread all fields from Firestore and use a safe type assertion.
    // This ensures all fields, including `updatedAt`, are present and normalizes dates.
    return {
      id: docSnap.id,
      ...data,
      balance: data.balance || 0,
      bonusBalance: data.bonusBalance || 0,
      updatedAt: data.updatedAt ? resolveFirestoreDate(data.updatedAt) : undefined,
      lastUpdated: data.lastUpdated ? resolveFirestoreDate(data.lastUpdated) : undefined,
    } as unknown as Wallet;
  }
  
  return null;
}

export async function updateWallet(
  firestore: Firestore, 
  updates: Partial<Omit<Wallet, 'id'>>,
  uid: string = DEFAULT_WALLET_ID
): Promise<void> {
  const docRef = doc(firestore, WALLET_COLLECTION, uid);
  
  const lastUpdatedValue = (updates as any).lastUpdated;
  
  const walletData = {
    ...updates,
    lastUpdated: (lastUpdatedValue && typeof (lastUpdatedValue as any).toDate === 'function') 
      ? (lastUpdatedValue as any).toDate() 
      : (lastUpdatedValue instanceof Date ? lastUpdatedValue : new Date()),
  };

  await setDoc(docRef, walletData, { merge: true });
}
