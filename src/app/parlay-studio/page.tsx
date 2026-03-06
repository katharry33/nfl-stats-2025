'use client';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/firebase/provider';
import { useBetSlip } from '@/context/betslip-context';
import { getWeekFromDate } from '@/lib/utils/nfl-week';
import { toDecimal, toAmerican } from '@/lib/utils/odds';
import {
  Trash2, ChevronLeft, CheckCircle2, Clock, XCircle,
  Zap, DollarSign, ArrowDown, TrendingUp, Loader2, AlertTriangle, Layers, ShieldCheck
} from 'lucide-react';
import { toast } from 'sonner';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtAmerican(n: number): string {
  if (!n || isNaN(n) || !isFinite(n)) return '—';
  return n >= 0 ? `+${n}` : `${n}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type LegResult = 'pending' | 'won' | 'lost' | 'void';

interface LegState {
  id: string; player: string; prop: string;
  line: number; selection: string; odds: number;
  matchup: string; week?: number; result: LegResult;
  isLive: boolean;
  [key: string]: any;
}

const RESULTS: {
  value: LegResult; label: string; icon: React.ReactNode;
  active: string; inactive: string;
}[] = [
  { value: 'won',     label: 'Win',     icon: <CheckCircle2 className="h-3.5 w-3.5" />, active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', inactive: 'border-white/[0.08] text-zinc-600 hover:border-white/20 hover:text-zinc-300' },
  { value: 'lost',    label: 'Loss',    icon: <XCircle      className="h-3.5 w-3.5" />, active: 'bg-red-500/20 text-red-400 border-red-500/40',             inactive: 'border-white/[0.08] text-zinc-600 hover:border-white/20 hover:text-zinc-300' },
  { value: 'pending', label: 'Pending', icon: <Clock        className="h-3.5 w-3.5" />, active: 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/30',       inactive: 'border-white/[0.08] text-zinc-600 hover:border-white/20 hover:text-zinc-300' },
  { value: 'void',    label: 'Void',    icon: <XCircle      className="h-3.5 w-3.5" />, active: 'bg-white/10 text-zinc-400 border-white/20',                inactive: 'border-white/[0.08] text-zinc-600 hover:border-white/20 hover:text-zinc-300' },
];

const BET_TYPES = ['Single','Anytime TD','SGP','Round Robin','SGPX','Spread','Moneyline','Total Points','Parlay'];

// ─── DuplicateModal ──────────────────────────────────────────────────────────

function DuplicateModal({ duplicates, onSaveAnyway, onCancel }: {
  duplicates: { player: string; prop: string }[];
  onSaveAnyway: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="bg-[#0f1115] border border-[#FFD700]/20 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#FFD700]/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-[#FFD700]" />
          </div>
          <div>
            <h2 className="text-white font-black text-sm italic uppercase tracking-tight">Already Logged</h2>
            <p className="text-zinc-600 text-[10px] font-mono uppercase">Duplicate legs detected</p>
          </div>
        </div>
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {duplicates.map((d: any, i: number) => (
            <div key={i} className="flex items-center gap-2 bg-black/40 border border-white/[0.06] rounded-xl px-3 py-2">
              <span className="text-[#FFD700] text-[9px] font-black uppercase bg-[#FFD700]/10 px-1.5 py-0.5 rounded">DUP</span>
              <div className="text-xs text-white font-bold">{d.player}</div>
              <div className="text-[10px] text-zinc-600 ml-auto capitalize">{d.prop}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel} className="flex-1 py-3 rounded-2xl border border-white/[0.08] text-zinc-400 text-[10px] font-black uppercase">Cancel</button>
          <button onClick={onSaveAnyway} className="flex-1 py-3 rounded-2xl bg-[#FFD700] text-black text-[10px] font-black uppercase">Save Anyway</button>
        </div>
      </div>
    </div>
  );
}

// ─── LegCard ─────────────────────────────────────────────────────────────────

function LegCard({ leg, index, onUpdate, onRemove }: {
  leg: LegState; index: number;
  onUpdate: (id: string, up: Partial<LegState>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className={`bg-[#0f1115] border rounded-2xl overflow-hidden transition-all duration-300 ${leg.result === 'void' ? 'opacity-50 grayscale border-white/5' : 'border-white/[0.06] hover:border-white/10'}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-6 h-6 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/20 text-[10px] font-black text-[#FFD700] flex items-center justify-center shrink-0">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="text-white font-black text-sm italic uppercase tracking-tight truncate">{leg.player}</p>
            <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-tighter truncate">{leg.matchup || '—'}</p>
          </div>
        </div>
        <button onClick={() => onRemove(leg.id)} className="text-zinc-700 hover:text-red-400 transition-colors ml-3 shrink-0">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-[10px] font-black uppercase">{leg.prop}</span>
            <input type="number" step="0.5" value={leg.line} 
              onChange={e => onUpdate(leg.id, { line: parseFloat(e.target.value) || 0 })}
              className="w-16 bg-black/40 border border-white/[0.08] text-white font-mono text-xs rounded-xl px-2 py-1.5 text-center outline-none" />
          </div>
          <div className="flex rounded-xl overflow-hidden border border-white/[0.08] ml-auto">
            {(['Over', 'Under'] as const).map((s: any) => (
              <button key={s} onClick={() => onUpdate(leg.id, { selection: s })}
                className={`px-3 py-1.5 text-[10px] font-black uppercase transition-colors ${
                  leg.selection === s
                    ? s === 'Over' ? 'bg-blue-600 text-white' : 'bg-orange-600 text-white'
                    : 'bg-black/40 text-zinc-600 hover:bg-white/[0.04]'
                }`}>{s}</button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[9px] text-zinc-600 uppercase font-black">Odds</span>
            <input type="number" value={leg.odds}
              onChange={e => onUpdate(leg.id, { odds: parseInt(e.target.value) || -110 })}
              className="w-20 bg-black/40 border border-white/[0.08] text-white font-mono text-xs rounded-xl px-2.5 py-1.5 text-center" />
          </div>
        </div>

        <div className="flex items-center justify-between py-2 border-t border-white/[0.04]">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input type="checkbox" checked={leg.isLive || false}
              onChange={e => onUpdate(leg.id, { isLive: e.target.checked })}
              className="w-4 h-4 rounded border-white/20 bg-black accent-[#FFD700]" />
            <span className="text-[9px] uppercase font-black text-zinc-600">Live Bet</span>
          </label>
          {leg.isLive && (
            <span className="flex items-center gap-1 text-[9px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full animate-pulse">
              <span className="w-1 h-1 rounded-full bg-blue-400" /> LIVE
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] uppercase font-black text-zinc-600 w-12 shrink-0">Result</span>
          <div className="flex gap-1.5 flex-wrap">
            {RESULTS.map((r: any) => (
              <button key={r.value} onClick={() => onUpdate(leg.id, { result: r.value })}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[9px] font-black uppercase transition-all ${
                  leg.result === r.value ? r.active : r.inactive
                }`}>
                {r.icon}{r.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ParlayStudioPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { selections, removeLeg, clearSlip, isInitialized } = useBetSlip();
  const detailsRef = useRef<HTMLDivElement>(null);
  const isPopulated = useRef(false);

  const [legs, setLegs] = useState<LegState[]>([]);
  const [selectedType, setSelectedType] = useState('Parlay');
  const [stake, setStake] = useState('');
  const [boost, setBoost] = useState('');
  const [manualOdds, setManualOdds] = useState('');
  const [isBonusBet, setIsBonusBet] = useState(false);
  const [saving, setSaving] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [dupModal, setDupModal] = useState(false);
  const [dupLegs, setDupLegs] = useState<{ player: string; prop: string }[]>([]);

  const [gameDate, setGameDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [week, setWeek] = useState(() => String(getWeekFromDate(new Date().toISOString())));
  const [season, setSeason] = useState(() => String(new Date().getFullYear()));

  // 1. Initial Load from BetSlip (Once)
  useEffect(() => {
    if (isInitialized && selections.length > 0 && !isPopulated.current) {
      setLegs(selections.map((s: any) => ({
        id: s.id, player: s.player || '', prop: s.prop || '',
        line: Number(s.line || 0), selection: s.selection || 'Over',
        odds: Number(s.odds || -110), matchup: s.matchup || '',
        week: s.week, result: 'pending' as LegResult, isLive: false,
      })));
      
      if (selections[0].gameDate) {
        const d = new Date(selections[0].gameDate);
        setGameDate(d.toISOString().split('T')[0]);
        setSeason(String(d.getUTCFullYear()));
      }
      isPopulated.current = true;
    }
  }, [isInitialized, selections]);

  // 2. Smart Parlay Odds (Handles Void)
  const parlayOdds = useMemo(() => {
    const validLegs = legs.filter(l => l.result !== 'void');
    if (validLegs.length === 0) return 0;
    if (validLegs.length === 1) return validLegs[0].odds;
    
    const dec = validLegs.reduce((acc, l) => acc * toDecimal(l.odds), 1);
    return Math.round(toAmerican(dec));
  }, [legs]);

  const effectiveOdds = manualOdds.trim() !== '' ? parseInt(manualOdds) : parlayOdds;
  const stakeNum = parseFloat(stake) || 0;

  const potentialPayout = useMemo(() => {
    if (!stakeNum || !effectiveOdds) return 0;
    const dec = toDecimal(effectiveOdds);
    const boostMult = boost ? 1 + parseInt(boost) / 100 : 1;
    const payout = stakeNum * dec * boostMult;
    return isBonusBet ? payout - stakeNum : payout;
  }, [stakeNum, effectiveOdds, boost, isBonusBet]);

  const handleDateChange = (val: string) => {
    if (!val) return;
    setGameDate(val);
    const d = new Date(`${val}T12:00:00.000Z`);
    setWeek(String(getWeekFromDate(val)));
    setSeason(String(d.getUTCFullYear()));
  };

  const updateLegState = (id: string, up: Partial<LegState>) =>
    setLegs(prev => prev.map((l: any) => l.id === id ? { ...l, ...up } : l));

  const removeLegState = (id: string) => {
    setLegs(prev => prev.filter((l: any) => l.id !== id));
    removeLeg(id);
  };

  const handleSaveParlay = async () => {
    if (!stake || effectiveOdds === 0) {
      toast.error("Enter a stake and odds");
      return;
    }
  
    setSaving(true);
    try {
      const betDoc = {
        userId: user?.uid,
        type: selectedType,
        stake: Number(stake),
        odds: effectiveOdds,
        boost: Number(boost) || 0,
        gameDate,
        week: Number(week),
        season: Number(season),
        status: 'pending',
        isBonusBet,
        legs: legs.map(l => ({ 
          player: l.player, prop: l.prop, line: Number(l.line),
          selection: l.selection, odds: Number(l.odds),
          status: l.result, matchup: l.matchup
        })),
        payout: 0,
        createdAt: new Date().toISOString()
      };
  
      const res = await fetch('/api/betting-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(betDoc),
      });
  
      if (!res.ok) throw new Error('Failed to save to database');
  
      toast.success('Bet logged!');
      clearSlip();
      router.push('/betting-log');
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (!isInitialized) return <div className="min-h-screen bg-[#060606] flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#FFD700]" /></div>;

  if (legs.length === 0) {
    return (
      <div className="min-h-screen bg-[#060606] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4"><Layers className="h-8 w-8 text-zinc-800" /></div>
        <h2 className="text-white font-black uppercase italic text-lg tracking-tighter">Studio Empty</h2>
        <p className="text-zinc-600 text-xs mb-8">Add props to build your parlay.</p>
        <button onClick={() => router.push('/all-props')} className="bg-[#FFD700] text-black px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-transform active:scale-95">Browse Historical Props</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060606] pb-12">
      {dupModal && <DuplicateModal duplicates={dupLegs} onCancel={() => setDupModal(false)} onSaveAnyway={handleSaveParlay} />}

      <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 bg-white/5 rounded-full text-zinc-500 hover:text-white"><ChevronLeft className="h-5 w-5" /></button>
          <div>
            <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">Parlay <span className="text-[#FFD700]">Studio</span></h1>
            <p className="text-zinc-600 text-[10px] font-mono uppercase tracking-widest">{legs.length} Leg Construction</p>
          </div>
        </div>

        <section className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-[10px] uppercase font-black text-zinc-600 tracking-widest flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#FFD700] text-black flex items-center justify-center">1</span> Review Legs
            </h2>
            <button onClick={() => { setLegs([]); clearSlip(); }} className="text-[10px] text-zinc-700 hover:text-red-400 font-black uppercase">Clear Slip</button>
          </div>
          {legs.map((leg, i) => <LegCard key={leg.id} leg={leg} index={i} onUpdate={updateLegState} onRemove={removeLegState} />)}
          
          <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-[#FFD700]/5 border border-[#FFD700]/10">
            <span className="text-[10px] text-zinc-500 font-black uppercase italic">Calculated Odds</span>
            <span className="text-sm font-black font-mono text-[#FFD700]">{fmtAmerican(parlayOdds)}</span>
          </div>
        </section>

        {!detailsOpen && (
          <button onClick={() => { setDetailsOpen(true); setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100); }}
            className="w-full flex items-center justify-center gap-2 py-5 rounded-[2rem] bg-[#FFD700] text-black font-black uppercase text-sm tracking-tighter shadow-xl shadow-[#FFD700]/10">
            Finalize Bet Details <ArrowDown className="h-4 w-4" />
          </button>
        )}

        {detailsOpen && (
          <section ref={detailsRef} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
             <h2 className="text-[10px] uppercase font-black text-zinc-600 tracking-widest flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#FFD700] text-black flex items-center justify-center">2</span> Bet Configuration
            </h2>

            <div className="bg-[#0f1115] border border-white/[0.06] rounded-[2.5rem] p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-black text-zinc-500">Category</label>
                  <select value={selectedType} onChange={e => setSelectedType(e.target.value)} className="w-full bg-black/40 border border-white/[0.08] text-white rounded-xl px-3 py-3 text-xs outline-none focus:border-[#FFD700]/40">
                    {BET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-black text-zinc-500">Stake ($)</label>
                  <input type="number" value={stake} onChange={e => setStake(e.target.value)} placeholder="0.00" className="w-full bg-black/40 border border-white/[0.08] text-white rounded-xl px-3 py-3 text-xs outline-none focus:border-[#FFD700]/40 font-mono" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-black text-zinc-500">Manual Odds (Override)</label>
                  <input type="number" value={manualOdds} onChange={e => setManualOdds(e.target.value)} placeholder={String(parlayOdds)} className="w-full bg-black/40 border border-white/[0.08] text-[#FFD700] rounded-xl px-3 py-3 text-xs outline-none font-mono" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-black text-zinc-500">Boost %</label>
                  <select value={boost} onChange={e => setBoost(e.target.value)} className="w-full bg-black/40 border border-white/[0.08] text-white rounded-xl px-3 py-3 text-xs outline-none">
                    <option value="">None</option>
                    {[10,25,33,50,100].map(p => <option key={p} value={String(p)}>{p}%</option>)}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-black text-zinc-500">Game Date</label>
                  <input type="date" value={gameDate} onChange={e => handleDateChange(e.target.value)} className="w-full bg-black/40 border border-white/[0.08] text-white rounded-xl px-3 py-3 text-xs [color-scheme:dark]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase font-black text-zinc-500 flex justify-between">Week <span className="text-[#FFD700]">WK {week}</span></label>
                  <input type="number" value={week} onChange={e => setWeek(e.target.value)} className="w-full bg-black/40 border border-white/[0.08] text-white rounded-xl px-3 py-3 text-xs font-mono" />
                </div>
              </div>

              <button onClick={() => setIsBonusBet(!isBonusBet)} className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${isBonusBet ? 'bg-cyan-500/10 border-cyan-500/40' : 'bg-black/20 border-white/5 opacity-60'}`}>
                <div className="flex items-center gap-3">
                  <ShieldCheck className={`h-5 w-5 ${isBonusBet ? 'text-cyan-400' : 'text-zinc-600'}`} />
                  <span className={`text-[10px] font-black uppercase ${isBonusBet ? 'text-cyan-400' : 'text-zinc-500'}`}>Bonus Bet / No-Sweat</span>
                </div>
                <div className={`w-4 h-4 rounded-full border-2 ${isBonusBet ? 'bg-cyan-400 border-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'border-zinc-700'}`} />
              </button>

              {stakeNum > 0 && (
                <div className="flex items-center justify-between px-5 py-4 bg-[#FFD700]/10 border border-[#FFD700]/20 rounded-2xl">
                  <div className="text-left">
                    <p className="text-[9px] text-zinc-500 font-black uppercase">Potential {isBonusBet ? 'Profit' : 'Payout'}</p>
                    <p className="text-2xl font-black font-mono text-[#FFD700]">${potentialPayout.toFixed(2)}</p>
                  </div>
                  <TrendingUp className="h-6 w-6 text-[#FFD700] opacity-20" />
                </div>
              )}
            </div>

            <button onClick={handleSaveParlay} disabled={saving}
              className="w-full py-5 rounded-[2rem] bg-[#FFD700] hover:bg-[#e6c200] text-black font-black uppercase text-sm tracking-widest transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><TrendingUp className="h-5 w-5" /> Log Bet History</>}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}