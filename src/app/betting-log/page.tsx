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

// 1. IMPORT YOUR NEW SHARED TYPES & NORMALIZATION LOGIC
import { NormalizedProp } from '@/lib/types';
import { normalizePlayerName } from '@/lib/enrichment/shared/normalize';

export default function BettingLogPage() {
  // Use the Shared Interface instead of a local 'Bet' interface
  const [bets, setBets] = useState<NormalizedProp[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [sport, setSport] = useState<'nba' | 'nfl'>('nba');
  const [search, setSearch] = useState('');

  // 2. FETCH DATA FROM FIRESTORE
  const fetchBets = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'bettingLog'), orderBy('date', 'desc'));
      const snapshot = await getDocs(q);
      
      const data = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      } as NormalizedProp));
      
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

  // 3. SYNC HANDLER (Triggers your API route)
  const syncNbaResults = async () => {
    setIsSyncing(true);
    const toastId = toast.loading("Syncing NBA box scores...");
    try {
      // Ensure this endpoint matches your folder: src/app/api/betting-log/sync-nba/route.ts
      const res = await fetch('/api/betting-log/sync-nba', { method: 'POST' });
      if (res.ok) {
        toast.success("NBA Results Synced", { id: toastId });
        fetchBets(); // Refresh local state with new scores
      } else {
        throw new Error("Sync API returned an error");
      }
    } catch (e) {
      toast.error("Sync failed. Check API logs.", { id: toastId });
    } finally {
      setIsSyncing(false);
    }
  };

  // 4. SMART FILTERING
  const filteredBets = useMemo(() => {
    return bets.filter(bet => {
      // League Filter
      const matchesSport = bet.league?.toLowerCase() === sport.toLowerCase();
      
      // Smart Player Search (Uses your normalization logic to strip 'Jr.', dots, etc.)
      const normalizedQuery = normalizePlayerName(search);
      const normalizedPlayer = normalizePlayerName(bet.player || '');
      
      const matchesSearch = normalizedPlayer.includes(normalizedQuery);
        
      return matchesSport && matchesSearch;
    });
  }, [bets, search, sport]);

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
      {/* HEADER SECTION */}
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

      {/* STATS OVERVIEW CARDS */}
      <BettingStats bets={filteredBets} />

      {/* TABLE SECTION */}
      <div className="bg-[#0a0a0a] border border-white/5 rounded-[32px] overflow-hidden shadow-2xl border-t-white/10">
        <div className="p-5 border-b border-white/5 flex flex-col md:flex-row gap-4 items-center justify-between bg-zinc-900/20">
           {/* SEARCH BOX */}
           <div className="relative w-full md:max-w-sm">
             <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600 w-4 h-4" />
             <Input 
               placeholder="Search players (e.g. Mahomes)..." 
               value={search}
               onChange={(e) => setSearch(e.target.value)}
               className="pl-11 bg-black/40 border-white/5 focus:border-indigo-500/50 h-12 text-sm font-medium rounded-2xl transition-all"
             />
           </div>
           
           {/* SPORT TOGGLE */}
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

        {/* DATA TABLE */}
        <div className="p-2">
          <BetsTable 
            data={filteredBets} 
            // The BetsTable internally handles the mapping of the NormalizedProp 
            // to the specific columns we defined.
          />
        </div>
      </div>
    </div>
  );
}