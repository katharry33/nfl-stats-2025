'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useBetSlip } from '@/context/betslip-context';
import { getWeekFromDate } from '@/lib/utils/nfl-week';
import {
  Trash2, ChevronLeft, CheckCircle2, Clock, XCircle,
  Zap, DollarSign, Gift, ArrowDown, ChevronRight, TrendingUp, Loader2
} from 'lucide-react';
import { toast } from 'sonner';

// ─────────────────────────────────────────────────────────────────────────────
// Odds helpers
// ─────────────────────────────────────────────────────────────────────────────

function toDecimal(american: number): number {
  if (american >= 100)  return american / 100 + 1;
  if (american <= -100) return 100 / Math.abs(american) + 1;
  return 1;
}

function toAmerican(decimal: number): number {
  if (!isFinite(decimal) || decimal <= 1) return 0;
  if (decimal >= 2) return Math.round((decimal - 1) * 100);
  return Math.round(-100 / (decimal - 1));
}

function parlayDecimal(odds: number[]): number {
  return odds.reduce((acc, o) => acc * toDecimal(o), 1);
}

function fmtAmerican(n: number): string {
  if (!n || isNaN(n) || !isFinite(n)) return '—';
  return n >= 0 ? `+${n}` : `${n}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

type LegResult = 'pending' | 'won' | 'lost' | 'void';
type BetType   = 'regular' | 'bonus';

interface LegState {
  id: string; player: string; prop: string;
  line: number; selection: string; odds: number;
  matchup: string; week?: number; result: LegResult;
  // Allow other fields from data source
  [key: string]: any;
}

// ─────────────────────────────────────────────────────────────────────────────
// Result toggle config
// ─────────────────────────────────────────────────────────────────────────────

const RESULTS: { value: LegResult; label: string; icon: React.ReactNode; active: string; inactive: string }[] = [
  { value: 'won',     label: 'Win',     icon: <CheckCircle2 className="h-3.5 w-3.5" />, active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', inactive: 'border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300' },
  { value: 'lost',    label: 'Loss',    icon: <XCircle      className="h-3.5 w-3.5" />, active: 'bg-red-500/20 text-red-400 border-red-500/40',             inactive: 'border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300' },
  { value: 'pending', label: 'Pending', icon: <Clock        className="h-3.5 w-3.5" />, active: 'bg-amber-500/20 text-amber-400 border-amber-500/40',       inactive: 'border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300' },
  { value: 'void',    label: 'Void',    icon: <XCircle      className="h-3.5 w-3.5" />, active: 'bg-slate-700 text-slate-300 border-slate-500',              inactive: 'border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300' },
];

// ─────────────────────────────────────────────────────────────────────────────
// Leg Card
// ─────────────────────────────────────────────────────────────────────────────

function LegCard({ leg, index, onUpdate, onRemove }: {
  leg: LegState; index: number;
  onUpdate: (id: string, up: Partial<LegState>) => void;
  onRemove: (id: string) => void;
}) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800/60">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-6 h-6 rounded-full bg-slate-800 text-[11px] font-black text-slate-400 flex items-center justify-center flex-shrink-0">
            {index + 1}
          </span>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">{leg.player}</p>
            <p className="text-slate-500 text-xs truncate">{leg.matchup || '—'}</p>
          </div>
        </div>
        <button onClick={() => onRemove(leg.id)} className="text-slate-700 hover:text-red-500 transition-colors ml-3 flex-shrink-0">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Prop + Over/Under + Odds */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <span className="text-slate-400 text-xs">{leg.prop}</span>
            <span className="font-mono font-bold text-white">{leg.line}</span>
          </div>
          <div className="flex rounded-lg overflow-hidden border border-slate-800 ml-auto">
            {(['Over', 'Under'] as const).map(s => (
              <button
                key={s}
                onClick={() => onUpdate(leg.id, { selection: s })}
                className={`px-3 py-1 text-[11px] font-bold uppercase transition-colors ${
                  leg.selection === s
                    ? s === 'Over' ? 'bg-blue-600 text-white' : 'bg-orange-600 text-white'
                    : 'bg-slate-950 text-slate-500 hover:bg-slate-800'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] text-slate-500 uppercase font-black">Odds</span>
            <input
              type="number"
              value={leg.odds}
              onChange={e => onUpdate(leg.id, { odds: parseInt(e.target.value) || -110 })}
              className="w-24 bg-slate-950 border border-slate-800 text-white font-mono text-xs rounded-lg px-2.5 py-1.5 focus:ring-1 focus:ring-blue-500 outline-none text-center"
            />
          </div>
        </div>

        {/* Result */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase font-black text-slate-500 w-12 flex-shrink-0">Result</span>
          <div className="flex gap-1.5 flex-wrap">
            {RESULTS.map(r => (
              <button
                key={r.value}
                onClick={() => onUpdate(leg.id, { result: r.value })}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-bold uppercase transition-all ${
                  leg.result === r.value ? r.active : r.inactive
                }`}
              >
                {r.icon}{r.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Page — NO BetSlip rendered here
// ─────────────────────────────────────────────────────────────────────────────

export default function ParlayStudioPage() {
  const router = useRouter();
  const { selections, removeLeg, clearSlip } = useBetSlip();
  const detailsRef = useRef<HTMLDivElement>(null);

  const [legs, setLegs] = useState<LegState[]>(() =>
    selections.map((s: any) => ({
      id: s.id, 
      player: s.player || '', 
      prop: s.prop || '',
      line: Number(s.line || 0), 
      selection: s.selection || 'Over',
      odds: Number(s.odds || -110), 
      matchup: s.matchup || '',
      week: s.week !== undefined ? Number(s.week) : undefined, 
      result: 'pending' as LegResult,
      ...s // Carry over any other fields from the original data source
    }))
  );

  // Bet details state
  const [betType,    setBetType]    = useState<BetType>('regular');
  const [stake,      setStake]      = useState('');
  const [bonusAmt,   setBonusAmt]   = useState('');
  const [manualOdds, setManualOdds] = useState('');
  const [boost,      setBoost]      = useState('');
  const [week,       setWeek]       = useState(() => {
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
    setLegs(prev => prev.map(l => l.id === id ? { ...l, ...up } : l));

  const removeLegState = (id: string) => {
    setLegs(prev => prev.filter(l => l.id !== id));
    removeLeg(id);
  };

  // Odds
  const autoDecimal  = useMemo(() => parlayDecimal(legs.map(l => l.odds)), [legs]);
  const autoAmerican = useMemo(() => toAmerican(autoDecimal), [autoDecimal]);
  const effectiveOdds    = manualOdds.trim() ? parseInt(manualOdds) : autoAmerican;
  const effectiveDecimal = toDecimal(effectiveOdds);

  // Payout
  const stakeNum  = betType === 'bonus' ? parseFloat(bonusAmt) || 0 : parseFloat(stake) || 0;
  const boostPct  = parseFloat(boost) || 0;
  const rawProfit     = stakeNum * (effectiveDecimal - 1);
  const boostedProfit = rawProfit * (1 + boostPct / 100);
  const totalPayout   = betType === 'bonus' ? boostedProfit : stakeNum + boostedProfit;

  // Parlay status
  const parlayStatus: LegResult =
    legs.some(l => l.result === 'lost')      ? 'lost'
    : legs.length > 0 && legs.every(l => l.result === 'won') ? 'won'
    : legs.some(l => l.result === 'pending') ? 'pending'
    : 'void';

  const sc = {
    won:     { text: 'text-emerald-400', border: 'border-emerald-500/30', bg: 'bg-emerald-500/8' },
    lost:    { text: 'text-red-400',     border: 'border-red-500/30',     bg: 'bg-red-500/8' },
    pending: { text: 'text-amber-400',   border: 'border-amber-500/30',   bg: 'bg-amber-500/8' },
    void:    { text: 'text-slate-400',   border: 'border-slate-700',      bg: 'bg-slate-800/40' },
  }[parlayStatus];

  const handleSaveParlay = async () => {
    if (legs.length === 0) {
      toast.warning("Cannot save an empty bet slip.");
      return;
    }
    setSaving(true);

    // Sanitize legs to prevent undefined values and match Firestore schema
    const sanitizedLegs = legs.map(leg => ({
      player: leg.player || leg.Player || "Unknown",
      prop: leg.prop || leg.Prop || "N/A",
      line: Number(leg.line) || 0,
      odds: Number(leg.odds) || 0,
      selection: leg.selection || "Over",
      matchup: leg.matchup || leg.Matchup || "N/A",
      status: leg.result || "pending",
      playerteam: leg.playerteam || leg.Team || "N/A",
      gameDate: leg.eventdate || leg.gameDate || gameDate || new Date().toISOString(),
      week: leg.week
    }));

    const payload: Record<string, any> = {
      betType: legs.length === 1 ? 'Single' : `Parlay${legs.length}`,
      status: parlayStatus,
      stake: betType === 'regular' ? parseFloat(stake) || 0 : 0,
      isBonusBet: betType === 'bonus',
      bonusStake: betType === 'bonus' ? parseFloat(bonusAmt) || 0 : 0,
      odds: effectiveOdds,
      boost: parseFloat(boost) || null,
      payout: totalPayout,
      week: parseInt(week) || null,
      gameDate: gameDate || null,
      legs: sanitizedLegs,
    };
    
    // Remove null/undefined top-level fields, but keep '0' values
    const cleanPayload = Object.fromEntries(Object.entries(payload).filter(([_, v]) => v != null));
    if (payload.stake === 0) cleanPayload.stake = 0;
    if (payload.bonusStake === 0) cleanPayload.bonusStake = 0;
    if (payload.payout === 0) cleanPayload.payout = 0;

    try {
      const response = await fetch('/api/betting-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cleanPayload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save parlay.');
      }

      toast.success('Parlay Saved', {
        description: 'Your parlay has been successfully logged.',
      });
      clearSlip();
      router.push('/betting-log');

    } catch (err: any) {
      toast.error('Save Failed', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  // Empty state
  if (legs.length === 0 && selections.length === 0) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-slate-400 text-sm">No legs in your bet slip.</p>
          <button onClick={() => router.push('/all-props')} className="text-blue-400 text-xs hover:underline flex items-center gap-1 mx-auto">
            <ChevronLeft className="h-3 w-3" /> Back to Historical Props
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950">
      <div className="max-w-2xl mx-auto px-5 py-8 space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="flex items-center gap-1 text-slate-500 hover:text-white text-xs transition-colors">
            <ChevronLeft className="h-4 w-4" />Back
          </button>
          <div>
            <h1 className="text-2xl font-black text-white italic uppercase tracking-tighter">Parlay Studio</h1>
            <p className="text-slate-500 text-xs font-mono">{legs.length} leg{legs.length !== 1 ? 's' : ''} selected</p>
          </div>
        </div>

        {/* ── Step 1: Review Legs ── */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] uppercase font-black text-slate-500 tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-black flex items-center justify-center">1</span>
              Review Legs
            </h2>
            {legs.length > 1 && (
              <button onClick={() => { setLegs([]); clearSlip(); }} className="text-[10px] text-slate-600 hover:text-red-400 font-bold uppercase">
                Clear All
              </button>
            )}
          </div>

          {legs.map((leg, i) => (
            <LegCard key={leg.id} leg={leg} index={i} onUpdate={updateLegState} onRemove={removeLegState} />
          ))}

          {legs.length > 1 && (
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <span className="text-xs text-slate-500 font-mono">Auto parlay odds ({legs.length} legs)</span>
              <span className="text-sm font-black font-mono text-white">{fmtAmerican(autoAmerican)}</span>
            </div>
          )}
        </section>

        {/* ── Enter Bet Details CTA ── */}
        {!detailsOpen && legs.length > 0 && (
          <button
            onClick={handleEnterDetails}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-sm tracking-wide transition-all shadow-lg shadow-emerald-900/30"
          >
            Enter Bet Details
            <ArrowDown className="h-4 w-4" />
          </button>
        )}

        {/* ── Step 2: Bet Details ── */}
        {detailsOpen && legs.length > 0 && (
          <section ref={detailsRef} className="space-y-4 pt-1">
            <h2 className="text-[10px] uppercase font-black text-slate-500 tracking-wider flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">2</span>
              Bet Details
            </h2>

            {/* Bet Type */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
              <p className="text-[10px] uppercase font-black text-slate-500">Bet Type</p>
              <div className="flex rounded-xl overflow-hidden border border-slate-800">
                <button
                  onClick={() => setBetType('regular')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase transition-colors ${betType === 'regular' ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
                >
                  <DollarSign className="h-3.5 w-3.5" />Regular
                </button>
                <button
                  onClick={() => setBetType('bonus')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-xs font-bold uppercase transition-colors ${betType === 'bonus' ? 'bg-violet-600 text-white' : 'bg-slate-900 text-slate-400 hover:bg-slate-800'}`}
                >
                  <Gift className="h-3.5 w-3.5" />Bonus Bet
                </button>
              </div>
              {betType === 'bonus' && (
                <p className="text-[10px] text-violet-400/80 font-mono leading-relaxed">
                  Bonus bets are free — stake is not returned on a win. Payout = bonus amount × decimal odds.
                </p>
              )}
            </div>

            {/* Stake + Boost */}
            <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {/* Stake / Bonus Amount */}
                <div className="space-y-1.5">
                  <label className={`text-[10px] uppercase font-black ${betType === 'bonus' ? 'text-violet-400' : 'text-slate-500'}`}>
                    {betType === 'bonus' ? 'Bonus Amount ($)' : 'Stake ($)'}
                  </label>
                  <div className="relative">
                    {betType === 'bonus'
                      ? <Gift className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-violet-500" />
                      : <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">$</span>}
                    <input
                      type="number" min={0} step={0.01} placeholder="0.00"
                      value={betType === 'bonus' ? bonusAmt : stake}
                      onChange={e => betType === 'bonus' ? setBonusAmt(e.target.value) : setStake(e.target.value)}
                      className={`w-full border rounded-lg pl-8 pr-3 py-2.5 font-mono text-sm outline-none text-white ${betType === 'bonus' ? 'bg-violet-950/30 border-violet-700/40 focus:ring-1 focus:ring-violet-500' : 'bg-slate-950 border-slate-800 focus:ring-1 focus:ring-emerald-500'}`}
                    />
                  </div>
                </div>

                {/* Boost */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-slate-500 flex items-center gap-1">
                    <Zap className="h-3 w-3 text-amber-400" />Boost %
                  </label>
                  <select
                    value={boost}
                    onChange={e => setBoost(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">None</option>
                    {[5,10,15,20,25,30,35,40,45,50].map(p => (
                      <option key={p} value={String(p)}>{p}%</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Total Odds */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] uppercase font-black text-slate-500">Total Odds</label>
                  <span className="text-[10px] text-slate-600 font-mono">Auto: {fmtAmerican(autoAmerican)}</span>
                </div>
                <input
                  type="number"
                  placeholder={`${fmtAmerican(autoAmerican)} (auto-calculated)`}
                  value={manualOdds}
                  onChange={e => setManualOdds(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white font-mono rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                />
                {manualOdds && (
                  <button onClick={() => setManualOdds('')} className="text-[10px] text-slate-600 hover:text-slate-400">
                    ← Reset to auto ({fmtAmerican(autoAmerican)})
                  </button>
                )}
              </div>

              {/* Date + Week */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-slate-500">Game Date</label>
                  <input
                    type="date" value={gameDate}
                    onChange={e => handleDateChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-emerald-500 outline-none [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-slate-500">
                    NFL Week
                    {week && <span className="text-emerald-500 ml-1.5 font-mono normal-case">WK {week}</span>}
                  </label>
                  <input
                    type="number" min={1} max={22} placeholder="1 – 22"
                    value={week} onChange={e => setWeek(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2.5 text-sm font-mono focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Payout Summary */}
            <div className={`rounded-xl border p-4 space-y-3 ${sc.bg} ${sc.border}`}>
              <div className="flex items-center justify-between">
                <p className="text-[10px] uppercase font-black text-slate-500">Payout Summary</p>
                <span className={`text-[10px] uppercase font-black font-mono ${sc.text}`}>{parlayStatus}</span>
              </div>
              <div className="space-y-2 font-mono text-sm">
                <div className="flex justify-between text-slate-400">
                  <span>{betType === 'bonus' ? 'Bonus Amt' : 'Stake'}</span>
                  <span>${stakeNum.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Odds</span><span>{fmtAmerican(effectiveOdds)}</span>
                </div>
                {boostPct > 0 && (
                  <div className="flex justify-between text-amber-400">
                    <span>Boost</span><span>+{boostPct}%</span>
                  </div>
                )}
                <div className="flex justify-between font-bold border-t border-slate-700/40 pt-2">
                  <span className="text-slate-300">{betType === 'bonus' ? 'Potential Win' : 'Potential Payout'}</span>
                  <span className="text-emerald-400 text-base">${totalPayout.toFixed(2)}</span>
                </div>
                {stakeNum > 0 && (
                  <div className={`flex justify-between text-xs ${betType === 'bonus' ? 'text-violet-400' : 'text-slate-500'}`}>
                    <span>{betType === 'bonus' ? 'Risk-free profit' : 'Net profit'}</span>
                    <span>+${boostedProfit.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Submit */}
            <button
              onClick={handleSaveParlay}
              disabled={saving || legs.length === 0}
              className="w-full mt-4 flex items-center justify-center py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-sm tracking-widest transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-emerald-900/30"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" /> }
              {saving ? 'Saving...' : 'Save to Betting Log'}
            </button>

            <p className="text-center text-[10px] text-slate-600 pb-6">
              Saves as {legs.length === 1 ? 'a Single' : `a ${legs.length}-leg Parlay`} to your Betting Log
            </p>
          </section>
        )}

      </div>
    </div>
  );
}
