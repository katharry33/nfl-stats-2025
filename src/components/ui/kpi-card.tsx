import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
    title: string;
    value: string;
    color: string;
    icon: LucideIcon;
}

export const KpiCard = ({ title, value, color, icon: Icon }: KpiCardProps) => (
    <div className="bg-[#0f1115] border border-white/[0.06] rounded-2xl p-6 flex items-center gap-6">
        <div className={`w-12 h-12 flex items-center justify-center rounded-xl bg-white/5 ${color}`}>
            <Icon className="h-6 w-6" />
        </div>
        <div>
            <p className="text-xs font-black uppercase text-zinc-500 tracking-widest">{title}</p>
            <p className={`text-3xl font-black font-mono ${color}`}>{value}</p>
        </div>
    </div>
);