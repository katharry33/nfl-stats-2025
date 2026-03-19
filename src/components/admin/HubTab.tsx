import { LucideIcon, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface HubTabProps {
  active: boolean;
  onClick: () => void;
  icon: LucideIcon;
  label: string;
}

export function HubTab({ active, onClick, icon: Icon, label }: HubTabProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-between w-full px-4 py-3 rounded-xl transition-all duration-300 border",
        active 
          ? "bg-primary/10 text-primary border-primary/20 shadow-[inset_0_0_15px_rgba(34,211,238,0.05)]" 
          : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200 border-transparent"
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={cn(
          "h-4 w-4 transition-transform duration-300",
          active ? "scale-110 text-primary" : "text-zinc-600"
        )} />
        <span className="font-bold text-[10px] uppercase tracking-wider">
          {label}
        </span>
      </div>
      
      {active && <ChevronRight className="h-3 w-3 text-primary animate-pulse" />}
    </button>
  );
}