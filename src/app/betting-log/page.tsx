'use client';

import { useEffect, useState, useCallback, useMemo } from "react";
import { Bet } from "@/lib/types";
import { toast } from "sonner";
import { EditBetModal } from "@/components/bets/edit-bet-modal";
import { Input } from "@/components/ui/input";
import { Search } from 'lucide-react';
import { db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy } from "firebase/firestore";
import { BetsTable } from "@/components/bets/bets-table";

const calculateProfit = (stake: number, odds: number): number => {
  if (odds > 0) return stake * (odds / 100);
  return stake / (Math.abs(odds) / 100);
};

const aggregateBets = (rawDocs: any[]) => {
  const map = new Map();
  rawDocs.forEach(doc => {
    const groupId = doc.parlayid || doc.id;
    if (!map.has(groupId)) {
      map.set(groupId, { ...doc, id: groupId, status: (doc.status || doc.result || 'pending').toLowerCase(), legs: doc.legs || [] });
    }
    const entry = map.get(groupId);
    if (doc.parlayid) {
      entry.legs.push({ player: doc.playerteam || doc.player || 'Legacy Bet', prop: doc.prop, line: doc.line, selection: doc.selection || '', odds: doc.odds, status: (doc.status || doc.result || 'pending').toLowerCase(), matchup: doc.matchup });
      if (doc.result?.toLowerCase() === 'lost' || doc.status?.toLowerCase() === 'lost') {
        entry.status = 'lost';
      }
    }
  });
  return Array.from(map.values());
};

export default function BettingLogPage() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBet, setSelectedBet] = useState<Bet | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBets = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(collection(db, "bettingLog"), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      const rawData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const groupedData = aggregateBets(rawData);
      setBets(groupedData);
    } catch (error) {
      console.error("Fetch error:", error);
      toast.error("Failed to load betting log.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBets();
  }, [fetchBets]);

  const filteredBets = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return bets;

    return bets.filter(bet => {
      // Check if any leg matches the search
      const legMatch = bet.legs?.some((leg: any) => {
        // Check every possible field name used in both Legacy and Studio
        const searchSpace = [
          leg.player,
          leg.playerteam,
          leg.prop,
          leg.matchup,
          bet.betType
        ].join(' ').toLowerCase();
        
        return searchSpace.includes(q);
      });

      return legMatch || bet.status.toLowerCase().includes(q);
    });
  }, [bets, searchQuery]);

  const stats = useMemo(() => {
    return bets.reduce((acc, bet) => {
      const stake = Number(bet.stake) || 0;
      const isBonus = !!bet.isBonus || !!bet.boost;
      let payout = 0;
      if (bet.status === 'push') payout = stake;
      else if (bet.status === 'won') {
        const profit = calculateProfit(stake, bet.odds);
        payout = isBonus ? profit : stake + profit;
      }
      acc.totalVolume += stake;
      acc.totalPayout += payout;
      acc.netProfit += (payout - (isBonus ? 0 : stake));
      acc.betCount += 1;
      if (bet.status === 'won') acc.winCount += 1;
      return acc;
    }, { totalVolume: 0, totalPayout: 0, netProfit: 0, betCount: 0, winCount: 0 });
  }, [bets]);

  const roi = stats.totalVolume > 0 ? (stats.netProfit / stats.totalVolume) * 100 : 0;
  const winRate = stats.betCount > 0 ? (stats.winCount / stats.betCount) * 100 : 0;

  const handleEdit = (bet: Bet) => {
    setSelectedBet(bet);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleSaveBet = async (updatedData: any) => {
    // Implementation... (omitted for brevity, remains the same)
  };

  const handleDeleteBet = async (bet: Bet) => {
    // Implementation... (omitted for brevity, remains the same)
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 text-center">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Net Profit</p>
          <p className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {stats.netProfit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Volume</p>
          <p className="text-2xl font-bold text-white">{stats.totalVolume.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">ROI</p>
          <p className={`text-2xl font-bold ${roi >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>{roi.toFixed(2)}%</p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Win Rate</p>
          <p className="text-2xl font-bold text-white">{winRate.toFixed(2)}%</p>
        </div>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black italic uppercase text-white">Betting Log</h1>
        <div className="relative w-full max-w-xs sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <Input
            placeholder="Search players, teams, status..."
            className="pl-10 bg-slate-900 border-slate-800 focus:ring-emerald-500 h-11 text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-10">Loading bets...</div>
      ) : (
        <BetsTable bets={filteredBets} onDelete={handleDeleteBet} onEdit={handleEdit} />
      )}

      <EditBetModal bet={selectedBet} isOpen={isModalOpen} onClose={handleCloseModal} onSave={handleSaveBet} />
    </div>
  );
}
