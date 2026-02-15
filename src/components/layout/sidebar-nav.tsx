'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  History, 
  FileText, 
  TrendingUp,
  Wallet,
  Target,
  Zap,
  CalendarDays,
  Combine,
  Shield,
  BarChart
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useBetSlip } from '../../context/betslip-context';

interface SidebarNavProps {
  bankroll: number;
  bonusBalance: number;
  selectedBetsCount?: number; 
}

export function SidebarNav({ bankroll, bonusBalance }: SidebarNavProps) {
  const pathname = usePathname();
  const { legs } = useBetSlip();
  const liveCount = legs?.length || 0;

  const safeBankroll = typeof bankroll === 'number' ? bankroll : 0;
  const safeBonus = typeof bonusBalance === 'number' ? bonusBalance : 0;

  const routes = [
    { label: 'My Performance', icon: BarChart, href: '/performance' },
    { label: 'Wallet', icon: Wallet, href: '/wallet' },
    { label: 'Bet Builder', icon: Zap, href: '/bet-builder' },
    { label: 'Parlay Studio', icon: Combine, href: '/parlay-studio' },
    { label: 'Bonuses', icon: Shield, href: '/bonuses' },
    { label: 'Market Insights', icon: TrendingUp, href: '/insights' },
    { label: 'Historical Props', icon: FileText, href: '/all-props' },
    { label: 'Betting Log', icon: History, href: '/betting-log' },
    { label: 'Schedule', icon: CalendarDays, href: '/schedule' },
  ];

  return (
    <nav className='flex flex-col h-full bg-green-950 text-slate-300'>
      {/* Branding Section */}
      <div className='p-6'>
        <div className='text-xl font-bold text-white flex items-center gap-2'>
          <Target className='text-emerald-500 h-6 w-6' />
          <span className="tracking-tight">Gridiron Guru</span>
        </div>
      </div>

      {/* Navigation Links */}
      <div className='flex-1 px-4 space-y-1 overflow-y-auto custom-scrollbar'>
        {routes.map((route) => {
          const isActive = pathname === route.href;
          return (
            <Link
              key={route.href}
              href={route.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group',
                isActive 
                  ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-600/20' 
                  : 'text-slate-400 hover:text-white hover:bg-green-900/50'
              )}
            >
              <route.icon className={cn(
                'h-4 w-4 shrink-0',
                isActive ? 'text-emerald-400' : 'group-hover:text-white'
              )} />
              <span className='text-sm font-medium'>{route.label}</span>
              
              {route.label === 'Bet Builder' && liveCount > 0 && (
                <span className='ml-auto bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full ring-2 ring-green-950'>
                  {liveCount}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom Bankroll Section */}
      <div className='p-5 border-t border-green-900 bg-black/10'>
        <div className='space-y-4'>
          <div className='flex flex-col gap-0.5'>
            <span className='text-[10px] text-slate-500 uppercase font-black tracking-widest'>Bankroll</span>
            <span className='text-xl font-mono font-bold text-emerald-400'>
              ${safeBankroll.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
          <div className='flex flex-col gap-0.5'>
            <span className='text-[10px] text-slate-500 uppercase font-black tracking-widest'>Bonus Balance</span>
            <span className='text-md font-mono font-semibold text-blue-400'>
              ${safeBonus.toLocaleString(undefined, { minimumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      </div>
    </nav>
  );
}