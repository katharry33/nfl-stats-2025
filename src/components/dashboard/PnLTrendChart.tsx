import { PnLSparkline } from '@/components/dashboard/PnLSparkline';
import { usePerformance } from '@/hooks/use-performance';
import Link from 'next/link';
import { Activity, ArrowRight } from 'lucide-react';

const SectionLabel = ({ children }: { children: React.ReactNode }) => (
    <p className="text-xs font-black uppercase italic text-zinc-400 tracking-widest">{children}</p>
);

export const PnLTrendChart = ({ data }: { data: any[] }) => {
    const { stats } = usePerformance();

    return (
        <div className="bg-[#0f1115] border border-white/[0.06] rounded-[2rem] p-8">
            <div className="flex justify-between items-start mb-6">
                <SectionLabel>Performance Momentum</SectionLabel>
                <Link href="/my-performance" className="px-4 py-2 bg-[#FFD700]/10 hover:bg-[#FFD700]/20 border border-[#FFD700]/20 rounded-xl text-[10px] font-black uppercase tracking-widest text-[#FFD700] transition-all flex items-center gap-2">
                    Enter The Lab <Activity className="h-3 w-3" />
                </Link>
            </div>
            <PnLSparkline data={stats.chartData} height={160} />
        </div>
    );
};