'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/firebase/provider';
import { useFirebaseBets } from '@/hooks/useBets';
import { BetsTable } from '@/components/bets/bets-table';
import { BettingStats } from '@/components/bets/betting-stats';
import { EditBetModal } from '@/components/modals/edit-bet-modal';
import { Input } from '@/components/ui/input';
import { useDebounce } from '@/hooks/use-debounce';
import type { Bet } from '@/lib/types';
import { Search, Loader2, RefreshCw, Target } from 'lucide-react';
import { toast } from 'sonner';
import { fetchScoringCriteria, ScoringCriteria } from '@/lib/utils/sweetSpotScore';
import { PageLoader } from '@/components/ui/LoadingSpinner';

export default function BettingLogPage() {
  const auth = useAuth();
  const user = auth?.user;
  const authLoading = auth?.loading;

  const { bets, loading, error, fetchBets, updateBet, deleteBet } =
    useFirebaseBets(user?.uid ?? '');

  const [search, setSearch] = useState('');
  const [editBet, setEditBet] = useState<Bet | null>(null);
  const [criteria, setCriteria] = useState<ScoringCriteria | null>(null);
  const debouncedSearch = useDebounce(search, 400);
  const [isSyncing, setIsSyncing] = useState(false);

  // Initial fetch and fetch on search change
  useEffect(() => {
    fetchBets(debouncedSearch, 'all');
  }, [debouncedSearch, fetchBets]);

  useEffect(() => {
    fetchScoringCriteria().then(c => { 
      if (c !== undefined) setCriteria(c as ScoringCriteria);
    });
  }, []);

  const syncNbaResults = async () => {
    setIsSyncing(true);
    try {
      const res = await fetch('/api/betting-log/sync-nba', { method: 'POST' });
      if (!res.ok) throw new Error('Sync failed');
      const data = await res.json();
      
      toast.success(`Synced ${data.updated} NBA bets!`);
      fetchBets(debouncedSearch, 'all'); 
    } catch (e) {
      toast.error("Sync failed", { description: "Could not connect to service." });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDelete = useCallback(async (ids: string[]) => {
    if (ids.length > 5 && !confirm(`Delete ${ids.length} bets?`)) return;

    try {
      await Promise.all(ids.map(id => deleteBet(id)));
      toast.success(ids.length > 1 ? `${ids.length} bets deleted` : 'Bet deleted');
    } catch (err: any) {
      toast.error('Delete failed');
      fetchBets(debouncedSearch, 'all'); 
    }
  }, [deleteBet, debouncedSearch, fetchBets]);

  const handleSave = useCallback(async (updated: Bet) => {
    try {
      await updateBet(updated);
      toast.success('Bet updated');
    } catch (e) {
      toast.error('Failed to update');
    }
  }, [updateBet]);

  if (authLoading) return <PageLoader />;

  return (
    <main className="min-h-screen bg-background text-foreground p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Betting Log</h1>
            <p className="text-muted-foreground text-sm mt-0.5 flex items-center gap-2">
              {loading ? 'Loading...' : `${bets.length} bets loaded`}
              {criteria && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary">
                  <Target className="h-3 w-3" />
                  Sweet Spots Active
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={syncNbaResults}
              disabled={isSyncing}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-orange-500/10 border border-orange-500/20 text-orange-500 hover:bg-orange-500/20 text-xs font-medium transition-colors"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              Sync NBA Stats
            </button>
            <button
              onClick={() => fetchBets(debouncedSearch, 'all')}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:bg-secondary text-xs font-medium transition-colors disabled:opacity-40"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        <BettingStats />

        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by player..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9 bg-card border-border"
          />
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-500">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            <span className="text-sm">Loading bets...</span>
          </div>
        ) : (
          <BetsTable
            bets={bets}
            loading={loading}
            onDelete={handleDelete}
            onSave={handleSave}
            onEdit={bet => setEditBet(bet)}
            sweetSpotCriteria={criteria}
          />
        )}
      </div>

      {editBet && (
        <EditBetModal
          key={editBet.id}
          bet={editBet}
          isOpen={!!editBet}
          onClose={() => setEditBet(null)}
          onSave={async (updated) => { 
            await handleSave(updated); 
            setEditBet(null); 
          }}
          onDelete={async (id) => { 
            await handleDelete([id]); 
            setEditBet(null); 
          }}
        />
      )}
    </main>
  );
}