import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config'; 
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { toast } from 'sonner';

export function usePlayerRegistry(sport: 'NFL' | 'NBA') {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setPlayers([]); 
    setLoading(true);

    // NFL uses the old PFR map; NBA uses the newer mapping collection
    const collectionName = sport === 'NFL' ? 'static_pfrIdMap' : 'static_playerTeamMapping';
    const sortField = sport === 'NFL' ? 'player' : 'playerName';

    try {
      const colRef = collection(db, collectionName);
      const q = query(colRef, orderBy(sortField, 'asc'), limit(1000));

      const unsubscribe = onSnapshot(q, 
        (snapshot) => {
          if (snapshot.empty) {
            setPlayers([]);
          } else {
            // Use a Map to prevent duplicate players based on their BDL ID
            const playerMap = new Map();

            snapshot.docs.forEach(doc => {
              const data = doc.data();
              
              // Normalize IDs first to use as a unique key
              const bdlIdStr = data.bdlId?.toString() || "";
              const pfridStr = (data.pfrid || data.pfrId || "").toString();
              
              const normalizedPlayer = {
                id: doc.id,
                sport: sport,
                
                // 1. NAME NORMALIZATION
                // Covers 'playerName', 'player' (NFL), and 'name' (Old NBA)
                playerName: data.playerName || data.player || data.name || "Unknown Player",
                
                // 2. TEAM NORMALIZATION
                // Covers 'teamAbbreviation' and 'team' (found in your NFL/NBA collections)
                teamAbbreviation: data.teamAbbreviation || data.team || "---",
                
                // 3. ID NORMALIZATION
                bdlId: bdlIdStr,
                pfrid: pfridStr,
                
                // 4. Original data for potential deep-links
                ...data
              };

              // DE-DUPLICATION LOGIC
              // If bdlId exists, use it as the key. If not, use Firestore doc ID.
              const uniqueKey = bdlIdStr || doc.id;
              if (!playerMap.has(uniqueKey)) {
                playerMap.set(uniqueKey, normalizedPlayer);
              }
            });

            const allUniquePlayers = Array.from(playerMap.values());

            // 5. SEARCH FILTERING
            const filtered = allUniquePlayers.filter(p => {
              const searchLower = searchTerm.toLowerCase();
              return (
                p.playerName?.toLowerCase().includes(searchLower) ||
                p.teamAbbreviation?.toLowerCase().includes(searchLower) ||
                p.bdlId?.includes(searchLower) ||
                p.pfrid?.toLowerCase().includes(searchLower)
              );
            });
            
            setPlayers(filtered);
          }
          setLoading(false);
        },
        (error: any) => {
          console.error("Firestore Error:", error);
          toast.error(`Failed to sync ${sport}: ${error.message}`);
          setLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error("Setup Error:", err);
      setLoading(false);
    }
  }, [sport, searchTerm]); 

  return { players, loading, searchTerm, setSearchTerm };
}