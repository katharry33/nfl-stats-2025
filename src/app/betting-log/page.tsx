'use client';

import { useState, useMemo } from "react";
import { Bet, BetLeg, BetStatus } from "@/lib/types";
import { BetsTable } from "@/components/bets/bets-table";
import { EditBetModal } from "@/components/bets/edit-bet-modal";
import { useFirebaseBets } from "@/hooks/useBets"; 
import { BettingStats } from "@/components/bets/betting-stats";

import { 
  Search, 
  RotateCcw, 
  Loader2, 
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';

function normalizeBet(data: any): Bet {
  const isFlatRecord = !Array.isArray(data.legs) || data.legs.length === 0;
  const rawLegs = isFlatRecord ? [data] : data.legs;

  const normalizedLegs: BetLeg[] = rawLegs.map((leg: any) => ({
    id: leg.id || crypto.randomUUID(),
    player: leg.player || leg.Player || 'Unknown',
    team: leg.team || leg.Team || 'TBD',
    prop: leg.prop || leg.Prop || '',
    line: Number(leg.line ?? leg.Line ?? 0),
    odds: Number(leg.odds ?? leg.Odds ?? -110),
    selection: leg.selection || (leg.overunder === 'Over' || leg['Over/Under?'] === 'Over' ? 'Over' : 'Under'),
    status: (leg.status || 'pending').toLowerCase(),
    gameDate: leg.gameDate || (isFlatRecord ? data.date : null),
    matchup: leg.matchup || (isFlatRecord ? data.matchup : 'N/A')
  }));

  const finalDate = data.manualDate || data.date;
  const creation = data.createdAt?.seconds 
      ? new Date(data.createdAt.seconds * 1000) 
      : new Date(data.createdAt || data.date || Date.now());

  return {
    ...data,
    id: data.id,
    stake: Number(data.stake || 0),
    odds: Number(data.odds || 0),
    betType: data.betType || (normalizedLegs.length > 1 ? 'Parlay' : 'Single'),
    status: (data.status || 'pending').toLowerCase() as BetStatus,
    legs: normalizedLegs,
    date: finalDate,
    manualDate: data.manualDate,
    createdAt: creation,
    cashedOutAmount: data.cashedOutAmount || data.CashedOutAmount || undefined,
  } as Bet;
}

export default function BettingLogPage() {
  const { 
    bets: allBets, 
    loading, 
    deleteBet, 
    updateBet, 
    loadMore,
    hasMore,
    loadingMore 
  } = useFirebaseBets('dev-user');

  const [selectedBet, setSelectedBet] = useState<Bet | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  const [playerInput, setPlayerInput] = useState('');
  const [teamInput, setTeamInput] = useState('');
  const [statusInput, setStatusInput] = useState('all');
  const [betTypeInput, setBetTypeInput] = useState('all');
  const [appliedFilters, setAppliedFilters] = useState({ 
    player: '', team: '', status: 'all', betType: 'all'
  });

  const processedBets = useMemo(() => {
    return allBets.map(normalizeBet).sort((a, b) => {
        const aDate = new Date(a.date || a.createdAt).getTime();
        const bDate = new Date(b.date || b.createdAt).getTime();
        return bDate - aDate;
    });
  }, [allBets]);

  const handleSearch = () => {
    setAppliedFilters({ player: playerInput, team: teamInput, status: statusInput, betType: betTypeInput });
  };

  const handleReset = () => {
    setPlayerInput('');
    setTeamInput('');
    setStatusInput('all');
    setBetTypeInput('all');
    setAppliedFilters({ player: '', team: '', status: 'all', betType: 'all' });
  };

  const filteredBets = useMemo(() => {
    if (appliedFilters.player || appliedFilters.team || appliedFilters.status !== 'all' || appliedFilters.betType !== 'all') {
      return processedBets.filter(bet => {
        const playerMatch = !appliedFilters.player || bet.legs.some(l => (l.player ?? "").toLowerCase().includes(appliedFilters.player.toLowerCase()));
        const teamMatch = !appliedFilters.team || bet.legs.some(l => (l.team ?? "").toLowerCase().includes(appliedFilters.team.toLowerCase()));
        const statusMatch = appliedFilters.status === 'all' || bet.status === appliedFilters.status;
        const typeMatch = appliedFilters.betType === 'all' || bet.betType === appliedFilters.betType;
        return playerMatch && teamMatch && statusMatch && typeMatch;
      });
    } 
    return processedBets;
  }, [processedBets, appliedFilters]);

  const handleEditClick = (id: string) => {
    const bet = processedBets.find(b => b.id === id);
    if (bet) {
      setSelectedBet(bet);
      setIsEditOpen(true);
    }
  };

  const handleSave = async (updates: any) => {
    await updateBet(updates);
    setIsEditOpen(false);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-white mb-2">Betting Log</h1>
        <p className="text-slate-400 text-sm">Track your performance and manage active plays.</p>
      </div>

      <BettingStats bets={processedBets} />

      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 bg-slate-900/40 p-4 rounded-xl border border-slate-800/50 items-end">
        <div className="space-y-1.5"><Label className="label-form">Player</Label><Input placeholder="Search..." value={playerInput} onChange={(e) => setPlayerInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="input-form" /></div>
        <div className="space-y-1.5"><Label className="label-form">Team</Label><Input placeholder="LAL, SF..." value={teamInput} onChange={(e) => setTeamInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSearch()} className="input-form uppercase" /></div>
        <div className="space-y-1.5"><Label className="label-form">Bet Status</Label><Select value={statusInput} onValueChange={setStatusInput}><SelectTrigger className="input-form"><SelectValue/></SelectTrigger><SelectContent className="select-content"><SelectItem value="all">All Statuses</SelectItem><SelectItem value="won">Won</SelectItem><SelectItem value="lost">Lost</SelectItem><SelectItem value="pending">Pending</SelectItem><SelectItem value="push">Push</SelectItem><SelectItem value="cashed out">Cashed Out</SelectItem></SelectContent></Select></div>
        <div className="space-y-1.5"><Label className="label-form">Bet Type</Label><Select value={betTypeInput} onValueChange={setBetTypeInput}><SelectTrigger className="input-form"><SelectValue/></SelectTrigger><SelectContent className="select-content"><SelectItem value="all">All Types</SelectItem><SelectItem value="Single">Single</SelectItem><SelectItem value="Parlay">Parlay</SelectItem><SelectItem value="SGP">SGP</SelectItem><SelectItem value="SGPx">SGP+</SelectItem></SelectContent></Select></div>
        <div className="flex gap-2">
            <Button onClick={handleSearch} className="flex-1 bg-emerald-600 hover:bg-emerald-500 h-9"><Search className="h-4 w-4 mr-2"/>Filter</Button>
            <Button variant="ghost" onClick={handleReset} className="text-slate-400 border border-slate-700 h-9 px-3"><RotateCcw className="h-4 w-4"/></Button>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 py-10"><Loader2 className="h-6 w-6 mx-auto animate-spin"/></div>
      ) : (
        <BetsTable 
          bets={filteredBets} 
          onDelete={deleteBet} 
          onEdit={handleEditClick} 
        />
      )}

      {hasMore && (
        <div className="flex justify-center mt-4">
          <Button 
            onClick={loadMore} 
            disabled={loadingMore}
            className="bg-slate-800 hover:bg-slate-700 text-white"
          >
            {loadingMore ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </Button>
        </div>
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
