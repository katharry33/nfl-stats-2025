'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/firebase/provider';
import { useFirebaseBets } from '@/hooks/useBets';
import { BetsTable } from '@/components/bets/bets-table';
import { BettingStats } from '@/components/bets/betting-stats';
import { EditBetModal } from '@/components/bets/edit-bet-modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/use-debounce';
import type { Bet } from '@/lib/types';
import { Search, Loader2, RefreshCw, Database } from 'lucide-react';

export default function BettingLogPage() {
  const auth        = useAuth();
  const user        = auth?.user;
  const authLoading = auth?.loading;

  const {
    bets,
    loading,
    loadingMore,
    hasMore,
    error,
    fetchBets,
    loadMore,
    updateBet,
    deleteBet,
  } = useFirebaseBets(user?.uid ?? '');

  const [search,  setSearch]  = useState('');
  const [editBet, setEditBet] = useState<Bet | null>(null);
  const debouncedSearch = useDebounce(search, 400);

  const fetchBetsRef = useRef(fetchBets);
  useEffect(() => { fetchBetsRef.current = fetchBets; }, [fetchBets]);

  useEffect(() => {
    if (user) fetchBetsRef.current(true, debouncedSearch, 'all');
  }, [debouncedSearch, user]);

  const handleDelete = useCallback(async (ids: string[]) => {
    try {
      await Promise.all(ids.map(id => deleteBet(id)));
    } catch (err) {
      console.error('handleDelete failed:', err);
    }
  }, [deleteBet]);

  const handleSave = useCallback(async (updated: Bet) => {
    try {
      await updateBet(updated);
      setEditBet(null);
      fetchBetsRef.current(true, debouncedSearch, 'all');
    } catch (e) {
      console.error('handleSave failed:', e);
    }
  }, [updateBet, debouncedSearch]);

  const handleRefresh = useCallback(() => {
    fetchBetsRef.current(true, debouncedSearch, 'all');
  }, [debouncedSearch]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#060606] flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#FFD700]" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-[#060606] flex items-center justify-center">
        <p className="text-zinc-500 font-black italic uppercase tracking-widest">
          Access Denied. Please Sign In.
        </p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#060606] text-white px-4 py-8 md:px-8">
      <div className="max-w-7xl mx-auto space-y-6">

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#FFD700]/10 border border-[#FFD700]/20 flex items-center justify-center">
              <Database className="h-5 w-5 text-[#FFD700]" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-white italic uppercase">
                Betting Log
              </h1>
              <p className="text-zinc-600 text-xs font-mono mt-0.5">
                {loading ? 'Loading…' : `${bets.length} bets loaded`}
              </p>
            </div>
          </div>

          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/[0.08] text-zinc-500 hover:text-white hover:border-white/20 transition-all text-xs font-black uppercase disabled:opacity-40"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <BettingStats bets={bets} />

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-600" />
          <Input
            placeholder="Search by player..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900/60 border-white/[0.08] text-white placeholder:text-zinc-600 rounded-2xl focus:ring-1 focus:ring-[#FFD700]/30 focus:border-[#FFD700]/30"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white transition-colors text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {error && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={handleRefresh}
              className="text-xs underline hover:no-underline"
            >
              Retry
            </button>
          </div>
        )}

        <BetsTable
          bets={bets as Bet[]}
          loading={loading}
          onDelete={handleDelete}
          onEdit={bet => setEditBet(bet)}
        />

        {hasMore && !loading && (
          <div className="flex justify-center pt-2">
            <Button
              variant="outline"
              onClick={() => loadMore()}
              disabled={loadingMore}
              className="border-white/[0.08] text-zinc-400 hover:text-white hover:border-white/20 rounded-2xl px-8"
            >
              {loadingMore
                ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Loading…</>
                : 'Load More'}
            </Button>
          </div>
        )}

        {!hasMore && !loading && bets.length > 0 && (
          <p className="text-center text-zinc-700 text-xs font-mono py-4">
            — end of history —
          </p>
        )}

      </div>

      {editBet && (
        <EditBetModal
          key={editBet.id}
          bet={editBet}
          isOpen={!!editBet}
          onClose={() => setEditBet(null)}
          onSave={handleSave}
        />
      )}
    </main>
  );
}
