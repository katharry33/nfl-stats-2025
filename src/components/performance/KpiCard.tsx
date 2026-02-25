import { ElementType } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export function KpiCard({
  title,
  value,
  description,
  icon: Icon,
  change,
  changeType,
}: {
  title: string;
  value: string | number;
  description?: string;
  icon?: ElementType;
  change?: string;
  changeType?: 'positive' | 'negative';
}) {
  const changeColor = changeType === 'positive' ? 'text-emerald-400' : 'text-red-400';
  const ChangeIcon = changeType === 'positive' ? ArrowUpRight : ArrowDownRight;

  return (
    <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-bold text-slate-500 uppercase">{title}</p>
        {Icon && <Icon className="h-4 w-4 text-slate-500" />}
      </div>
      <p className="text-2xl font-black text-white">{value}</p>
      <div className="flex items-center gap-1 mt-1">
        {change && changeType && (
          <span className={`flex items-center text-xs font-bold ${changeColor}`}>
            <ChangeIcon className="h-3 w-3 mr-0.5" />
            {change}
          </span>
        )}
        {description && <p className="text-[10px] text-slate-400">{description}</p>}
      </div>
    </div>
  );
}