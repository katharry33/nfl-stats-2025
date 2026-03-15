'use client';

import { useState, useEffect } from 'react';
import { BonusForm } from '@/components/bonuses/bonus-form';
import { db } from '@/lib/firebase/client';
import { collection, query, onSnapshot, orderBy, updateDoc, doc, deleteDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import {
  PlusCircle, Gift, Zap, Ghost, Layers, Star, MoreHorizontal,
  CheckCircle2, XCircle, Clock, Trash2, Pencil, X, ChevronDown
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import type { Bonus } from '@/lib/types';
import { resolveFirestoreDate } from '@/lib/types';

// Updated Meta with the app's neon palette
const TYPE_META: Record<string, { icon: React.ReactNode; color: string; bg: string }> = {
  bonus_bet:     { icon: <Gift className="h-3.5 w-3.5" />, color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20' },
  profit_boost:  { icon: <Zap className="h-3.5 w-3.5" />, color: 'text-[#FFD700]',  bg: 'bg-[#FFD700]/10 border-[#FFD700]/20' },
  ghost_parlay:  { icon: <Ghost className="h-3.5 w-3.5" />, color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20' },
  parlay_boost:  { icon: <Layers className="h-3.5 w-3.5" />, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  sgp:           { icon: <Star className="h-3.5 w-3.5" />, color: 'text-pink-400',    bg: 'bg-pink-500/10 border-pink-500/20' },
};

function StatusBadge({ status }: { status: string }) {
  const map = {
    active:  { cls: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: <Clock className="h-3 w-3" />, label: 'Active' },
    used:    { cls: 'bg-blue-500/10 text-blue-400 border-blue-500/20', icon: <CheckCircle2 className="h-3 w-3" />, label: 'Used' },
    expired: { cls: 'bg-white/5 text-zinc-600 border-white/5', icon: <XCircle className="h-3 w-3" />, label: 'Expired' },
  }[status] ?? { cls: 'bg-white/5 text-zinc-500', icon: null, label: status };
  
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-black uppercase border tracking-tighter ${map.cls}`}>
      {map.icon}{map.label}
    </span>
  );
}

function BonusCard({ bonus, onEdit, onMarkUsed, onDelete }: {
  bonus: Bonus; onEdit: (b: Bonus) => void; onMarkUsed: (id: string) => void; onDelete: (id: string) => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const expiry = resolveFirestoreDate(bonus.expirationDate);
  const usedAt = bonus.usedAt ? resolveFirestoreDate(bonus.usedAt) : null;
  const meta = TYPE_META[bonus.betType ?? ''] ?? { icon: <Zap className="h-3.5 w-3.5" />, color: 'text-zinc-500', bg: 'bg-white/5 border-white/10' };
  const isActive = bonus.status === 'active';

  const expiresInMs = expiry ? expiry.getTime() - Date.now() : null;
  const expiresInHrs = expiresInMs !== null ? expiresInMs / 3_600_000 : null;
  const urgentExpiry = expiresInHrs !== null && expiresInHrs > 0 && expiresInHrs < 24;

  return (
    <div className={`relative rounded-2xl border transition-all duration-300 ${isActive ? 'bg-[#0f1115] border-white/5 hover:border-white/10' : 'bg-black/40 border-white/5 opacity-50'} p-5`}>
      {urgentExpiry && <div className="absolute top-0 left-0 right-0 h-1 bg-red-500/50 rounded-t-2xl shadow-[0_0_10px_rgba(239,68,68,0.2)]" />}

      <div className="flex items-start justify-between">
        <div className="flex gap-4 min-w-0">
          <div className={`w-12 h-12 rounded-xl border ${meta.bg} flex items-center justify-center flex-shrink-0 ${meta.color} shadow-inner`}>
            {meta.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h3 className="font-black text-white text-sm uppercase tracking-tight truncate">{bonus.name}</h3>
              <StatusBadge status={bonus.status ?? 'active'} />
            </div>
            
            <div className="flex items-center gap-2 mb-3">
               <span className="text-[10px] font-mono font-black text-[#FFD700] bg-[#FFD700]/10 px-1.5 py-0.5 rounded">
                {bonus.boost}% BOOST
              </span>
              <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">
                MAX ${bonus.maxWager}
              </span>
            </div>

            {bonus.description && <p className="text-xs text-zinc-500 mb-2 line-clamp-1 italic">{bonus.description}</p>}

            <div className="flex items-center gap-4">
               {expiry && (
                <span className={`text-[10px] font-mono font-bold uppercase tracking-tighter ${urgentExpiry ? 'text-red-400' : 'text-zinc-600'}`}>
                   {isActive ? (urgentExpiry ? `⚡ ${formatDistanceToNow(expiry)} left` : `Exp: ${format(expiry, 'MM/dd HH:mm')}`) : `Expired`}
                </span>
              )}
              {usedAt && <span className="text-[10px] text-blue-500 font-bold uppercase">Used: {format(usedAt, 'MM/dd')}</span>}
            </div>
            <div className="flex gap-1 mt-2">
              {bonus.eligibleTypes?.map(t => (
                <span key={t} className="text-[8px] px-1 bg-white/5 text-zinc-500 rounded border border-white/5">{t}</span>
              ))}
              {bonus.minOdds && <span className="text-[8px] px-1 bg-white/5 text-zinc-500 rounded border border-white/5">Min: {bonus.minOdds}</span>}
            </div>
          </div>
        </div>

        {isActive && (
          <div className="relative">
            <button onClick={() => setMenuOpen(!menuOpen)} className="p-2 text-zinc-600 hover:text-white transition-colors">
              <MoreHorizontal className="h-5 w-5" />
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-10 z-20 bg-[#0f1115] border border-white/10 rounded-xl shadow-2xl py-2 min-w-[180px]">
                  <button onClick={() => { onEdit(bonus); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-xs text-zinc-300 hover:bg-white/5 transition-colors">
                    <Pencil className="h-3.5 w-3.5" /> Edit
                  </button>
                  <button onClick={() => { onMarkUsed(bonus.id); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-xs text-emerald-400 hover:bg-emerald-500/5 transition-colors">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Use Now
                  </button>
                  <div className="border-t border-white/5 my-1" />
                  <button onClick={() => { onDelete(bonus.id); setMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-2 text-xs text-red-400 hover:bg-red-500/5 transition-colors">
                    <Trash2 className="h-3.5 w-3.5" /> Burn
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

export default function BonusesPage() {
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingBonus, setEditingBonus] = useState<Bonus | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'bonuses'), orderBy('createdAt', 'desc'));
    return onSnapshot(q, snapshot => {
      let bonuses = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Bonus));

      const getBonusPriority = (bonus: Bonus) => {
        if (bonus.status === 'active') {
          const expiry = resolveFirestoreDate(bonus.expirationDate);
          if (expiry) {
            const expiresInMs = expiry.getTime() - Date.now();
            if (expiresInMs > 0 && expiresInMs < 24 * 3600 * 1000) {
              return 3; // 1. Urgent
            }
          }
          return 2; // 2. Active, not urgent
        }
        return 1; // 3. Used or Expired
      };

      bonuses.sort((a, b) => {
        const priorityA = getBonusPriority(a);
        const priorityB = getBonusPriority(b);

        if (priorityA !== priorityB) {
          return priorityB - priorityA;
        }

        // For urgent items, sort by expiration date (sooner first)
        if (priorityA === 3) {
             const expiryA = resolveFirestoreDate(a.expirationDate)?.getTime() ?? 0;
             const expiryB = resolveFirestoreDate(b.expirationDate)?.getTime() ?? 0;
             return expiryA - expiryB;
        }

        // For other priorities, sort by creation date (newest first)
        const dateA = resolveFirestoreDate(a.createdAt)?.getTime() ?? 0;
        const dateB = resolveFirestoreDate(b.createdAt)?.getTime() ?? 0;
        return dateB - dateA;
      });

      setBonuses(bonuses);
      setIsLoading(false);
    });
  }, []);

  const active = bonuses.filter(b => b.status === 'active');
  const used = bonuses.filter(b => b.status === 'used');
  const totalValue = active.reduce((sum, b) => sum + (b.maxWager ?? 0) * (b.boost ?? 0) / 100, 0);

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-8 bg-black min-h-screen">
      <div className="flex items-end justify-between border-b border-white/5 pb-6">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic">Inventory</h1>
          <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest mt-1">Strategic Assets & Bonuses</p>
        </div>
        <button onClick={() => { setEditingBonus(null); setModalOpen(true); }} className="flex items-center gap-2 px-5 py-2.5 bg-white text-black text-xs font-black uppercase rounded-full hover:bg-zinc-200 transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)]">
          <PlusCircle className="h-4 w-4" /> Add Bonus
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active', value: active.length, color: 'text-emerald-500' },
          { label: 'Unused Value', value: `$${totalValue.toFixed(0)}`, color: 'text-[#FFD700]' },
          { label: 'Burned', value: used.length, color: 'text-zinc-500' },
        ].map(s => (
          <div key={s.label} className="bg-[#0f1115] border border-white/5 rounded-2xl p-4">
            <div className={`text-2xl font-black font-mono tracking-tighter ${s.color}`}>{s.value}</div>
            <div className="text-[9px] text-zinc-600 uppercase font-black tracking-widest mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="space-y-12">
        <Section title="Active Promos" icon={<Clock className="h-4 w-4 text-emerald-500" />} count={active.length}>
          {active.map(b => <BonusCard key={b.id} bonus={b} onEdit={b => {setEditingBonus(b); setModalOpen(true)}} onMarkUsed={id => updateDoc(doc(db, 'bonuses', id), {status: 'used', usedAt: new Date()})} onDelete={id => deleteDoc(doc(db, 'bonuses', id))} />)}
        </Section>
        
        {used.length > 0 && (
          <Section title="History" icon={<CheckCircle2 className="h-4 w-4 text-zinc-600" />} count={used.length} defaultCollapsed>
            {used.map(b => <BonusCard key={b.id} bonus={b} onEdit={b => {setEditingBonus(b); setModalOpen(true)}} onMarkUsed={() => {}} onDelete={id => deleteDoc(doc(db, 'bonuses', id))} />)}
          </Section>
        )}
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md px-4">
          <div className="bg-[#0f1115] border border-white/10 rounded-3xl w-full max-w-lg shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden">
             <div className="flex items-center justify-between px-8 py-6 border-b border-white/5">
                <h2 className="text-white font-black uppercase italic tracking-tighter text-xl">Asset Configuration</h2>
                <button onClick={() => setModalOpen(false)} className="text-zinc-500 hover:text-white"><X className="h-5 w-5"/></button>
             </div>
             <div className="p-8 max-h-[80vh] overflow-y-auto">
               <BonusForm onSave={() => setModalOpen(false)} bonusToEdit={editingBonus} onClose={() => setModalOpen(false)} />
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Section({ title, icon, count, children, defaultCollapsed = false }: any) {
  const [open, setOpen] = useState(!defaultCollapsed);
  return (
    <div className="space-y-4">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center gap-3 group">
        <span className="bg-white/5 p-1.5 rounded-lg group-hover:bg-white/10 transition-colors">{icon}</span>
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 group-hover:text-zinc-300 transition-colors">{title} ({count})</span>
        <div className="flex-1 h-px bg-white/5 ml-2" />
        <ChevronDown className={`h-4 w-4 text-zinc-700 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="space-y-3">{children}</div>}
    </div>
  );
}
