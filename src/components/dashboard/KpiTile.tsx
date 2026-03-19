// src/components/dashboard/KpiTile.tsx
import { LucideIcon } from 'lucide-react';

interface KpiTileProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  color: string;
}

export function KpiTile({ label, value, icon: Icon, color }: KpiTileProps) {
  return (
    <div className="bg-card border border-white/5 rounded-3xl p-6 flex items-center gap-4 shadow-xl transition-all hover:border-white/10">
      <div className={`p-3 bg-background border border-white/5 rounded-2xl ${color}`}>
        <Icon className="h-6 w-6" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-0.5">
          {label}
        </p>
        <p className="text-2xl font-black italic tracking-tighter text-white">
          {value || '0.0%'}
        </p>
      </div>
    </div>
  );
}