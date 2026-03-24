'use client';
import { useState, useCallback } from 'react';

export function useFirebaseBets(userId: string) {
  const [bets, setBets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const API_PATH = '/api/betting-log';

  const fetchBets = useCallback(async (search = '', week = 'all', sport = 'nfl') => {
    setLoading(true);
    try {
      const res = await fetch(`${API_PATH}?sport=${sport}&search=${search}`);
      const data = await res.json();
      setBets(data.bets || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateBet = useCallback(async (updates: any, sport: string) => {
    setBets(prev => prev.map(b => b.id === updates.id ? { ...b, ...updates } : b));
    await fetch(API_PATH, {
      method: 'POST',
      body: JSON.stringify({ ...updates, sport, userId }),
    });
  }, [userId]);

  const deleteBet = useCallback(async (id: string, sport: string) => {
    setBets(prev => prev.filter(b => b.id !== id));
    await fetch(`${API_PATH}?id=${id}&sport=${sport}`, { method: 'DELETE' });
  }, []);

  return { bets, loading, fetchBets, updateBet, deleteBet };
}