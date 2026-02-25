'use client';

import { useEffect, useState } from 'react';
import { useAuth } from "@/lib/firebase/provider";
import { useBetSlip } from "@/context/betslip-context";
import { BetsTable } from './bets-table';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useDebounce } from '@/hooks/use-debounce';

export default function BettingLogLoader() {
  const { user, loading: authLoading } = useAuth();
  const { bets, loading, hasMore, fetchBets, error } = useBetSlip();
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingMore, setLoadingMore] = useState(false);
  const debouncedSearch = useDebounce(searchQuery, 500);

  useEffect(() => {
    // Initial fetch or when search term changes
    fetchBets(debouncedSearch, false);
  }, [debouncedSearch, fetchBets]);

  const handleLoadMore = async () => {
    if (hasMore && !loadingMore) {
      setLoadingMore(true);
      await fetchBets(debouncedSearch, true);
      setLoadingMore(false);
    }
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
        <BetsTable bets={bets} />
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
