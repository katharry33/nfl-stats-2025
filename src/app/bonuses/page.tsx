'use client';

import { useState, useEffect } from 'react';
import { BonusForm } from '@/components/bonuses/bonus-form';
import { db } from '@/lib/firebase/client';
import { collection, query, onSnapshot, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import {
  PlusCircle, Gift, Zap, Ghost, Layers, Star, MoreHorizontal,
  CheckCircle2, XCircle, Clock, Trash2, Pencil, X,
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { Bonus } from '@/lib/types';
import { resolveFirestoreDate } from '@/lib/types';

// ─── Type meta ─────────────────────────────────────────────────────────────────

const TYPE_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  bonus_bet:     { icon: <Gift  className="h-3.5 w-3.5" />, color: 'text-violet-400', bg: 'bg-violet-500/10' },
  profit_boost:  { icon: <Zap   className="h-3.5 w-3.5" />, color: 'text-amber-400',  bg: 'bg-amber-500/10' },
  ghost_parlay:  { icon: <Ghost className="h-3.5 w-3.5" />, color: 'text-blue-400',   bg: 'bg-blue-500/10' },
  parlay_boost:  { icon: <Layers className="h-3.5 w-3.5" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  sgp:           { icon: <Star  className="h-3.5 w-3.5" />, color: 'text-pink-400',   bg: 'bg-pink-500/10' },
};

function getTypeMeta(betType: string) {
  return TYPE_META[betType] ?? { icon: <Zap className="h-3.5 w-3.5" />, color: 'text-slate-400', bg: 'bg-slate-700/30' };
}

function formatBetTypeLabel(id: string): string {
  const labels: Record<string, string> = {
    bonus_bet: 'Bonus Bet', profit_boost: 'Profit Boost', ghost_parlay: 'Ghost Parlay',
    parlay_boost: 'Parlay Boost', sgp: 'SGP Boost',
  };
  return labels[id] ?? id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

// ─── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  const map = {
    active:  { cls: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/25', icon: <Clock className="h-3 w-3" />, label: 'Active' },
    used:    { cls: 'bg-blue-500/15 text-blue-400 border-blue-500/25',          icon: <CheckCircle2 className="h-3 w-3" />, label: 'Used' },
    expired: { cls: 'bg-slate-700/30 text-slate-500 border-slate-700/30',       icon: <XCircle className="h-3 w-3" />, label: 'Expired' },
  }[status] ?? { cls: 'bg-slate-700/30 text-slate-500 border-slate-700/30', icon: null, label: status };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${map.cls}`}>
      {map.icon}{map.label}
    </span>
  );
}

// ─── Bonus Card ────────────────────────────────────────────────────────────────

function BonusCard({ bonus, onEdit, onMarkUsed, onDelete }: {
  bonus: Bonus;
  onEdit: (b: Bonus) => void;
  onMarkUsed: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const expiry    = resolveFirestoreDate(bonus.expirationDate);
  const usedAt    = bonus.usedAt ? resolveFirestoreDate(bonus.usedAt) : null;
  const meta      = getTypeMeta(bonus.betType ?? '');
  const isActive  = bonus.status === 'active';

  const expiresInMs   = expiry ? expiry.getTime() - Date.now() : null;
  const expiresInHrs  = expiresInMs !== null ? expiresInMs / 3_600_000 : null;
  const urgentExpiry  = expiresInHrs !== null && expiresInHrs > 0 && expiresInHrs < 24;

  return (
    <div className={`relative rounded-xl border p-4 transition-all group ${
      isActive
        ? 'bg-slate-900 border-slate-800 hover:border-slate-700'
        : 'bg-slate-900/40 border-slate-800/50 opacity-70'
    }`}>
      {/* Urgency stripe */}
      {urgentExpiry && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-amber-500 rounded-t-xl" />
      )}

      <div className="flex items-start justify-between gap-3">
        {/* Left: type icon + info */}
        <div className="flex items-start gap-3 min-w-0">
          <div className={`w-9 h-9 rounded-lg ${meta.bg} flex items-center justify-center flex-shrink-0 ${meta.color}`}>
            {meta.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-slate-100 text-sm truncate">{bonus.name}</h3>
              <StatusBadge status={bonus.status ?? 'active'} />
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${meta.bg} ${meta.color}`}>
                {formatBetTypeLabel(bonus.betType ?? '')}
              </span>
              <span className="text-[10px] text-slate-500">
                <span className="text-amber-400 font-bold font-mono">{bonus.boost}%</span> boost
              </span>
              <span className="text-[10px] text-slate-500">
                max <span className="text-slate-300 font-mono">${bonus.maxWager}</span>
              </span>
            </div>

            {/* Win logic */}
            {(bonus as any).winLogic && (
              <p className="text-[10px] text-slate-500 mt-1.5 italic leading-relaxed">
                {(bonus as any).winLogic}
              </p>
            )}

            {/* Description */}
            {bonus.description && (
              <p className="text-xs text-slate-500 mt-1">{bonus.description}</p>
            )}

            {/* Dates */}
            <div className="flex items-center gap-3 mt-2 flex-wrap">
              {expiry && (
                <span className={`text-[10px] ${urgentExpiry ? 'text-amber-400 font-bold' : 'text-slate-600'}`}>
                  {isActive
                    ? urgentExpiry
                      ? `⚡ Expires ${formatDistanceToNow(expiry, { addSuffix: true })}`
                      : `Expires ${format(expiry, 'MMM d, yyyy h:mm a')}`
                    : `Expired ${format(expiry, 'MMM d, yyyy')}`
                  }
                </span>
              )}
              {usedAt && (
                <span className="text-[10px] text-blue-400">
                  Used {format(usedAt, 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Right: actions */}
        {isActive && (
          <div className="relative flex-shrink-0">
            <button
              onClick={() => setMenuOpen(o => !o)}
              className="p-1.5 text-slate-600 hover:text-slate-300 rounded-lg hover:bg-slate-800 transition-colors"
            >
              <MoreHorizontal className="h-4 w-4" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-8 z-20 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 min-w-[160px]">
                  <button
                    onClick={() => { onEdit(bonus); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 transition-colors"
                  >
                    <Pencil className="h-3.5 w-3.5 text-slate-500" /> Edit
                  </button>
                  <button
                    onClick={() => { onMarkUsed(bonus.id); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-blue-400 hover:bg-slate-800 transition-colors"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" /> Mark as Used
                  </button>
                  <div className="border-t border-slate-800 my-1" />
                  <button
                    onClick={() => { onDelete(bonus.id); setMenuOpen(false); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-rose-400 hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section ───────────────────────────────────────────────────────────────────

function Section({ title, icon, count, children, defaultCollapsed = false }: {
  title: string; icon: React.ReactNode; count: number;
  children: React.ReactNode; defaultCollapsed?: boolean;
}) {
  const [open, setOpen] = useState(!defaultCollapsed);
  if (count === 0) return null;
  return (
    <div className="space-y-3">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-sm font-bold text-slate-400 hover:text-white transition-colors w-full text-left"
      >
        {icon}
        {title}
        <span className="ml-1 text-slate-600 text-xs font-mono">({count})</span>
        <span className={`ml-auto text-slate-600 text-xs transition-transform ${open ? 'rotate-180' : ''}`}>▼</span>
      </button>
      {open && <div className="space-y-2">{children}</div>}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function BonusesPage() {
  const [bonuses,       setBonuses]       = useState<Bonus[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [modalOpen,     setModalOpen]     = useState(false);
  const [editingBonus,  setEditingBonus]  = useState<Bonus | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'bonuses'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snapshot => {
      const updated = snapshot.docs.map(d => {
        const data = d.data();
        const expiry = resolveFirestoreDate(data.expirationDate);
        let status = data.status ?? 'active';
        if (status === 'active' && expiry && expiry < new Date()) {
          status = 'expired';
          updateDoc(d.ref, { status: 'expired' });
        }
        return {
          id: d.id, ...data, status,
          expirationDate: expiry,
          usedAt: data.usedAt ? resolveFirestoreDate(data.usedAt) : undefined,
        } as unknown as Bonus;
      });
      setBonuses(updated);
      setIsLoading(false);
    }, err => {
      console.error(err);
      toast.error('Failed to load bonuses');
      setIsLoading(false);
    });
  }, []);

  const openAdd  = () => { setEditingBonus(null); setModalOpen(true); };
  const openEdit = (b: Bonus) => { setEditingBonus(b); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditingBonus(null); };

  const handleMarkUsed = async (id: string) => {
    await updateDoc(doc(db, 'bonuses', id), { status: 'used', usedAt: new Date() });
    toast.success('Marked as used');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this bonus?')) return;
    await deleteDoc(doc(db, 'bonuses', id));
    toast.success('Bonus deleted');
  };

  const active  = bonuses.filter(b => b.status === 'active');
  const used    = bonuses.filter(b => b.status === 'used');
  const expired = bonuses.filter(b => b.status === 'expired');

  // Stats
  const totalBoostValue = active.reduce((sum, b) => sum + (b.maxWager ?? 0) * (b.boost ?? 0) / 100, 0);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Bonuses</h1>
          <p className="text-slate-500 text-sm mt-0.5">Track sportsbook promos, boosts &amp; free bets.</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-xl transition-colors shadow-lg shadow-emerald-900/30"
        >
          <PlusCircle className="h-4 w-4" /> Add Bonus
        </button>
      </div>

      {/* ── Summary stats ───────────────────────────────────────────────────── */}
      {!isLoading && bonuses.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Active',       value: active.length,           color: 'text-emerald-400' },
            { label: 'Total Value',  value: `$${totalBoostValue.toFixed(0)}`, color: 'text-amber-400' },
            { label: 'Lifetime Used', value: used.length,            color: 'text-blue-400' },
          ].map(s => (
            <div key={s.label} className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-3">
              <div className={`text-xl font-black font-mono ${s.color}`}>{s.value}</div>
              <div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex flex-col items-center py-20 gap-3">
          <div className="h-6 w-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-600 text-xs uppercase font-mono tracking-wider">Loading…</p>
        </div>
      ) : bonuses.length === 0 ? (
        <div className="flex flex-col items-center py-24 border border-dashed border-slate-800 rounded-2xl gap-3">
          <Gift className="h-8 w-8 text-slate-700" />
          <p className="text-slate-500 text-sm">No bonuses yet.</p>
          <button onClick={openAdd} className="text-emerald-400 text-xs hover:underline">
            Add your first bonus →
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <Section title="Active" icon={<Clock className="h-4 w-4 text-emerald-500" />} count={active.length}>
            {active.map(b => (
              <BonusCard key={b.id} bonus={b} onEdit={openEdit} onMarkUsed={handleMarkUsed} onDelete={handleDelete} />
            ))}
          </Section>
          <Section title="Used" icon={<CheckCircle2 className="h-4 w-4 text-blue-500" />} count={used.length} defaultCollapsed>
            {used.map(b => (
              <BonusCard key={b.id} bonus={b} onEdit={openEdit} onMarkUsed={handleMarkUsed} onDelete={handleDelete} />
            ))}
          </Section>
          <Section title="Expired" icon={<XCircle className="h-4 w-4 text-slate-500" />} count={expired.length} defaultCollapsed>
            {expired.map(b => (
              <BonusCard key={b.id} bonus={b} onEdit={openEdit} onMarkUsed={handleMarkUsed} onDelete={handleDelete} />
            ))}
          </Section>
        </div>
      )}

      {/* ── Modal ───────────────────────────────────────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4 pb-4 sm:pb-0">
          <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">

            {/* Modal header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
              <div>
                <h2 className="text-white font-bold">{editingBonus ? 'Edit Bonus' : 'New Bonus'}</h2>
                <p className="text-slate-500 text-xs mt-0.5">
                  {editingBonus ? 'Update bonus details' : 'Add a promo, boost or free bet'}
                </p>
              </div>
              <button
                onClick={closeModal}
                className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal body — scrollable */}
            <div className="overflow-y-auto px-6 py-5 flex-1">
              <BonusForm
                onSave={closeModal}
                bonusToEdit={editingBonus}
                onClose={closeModal}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}