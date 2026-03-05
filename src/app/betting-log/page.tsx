'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/provider';
import { useFirebaseBets } from '@/hooks/useBets';
import { BetsTable } from '@/components/bets/bets-table';
import { BettingStats } from '@/components/bets/betting-stats';
import { EditBetModal } from '@/components/bets/edit-bet-modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/use-debounce';
import type { Bet } from '@/lib/types';
import { Search, Loader2 } from 'lucide-react';

export default function BettingLogPage() {
  const router = useRouter();
  const auth = useAuth();
  const user = auth?.user;
  const authLoading = auth?.loading;
  
  const { 
    bets, 
    loading,
    loadingMore,
    hasMore,
    error,
    fetchBets,
    updateBet,
    deleteBet
  } = useFirebaseBets(user?.uid ?? '');

  const [search, setSearch] = useState('');
  const [editBet, setEditBet] = useState<Bet | null>(null);
  const debouncedSearch = useDebounce(search, 400);

  const fetchBetsRef = useRef(fetchBets);
  useEffect(() => { fetchBetsRef.current = fetchBets; }, [fetchBets]);

  // Fetch on mount + whenever search changes
  useEffect(() => {
    if (user) fetchBetsRef.current(true, debouncedSearch, 'all');
  }, [debouncedSearch, user]);

  const handleDelete = useCallback(async (ids: string[]) => {
    try {
      // Call the single delete function for every ID in the array
      await Promise.all(ids.map(id => deleteBet(id)));
      
      // Refresh local state or re-fetch
      router.refresh(); 
    } catch (error) {
      console.error("Failed to delete bets", error);
    }
  }, [deleteBet, router]);

  const handleSave = useCallback(async (updated: Bet) => {
    try {
      await updateBet(updated);
      setEditBet(null);
    } catch (e) {
      console.error('handleSave failed:', e);
    }
  }, [updateBet]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#060606] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFD700]"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#060606] flex items-center justify-center">
        <p className="text-zinc-500 font-black italic uppercase">Access Denied. Please Sign In.</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white">Betting Log</h1>
            <p className="text-zinc-500 text-sm mt-0.5">Your complete bet history</p>
          </div>
        </div>

        {/* Stats */}
        <BettingStats bets={bets} />

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search by player..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Table */}
        <BetsTable
          bets={bets as Bet[]}
          loading={loading}
          onDelete={handleDelete}
          onEdit={bet => setEditBet(bet)}
        />

        {/* Load more */}
        {hasMore && !loading && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => fetchBets(false, search, 'all')}
              disabled={loadingMore}
              className="border-zinc-800 text-zinc-400 hover:text-white"
            >
              {loadingMore
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading...</>
                : 'Load More'}
            </Button>
          </div>
        )}

      </div>

      {editBet && (
        <EditBetModal
          key={editBet?.id}
          bet={editBet}
          isOpen={!!editBet}
          userId={user?.uid}
          onClose={() => setEditBet(null)}
          onSave={handleSave}
          onDelete={(id) => handleDelete([id])}
        />
      )}
    </main>
  );
}
