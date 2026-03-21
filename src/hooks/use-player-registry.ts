'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config'; 
import { collection, query, onSnapshot, limit } from 'firebase/firestore';

export function usePlayerRegistry(sport: 'NFL' | 'NBA') {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const normalize = (name: string) => name?.toLowerCase().replace(/[^a-z0-9]/g, '') || '';

  useEffect(() => {
    setLoading(true);
    
    if (sport === 'NBA') {
      const q = query(collection(db, 'static_nbaIdMap'), limit(1000));
      return onSnapshot(q, (snap) => {
        const results = snap.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            playerName: data.playerName || data.player || "Unknown NBA Player",
            teamAbbreviation: data.teamAbbreviation || data.team || "---",
            bdlId: data.bdlId || data.bdl_id || "",
            bbrId: data.bbrId || data.bbr_id || "",
            ...data
          };
        });
        setPlayers(results);
        setLoading(false);
      });
    } else {
      // NFL Joined Logic
      const teamRef = collection(db, 'static_playerTeamMapping');
      const idRef = collection(db, 'static_pfrIdMap');

      return onSnapshot(teamRef, (teamSnap) => {
        const unsubIds = onSnapshot(idRef, (idSnap) => {
          const idLookup = new Map();
          idSnap.docs.forEach(d => {
            const data = d.data();
            // Key by normalized version of the 'player' field
            const lookupKey = normalize(data.player || data.playerName || d.id);
            idLookup.set(lookupKey, data);
          });

          const merged = teamSnap.docs
            .map(doc => {
              const teamData = doc.data();
              if (teamData.sport === 'NBA') return null;
              
              const pName = teamData.playerName || teamData.player || "Unknown NFL Player";
              const ids = idLookup.get(normalize(pName)) || {};
              
              return {
                id: doc.id,
                playerName: pName,
                teamAbbreviation: teamData.teamAbbreviation || teamData.team || "---",
                // Check both casing variations for pfrId
                pfrid: ids.pfrid || ids.pfrId || teamData.pfrid || "",
                bdlId: ids.bdlId || ids.bdl_id || teamData.bdlId || "",
                ...teamData,
                ...ids 
              };
            })
            .filter(Boolean);

          setPlayers(merged);
          setLoading(false);
        });
      });
    }
  }, [sport]);

  const filteredPlayers = players.filter(p => {
    const s = searchTerm.toLowerCase();
    return !s || 
      p.playerName?.toLowerCase().includes(s) || 
      p.teamAbbreviation?.toLowerCase().includes(s) ||
      p.bdlId?.toString().includes(s);
  });

  return { players: filteredPlayers, loading, searchTerm, setSearchTerm };
}