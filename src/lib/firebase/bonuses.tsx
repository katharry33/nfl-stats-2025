import { adminDb } from './admin';
import { Bonus } from '../types';

export async function getActiveBonuses(): Promise<Bonus[]> {
  try {
    const snapshot = await adminDb.collection('bonuses').get();

    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      return {
        id:             docSnap.id,
        name:           data.name           ?? 'Generic Bonus',
        boost:          data.boost          ?? 0,
        betType:        data.betType        ?? 'All',
        maxWager:       data.maxWager       ?? 0,
        eligibleTypes:  data.eligibleTypes  ?? [],   // ← was missing, required by Bonus type
        isExpired:      data.isExpired      ?? false,
        startDate:      data.startDate      ?? '',
        endDate:        data.endDate        ?? '',
        description:    data.description   ?? '',
        expirationDate: data.expirationDate ?? data.endDate ?? '',
        status:         data.status         ?? 'active',
        createdAt:      data.createdAt      ?? new Date().toISOString(),
        ...data,
      } as unknown as Bonus;  // unknown cast needed because ...data spreads unknown fields
    });
  } catch (error) {
    console.error('❌ Error fetching bonuses:', error);
    return [];
  }
}