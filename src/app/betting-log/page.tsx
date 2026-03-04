'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/provider';
import { useBetSlip } from '@/context/betslip-context';
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
    bets, loading, loadingMore, hasMore, error,
    fetchBets, loadMoreBets, updateBet
  } = useBetSlip();

  const [search, setSearch] = useState('');
  const [editBet, setEditBet] = useState<Bet | null>(null);
  const debouncedSearch = useDebounce(search, 400);

  // Fetch on mount + whenever search changes
  useEffect(() => {
    if (user) {
      fetchBets(debouncedSearch, 'all');
    }
  }, [debouncedSearch, user, fetchBets]);

  const handleDelete = useCallback(async (ids: string[]) => {
    try {
      const deletePromises = ids.map(id =>
        fetch(`/api/betting-log?id=${id}&userId=${user?.uid ?? ''}`, { method: 'DELETE' })

      );
      const responses = await Promise.all(deletePromises);

      const allOk = responses.every(res => res.ok);

      if (allOk) {
        if (ids.length === 1) {
          setEditBet(null); // Close modal on single delete
        }
        router.refresh(); // Re-fetch data
      } else {
        const failedResponse = responses.find(res => !res.ok);
        if (failedResponse) {
          const err = await failedResponse.json().catch(() => ({ error: 'Failed to parse error response.' }));
          alert(`Delete failed: ${err.error || failedResponse.statusText}`);
        } else {
          alert('An unknown error occurred during deletion.');
        }
      }
    } catch (error) {
      console.error("Delete request failed", error);
      alert('An error occurred while sending the delete request.');
    }
  }, [router]);

  const handleSave = useCallback(async (updated: Bet) => {
    // Derive correct status from legs before updating local state
    const legs = (updated as any).legs ?? [];
    const hasLost = legs.some((l: any) => ['lost', 'loss'].includes((l.status ?? '').toLowerCase()));
    const allWon = legs.length > 0 && legs.every((l: any) => ['won', 'win'].includes((l.status ?? '').toLowerCase()));
    const correctStatus = hasLost ? 'lost' : allWon ? 'won' : updated.status;

    // Recalculate payout
    const odds = Number(updated.odds) || 0;
    const stake = Number(updated.stake) || 0;
    const boost = Number((updated as any).boost || 0);
    const isBonusBet = Boolean((updated as any).isBonusBet);
    let payout: number | null = null;
    if (odds && stake) {
      const dec = odds > 0 ? odds / 100 + 1 : 100 / Math.abs(odds) + 1;
      const raw = stake * dec * (1 + boost / 100);
      payout = parseFloat((isBonusBet ? raw - stake : raw).toFixed(2));
    }

    await updateBet(updated.id, { ...updated, status: correctStatus as any, payout } as any);
    setEditBet(null);
    // Refetch after a longer delay to let Firestore propagate
    setTimeout(() => fetchBets(search, 'all'), 3000);
  }, [updateBet, fetchBets, search]);

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
              onClick={() => loadMoreBets(search, 'all')}
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
