'use client';
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/firebase/provider';
import { useFirebaseBets } from '@/hooks/useBets';
import { BetsTable } from '@/components/bets/bets-table';
import { BettingStats } from '@/components/bets/betting-stats';
import { EditBetModal } from '@/components/bets/edit-bet-modal';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import type { Bet } from '@/lib/types';
import { Search, Loader2, RefreshCw, Target } from 'lucide-react';
import { toast } from 'sonner';
import { fetchScoringCriteria, type ScoringCriteria } from '@/lib/utils/sweetSpotScore';

export default function BettingLogPage() {
  const auth        = useAuth();
  const user        = auth?.user;
  const authLoading = auth?.loading;

  const { bets, loading, error, fetchBets, updateBet, deleteBet } =
    useFirebaseBets(user?.uid ?? '');

  const [search,    setSearch]    = useState('');
  const [editBet,   setEditBet]   = useState<Bet | null>(null);
  const [criteria,  setCriteria]  = useState<ScoringCriteria | null>(null);
  const debouncedSearch = useDebounce(search, 400);

  const fetchBetsRef = useRef(fetchBets);
  useEffect(() => { fetchBetsRef.current = fetchBets; }, [fetchBets]);

  useEffect(() => {
    if (user?.uid) fetchBetsRef.current(true, debouncedSearch, 'all');
  }, [debouncedSearch, user?.uid]);

  // Load sweet spot criteria once — used to badge each bet row
  useEffect(() => {
    fetchScoringCriteria().then(c => { if (c) setCriteria(c); });
  }, []);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleDelete = useCallback(async (ids: string[]) => {
    try {
      await Promise.all(ids.map(id => deleteBet(id)));
      toast.success(ids.length > 1 ? `${ids.length} bets deleted` : 'Bet deleted');
    } catch (err: any) {
      toast.error('Delete failed', { description: err.message });
    }
  }, [deleteBet]);

  const handleSave = useCallback(async (updated: Bet) => {
    await updateBet(updated);
  }, [updateBet]);

  // ── Auth gates ────────────────────────────────────────────────────────────

  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#060606] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#FFD700]" />
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

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-[#060606] text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-white italic uppercase">
              Betting Log
            </h1>
            <p className="text-zinc-500 text-sm mt-0.5 flex items-center gap-2">
              {loading ? 'Loading…' : `${bets.length} bets loaded`}
              {criteria && (
                <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase text-[#FFD700]/60">
                  <Target className="h-2.5 w-2.5" />
                  Sweet Spots Active
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {criteria && (
              <a href="/sweet-spots"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#FFD700]/20 text-[#FFD700]/70 hover:text-[#FFD700] text-[9px] font-black uppercase transition-colors">
                <Target className="h-3 w-3" />
                View Sweet Spots
              </a>
            )}
            <button
              onClick={() => fetchBets(true, debouncedSearch, 'all')}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-xl border border-white/[0.08]
                text-zinc-500 hover:text-white text-xs font-black uppercase transition-colors disabled:opacity-40">
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats */}
        <BettingStats bets={bets} />

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
          <Input
            placeholder="Search by player…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-zinc-900 border-zinc-800 text-white placeholder:text-zinc-600
              focus:border-[#FFD700]/40 focus:ring-[#FFD700]/20"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-white text-xs font-black transition-colors">
              ✕
            </button>
          )}
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => fetchBets(true, debouncedSearch, 'all')}
              className="text-red-400 hover:text-red-300 font-black text-xs ml-4">
              Retry
            </button>
          </div>
        )}

        {/* Table */}
        {loading
          ? <div className="flex items-center justify-center py-20 text-zinc-600">
              <Loader2 className="h-6 w-6 animate-spin mr-3" />
              <span className="text-sm font-black uppercase italic">Loading bets…</span>
            </div>
          : <BetsTable
              bets={bets as Bet[]}
              loading={loading}
              onDelete={handleDelete}
              onSave={handleSave}
              onEdit={bet => setEditBet(bet)}
              sweetSpotCriteria={criteria}
            />
        }

      </div>

      {editBet && (
        <EditBetModal
          key={editBet.id}
          bet={editBet}
          isOpen={!!editBet}
          userId={user?.uid}
          onClose={() => setEditBet(null)}
          onSave={async (updated) => { await handleSave(updated); setEditBet(null); }}
          onDelete={async (id) => { await handleDelete([id]); setEditBet(null); }}
        />
      )}
    </main>
  );
}