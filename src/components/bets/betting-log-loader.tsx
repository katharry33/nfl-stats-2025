'use client';

import { useEffect, useState } from 'react';
import { getBetsStream } from "../../lib/firebase/bets";
import { useAuth } from "@/lib/firebase/provider";
import type { Bet } from "../../lib/types";
import { BetsTable } from './bets-table';

export default function BettingLogLoader() {
  const { user, loading: authLoading } = useAuth();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribe = getBetsStream(user.uid, (newBets: Bet[]) => {
      const sortedBets = [...newBets].sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      });

      setBets(sortedBets);
      setLoading(false);
    });

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, [user?.uid]);

  if (authLoading) return <div className="p-8 text-center text-slate-400">Verifying session...</div>;
  if (!user) return <div className="p-8 text-center text-slate-500">Please sign in to view your bets.</div>;
  if (loading) return <div className="p-8 text-center text-slate-400 animate-pulse">Loading history...</div>;

  return <BetsTable bets={bets} />;
}
