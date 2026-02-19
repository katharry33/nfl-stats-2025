'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Wallet, 
  Hammer, 
  Grid3x3, 
  Trophy,
  TrendingUp,
  History,
  Calendar,
  Gift
} from 'lucide-react';

interface SidebarNavProps {
  bankroll: number;
  bonusBalance: number;
  selectedBetsCount: number;
}

export function SidebarNav({ bankroll, bonusBalance, selectedBetsCount }: SidebarNavProps) {
  const pathname = usePathname();

  const navItems = [
    { href: '/my-performance', label: 'My Performance', icon: LayoutDashboard },
    { href: '/wallet', label: 'Wallet', icon: Wallet },
    { href: '/bet-builder', label: 'Bet Builder', icon: Hammer, badge: selectedBetsCount },
    { href: '/parlay-studio', label: 'Parlay Studio', icon: Trophy },
    { href: '/bonuses', label: 'Bonuses', icon: Gift },
    { href: '/market-insights', label: 'Market Insights', icon: TrendingUp },
    { href: '/all-props', label: 'Historical Props', icon: History },
    { href: '/betting-log', label: 'Betting Log', icon: History },
    { href: '/schedule', label: 'Schedule', icon: Calendar },
  ];

  return (
    <div className="flex flex-col h-full bg-slate-950 border-r border-slate-800">
      {/* Logo */}
      <div className="p-6 border-b border-slate-800">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold text-lg">G</span>
          </div>
          <span className="text-xl font-bold text-white">Gridiron Guru</span>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors relative ${
                isActive
                  ? 'bg-emerald-500/10 text-emerald-500'
                  : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span className="text-sm font-medium">{item.label}</span>
              {item.badge && item.badge > 0 && (
                <span className="ml-auto bg-emerald-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bankroll */}
      <div className="p-4 border-t border-slate-800 space-y-3">
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Bankroll</p>
          <p className="text-2xl font-bold text-emerald-500">${bankroll.toFixed(2)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">Bonus Balance</p>
          <p className="text-lg font-bold text-purple-400">${bonusBalance.toFixed(2)}</p>
        </div>
      </div>
    </div>
  );
}