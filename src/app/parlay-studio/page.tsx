'use client';
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useBetSlip } from '@/context/betslip-context';
import { getWeekFromDate } from '@/lib/utils/nfl-week';
import { toDecimal, toAmerican, calculateParlayOdds } from '@/lib/utils/odds';
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

function parlayDecimal(odds: number[]): number {
  return odds.reduce((acc, o) => acc * toDecimal(o), 1);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type LegResult     = 'pending' | 'won' | 'lost' | 'void';
type BetPaymentType = 'regular' | 'bonus';

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
  { value: 'void',    label: 'Void',    icon: <XCircle      className="h-3.5 w-3.5" />, active: 'bg-white/[0.06] text-zinc-400 border-white/20',             inactive: 'border-white/[0.08] text-zinc-600 hover:border-white/20 hover:text-zinc-300' },
];

const BET_TYPES = ['Single','Anytime TD','SGP','Round Robin','SGPX','Spread','Moneyline','Total Points','Parlay'];

// ─── DuplicateModal ──────────────────────────────────────────────────────────

function DuplicateModal({ duplicates, onSaveAnyway, onCancel }: {
  duplicates: { player: string; prop: string }[];
  onSaveAnyway: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm px-4">
      <div className="bg-[#0f1115] border border-[#FFD700]/20 rounded-3xl p-6 max-w-sm w-full shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#FFD700]/10 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-[#FFD700]" />
          </div>
          <div>
            <h2 className="text-white font-black text-sm italic uppercase">Already in Betting Log</h2>
            <p className="text-zinc-600 text-xs mt-0.5">
              {duplicates.length} leg{duplicates.length > 1 ? 's' : ''} found for this week
            </p>
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
        <p className="text-zinc-600 text-xs">These legs are already logged for this week. Saving again will create a duplicate.</p>
        <div className="flex gap-2 pt-1">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-2xl border border-white/[0.08] text-zinc-400 text-xs font-black uppercase hover:bg-white/[0.04] transition-colors">
            Cancel
          </button>
          <button onClick={onSaveAnyway}
            className="flex-1 py-2.5 rounded-2xl bg-[#FFD700] hover:bg-[#e6c200] text-black text-xs font-black uppercase transition-colors">
            Save Anyway
          </button>
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
    <div className="bg-[#0f1115] border border-white/[0.06] rounded-2xl overflow-hidden hover:border-white/10 transition-colors">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-6 h-6 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/20 text-[10px] font-black text-[#FFD700] flex items-center justify-center shrink-0">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="text-white font-black text-sm italic uppercase tracking-tight truncate">{leg.player}</p>
            <p className="text-zinc-600 text-xs truncate">{leg.matchup || '—'}</p>
          </div>
        </div>
        <button onClick={() => onRemove(leg.id)} className="text-zinc-700 hover:text-red-400 transition-colors ml-3 shrink-0">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Prop + Over/Under + Odds */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-zinc-500 text-xs">{leg.prop}</span>
            <span className="font-mono font-black text-white">{leg.line}</span>
          </div>
          <div className="flex rounded-xl overflow-hidden border border-white/[0.08] ml-auto">
            {(['Over', 'Under'] as const).map((s: any) => (
              <button key={s} onClick={() => onUpdate(leg.id, { selection: s })}
                className={`px-3 py-1.5 text-[11px] font-black uppercase transition-colors ${
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
              className="w-24 bg-black/40 border border-white/[0.08] text-white font-mono text-xs rounded-xl px-2.5 py-1.5
                focus:ring-1 focus:ring-[#FFD700]/30 outline-none text-center" />
          </div>
        </div>

        {/* Live bet */}
        <div className="flex items-center justify-between py-2 border-t border-white/[0.04]">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input type="checkbox" checked={leg.isLive || false}
              onChange={e => onUpdate(leg.id, { isLive: e.target.checked })}
              className="w-4 h-4 rounded border-white/20 bg-black accent-[#FFD700] cursor-pointer" />
            <span className="text-[9px] uppercase font-black text-zinc-600 group-hover:text-zinc-400 transition-colors">
              Live Bet
            </span>
          </label>
          {leg.isLive && (
            <span className="flex items-center gap-1 text-[9px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full animate-pulse">
              <span className="w-1 h-1 rounded-full bg-blue-400" /> LIVE
            </span>
          )}
        </div>

        {/* Result */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[9px] uppercase font-black text-zinc-600 w-12 shrink-0">Result</span>
          <div className="flex gap-1.5 flex-wrap">
            {RESULTS.map((r: any) => (
              <button key={r.value} onClick={() => onUpdate(leg.id, { result: r.value })}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl border text-[10px] font-black uppercase transition-all ${
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
  const router        = useRouter();
  const auth          = useAuth();
  const { selections, addLeg, removeLeg, clearSlip } = useBetSlip();
  const detailsRef    = useRef<HTMLDivElement>(null);

  const [legs, setLegs] = useState<LegState[]>([]);

  useEffect(() => {
    const loadSelectionsFromStorage = (parsed: any[]) => {
      if (Array.isArray(parsed)) {
        parsed.forEach(leg => addLeg(leg));
      }
    };

    const pending = sessionStorage.getItem('pendingBetSlip');
    if (pending) {
      try {
        const parsed = JSON.parse(pending);
        loadSelectionsFromStorage(parsed);
        sessionStorage.removeItem('pendingBetSlip');
      } catch (e) {
        console.error("Failed to parse pendingBetSlip from sessionStorage", e);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selections) {
        setLegs(selections.map((s: any) => ({
            id: s.id, player: s.player || '', prop: s.prop || '',
            line: Number(s.line || 0), selection: s.selection || 'Over',
            odds: Number(s.odds || -110), matchup: s.matchup || '',
            week: s.week !== undefined ? Number(s.week) : undefined,
            result: 'pending' as LegResult, isLive: false, ...s,
        })));
    }
  }, [selections]);

  const [selectedType, setSelectedType] = useState('Parlay');
  const [stake,        setStake]        = useState('');
  const [boost,        setBoost]        = useState('');
  const [week,         setWeek]         = useState(() => {
    const w = selections[0]?.week; return w ? String(w) : '';
  });
  const [gameDate, setGameDate] = useState(() => {
    const gd = selections[0]?.gameDate;
    if (!gd) return '';
    try {
      const d = typeof gd === 'string'
        ? new Date(gd.includes('T') ? gd : `${gd}T12:00:00`)
        : new Date((gd as any).seconds * 1000);
      return d.toISOString().split('T')[0];
    } catch { return ''; }
  });
  const [saving,      setSaving]      = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [manualOdds,  setManualOdds]  = useState('');
  const [isBonusBet,  setIsBonusBet]  = useState(false);
  const [dupModal,    setDupModal]    = useState(false);
  const [dupLegs,     setDupLegs]     = useState<{ player: string; prop: string }[]>([]);

  const parlayOdds = useMemo(() => {
    const allOdds = legs.map(l => Number(l.odds));
    return calculateParlayOdds(allOdds);
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

  const handleEnterDetails = () => {
    setDetailsOpen(true);
    setTimeout(() => detailsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 80);
  };

  const handleDateChange = (val: string) => {
    setGameDate(val);
    const derived = getWeekFromDate(val);
    if (derived && !week) setWeek(String(derived));
  };

  const updateLegState = (id: string, up: Partial<LegState>) =>
    setLegs(prev => prev.map((l: any) => l.id === id ? { ...l, ...up } : l));

  const removeLegState = (id: string) => {
    setLegs(prev => prev.filter((l: any) => l.id !== id));
    removeLeg(id);
  };
  const handleSaveParlay = async () => {
    if (!gameDate || !stake) {
      toast.error("Missing Info");
      return;
    }
  
    setSaving(true);
    try {
      // Create the object WITHOUT an ID key
      const betDoc: any = {
        userId: auth.user?.uid,
        type: selectedType,
        stake: Number(stake),
        odds: effectiveOdds,
        boost: Number(boost) || 0,
        gameDate,
        week: Number(week),
        status: 'pending',
        isBonusBet,
        legs: legs.map((l) => ({ 
          player: l.player,
          prop: l.prop,
          line: Number(l.line),
          selection: l.selection,
          odds: Number(l.odds),
          status: l.result,
          matchup: l.matchup
        })),
      };
  
      console.log("Sending to API:", betDoc); // Check your console to ensure 'id' isn't here
  
      const response = await fetch('/api/save-bet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(betDoc), 
      });
  
      const result = await response.json();
  
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save');
      }
  
      toast.success('Saved successfully!');
      clearSlip();
      router.push('/betting-log');
    } catch (err: any) {
      console.error("Save error:", err);
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (legs.length === 0 && selections.length === 0) {
    return (
      <div className="min-h-screen bg-[#060606] flex items-center justify-center">
        <div className="text-center space-y-3">
          <Layers className="h-10 w-10 text-zinc-700 mx-auto" />
          <p className="text-zinc-500 text-sm">No legs in your bet slip.</p>
          <button onClick={() => router.push('/all-props')}
            className="text-[#FFD700] text-xs hover:underline flex items-center gap-1 mx-auto font-bold">
            <ChevronLeft className="h-3 w-3" /> Back to Historical Props
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#060606]">
      {dupModal && (
        <DuplicateModal
          duplicates={dupLegs}
          onCancel={() => setDupModal(false)}
          onSaveAnyway={async () => { setDupModal(false); await handleSaveParlay(); }}
        />
      )}

      <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()}
            className="flex items-center gap-1 text-zinc-600 hover:text-white text-xs transition-colors font-bold">
            <ChevronLeft className="h-4 w-4" /> Back
          </button>
          <div>
            <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">Parlay Studio</h1>
            <p className="text-zinc-600 text-[10px] font-mono">{legs.length} leg{legs.length !== 1 ? 's' : ''}</p>
          </div>
        </div>

        {/* Step 1 */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] uppercase font-black text-zinc-600 tracking-widest flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#FFD700] text-black text-[10px] font-black flex items-center justify-center">1</span>
              Review Legs
            </h2>
            {legs.length > 1 && (
              <button onClick={() => { setLegs([]); clearSlip(); }}
                className="text-[10px] text-zinc-700 hover:text-red-400 font-black uppercase transition-colors">
                Clear All
              </button>
            )}
          </div>

          {legs.map((leg: any, i: number) => (
            <LegCard key={leg.id} leg={leg} index={i} onUpdate={updateLegState} onRemove={removeLegState} />
          ))}

          {legs.length > 1 && (
            <div className="flex items-center justify-between px-4 py-3 rounded-2xl bg-[#FFD700]/5 border border-[#FFD700]/10">
              <span className="text-xs text-zinc-600 font-mono">Auto parlay ({legs.length} legs)</span>
              <span className="text-sm font-black font-mono text-[#FFD700]">{fmtAmerican(parlayOdds)}</span>
            </div>
          )}
        </section>

        {/* CTA */}
        {!detailsOpen && legs.length > 0 && (
          <button onClick={handleEnterDetails}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#FFD700]
              hover:bg-[#e6c200] text-black font-black uppercase text-sm tracking-wide transition-all">
            Enter Bet Details
            <ArrowDown className="h-4 w-4" />
          </button>
        )}

        {/* Step 2 */}
        {detailsOpen && legs.length > 0 && (
          <section ref={detailsRef} className="space-y-4 pt-1">
            <h2 className="text-[10px] uppercase font-black text-zinc-600 tracking-widest flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-[#FFD700] text-black text-[10px] font-black flex items-center justify-center">2</span>
              Bet Details
            </h2>

            <div className="bg-[#0f1115] border border-white/[0.06] rounded-3xl p-5 space-y-4">

              {/* Bet Type */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black text-zinc-600 flex items-center gap-1">
                  <Layers className="h-3 w-3" /> Bet Category
                </label>
                <select value={selectedType} onChange={e => setSelectedType(e.target.value)}
                  className="w-full bg-black/40 border border-white/[0.08] text-white rounded-xl px-3 py-2.5 text-sm
                    outline-none focus:ring-1 focus:ring-[#FFD700]/30">
                  {BET_TYPES.map((t: any) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-600 flex items-center gap-1">
                    <DollarSign className="h-3 w-3" /> Stake ($)
                  </label>
                  <input type="number" step="0.01" value={stake} onChange={e => setStake(e.target.value)}
                    placeholder="0.00"
                    className="w-full bg-black/40 border border-white/[0.08] text-white rounded-xl px-3 py-2.5 text-sm
                      focus:ring-1 focus:ring-[#FFD700]/30 outline-none" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-600 flex items-center gap-1">
                    <Zap className="h-3 w-3 text-[#FFD700]" /> Boost %
                  </label>
                  <select value={boost} onChange={e => setBoost(e.target.value)}
                    className="w-full bg-black/40 border border-white/[0.08] text-white rounded-xl px-3 py-2.5 text-sm
                      outline-none focus:ring-1 focus:ring-[#FFD700]/30">
                    <option value="">None</option>
                    {[5,10,15,20,25,30,33,35,40,50,100].map((p: any) => (
                      <option key={p} value={String(p)}>{p}%</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Overall Odds */}
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase font-black text-zinc-600 flex justify-between items-center">
                  <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Overall Odds</span>
                  <span className="text-[#FFD700] font-mono">{fmtAmerican(parlayOdds)} (Auto)</span>
                </label>
                <input
                  type="number"
                  value={manualOdds}
                  onChange={e => setManualOdds(e.target.value)}
                  placeholder={String(parlayOdds)}
                  className="w-full bg-black/40 border border-white/[0.08] text-white rounded-xl px-3 py-2.5 text-sm font-mono text-center
                    focus:ring-1 focus:ring-[#FFD700]/30 outline-none"
                />
              </div>

               <div className="flex items-center justify-end">
                <label className="flex items-center gap-3 cursor-pointer text-sm font-bold text-cyan-400">
                  <input
                    type="checkbox"
                    checked={isBonusBet}
                    onChange={(e) => setIsBonusBet(e.target.checked)}
                    className="hidden"
                  />
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center transition-all duration-200 ${isBonusBet
                        ? 'bg-cyan-400/20 border-cyan-500'
                        : 'bg-black/20 border-white/10'
                      }`}>
                    {isBonusBet && (
                      <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    )}
                  </div>
                  This is a Bonus Bet (No-Sweat / Free Bet)
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-600">Game Date</label>
                  <input type="date" value={gameDate} onChange={e => handleDateChange(e.target.value)}
                    className="w-full bg-black/40 border border-white/[0.08] text-zinc-200 rounded-xl px-3 py-2.5 text-sm
                      focus:ring-1 focus:ring-[#FFD700]/30 outline-none [color-scheme:dark]" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-zinc-600 flex justify-between">
                    NFL Week
                    {week && <span className="text-[#FFD700] font-mono">WK {week}</span>}
                  </label>
                  <input type="number" min={1} max={22} value={week}
                    onChange={e => setWeek(e.target.value)} placeholder="1–22"
                    className="w-full bg-black/40 border border-white/[0.08] text-white rounded-xl px-3 py-2.5 text-sm
                      font-mono focus:ring-1 focus:ring-[#FFD700]/30 outline-none" />
                </div>
              </div>

              {/* Payout preview */}
              {stakeNum > 0 && (
                <div className="flex items-center justify-between px-4 py-3 bg-[#FFD700]/5 border border-[#FFD700]/10 rounded-2xl">
                  <span className="text-xs text-zinc-500 font-mono">Potential {isBonusBet ? 'Profit' : 'Payout'}</span>
                  <span className="text-lg font-black font-mono text-[#FFD700]">${potentialPayout.toFixed(2)}</span>
                </div>
              )}
            </div>

            <button onClick={handleSaveParlay} disabled={saving || legs.length === 0}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-[#FFD700]
                hover:bg-[#e6c200] text-black font-black uppercase text-sm tracking-widest
                transition-all disabled:opacity-40">
              {saving
                ? <><Loader2 className="h-5 w-5 animate-spin" /> Saving…</>
                : <><TrendingUp className="h-5 w-5" /> Save to Betting Log</>}
            </button>
          </section>
        )}
      </div>
    </div>
  );
}
