import { adminDb } from './admin';
import { Bonus } from '../types';

export async function getActiveBonuses(): Promise<Bonus[]> {
  try {
    const snapshot = await adminDb.collection('bonuses').get();
    
    return snapshot.docs.map((docSnap) => {
      const data = docSnap.data();
      
      // We must include all properties defined in the Bonus interface
      // to avoid the "neither type sufficiently overlaps" error.
      return {
        id: docSnap.id,
        name: data.name || 'Generic Bonus',
        boost: data.boost || 0,
        betType: data.betType || 'All',
        maxWager: data.maxWager || 0,
        isExpired: data.isExpired || false,
        startDate: data.startDate || '',
        endDate: data.endDate || '',
        description: data.description || '',
        
        // --- Added missing properties required by the Bonus interface ---
        expirationDate: data.expirationDate || data.endDate || '', 
        status: data.status || 'active',
        createdAt: data.createdAt || new Date().toISOString(),
        
        ...data // This allows any other existing data to be passed through
      } as Bonus;
    });
  } catch (error) {
    console.error("❌ Error fetching bonuses:", error);
    return [];
  }
}