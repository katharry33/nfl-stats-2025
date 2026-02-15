import { collection, query, where, onSnapshot, getFirestore } from 'firebase/firestore';
import { app } from './client'; // Ensure client-side app is imported
import type { Bet } from '../types';

const db = getFirestore(app);

export function getBetsStream(userId: string, callback: (bets: Bet[]) => void) {
  const betsRef = collection(db, 'bettingLog');
  const q = query(betsRef, where('userId', '==', userId));

  const unsubscribe = onSnapshot(q, (snapshot) => {
    const bets = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as Bet));
    callback(bets);
  });

  return unsubscribe;
}
