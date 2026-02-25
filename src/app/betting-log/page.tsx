'use client';

import { useState, useMemo, useEffect } from "react";
import { useBetSlip } from "@/context/betslip-context";
import { Bet } from "@/lib/types";
import { BetsTable } from "@/components/bets/bets-table";
import { EditBetModal } from "@/components/bets/edit-bet-modal";
import { BettingStats } from "@/components/bets/betting-stats";
import { Loader2, AlertCircle, RefreshCw, Bug } from 'lucide-react';

export default function BettingLogPage() {
  const betSlipContext = useBetSlip();
  const { 
    bets: allBets, 
    loading,
    loadingMore,
    hasMore,
    fetchBets,
    loadMoreBets,
    updateBet, 
    deleteBet,
    error
  } = betSlipContext;

  const [selectedBet, setSelectedBet] = useState<Bet | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [weekFilter, setWeekFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDebug, setShowDebug] = useState(false);
  
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({
    key: 'createdAt', 
    direction: 'desc'
  });

  const toggleSort = (key: string) => {
    setSortConfig(prev => ({
      key, 
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc',
    }));
  };

  const processedBets = useMemo(() => {
    if (!allBets || !Array.isArray(allBets)) return [];

    // Map to handle legacy data properties for filtering/searching
    let filtered = allBets.map((b: any) => {
      if (!b.legs || !Array.isArray(b.legs)) {
        return {
          ...b,
          legs: [{
            player: b.player || b.playerteam || b.Player || 'Legacy Bet',
            prop: b.prop || b.Prop || 'N/A',
            matchup: b.matchup || b.Matchup || 'N/A',
            selection: b.selection || b['Over/Under?'] || '',
            line: b.line || b.Line || '0'
          }]
        };
      }
      return b;
    });

    if (searchTerm) {
      const lowerSearch = searchTerm.toLowerCase();
      filtered = filtered.filter(b =>
        b.legs?.some((l: any) =>
          l.player?.toLowerCase().includes(lowerSearch) ||
          l.matchup?.toLowerCase().includes(lowerSearch)
        )
      );
    }

    if (weekFilter !== 'all') {
      filtered = filtered.filter(b => (b.week || b.legs?.[0]?.week)?.toString() === weekFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(b => b.status === statusFilter);
    }

    filtered.sort((a, b) => {
      const valA = (a as any)[sortConfig.key] ?? 0;
      const valB = (b as any)[sortConfig.key] ?? 0;
      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [allBets, searchTerm, weekFilter, statusFilter, sortConfig]);

  const handleEditBet = (bet: any) => {
    setSelectedBet(bet);
    setIsEditOpen(true);
  };

  const handleDeleteBet = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this bet?')) return;
    try {
      await deleteBet(id);
    } catch (err) {
      console.error('Delete failed:', err);
    }
  };

  const handleSave = async (updates: any) => {
    try {
      if (!updates.id) return;
      await updateBet(updates.id, updates);
      setIsEditOpen(false);
    } catch (err) {
      console.error('Save failed:', err);
    }
  };

  const activeFilters = searchTerm || weekFilter !== 'all' || statusFilter !== 'all';

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white mb-1">
            Betting Log
            {!loading && <span className="text-slate-400 text-lg font-medium ml-2">({allBets?.length || 0})</span>}
          </h1>
          <p className="text-slate-400 text-sm">Track performance and manage active plays.</p>
        </div>
        
        <div className="flex items-center gap-2">
          <button onClick={() => setShowDebug(!showDebug)} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg">
            <Bug className="h-3.5 w-3.5" /> {showDebug ? 'Hide' : 'Show'} Debug
          </button>
          <button onClick={() => fetchBets()} className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 text-slate-300 text-xs rounded-lg">
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/20 border border-red-500/30 rounded-lg p-4 flex items-start gap-3 text-red-300">
          <AlertCircle className="h-5 w-5" /> <span>{error}</span>
        </div>
      )}

      {loading ? (
        <div className="text-center py-16 text-slate-500"><Loader2 className="animate-spin h-8 w-8 mx-auto mb-4" /> Loading...</div>
      ) : (
        <>
          <BettingStats bets={allBets || []} />
          
          <div className="flex flex-wrap items-center gap-4 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
            <input
              type="text" 
              placeholder="Search..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-lg px-4 py-2 w-64 outline-none"
            />
            
            <select value={weekFilter} onChange={(e) => setWeekFilter(e.target.value)} className="bg-slate-950 border border-slate-700 text-emerald-400 text-xs rounded-lg px-3 py-2 outline-none">
              <option value="all">ALL WEEKS</option>
              {Array.from({ length: 22 }, (_, i) => (<option key={i + 1} value={(i + 1).toString()}>WEEK {i + 1}</option>))}
            </select>
            
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-slate-950 border border-slate-700 text-slate-300 text-xs rounded-lg px-3 py-2 outline-none">
              <option value="all">ALL STATUS</option>
              <option value="won">WON</option>
              <option value="lost">LOST</option>
              <option value="pending">PENDING</option>
            </select>
            
            {activeFilters && (
              <button onClick={() => { setSearchTerm(''); setWeekFilter('all'); setStatusFilter('all'); }} className="text-[10px] text-slate-500 hover:text-white font-bold uppercase ml-auto">
                Clear Filters
              </button>
            )}
          </div>
          
          <BetsTable 
            bets={processedBets} 
            onDelete={handleDeleteBet} 
            onEdit={handleEditBet} 
            onSort={toggleSort} 
          />

          {hasMore && (
            <div className="flex justify-center pt-6">
              <button onClick={loadMoreBets} disabled={loadingMore} className="px-6 py-3 bg-slate-800 text-white rounded-lg flex items-center gap-2">
                {loadingMore ? <Loader2 className="animate-spin h-4 w-4" /> : <RefreshCw className="h-4 w-4" />} 
                Load More
              </button>
            </div>
          )}
        </>
      )}
      
      <EditBetModal 
        isOpen={isEditOpen} 
        bet={selectedBet} 
        onClose={() => setIsEditOpen(false)} 
        onSave={handleSave} 
      />
    </div>
  );
}