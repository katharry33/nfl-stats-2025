'use client';

import { useState, useMemo } from "react";
import { BetsTable } from "@/components/bets/bets-table";
import { EditBetModal } from "@/components/bets/edit-bet-modal";
import { useFirebaseBets } from "@/hooks/useBets";
import { BettingStats } from "@/components/bets/betting-stats";
import { groupBets } from "@/lib/services/bet-normalizer";
import { resolveDateMs } from "@/lib/utils/dates";
import { Loader2 } from 'lucide-react';

export default function BettingLogPage() {
  const { bets: allBets, loading, deleteBet, updateBet, loadMore, hasMore, loadingMore } = useFirebaseBets('dev-user');

  const [selectedBet, setSelectedBet] = useState<any>(null);
  const [isEditOpen, setIsEditOpen]   = useState(false);
  const [searchTerm, setSearchTerm]   = useState('');
  const [weekFilter, setWeekFilter]   = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortConfig, setSortConfig]   = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: 'createdAt', direction: 'desc' });

  const toggleSort = (key: string) => {
    setSortConfig(prev => ({ key, direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc' }));
  };

  // Group flat DK leg docs + normalize app bets
  const groupedBets = useMemo(() => groupBets(allBets), [allBets]);

  const processedBets = useMemo(() => {
    let filtered = [...groupedBets];

    if (searchTerm) {
      filtered = filtered.filter(b =>
        b.legs?.some((l: any) =>
          l.player?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.matchup?.toLowerCase().includes(searchTerm.toLowerCase())
        )
      );
    }

    if (weekFilter !== 'all') {
      filtered = filtered.filter(b => {
        const w = b.week ?? b.legs?.[0]?.week;
        return w?.toString() === weekFilter;
      });
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === statusFilter);
    }

    filtered.sort((a, b) => {
      let valA: any, valB: any;
      if (sortConfig.key === 'gameDate' || sortConfig.key === 'createdAt') {
        valA = resolveDateMs(a.gameDate ?? a.createdAt ?? a.date ?? a.legs?.[0]?.gameDate);
        valB = resolveDateMs(b.gameDate ?? b.createdAt ?? b.date ?? b.legs?.[0]?.gameDate);
      } else if (sortConfig.key === 'week') {
        valA = a.week ?? a.legs?.[0]?.week ?? 0;
        valB = b.week ?? b.legs?.[0]?.week ?? 0;
      } else {
        valA = (a as any)[sortConfig.key];
        valB = (b as any)[sortConfig.key];
      }
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [groupedBets, searchTerm, weekFilter, statusFilter, sortConfig]);

  const handleSave = async (updates: any) => {
    await updateBet(updates);
    setIsEditOpen(false);
  };

  const activeFilters = searchTerm || weekFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">
          Betting Log <span className="text-slate-400 text-lg font-medium">({allBets.length} Bets)</span>
        </h1>
        <p className="text-slate-400 text-sm">Track your performance and manage active plays.</p>
      </div>

      <BettingStats bets={processedBets} />

      <div className="flex flex-wrap items-center gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <input
          type="text"
          placeholder="Search player or matchup..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-4 py-2 w-64 focus:ring-1 focus:ring-emerald-500 outline-none"
        />
        <select
          value={weekFilter}
          onChange={(e) => setWeekFilter(e.target.value)}
          className="bg-slate-950 border border-slate-700 text-emerald-400 text-xs rounded-lg px-3 py-2 outline-none"
        >
          <option value="all">ALL WEEKS</option>
          {Array.from({ length: 22 }, (_, i) => (
            <option key={i + 1} value={(i + 1).toString()}>WEEK {i + 1}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-950 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none"
        >
          <option value="all">ALL STATUS</option>
          <option value="won">WON</option>
          <option value="lost">LOST</option>
          <option value="pending">PENDING</option>
          <option value="cashed out">CASHED OUT</option>
          <option value="void">VOID</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-10">
          <Loader2 className="h-6 w-6 mx-auto animate-spin" />
        </div>
      ) : (
        <BetsTable
          bets={processedBets}
          isLibraryView={false}
          onDelete={(id: string) => { if (window.confirm('Delete this bet?')) deleteBet(id); }}
          onEdit={(bet: any) => { setSelectedBet(bet); setIsEditOpen(true); }}
          onSort={toggleSort}
        />
      )}

      {hasMore && !activeFilters && (
        <div className="flex justify-center mt-8 pb-10">
          <button onClick={loadMore} disabled={loadingMore} className="bg-slate-800 hover:bg-slate-700 text-white min-w-[140px] py-2 px-4 rounded-lg">
            {loadingMore ? <Loader2 className="animate-spin h-4 w-4 mx-auto" /> : 'Load More'}
          </button>
        </div>
      )}

      {!loading && allBets.length > 0 && (!hasMore || activeFilters) && (
        <p className="text-center text-slate-500 text-xs py-10 uppercase tracking-widest">
          {activeFilters ? `${processedBets.length} bets found` : '— All bets loaded —'}
        </p>
      )}

      <EditBetModal isOpen={isEditOpen} bet={selectedBet} onClose={() => setIsEditOpen(false)} onSave={handleSave} />
    </div>
  );
}