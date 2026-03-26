      'use client';
      
      import React, { useState, useEffect } from 'react';
      import { 
        Table, 
        TableBody, 
        TableCell, 
        TableHead, 
        TableHeader, 
        TableRow 
     } from "@/components/ui/table";
     import { Button } from "@/components/ui/button";
     import { Badge } from "@/components/ui/badge";
     import { 
       Star, 
       Plus, 
       Check, 
       TrendingUp, 
       ShieldAlert, 
       Zap,
       RefreshCw
     } from "lucide-react";
     import NBAIngestTools from '@/lib/enrichment/nba/NBAIngestTools';
     import { useToast } from "@/components/ui/use-toast";
     
     // --- TYPES ---
     interface NBAProp {
       id: string;
       player: string;
       matchup: string;
       prop: string;
       line: number;
       bestOdds: number;
       bestBook: string;
       expertStars?: number;
       // Enriched Data from your Logic
       seasonHitPct?: number;
       playerAvg?: number;
       opponentRank?: number;
       opponentAvgVsStat?: number;
       score?: number; // The "Guru Score"
       teamLogo?: string;
     }
     
     export default function BetBuilderView() {
       const [props, setProps] = useState<NBAProp[]>([]);
       const [betSlip, setBetSlip] = useState<string[]>([]);
       const [isLoading, setIsLoading] = useState(true);
       const { toast } = useToast();
     
       // 1. Fetch Data (Placeholders for your Firebase fetch logic)
       const fetchProps = async () => {
         setIsLoading(true);
         try {
           // This would call your Firestore collection: nbaProps_2025
           const res = await fetch('/api/props?league=nba&season=2025');
           const data = await res.json();
           setProps(data.props || []);
         } catch (err) {
           console.error("Failed to load props", err);
         } finally {
           setIsLoading(false);
         }
       };
     
       useEffect(() => {
         fetchProps();
       }, []);
     
       // 2. Bet Slip Helpers
       const isInBetSlip = (id: string) => betSlip.includes(id);
       const toggleBetSlip = (prop: NBAProp) => {
         if (!prop.id) return;
         setBetSlip(prev => 
           prev.includes(prop.id) ? prev.filter(i => i !== prop.id) : [...prev, prop.id]
         );
       };
     
       return (
         <div className="min-h-screen bg-black text-zinc-100 p-4 md:p-8 space-y-8">
           
           {/* --- HEADER SECTION --- */}
           <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
             <div>
               <div className="flex items-center gap-3 mb-1">
                 <h1 className="text-4xl font-black tracking-tighter text-white">
                   GRIDIRON <span className="text-emerald-500">GURU</span>
                 </h1>
                 <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 font-bold">
                   NBA BETA
                 </Badge>
               </div>
               <p className="text-zinc-500 text-xs font-bold uppercase tracking-[0.2em]">
                 NBA Player Prop Predictive Analytics
               </p>
             </div>
     
             <div className="flex items-center gap-3">
               <Button 
                variant="outline" 
                size="sm" 
                onClick={fetchProps}
                className="border-white/10 bg-zinc-900 hover:bg-zinc-800"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <NBAIngestTools onComplete={fetchProps} />
            </div>
          </div>
    
          {/* --- MAIN ANALYSIS TABLE --- */}
          <div className="rounded-2xl border border-white/5 bg-zinc-900/40 backdrop-blur-md overflow-hidden">
            <Table>
              <TableHeader className="bg-zinc-950/50">
                <TableRow className="border-white/5 hover:bg-transparent">
                  <TableHead className="w-[250px] text-zinc-400 font-bold uppercase text-[10px] tracking-widest">Player / Matchup</TableHead>
                  <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest text-center">Prop</TableHead>
                  <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest text-center">Season Stats</TableHead>
                  <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest text-center">Matchup Edge</TableHead>
                  <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest text-center">Guru Score</TableHead>
                  <TableHead className="text-zinc-400 font-bold uppercase text-[10px] tracking-widest text-center">Best Odds</TableHead>
                  <TableHead className="w-[80px]"></TableHead>
                </TableRow>
              </TableHeader>
              
              <TableBody>
                {isLoading ? (
                  <TableRow><TableCell colSpan={7} className="h-64 text-center text-zinc-500">Loading data...</TableCell></TableRow>
                ) : props.length === 0 ? (
                  <TableRow><TableCell colSpan={7} className="h-64 text-center text-zinc-500">No props found. Upload a CSV to begin.</TableCell></TableRow>
                ) : props.map((p) => (
                  <TableRow key={p.id} className="border-white/5 hover:bg-white/2 transition-colors group">
                    
                    {/* Player & Matchup */}
                    <TableCell>
                      <div className="font-bold text-white text-base">{p.player}</div>
                      <div className="text-[10px] text-zinc-500 font-black flex items-center gap-1">
                        <span className="px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400 italic">VS</span>
                        {p.matchup}
                      </div>
                    </TableCell>
    
                    {/* Prop & Line */}
                    <TableCell className="text-center">
                      <div className="text-sm font-medium text-zinc-300 mb-1 capitalize">{p.prop.replace('_', ' ')}</div>
                      <Badge className="bg-amber-400 text-black font-black px-2 py-0">
                        {p.line}
                      </Badge>
                    </TableCell>
    
                    {/* Season Stats */}
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className="text-xs font-bold flex items-center gap-1">
                          <TrendingUp className="w-3 h-3 text-emerald-500" />
                          {p.seasonHitPct}% <span className="text-[10px] text-zinc-600 font-normal">HIT</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 uppercase">Avg: <span className="text-zinc-300">{p.playerAvg}</span></div>
                      </div>
                    </TableCell>
    
                    {/* Matchup Edge */}
                    <TableCell className="text-center">
                      <div className="flex flex-col items-center gap-1">
                        <div className={`text-xs font-bold ${Number(p.opponentRank) <= 10 ? 'text-emerald-400' : 'text-zinc-400'}`}>
                          Rank #{p.opponentRank}
                        </div>
                        <div className="text-[10px] text-zinc-500 uppercase font-medium">
                          Opp Avg: {p.opponentAvgVsStat}
                        </div>
                      </div>
                    </TableCell>
    
                    {/* Guru Score */}
                    <TableCell className="text-center">
                      <div className="inline-flex flex-col items-center px-3 py-1 bg-emerald-500/5 border border-emerald-500/10 rounded-lg">
                        <span className="text-emerald-400 font-black text-lg leading-none">
                          {p.score?.toFixed(1) || '0.0'}
                        </span>
                        <span className="text-[8px] text-emerald-500/50 font-bold uppercase tracking-tighter">Value</span>
                      </div>
                    </TableCell>
    
                    {/* Odds */}
                    <TableCell className="text-center">
                      <div className="text-emerald-400 font-mono font-bold text-sm">
                        {p.bestOdds > 0 ? `+${p.bestOdds}` : p.bestOdds}
                      </div>
                      <div className="text-[9px] text-zinc-600 font-black uppercase tracking-tight">{p.bestBook}</div>
                    </TableCell>
    
                    {/* Action */}
                    <TableCell className="text-right">
                      <Button
                        size="icon"
                        onClick={() => toggleBetSlip(p)}
                        className={`w-8 h-8 rounded-full transition-all ${
                          isInBetSlip(p.id) 
                            ? "bg-emerald-500 text-black hover:bg-emerald-400 scale-110" 
                            : "bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white border border-white/10"
                        }`}
                      >
                        {isInBetSlip(p.id) ? <Check size={16} strokeWidth={3} /> : <Plus size={16} />}
                      </Button>
                    </TableCell>
    
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
    
          {/* --- FOOTER STATUS --- */}
          <div className="flex items-center gap-4 text-[10px] text-zinc-600 font-bold uppercase tracking-widest">
            <div className="flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Engine Active
            </div>
            <div className="flex items-center gap-1.5">
              <Zap className="w-3 h-3" />
              {props.length} Prop Analyzed
            </div>
          </div>
    
        </div>
      );
    }