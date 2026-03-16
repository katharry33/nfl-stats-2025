'use client';

import React, { useState, useEffect } from 'react';
import { db, auth } from '@/lib/firebase/client';
import {
  collection, query, onSnapshot, where,
  updateDoc, doc, deleteDoc, addDoc, serverTimestamp,
} from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { toast } from 'sonner';
import {
  PlusCircle, Zap, Gift, Layers, Star, Ghost,
  Trash2, Pencil, CheckCircle2, Clock, XCircle,
  ChevronRight, X, Loader2,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { Bonus } from '@/lib/types';
import { resolveFirestoreDate } from '@/lib/types';

// ─── Constants ────────────────────────────────────────────────────────────────
const BOOST_OPTIONS = [5, 10, 15, 20, 25, 30, 33, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 100];
const BOOKS         = ['DraftKings', 'FanDuel', 'BetMGM', 'Caesars', 'Other'];
const ELIGIBLE_OPTS = ['Single', 'Parlay', 'SGP', 'SGPx', 'Live'];

const TYPE_META: Record<string, { icon: React.ReactNode; color: string }> = {
  bonus_bet:    { icon: <Gift    className="h-3 w-3" />, color: 'text-violet-400' },
  profit_boost: { icon: <Zap    className="h-3 w-3" />, color: 'text-[#FFD700]'  },
  ghost_parlay: { icon: <Ghost  className="h-3 w-3" />, color: 'text-blue-400'   },
  parlay_boost: { icon: <Layers className="h-3 w-3" />, color: 'text-emerald-400'},
  sgp:          { icon: <Star   className="h-3 w-3" />, color: 'text-pink-400'   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function parseBoostValue(raw: any): number {
  if (!raw || raw === 'None' || raw === '') return 0;
  if (typeof raw === 'number') return raw;
  return parseFloat(String(raw).replace('%', '')) || 0;
}

function StatusPip({ status }: { status: string }) {
  const map: Record<string, string> = {
    active:  'bg-emerald-500',
    used:    'bg-blue-400',
    expired: 'bg-zinc-700',
  };
  return <span className={`inline-block h-1.5 w-1.5 rounded-full flex-shrink-0 ${map[status] ?? 'bg-zinc-700'}`} />;
}

// ─── Bonus Form (slide-in panel) ──────────────────────────────────────────────
function BonusForm({
  bonusToEdit, onSave, onClose,
}: { bonusToEdit: Bonus | null; onSave: () => void; onClose: () => void }) {
  const [saving, setSaving]         = useState(false);
  const [name, setName]             = useState('');
  const [book, setBook]             = useState('DraftKings');
  const [eligible, setEligible]     = useState<string[]>(['Single']);
  const [maxWager, setMaxWager]     = useState('');
  const [minOdds, setMinOdds]       = useState('-200');
  const [boost, setBoost]           = useState(50);
  const [customBoost, setCustomBoost] = useState('');
  const [isCustom, setIsCustom]     = useState(false);

  useEffect(() => {
    if (bonusToEdit) {
      setName(bonusToEdit.name ?? '');
      setBook((bonusToEdit as any).book ?? 'DraftKings');
      setEligible((bonusToEdit as any).eligibleTypes ?? ['Single']);
      setMaxWager(String(bonusToEdit.maxWager ?? ''));
      setMinOdds((bonusToEdit as any).minOdds ?? '-200');
      const b = parseBoostValue(bonusToEdit.boost);
      if (BOOST_OPTIONS.includes(b)) { setBoost(b); setIsCustom(false); }
      else { setIsCustom(true); setCustomBoost(String(b)); }
    } else {
      setName(''); setBook('DraftKings'); setEligible(['Single']);
      setMaxWager(''); setMinOdds('-200'); setBoost(50); setIsCustom(false); setCustomBoost('');
    }
  }, [bonusToEdit]);

  const finalBoost = isCustom ? parseFloat(customBoost) || 0 : boost;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const user = auth.currentUser;
    if (!user) { toast.error('Authentication required'); return; }
    setSaving(true);
    try {
      const data = {
        name: name.trim(), book, boost: finalBoost,
        maxWager: parseFloat(maxWager) || 0,
        minOdds: minOdds || '-200', eligibleTypes: eligible,
        userId: user.uid, status: 'active', updatedAt: serverTimestamp(),
      };
      if (bonusToEdit?.id) {
        await updateDoc(doc(db, 'bonuses', bonusToEdit.id), data);
        toast.success('Bonus updated');
      } else {
        await addDoc(collection(db, 'bonuses'), { ...data, createdAt: serverTimestamp() });
        toast.success('Bonus added');
      }
      onSave();
    } catch (err: any) {
      toast.error('Save failed', { description: err.message });
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full bg-black/40 border border-white/[0.08] text-white text-xs font-mono rounded-xl px-3 py-2.5 outline-none focus:ring-1 focus:ring-[#FFD700]/30 transition-all";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name + Book */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Name</label>
          <input value={name} onChange={e => setName(e.target.value)} className={inputCls} placeholder="DK NFL Boost" required />
        </div>
        <div className="space-y-1.5">
          <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Book</label>
          <select value={book} onChange={e => setBook(e.target.value)} className={inputCls}>
            {BOOKS.map(b => <option key={b} value={b}>{b}</option>)}
          </select>
        </div>
      </div>

      {/* Boost picker */}
      <div className="space-y-1.5">
        <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Boost %</label>
        <div className="grid grid-cols-6 gap-1.5">
          {BOOST_OPTIONS.map(v => (
            <button key={v} type="button"
              onClick={() => { setBoost(v); setIsCustom(false); }}
              className={`py-1.5 rounded-lg text-[9px] font-black transition-all border ${
                !isCustom && boost === v
                  ? 'bg-[#FFD700] border-[#FFD700] text-black'
                  : 'bg-black/40 border-white/[0.08] text-zinc-500 hover:text-white'
              }`}
            >{v}%</button>
          ))}
          <button type="button"
            onClick={() => setIsCustom(true)}
            className={`py-1.5 rounded-lg text-[9px] font-black transition-all border col-span-2 ${
              isCustom ? 'bg-[#FFD700] border-[#FFD700] text-black' : 'bg-black/40 border-white/[0.08] text-zinc-500 hover:text-white'
            }`}
          >Custom</button>
        </div>
        {isCustom && (
          <input type="number" value={customBoost} onChange={e => setCustomBoost(e.target.value)}
            className={inputCls} placeholder="Enter %" />
        )}
      </div>

      {/* Eligible types */}
      <div className="space-y-1.5">
        <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Eligible For</label>
        <div className="flex flex-wrap gap-1.5">
          {ELIGIBLE_OPTS.map(opt => (
            <button key={opt} type="button"
              onClick={() => setEligible(prev => prev.includes(opt) ? prev.filter(t => t !== opt) : [...prev, opt])}
              className={`px-3 py-1.5 rounded-xl text-[9px] font-black uppercase border transition-all ${
                eligible.includes(opt)
                  ? 'bg-[#FFD700]/10 border-[#FFD700]/30 text-[#FFD700]'
                  : 'bg-black/40 border-white/[0.08] text-zinc-600 hover:text-white'
              }`}
            >{opt}</button>
          ))}
        </div>
      </div>

      {/* Max wager + min odds */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Max Wager ($)</label>
          <input type="number" value={maxWager} onChange={e => setMaxWager(e.target.value)} className={inputCls} placeholder="10.00" />
        </div>
        <div className="space-y-1.5">
          <label className="text-[8px] font-black uppercase tracking-widest text-zinc-600">Min Odds</label>
          <input type="text" value={minOdds} onChange={e => setMinOdds(e.target.value)} className={inputCls} placeholder="-200" />
        </div>
      </div>

      <button type="submit" disabled={saving}
        className="w-full py-3 rounded-xl bg-[#FFD700] text-black font-black uppercase text-xs tracking-widest hover:bg-[#e6c200] transition-all disabled:opacity-50 flex items-center justify-center gap-2">
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (bonusToEdit ? 'Update Bonus' : 'Add Bonus')}
      </button>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function BonusesPage() {
  const [bonuses,       setBonuses]       = useState<Bonus[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [panelOpen,     setPanelOpen]     = useState(false);
  const [editing,       setEditing]       = useState<Bonus | null>(null);
  const [filterStatus,  setFilterStatus]  = useState<'all' | 'active' | 'used'>('active');

  useEffect(() => {
    // Wait for Firebase auth to resolve before querying.
    // auth.currentUser is null on first render if auth hasn't initialised yet.
    const unsubAuth = onAuthStateChanged(auth, user => {
      if (!user) { setLoading(false); return; }

      const q = query(
        collection(db, 'bonuses'),
        where('userId', '==', user.uid),
        // No orderBy — would require a composite index. Sort client-side instead.
      );

      const unsubSnap = onSnapshot(q, snap => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Bonus));
        docs.sort((a, b) => {
          const ta = (a as any).createdAt?.toMillis?.() ?? new Date((a as any).createdAt ?? 0).getTime();
          const tb = (b as any).createdAt?.toMillis?.() ?? new Date((b as any).createdAt ?? 0).getTime();
          return tb - ta;
        });
        setBonuses(docs);
        setLoading(false);
      }, err => {
        console.error(err);
        toast.error('Failed to load bonuses');
        setLoading(false);
      });

      return unsubSnap;
    });

    return () => unsubAuth();
  }, []);

  const active   = bonuses.filter(b => b.status === 'active');
  const used     = bonuses.filter(b => b.status === 'used');
  const filtered = filterStatus === 'all' ? bonuses : filterStatus === 'active' ? active : used;
  const totalValue = active.reduce((s, b) => s + (b.maxWager ?? 0) * parseBoostValue(b.boost) / 100, 0);

  const openAdd  = () => { setEditing(null);  setPanelOpen(true); };
  const openEdit = (b: Bonus) => { setEditing(b); setPanelOpen(true); };
  const markUsed = (id: string) => updateDoc(doc(db, 'bonuses', id), { status: 'used', usedAt: new Date() })
    .then(() => toast.success('Marked as used'));
  const remove   = (id: string) => deleteDoc(doc(db, 'bonuses', id))
    .then(() => toast.success('Bonus removed'));

  return (
    <main className="min-h-screen bg-[#060606] text-white p-4 md:p-8">
      <div className="max-w-[1200px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black italic uppercase tracking-tight">Bonus Inventory</h1>
            <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest mt-0.5">
              {active.length} active · ${totalValue.toFixed(2)} estimated value
            </p>
          </div>
          <button onClick={openAdd}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#FFD700] text-black rounded-xl font-black text-xs uppercase tracking-widest hover:bg-[#e6c200] transition-all">
            <PlusCircle className="h-4 w-4" /> Add Bonus
          </button>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Active',        value: active.length,            color: 'text-emerald-400' },
            { label: 'Est. Value',    value: `$${totalValue.toFixed(0)}`, color: 'text-[#FFD700]' },
            { label: 'Used / Total',  value: `${used.length} / ${bonuses.length}`, color: 'text-zinc-400' },
          ].map(s => (
            <div key={s.label} className="bg-[#0f1115] border border-white/[0.06] rounded-2xl px-4 py-3">
              <p className={`text-xl font-black font-mono ${s.color}`}>{s.value}</p>
              <p className="text-[8px] font-black uppercase tracking-widest text-zinc-700 mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs + table */}
        <div className="bg-[#0f1115] border border-white/[0.06] rounded-2xl overflow-hidden">

          {/* Tab bar */}
          <div className="flex items-center gap-1 px-4 pt-4 pb-0 border-b border-white/[0.06]">
            {(['active', 'used', 'all'] as const).map(f => (
              <button key={f} onClick={() => setFilterStatus(f)}
                className={`px-3 py-2 text-[9px] font-black uppercase tracking-widest transition-colors border-b-2 -mb-px ${
                  filterStatus === f
                    ? 'border-[#FFD700] text-[#FFD700]'
                    : 'border-transparent text-zinc-600 hover:text-zinc-400'
                }`}>
                {f === 'all' ? `All (${bonuses.length})` : f === 'active' ? `Active (${active.length})` : `Used (${used.length})`}
              </button>
            ))}
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-16 text-zinc-600">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              <span className="text-xs font-black uppercase">Loading…</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center text-zinc-700 text-xs font-black uppercase italic">
              No {filterStatus === 'all' ? '' : filterStatus} bonuses yet
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead className="bg-black/30">
                  <tr>
                    {['Bonus', 'Book', 'Boost', 'Max Wager', 'Min Odds', 'Eligible For', 'Status', 'Created', ''].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[8px] font-black uppercase tracking-widest text-zinc-700 whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((bonus, i) => {
                    const meta    = TYPE_META[bonus.betType ?? ''] ?? { icon: <Zap className="h-3 w-3" />, color: 'text-zinc-500' };
                    const created = resolveFirestoreDate(bonus.createdAt as any);
                    const expiry  = resolveFirestoreDate(bonus.expirationDate as any);
                    const expiresInHrs = expiry ? (expiry.getTime() - Date.now()) / 3_600_000 : null;
                    const urgent  = expiresInHrs !== null && expiresInHrs > 0 && expiresInHrs < 24;
                    const isActive = bonus.status === 'active';

                    return (
                      <tr key={bonus.id}
                        className={`border-t border-white/[0.04] ${i % 2 === 0 ? 'bg-black/10' : ''} ${!isActive ? 'opacity-50' : 'hover:bg-white/[0.02]'} transition-colors`}>

                        {/* Name */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span className={meta.color}>{meta.icon}</span>
                            <span className="text-xs font-black italic uppercase text-white">{bonus.name}</span>
                          </div>
                        </td>

                        {/* Book */}
                        <td className="px-4 py-3">
                          <span className="text-[10px] font-bold text-zinc-400">{(bonus as any).book ?? '—'}</span>
                        </td>

                        {/* Boost */}
                        <td className="px-4 py-3">
                          <span className="text-sm font-black font-mono text-[#FFD700]">
                            {parseBoostValue(bonus.boost)}%
                          </span>
                        </td>

                        {/* Max wager */}
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-zinc-300">${bonus.maxWager ?? 0}</span>
                        </td>

                        {/* Min odds */}
                        <td className="px-4 py-3">
                          <span className="text-xs font-mono text-zinc-500">{(bonus as any).minOdds ?? '—'}</span>
                        </td>

                        {/* Eligible */}
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {((bonus as any).eligibleTypes ?? []).map((t: string) => (
                              <span key={t} className="text-[7px] px-1.5 py-0.5 bg-white/[0.04] border border-white/[0.06] text-zinc-500 rounded uppercase font-bold">
                                {t}
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <StatusPip status={bonus.status ?? 'active'} />
                            <span className="text-[9px] font-black uppercase text-zinc-500">
                              {bonus.status ?? 'active'}
                            </span>
                          </div>
                          {urgent && (
                            <p className="text-[8px] text-red-400 font-bold mt-0.5">
                              ⚡ {formatDistanceToNow(expiry!)} left
                            </p>
                          )}
                        </td>

                        {/* Created */}
                        <td className="px-4 py-3">
                          <span className="text-[9px] font-mono text-zinc-700">
                            {created ? format(created, 'MM/dd/yy') : '—'}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-3 py-3">
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(bonus)}
                              className="p-1.5 text-zinc-700 hover:text-zinc-300 hover:bg-white/[0.04] rounded-lg transition-colors">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                            {isActive && (
                              <button onClick={() => markUsed(bonus.id)}
                                className="p-1.5 text-zinc-700 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors"
                                title="Mark used">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                              </button>
                            )}
                            <button onClick={() => remove(bonus.id)}
                              className="p-1.5 text-zinc-700 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ── Slide-in form panel ── */}
      {panelOpen && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={() => setPanelOpen(false)} />

          {/* Panel */}
          <div className="fixed top-0 right-0 h-screen w-full max-w-md z-50 bg-[#0a0c0f] border-l border-white/[0.08] shadow-2xl flex flex-col">
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/[0.06]">
              <h2 className="text-sm font-black italic uppercase tracking-tight">
                {editing ? 'Edit Bonus' : 'Add Bonus'}
              </h2>
              <button onClick={() => setPanelOpen(false)}
                className="p-1.5 text-zinc-600 hover:text-white rounded-lg hover:bg-white/[0.04] transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <BonusForm
                bonusToEdit={editing}
                onSave={() => setPanelOpen(false)}
                onClose={() => setPanelOpen(false)}
              />
            </div>
          </div>
        </>
      )}
    </main>
  );
}