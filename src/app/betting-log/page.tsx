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
import { PageLoader } from '@/components/ui/LoadingSpinner';

export default function BettingLogPage() {
  const auth        = useAuth();
  const user        = auth?.user;
  const authLoading = auth?.loading;

  const { bets, loading, error, fetchBets, updateBet, deleteBet } =
    useFirebaseBets(user?.uid ?? '');

  const [search,   setSearch]   = useState('');
  const [editBet,  setEditBet]  = useState<Bet | null>(null);
  const [criteria, setCriteria] = useState<ScoringCriteria | null>(null);
  const debouncedSearch = useDebounce(search, 400);

  const fetchBetsRef = useRef(fetchBets);
  useEffect(() => { fetchBetsRef.current = fetchBets; }, [fetchBets]);

  useEffect(() => {
    if (user?.uid) fetchBetsRef.current(true, debouncedSearch, 'all');
  }, [debouncedSearch, user?.uid]);

  useEffect(() => {
    fetchScoringCriteria().then(c => { if (c) setCriteria(c); });
  }, []);

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

  if (authLoading) return <PageLoader />;

  if (!user) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground font-semibold">Access denied. Please sign in.</p>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* ── Header ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Betting Log</h1>
            <p className="text-muted-foreground text-sm mt-0.5 flex items-center gap-2">
              {loading ? 'Loading…' : `${bets.length} bets loaded`}
              {criteria && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                  <Target className="h-3 w-3" />
                  Sweet Spots Active
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {criteria && (
              <a href="/sweet-spots"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/20 text-primary hover:bg-primary/5 text-xs font-medium transition-colors">
                <Target className="h-3 w-3" />
                View Sweet Spots
              </a>
            )}
            <button
              onClick={() => fetchBets(true, debouncedSearch, 'all')}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary text-xs font-medium transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* ── Stats ── */}
        <BettingStats bets={bets} />

        {/* ── Search ── */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by player…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary/30"
          />
          {search && (
            <button onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs transition-colors">
              ✕
            </button>
          )}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="rounded-lg border border-loss/20 bg-loss/5 px-4 py-3 text-sm text-loss flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => fetchBets(true, debouncedSearch, 'all')}
              className="text-loss hover:text-loss/80 font-semibold text-xs ml-4">
              Retry
            </button>
          </div>
        )}

        {/* ── Table ── */}
        {loading
          ? <div className="flex items-center justify-center py-20 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-sm">Loading bets…</span>
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