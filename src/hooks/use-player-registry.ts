'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config'; 
import { collection, query, onSnapshot, orderBy, limit } from 'firebase/firestore';

export function usePlayerRegistry(sport: 'NFL' | 'NBA') {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    setLoading(true);
    setPlayers([]);

    // Keep using your primary mapping collections
    const collectionName = sport === 'NFL' ? 'static_playerTeamMapping' : 'static_nbaIdMap';
    
    try {
      const colRef = collection(db, collectionName);
      // Removed the 'where' filter temporarily to ensure data shows up so you can fix it
      const q = query(colRef, orderBy('playerName', 'asc'), limit(1000));

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const playerMap = new Map();

        snapshot.docs.forEach(doc => {
          const data = doc.data();
          
          // Logic: If a 'sport' field exists, it must match. 
          // If it DOESN'T exist, we show it anyway so it can be edited/assigned.
          const docSport = data.sport?.toUpperCase();
          if (docSport && docSport !== sport) return;

          playerMap.set(doc.id, {
            id: doc.id,
            playerName: data.playerName || data.player || "Unknown",
            teamAbbreviation: data.teamAbbreviation || data.team || "---",
            bdlId: data.bdlId || data.bdl_id || "",
            bbrId: data.bbrId || "",
            pfrid: data.pfrid || data.pfrId || "",
            sport: docSport || sport, // Fallback to current tab sport
            ...data
          });
        });

        const allPlayers = Array.from(playerMap.values());
        const filtered = allPlayers.filter(p => {
          const s = searchTerm.toLowerCase();
          return p.playerName.toLowerCase().includes(s) || p.teamAbbreviation.toLowerCase().includes(s);
        });

        setPlayers(filtered);
        setLoading(false);
      });

      return () => unsubscribe();
    } catch (err) {
      setLoading(false);
    }
  }, [sport, searchTerm]);

  return { players, loading, searchTerm, setSearchTerm };
}