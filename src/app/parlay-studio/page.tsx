'use client';

import React, { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext'; // Ensure useAuth is imported
import { useBetSlip } from '@/context/betslip-context';
import { getWeekFromDate } from '@/lib/utils/nfl-week';
import { toDecimal, toAmerican, calculateParlayOdds } from '@/lib/utils/odds';
import {
  Trash2, ChevronLeft, CheckCircle2, Clock, XCircle,
  Zap, DollarSign, Gift, ArrowDown, TrendingUp, Loader2, AlertTriangle, Layers
} from 'lucide-react';
import { toast } from 'sonner';

// ... (Keep the DuplicateModal component as is)
function DuplicateModal({ duplicates, onSaveAnyway, onCancel }: {
  duplicates: { player: string; prop: string }[];
  onSaveAnyway: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
          </div>
          <div>
            <h2 className="text-white font-bold text-sm">Already in Betting Log</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              {duplicates.length} leg{duplicates.length > 1 ? 's' : ''} found for this week
            </p>
          </div>
        </div>

        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {duplicates.map((d, i) => (
            <div key={i} className="flex items-center gap-2 bg-slate-950/60 border border-slate-800 rounded-lg px-3 py-2">
              <span className="text-amber-400 text-[10px] font-bold uppercase">DUP</span>
              <div className="text-xs text-slate-300 font-medium">{d.player}</div>
              <div className="text-[10px] text-slate-500 ml-auto capitalize">{d.prop}</div>
            </div>
          ))}
        </div>

        <p className="text-slate-500 text-xs leading-relaxed">
          These legs are already logged for this week. Saving again will create a duplicate entry.
        </p>

        <div className="flex gap-2 pt-1">
          <button
            onClick={onCancel}
            className="flex-1 py-2.5 rounded-xl border border-slate-700 text-slate-300 text-xs font-bold uppercase hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSaveAnyway}
            className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold uppercase transition-colors"
          >
            Save Anyway
          </button>
        </div>
      </div>
    </div>
  );
}

// ... (Keep utility functions like parlayDecimal, fmtAmerican)
function parlayDecimal(odds: number[]): number {
  return odds.reduce((acc, o) => acc * toDecimal(o), 1);
}
function fmtAmerican(n: number): string {
  if (!n || isNaN(n) || !isFinite(n)) return '—';
  return n >= 0 ? `+${n}` : `${n}`;
}

type LegResult = 'pending' | 'won' | 'lost' | 'void';
type BetPaymentType   = 'regular' | 'bonus';

interface LegState {
  id: string; player: string; prop: string;
  line: number; selection: string; odds: number;
  matchup: string; week?: number; result: LegResult;
  isLive: boolean;
  [key: string]: any;
}

const RESULTS: { value: LegResult; label: string; icon: React.ReactNode; active: string; inactive: string }[] = [
  { value: 'won',     label: 'Win',     icon: <CheckCircle2 className="h-3.5 w-3.5" />, active: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40', inactive: 'border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300' },
  { value: 'lost',    label: 'Loss',    icon: <XCircle      className="h-3.5 w-3.5" />, active: 'bg-red-500/20 text-red-400 border-red-500/40',             inactive: 'border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300' },
  { value: 'pending', label: 'Pending', icon: <Clock        className="h-3.5 w-3.5" />, active: 'bg-amber-500/20 text-amber-400 border-amber-500/40',       inactive: 'border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300' },
  { value: 'void',    label: 'Void',    icon: <XCircle      className="h-3.5 w-3.5" />, active: 'bg-slate-700 text-slate-300 border-slate-500',               inactive: 'border-slate-800 text-slate-500 hover:border-slate-600 hover:text-slate-300' },
];

const BET_TYPES = [
  'Single', 'Anytime TD', 'SGP', 'Round Robin', 
  'SGPX', 'Spread', 'Moneyline', 'Total Points', 'Parlay'
];

// ... (Keep the LegCard component as is)
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

        {/* ─── LIVE BET CHECKBOX ─── */}
        <div className="flex items-center justify-between py-2 border-t border-slate-800/40">
          <label className="flex items-center gap-2 cursor-pointer group">
            <input
              type="checkbox"
              checked={leg.isLive || false}
              onChange={(e) => onUpdate(leg.id, { isLive: e.target.checked })}
              className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-blue-500 focus:ring-blue-500/20 transition-all cursor-pointer"
            />
            <span className="text-[10px] uppercase font-black text-slate-500 group-hover:text-slate-300 transition-colors">
              Live Bet
            </span>
          </label>
          
          {leg.isLive && (
            <span className="flex items-center gap-1 text-[9px] font-bold text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full animate-pulse">
              <span className="w-1 h-1 rounded-full bg-blue-400" /> LIVE
            </span>
          )}
        </div>

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

export default function ParlayStudioPage() {
  const router = useRouter();
  const auth = useAuth(); // Get auth context
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
      isLive: false,
      ...s,
    }))
  );

  const [selectedType, setSelectedType] = useState('Parlay'); // New state for bet type
  const [stake, setStake] = useState('');
  const [boost, setBoost] = useState('');
  const [week, setWeek] = useState(() => {
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
  const [saving, setSaving] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // ... (other state variables remain unchanged)
  const [betPaymentType,    setBetPaymentType]    = useState<BetPaymentType>('regular');
  const [bonusAmt,   setBonusAmt]   = useState('');
  const [manualOdds, setManualOdds] = useState('');
  const [dupModal,       setDupModal]       = useState(false);
  const [dupLegs,        setDupLegs]        = useState<{ player: string; prop: string }[]>([]);
  const [pendingPayload, setPendingPayload] = useState<any>(null);


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

  const autoAmerican = useMemo(() => calculateParlayOdds(legs.map(l => l.odds)), [legs]);

  const effectiveOdds = manualOdds.trim() !== '' 
    ? parseInt(manualOdds) 
    : autoAmerican;

  const stakeNum = parseFloat(stake) || 0;

  const handleSaveParlay = async () => {
    setSaving(true);
    try {
      const parlayId = crypto.randomUUID(); // Unique ID for this specific bet group
      
      const betDoc = {
        userId: auth.user?.uid, // Correctly access uid
        parlayId,
        type: selectedType,
        legs: legs.map(l => ({
          ...l,
          status: 'pending' // Initialize legs as pending
        })),
        stake: stakeNum,
        odds: effectiveOdds,
        boost: Number(boost) || 0,
        gameDate: gameDate,
        week: Number(week),
        status: 'pending',
        createdAt: new Date().toISOString(),
      };
  
      const response = await fetch('/api/bets/save', {
        method: 'POST',
        body: JSON.stringify(betDoc),
        headers: { 'Content-Type': 'application/json' },
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save');
      }
      
      toast.success('Parlay Saved!');
      // Clear state on success
      setLegs([]);
      setDetailsOpen(false);
      clearSlip();
      router.push('/betting-log');

    } catch (err: any) {
      console.error("Save Error:", err);
      toast.error('Save Error', { description: err.message });
    } finally {
      setSaving(false);
    }
  };
  

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
  

  // ... (Rest of the component JSX)
  return (
    <div className="min-h-screen bg-slate-950">
      {dupModal && (
        <DuplicateModal
          duplicates={dupLegs}
          onCancel={() => { setDupModal(false); setPendingPayload(null); }}
          onSaveAnyway={async () => {
            setDupModal(false);
            setSaving(true);
            try {
              // You might need a separate API endpoint or a flag to force save
              await handleSaveParlay(); // Re-run the save logic
            } catch (err: any) {
              toast.error('Save Failed', { description: err.message });
            } finally {
              setSaving(false);
              setPendingPayload(null);
            }
          }}
        />
      )}

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

        {/* Step 1: Review Legs */}
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

        {/* Enter Bet Details CTA */}
        {!detailsOpen && legs.length > 0 && (
          <button
            onClick={handleEnterDetails}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-sm tracking-wide transition-all shadow-lg shadow-emerald-900/30"
          >
            Enter Bet Details
            <ArrowDown className="h-4 w-4" />
          </button>
        )}

        {/* Step 2: Bet Details */}
        {detailsOpen && legs.length > 0 && (
           <section ref={detailsRef} className="space-y-4 pt-1">
           <h2 className="text-[10px] uppercase font-black text-slate-500 tracking-wider flex items-center gap-2">
             <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-black flex items-center justify-center">2</span>
             Bet Details
           </h2>

           <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
              {/* Bet Type Dropdown */}
              <div className="space-y-1.5 mb-4">
                <label className="text-[10px] uppercase font-black text-slate-500 flex items-center gap-1">
                  <Layers className="h-3 w-3" /> Bet Category
                </label>
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-blue-500"
                >
                  {BET_TYPES.map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Stake Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-slate-500">Stake ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={stake}
                    onChange={e => setStake(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-emerald-500 outline-none"
                    placeholder="0.00"
                  />
                </div>

                {/* Boost Dropdown */}
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
                    {[5, 10, 15, 20, 25, 30, 33, 35, 40, 50, 100].map(p => (
                      <option key={p} value={String(p)}>{p}%</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Game Date and NFL Week */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-slate-500">Game Date</label>
                  <input
                    type="date"
                    value={gameDate}
                    onChange={e => handleDateChange(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-200 rounded-lg px-3 py-2.5 text-sm focus:ring-1 focus:ring-emerald-500 outline-none [color-scheme:dark]"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-black text-slate-500 flex justify-between">
                    NFL Week {week && <span className="text-emerald-500 font-mono">WK {week}</span>}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={22}
                    value={week}
                    onChange={e => setWeek(e.target.value)}
                    placeholder="1-22"
                    className="w-full bg-slate-950 border border-slate-800 text-white rounded-lg px-3 py-2.5 text-sm font-mono focus:ring-1 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* ... (Payout Summary and Final Save Button remain unchanged) */}
            
            <button
              onClick={handleSaveParlay}
              disabled={saving || legs.length === 0}
              className="w-full flex items-center justify-center py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black uppercase text-sm tracking-widest transition-all disabled:opacity-50 shadow-lg shadow-emerald-900/30"
            >
              {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <TrendingUp className="mr-2 h-5 w-5" />}
              {saving ? 'Saving to Firestore...' : 'Save to Betting Log'}
            </button>
          </section>
        )}

      </div>
    </div>
  );
}
