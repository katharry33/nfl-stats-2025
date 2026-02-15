// src/app/betting-log/page.tsx
'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { BetsTable, calculatePayout } from '@/components/bets/bets-table';
import { EditBetModal } from '@/components/bets/edit-bet-modal';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { DollarSign, Ticket, TrendingUp, TrendingDown, Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface BetRecord {
  id: string;
  status: string;
  stake: number | string;
  odds: number;
  legs: any[];
  createdAt?: any;
  betType?: string;
}

export default function BettingLogPage() {
  const [bets, setBets] = useState<BetRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBet, setSelectedBet] = useState<BetRecord | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Filter states
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [betTypeFilter, setBetTypeFilter] = useState<string>('all');
  const [playerSearch, setPlayerSearch] = useState<string>('');
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');

  useEffect(() => {
    fetchBets();
  }, []);

  const fetchBets = async () => {
    try {
      const res = await fetch('/api/betting-log');
      const data = await res.json();
      setBets(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch bets:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (bet: BetRecord) => {
    setSelectedBet(bet);
    setIsEditOpen(true);
  };

  const handleSave = async (id: string, updatedData: any) => {
    try {
      const res = await fetch(`/api/betting-log/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData),
      });
  
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to update');
      }
  
      const result = await res.json();
      
      setBets((prevBets) => 
        prevBets.map((bet) => (bet.id === id ? { ...bet, ...result.data } : bet))
      );
  
      console.log("✅ Bet updated");
    } catch (err) {
      console.error("Update failed:", err);
      alert("Error updating bet. Please try again.");
    }
  };

  // Apply filters
  const filteredBets = useMemo(() => {
    return bets.filter(bet => {
      // Status filter
      if (statusFilter !== 'all' && bet.status !== statusFilter) return false;
      
      // Bet type filter
      if (betTypeFilter !== 'all') {
        if (betTypeFilter === 'parlay' && !bet.betType?.includes('leg')) return false;
        if (betTypeFilter === 'straight' && bet.betType?.includes('leg')) return false;
      }
      
      // Player search
      if (playerSearch && bet.legs?.length > 0) {
        const hasPlayer = bet.legs.some(leg => 
          leg.player?.toLowerCase().includes(playerSearch.toLowerCase())
        );
        if (!hasPlayer) return false;
      }
      
      // Date range filter
      if (dateFrom || dateTo) {
        const betDate = bet.createdAt?.seconds 
          ? new Date(bet.createdAt.seconds * 1000)
          : bet.createdAt 
            ? new Date(bet.createdAt)
            : null;
            
        if (betDate) {
          if (dateFrom && betDate < new Date(dateFrom)) return false;
          if (dateTo && betDate > new Date(dateTo + 'T23:59:59')) return false;
        }
      }
      
      return true;
    });
  }, [bets, statusFilter, betTypeFilter, playerSearch, dateFrom, dateTo]);

  const stats = useMemo(() => {
    if (!filteredBets.length) return { total: 0, won: 0, lost: 0, profit: 0, roi: 0 };

    const total = filteredBets.length;
    const won = filteredBets.filter(b => b.status === 'won').length;
    const lost = filteredBets.filter(b => b.status === 'lost').length;
    
    // FIXED: Only calculate P/L from WON bets
    const wonBets = filteredBets.filter(b => b.status === 'won');
    const totalRiskedOnWonBets = wonBets.reduce((sum, b) => sum + (Number(b.stake) || 0), 0);
    const totalReturnedFromWonBets = wonBets.reduce((sum, b) => {
      return sum + calculatePayout(b.stake, Number(b.odds) || 0);
    }, 0);

    const profit = totalReturnedFromWonBets - totalRiskedOnWonBets;
    
    // ROI based on ALL risked amount
    const totalRisked = filteredBets.reduce((sum, b) => sum + (Number(b.stake) || 0), 0);
    const roi = totalRisked > 0 ? (profit / totalRisked) * 100 : 0;

    return { total, won, lost, profit, roi };
  }, [filteredBets]);

  const clearFilters = () => {
    setStatusFilter('all');
    setBetTypeFilter('all');
    setPlayerSearch('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = statusFilter !== 'all' || betTypeFilter !== 'all' || playerSearch || dateFrom || dateTo;

  if (loading) return <div className="p-8 text-slate-400 font-mono">Loading betting logs...</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <header className="flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter italic">BETTING LOG</h1>
          <p className="text-slate-500 text-sm">
            {filteredBets.length} of {bets.length} bets
            {hasActiveFilters && ' (filtered)'}
          </p>
        </div>
      </header>

      {/* Filters */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-400" />
              <CardTitle className="text-sm font-bold text-slate-400 uppercase">Filters</CardTitle>
            </div>
            {hasActiveFilters && (
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={clearFilters}
                className="text-xs text-slate-500 hover:text-slate-300"
              >
                <X className="h-3 w-3 mr-1" />
                Clear All
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="bg-slate-950 border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="won">Won</SelectItem>
                  <SelectItem value="lost">Lost</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Bet Type</Label>
              <Select value={betTypeFilter} onValueChange={setBetTypeFilter}>
                <SelectTrigger className="bg-slate-950 border-slate-800">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="parlay">Parlays</SelectItem>
                  <SelectItem value="straight">Straight</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Player Search</Label>
              <Input
                placeholder="Search player..."
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                className="bg-slate-950 border-slate-800"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Date From</Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="bg-slate-950 border-slate-800"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-400">Date To</Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="bg-slate-950 border-slate-800"
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <StatCard title="Total Bets" value={stats.total} icon={<Ticket className="h-4 w-4" />} />
        <StatCard title="Won" value={stats.won} icon={<TrendingUp className="h-4 w-4" />} color="text-emerald-400" />
        <StatCard title="Lost" value={stats.lost} icon={<TrendingDown className="h-4 w-4" />} color="text-red-400" />
        <StatCard 
          title="Net P/L" 
          value={`$${stats.profit.toFixed(2)}`} 
          color={stats.profit >= 0 ? 'text-emerald-400' : 'text-red-400'}
          icon={<DollarSign className="h-4 w-4" />} 
        />
        <StatCard 
          title="ROI" 
          value={`${stats.roi.toFixed(1)}%`} 
          color={stats.roi >= 0 ? 'text-emerald-400' : 'text-red-400'}
          icon={<TrendingUp className="h-4 w-4" />} 
        />
      </div>

      {/* Table */}
      <div className="bg-slate-950 border border-slate-800 rounded-xl shadow-2xl overflow-hidden">
        <BetsTable bets={filteredBets} onEdit={handleEdit} />
      </div>

      <EditBetModal 
        bet={selectedBet} 
        isOpen={isEditOpen} 
        onClose={() => setIsEditOpen(false)} 
        onSave={handleSave} 
      />
    </div>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color?: string;
}

function StatCard({ title, value, icon, color = "text-white" }: StatCardProps) {
  return (
    <Card className="bg-slate-900/50 border-slate-800 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-xs font-bold text-slate-500 uppercase tracking-widest">{title}</CardTitle>
        <div className="text-slate-600">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-black font-mono ${color}`}>{value}</div>
      </CardContent>
    </Card>
  );
}