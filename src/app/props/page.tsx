'use client';

import React, { useState, useMemo } from 'react';
import { 
  Search, Calendar, Database, Zap, CheckCircle2, RefreshCw, ChevronRight, Filter
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { IngestEnrichModal } from '@/components/bets/EnrichModal';
import { useToast } from "@/components/ui/use-toast";
import { useAllProps } from '@/hooks/useAllProps';
import { getWeekFromDate } from '@/lib/utils/nfl-week';

export default function HistoricalVault() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [league, setLeague] = useState<'nba' | 'nfl'>('nba');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGrading, setIsGrading] = useState(false);
  const { toast } = useToast();

  const season = '2025'; // Example season
  const selectedWeek = useMemo(() => getWeekFromDate(new Date(selectedDate)), [selectedDate]);

  const { props, loading, error, hasMore, loadMore, refresh } = useAllProps({
    league,
    season: Number(season),
    date: selectedDate,
    limit: 50
  });

  const filteredProps = useMemo(() => {
    if (!searchQuery) return props;
    return props.filter(p => 
      p.player?.toLowerCase().includes(searchQuery.toLowerCase()) || 
      p.matchup?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [props, searchQuery]);

  const hasData = props.length > 0;
  const isEnriched = hasData && props.some(p => (p.score || 0) > 0);

  const handleGradeResults = async () => {
    setIsGrading(true);
    try {
      const res = await fetch(`/api/${league}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date: selectedDate, week: selectedWeek, season })
      });
      if (!res.ok) throw new Error("Grading failed");
      toast({ 
        title: "Protocol Success",
        description: "Vault records updated and graded." 
      });
      refresh();
    } catch (err) {
      toast({ 
        variant: "destructive", 
        title: "Error",
        description: "Grading protocol failed." 
      });
    } finally {
      setIsGrading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 p-6 space-y-6">
      
      <div className="bg-[#121214] rounded-[32px] p-8 border border-white/[0.03] flex justify-between items-center shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="w-16 h-16 bg-indigo-500/10 rounded-[22px] flex items-center justify-center border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]">
            <Database className="text-indigo-500 w-8 h-8" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-none">
              Historical <span className="text-indigo-400">Vault</span>
            </h1>
            <div className="flex items-center gap-2 mt-2">
               <span className="text-[10px] font-black uppercase text-zinc-500 tracking-[0.2em]">Intel Archive</span>
               <div className="w-1 h-1 rounded-full bg-zinc-800" />
               <span className="text-[10px] font-black uppercase text-indigo-500/60 tracking-[0.2em]">{league} Protocol</span>
            </div>
          </div>
        </div>

        <div className="bg-black/40 p-1.5 rounded-[20px] border border-white/5 flex gap-1">
          {['nba', 'nfl'].map((l) => (
            <button
              key={l}
              onClick={() => setLeague(l as any)}
              className={`px-10 py-3 rounded-xl text-[11px] font-black uppercase transition-all duration-300 ${
                league === l ? 'bg-white text-black shadow-xl scale-[1.02]' : 'text-zinc-500 hover:text-white hover:bg-white/5'
              }`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#121214] rounded-[24px] p-4 border border-white/[0.03] flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-4">
            <Button onClick={() => setIsModalOpen(true)} className="bg-orange-600 hover:bg-orange-500 text-white font-black uppercase italic rounded-xl px-10 py-6 group transition-all shadow-[0_10px_20px_rgba(234,88,12,0.15)]">
              <Zap className="mr-2 w-4 h-4 group-hover:animate-pulse" />
              {hasData ? 'Refine Analysis' : 'Seed & Analyze'}
            </Button>
        </div>
        <div className="flex items-center gap-3">
            <Button 
                onClick={handleGradeResults}
                disabled={isGrading || !isEnriched}
                className="bg-[#00c278] hover:bg-[#00e08b] text-black font-black uppercase italic rounded-xl px-10 py-6 transition-all shadow-[0_10px_20px_rgba(0,194,120,0.15)] disabled:opacity-20"
            >
                {isGrading ? <RefreshCw className="mr-2 w-4 h-4 animate-spin" /> : <CheckCircle2 className="mr-2 w-4 h-4" />}
                Grade Slate
            </Button>
        </div>
      </div>

      <div className="bg-[#121214] rounded-[24px] p-4 border border-white/[0.03] flex items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-zinc-600" size={18} />
          <input 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search vault for players, matchups, or stats..."
            className="w-full bg-black/40 border border-white/5 rounded-xl py-4 pl-14 pr-4 text-sm font-medium focus:outline-none focus:border-indigo-500/40 transition-all placeholder:text-zinc-700"
          />
        </div>
        <div className="flex gap-2 h-full">
          <input 
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-black/40 border border-white/5 px-5 py-4 rounded-xl text-xs font-black text-white uppercase focus:outline-none focus:border-indigo-500/40 cursor-pointer"
          />
          <Button onClick={refresh} className="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 hover:bg-indigo-600 hover:text-white font-black uppercase text-[10px] px-8 rounded-xl transition-all">
             Refresh Data
          </Button>
        </div>
      </div>

      <div className="rounded-[24px] border border-white/[0.03] bg-[#121214] overflow-hidden shadow-lg">
        <Table>
          <TableHeader className="bg-black/30">
            <TableRow className="border-white/5 hover:bg-transparent">
              <TableHead className="px-6 py-4 text-zinc-500 font-black uppercase text-[9px] tracking-widest">Player / Stat</TableHead>
              <TableHead className="text-zinc-500 font-black uppercase text-[9px] tracking-widest text-center">Line</TableHead>
              <TableHead className="text-zinc-500 font-black uppercase text-[9px] tracking-widest text-center">Guru Edge</TableHead>
              <TableHead className="text-zinc-500 font-black uppercase text-[9px] tracking-widest text-center">Result</TableHead>
              <TableHead className="text-zinc-500 font-black uppercase text-[9px] tracking-widest text-right px-6">Outcome</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={5} className="h-64 text-center text-zinc-600 font-black uppercase text-xs">Loading Intel...</TableCell></TableRow>
            ) : filteredProps.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-64 text-center text-zinc-700 font-black uppercase text-xs italic tracking-widest">No Props Found for this Date</TableCell></TableRow>
            ) : filteredProps.map((p) => (
              <TableRow key={p.id} className="border-white/[0.02] hover:bg-white/[0.02] transition-all">
                <TableCell className="px-6 py-4">
                  <div className="font-black text-white text-sm tracking-tight">{p.player}</div>
                  <div className="text-[10px] text-zinc-500 font-black uppercase tracking-tighter">{p.prop?.replace('_', ' ')}</div>
                </TableCell>
                <TableCell className="text-center font-black text-zinc-400 text-lg">{p.line}</TableCell>
                <TableCell className="text-center">
                  <div className="inline-flex flex-col items-center px-4 py-1.5 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                    <span className="text-emerald-400 font-black text-base">{p.score?.toFixed(1) || '0.0'}</span>
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  {p.actualValue !== undefined ? (
                    <div className="flex flex-col items-center">
                      <span className="text-white font-black text-lg">{p.actualValue}</span>
                      <span className="text-[8px] text-zinc-600 font-bold uppercase">Actual</span>
                    </div>
                  ) : (
                    <span className="text-zinc-800 font-black italic text-xs">TBD</span>
                  )}
                </TableCell>
                <TableCell className="text-right px-6">
                  {p.actualValue !== undefined ? (
                    <Badge className={`font-black uppercase text-[10px] px-3 py-1 rounded-lg ${
                      p.actualValue > p.line ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                    }`}>
                      {p.actualValue > p.line ? '✅ HIT' : '❌ MISS'}
                    </Badge>
                  ) : (
                    <div className="text-[10px] text-zinc-700 font-black uppercase italic tracking-widest">Pending</div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <IngestEnrichModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onComplete={refresh}
        league={league}
        defaultDate={selectedDate}
        defaultSeason={Number(season)}
        props={props}
      />
    </div>
  );
}
