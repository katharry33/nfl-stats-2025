import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config'; 
import { collection, query, onSnapshot, orderBy } from 'firebase/firestore';
import { toast } from 'sonner';

export function usePlayerRegistry(sport: 'NFL' | 'NBA') {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    
    // 1. Determine the correct collection and sort field
    const collectionName = sport === 'NFL' ? 'static_pfrIdMap' : 'nba_player_registry';
    const sortField = sport === 'NFL' ? 'player' : 'playerName';

    const colRef = collection(db, collectionName);
    const q = query(colRef, orderBy(sortField, 'asc'));

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const playerData = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setPlayers(playerData);
        setLoading(false);
      },
      (error) => {
        // Handle permission errors (common if Firestore rules aren't set to public)
        console.error("Firestore Subscription Error:", error);
        toast.error(`Failed to sync ${sport} registry`);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount or sport change
    return () => unsubscribe();
  }, [sport]);

  return { players, loading };
}