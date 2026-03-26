'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, RefreshCw, Search } from 'lucide-react';
import { db } from '@/lib/firebase/config';
import { collection, query, getDocs, orderBy } from 'firebase/firestore';
import { BettingStats } from '@/components/bets/betting-stats';
import { BetsTable } from '@/components/bets/bets-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

import { Bet } from '@/lib/types';
import { normalizePlayerName } from '@/lib/shared/normalize';

export default function BettingLogPage() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sport, setSport] = useState<'nba' | 'nfl'>('nba');
  const [search, setSearch] = useState('');

  const fetchBets = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'bettingLog'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as Bet));
      
      setBets(data);
    } catch (error) {
      console.error("[BettingLog] Fetch error:", error);
      toast.error("Failed to load betting log history.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBets();
  }, []);

  const syncNbaResults = async () => {
    setIsSyncing(true);
    const toastId = toast.loading("Syncing NBA box scores...");
    try {
      const res = await fetch('/api/betting-log/sync-nba', { method: 'POST' });
      if (res.ok) {
        toast.success("NBA Results Synced", { id: toastId });
        fetchBets();
      } else {
        throw new Error("Sync API returned an error");
      }
    } catch (e) {
      toast.error("Sync failed. Check API logs.", { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  const filteredBets = useMemo(() => {
    return bets.filter(bet => {
      const matchesSport = bet.league?.toLowerCase() === sport.toLowerCase();
      const normalizedQuery = normalizePlayerName(search);
      const normalizedPlayer = normalizePlayerName(bet.player || '');
      const matchesSearch = normalizedPlayer.includes(normalizedQuery);
      return matchesSport && matchesSearch;
    });
  }, [bets, search, sport]);

  const handleSave = () => {}; // Placeholder
  const handleDelete = () => {}; // Placeholder
  const handleEdit = () => {}; // Placeholder

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="animate-spin text-indigo-500" size={40} />
          <p className="text-zinc-500 text-xs font-black uppercase tracking-widest animate-pulse">
            Accessing Vault...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 min-h-screen">
      <div className="flex justify-between items-end">
        <div>
          <h1 className="text-4xl font-black italic uppercase tracking-tighter text-white">
            Log <span className="text-indigo-500 text-glow">Vault</span>
          </h1>
          <p className="text-zinc-500 text-[10px] font-black uppercase tracking-[0.2em] mt-1">
            Historical Performance & Automated Grading
          </p>
        </div>
        
        <div className="flex gap-3">
          <Button 
            onClick={syncNbaResults} 
            disabled={isSyncing || sport !== 'nba'}
            variant="outline"
            className="border-white/5 bg-zinc-900/50 hover:bg-zinc-800 text-[10px] font-black uppercase tracking-widest h-10 px-6 rounded-xl transition-all"
          >
            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            Sync {sport.toUpperCase()} Scores
          </Button>
        </div>
      </div>

      <BettingStats bets={filteredBets as Bet[]} />

      <div className="bg-[#0a0a0a] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl border-t-white/10">
        <div className="p-5 border-b border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900/20">
           <div className="relative w-full md:max-w-sm">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4" />
             <Input 
               placeholder="Search players (e.g. Mahomes)..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="pl-11 bg-black/40 border-white/5 focus:border-indigo-500/50 h-12 text-sm font-medium rounded-2xl transition-all"
             />
           </div>
           
           <div className="flex p-1.5 bg-black/40 border border-white/5 rounded-2xl">
             {(['nba', 'nfl'] as const).map((s) => (
               <button
                 key={s}
                 onClick={() => setSport(s)}
                 className={`px-8 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                   sport === s 
                     ? 'bg-indigo-600 text-white shadow-[0_0_20px_rgba(79,70,229,0.4)]' 
                     : 'text-zinc-500 hover:text-zinc-300'
                 }`}
               >
                 {s}
               </button>
             ))}
           </div>
        </div>

        <div className="p-2">
          <BetsTable 
            bets={filteredBets as Bet[]}
            loading={loading}
            onDelete={handleDelete}
            onSave={handleSave}
            onEdit={handleEdit}
          />
        </div>
      </div>
    </div>
  );
}