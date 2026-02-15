import { adminDb } from './firebase/admin';
import { normalizeBet } from './services/bet-normalizer';
import { Bet, PropRow } from './types';

/**
 * Fetches historical props from the admin firestore instance.
 * Note: Admin SDK uses .collection().get() instead of getDocs(collection())
 */
export async function getHistoricalProps() {
  try {
    // The Admin SDK 'adminDb' is already an instance of Firestore
    const historicalRef = adminDb.collection('historical_props');
    
    // Fixed the typo and used the Admin .get() method
    const snapshot = await historicalRef.get();
    
    // Added type safety to the map parameter 'd'
    const props = snapshot.docs.map((d: any) => ({
      id: d.id,
      ...d.data()
    })) as PropRow[];

    return props;
  } catch (error) {
    console.error("Error fetching historical props:", error);
    return [];
  }
}