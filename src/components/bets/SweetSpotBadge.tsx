'use client';

import React from 'react';
import type { SweetSpotResult } from '@/lib/utils/sweetSpotScore';
import { Target, Flame, Gem } from 'lucide-react';

interface SweetSpotBadgeProps {
  result: SweetSpotResult;
  size?: 'sm' | 'md' | 'lg';
}

const TIER_STYLES = {
  bullseye: {
    icon: Gem,
    label: 'Bullseye',
    textColor: 'text-cyan-300',
    bgColor: 'bg-cyan-500/10',
    borderColor: 'border-cyan-500/20',
    shadow: 'shadow-cyan-500/10',
  },
  hot: {
    icon: Flame,
    label: 'Hot Pick',
    textColor: 'text-orange-400',
    bgColor: 'bg-orange-500/10',
    borderColor: 'border-orange-500/20',
    shadow: 'shadow-orange-500/10',
  },
  strong: {
    icon: Target,
    label: 'Strong Lean',
    textColor: 'text-indigo-400',
    bgColor: 'bg-indigo-500/10',
    borderColor: 'border-indigo-500/20',
    shadow: 'shadow-indigo-500/10',
  },
  cold: {
    icon: null,
    label: 'Cold',
    textColor: 'text-slate-500',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/20',
    shadow: '',
  },
};

export function SweetSpotBadge({ result, size = 'md' }: SweetSpotBadgeProps) {
  const { tier, score, contributingFactors } = result;
  const styles = TIER_STYLES[tier];
  if (!styles) return null;

  const sizeClasses = {
    sm: { wrapper: 'px-2 py-1', icon: 'h-3 w-3', text: 'text-[9px]' },
    md: { wrapper: 'px-2.5 py-1.5', icon: 'h-3.5 w-3.5', text: 'text-xs' },
    lg: { wrapper: 'px-3 py-2', icon: 'h-4 w-4', text: 'text-sm' },
  }[size];

  const tooltipContent = (
    <div className="p-2 bg-card border border-border rounded-lg shadow-xl">
      <p className="text-xs font-black text-white">{styles.label} (Score: {score.toFixed(2)})</p>
      <ul className="mt-2 space-y-1 text-xs text-slate-400">
        {contributingFactors.map(f => (
          <li key={f.factor}>- {f.factor} (+{f.score.toFixed(2)})</li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="relative group">
      <div
        className={`flex items-center gap-1.5 rounded-lg border shadow-lg transition-all ${sizeClasses.wrapper} ${styles.bgColor} ${styles.borderColor} ${styles.shadow}`}>
        {styles.icon && <styles.icon className={`${sizeClasses.icon} ${styles.textColor}`} />}
        <span className={`font-black uppercase tracking-widest ${sizeClasses.text} ${styles.textColor}`}>
          {styles.label}
        </span>
      </div>
      <div className="absolute bottom-full mb-2 w-max left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
        {tooltipContent}
      </div>
    </div>
  );
}
