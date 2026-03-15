import { FirestoreDataConverter, QueryDocumentSnapshot } from 'firebase/firestore';
import { BonusSchema, type Bonus } from '../types';

export const bonusConverter: FirestoreDataConverter<Bonus> = {
  toFirestore: (bonus) => bonus,
  fromFirestore: (snapshot: QueryDocumentSnapshot) => {
    const data = snapshot.data();
    // This is the "Sync Check": It validates the Firestore data against your TS schema
    const result = BonusSchema.safeParse({ id: snapshot.id, ...data });
    
    if (!result.success) {
      console.error(`❌ Schema Mismatch in Bonus ${snapshot.id}:`, result.error.format());
      return data as Bonus; // Fallback to avoid breaking the app
    }
    return result.data;
  }
};