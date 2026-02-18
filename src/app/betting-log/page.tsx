'use client';

import { useEffect, useState, useCallback, useMemo } from "react";
import { Bet } from "@/lib/types";
import { toast } from "sonner";
import { BetsTable } from "@/components/bets/bets-table";
import { EditBetModal } from "@/components/bets/edit-bet-modal";
import { Input } from "@/components/ui/input";
import { Search } from 'lucide-react';
import { db } from "@/lib/firebase";
import { collection, query, getDocs, orderBy } from "firebase/firestore";

// Renamed to clarify it calculates profit, not total payout
const calculateProfit = (stake: number, odds: number): number => {
  if (odds > 0) {
    return stake * (odds / 100);
  }
  return stake / (Math.abs(odds) / 100);
};

const aggregateBets = (rawDocs: any[]) => {
  const map = new Map();

  rawDocs.forEach(doc => {
    const groupId = doc.parlayid || doc.id;

    if (!map.has(groupId)) {
      map.set(groupId, {
        ...doc,
        id: groupId,
        status: (doc.status || doc.result || 'pending').toLowerCase(),
        legs: doc.legs || [] 
      });
    }

    const entry = map.get(groupId);

    if (doc.parlayid) {
      entry.legs.push({
        player: doc.playerteam || doc.player || 'Legacy Bet',
        prop: doc.prop,
        line: doc.line,
        selection: doc.selection || '',
        odds: doc.odds,
        status: (doc.status || doc.result || 'pending').toLowerCase(),
        matchup: doc.matchup
      });
      
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

  const sortedBets = useMemo(() => {
    // Sort bets by ID descending for a stable default order
    return [...bets].sort((a, b) => (b.id > a.id ? 1 : -1));
  }, [bets]);

  const filteredBets = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    
    if (!query) return sortedBets;

    return sortedBets.filter((bet) => {
      const matchesId = bet.id.toLowerCase().includes(query);
      const matchesStatus = bet.status.toLowerCase().includes(query);
      const matchesType = bet.betType?.toLowerCase().includes(query);
      const matchesLegs = bet.legs?.some((leg: any) => 
        (leg.player || leg.playerteam || '').toLowerCase().includes(query) ||
        (leg.prop || '').toLowerCase().includes(query) ||
        (leg.matchup || '').toLowerCase().includes(query)
      );
      return matchesId || matchesStatus || !!matchesType || !!matchesLegs;
    });
  }, [sortedBets, searchQuery]);

  const stats = useMemo(() => {
    return bets.reduce((acc, bet) => {
      const stake = Number(bet.stake) || 0;
      const isBonus = !!bet.isBonus || !!bet.boost;
      
      let payout = 0;
      if (bet.status === 'push') {
        payout = stake;
      } else if (bet.status === 'won') {
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

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedBet(null);
  };

  const handleSaveBet = async (updatedData: any) => {
    try {
      const response = await fetch('/api/update-bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
  
      if (!response.ok) throw new Error('Failed to update bet');
  
      setBets((prevBets) =>
        prevBets.map((bet) =>
          (updatedData.parlayid && bet.parlayid === updatedData.parlayid) || bet.id === updatedData.id
            ? { ...bet, status: updatedData.status, stake: updatedData.stake }
            : bet
        )
      );
      
      toast.success("Bet updated successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Error updating bet.");
    }
  };

  const handleDeleteBet = async (bet: Bet) => {
    if (!window.confirm("Are you sure you want to delete this bet? This cannot be undone.")) return;
  
    try {
      const response = await fetch('/api/delete-bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          betId: bet.id, 
          parlayid: bet.parlayid 
        }),
      });
  
      if (!response.ok) throw new Error('Failed to delete');
  
      setBets(prev => prev.filter(b => 
        bet.parlayid ? b.parlayid !== bet.parlayid : b.id !== bet.id
      ));
      toast.success("Bet deleted successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Error deleting bet.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-end mb-8">
        <div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase italic">Betting Log</h1>
          <p className="text-emerald-500 font-mono text-sm">{filteredBets.length} TOTAL WAGERS</p>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8 text-center">
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Net Profit</p>
          <p className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {stats.netProfit.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Total Volume</p>
          <p className="text-2xl font-bold text-white">
            {stats.totalVolume.toLocaleString('en-US', { style: 'currency', currency: 'USD' })}
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">ROI</p>
          <p className={`text-2xl font-bold ${roi >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
            {roi.toFixed(2)}%
          </p>
        </div>
        <div className="bg-card border border-border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">Win Rate</p>
          <p className="text-2xl font-bold text-white">
            {winRate.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="mb-6 relative">
        <Input
          type="text"
          placeholder="Search bets by player, team, prop, or status..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-card border-border h-11 pl-10"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          <div className="h-48 bg-card rounded-xl border border-border" />
          <div className="h-48 bg-card rounded-xl border border-border" />
        </div>
      ) : filteredBets.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
          <p className="text-muted-foreground">
            {searchQuery ? 'No bets match your search.' : 'No bets found in the master log.'}
          </p>
        </div>
      ) : (
        <BetsTable bets={filteredBets} onDelete={handleDeleteBet} onEdit={handleEdit} />
      )}

      <EditBetModal 
        bet={selectedBet}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSave={handleSaveBet}
      />
    </div>
  );
}
