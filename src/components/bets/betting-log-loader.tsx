'use client';

import { useEffect, useState } from 'react';
import { useAuth } from "@/lib/firebase/provider";
import { useBetSlip } from "@/context/betslip-context";
import { BetsTable } from './bets-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/use-debounce';
import { Bet } from "@/lib/types";

export default function BettingLogLoader() {
  const { user, loading: authLoading } = useAuth();
  const { bets, loading, hasMore, fetchBets, deleteBet, updateBet, error } = useBetSlip();
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 500);

  useEffect(() => {
    fetchBets(debouncedSearch, 'all');
  }, [debouncedSearch, fetchBets]);

  const handleLoadMore = async () => {
    if (hasMore && !loadingMore) {
      setLoadingMore(true);
      await fetchBets(debouncedSearch, String(true));
      setLoadingMore(false);
    }
  };

  // async + Promise.all so the return type is Promise<void>, matching BetsTable's onDelete prop
  const handleDelete = async (ids: string[]) => {
    await Promise.all(ids.map(id => deleteBet(id)));
  };

  const handleEdit = (bet: Bet) => {
    updateBet(bet.id, bet);
  };

  if (authLoading) return <div className="p-8 text-center text-slate-400">Verifying session...</div>;
  if (!user) return <div className="p-8 text-center text-slate-500">Please sign in to view your bets.</div>;

  return (
    <div>
      <div className="mb-4">
        <Input
          placeholder="Search by player or notes..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      {loading && !loadingMore ? (
        <div className="p-8 text-center text-slate-400 animate-pulse">Loading history...</div>
      ) : error ? (
        <div className="p-8 text-center text-red-500">{error}</div>
      ) : (
        <BetsTable bets={bets} loading={loading} onDelete={handleDelete} onEdit={handleEdit} />
      )}
      {hasMore && !loading && (
        <div className="text-center mt-4">
          <Button onClick={handleLoadMore} disabled={loadingMore}>
            {loadingMore ? 'Loading...' : 'Load More'}
          </Button>
        </div>
      )}
      {!hasMore && !loading && bets.length > 0 && (
        <div className="p-8 text-center text-slate-500">End of history.</div>
      )}
    </div>
  );
}