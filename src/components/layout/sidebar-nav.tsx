'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  BarChart2, BookOpen, Calendar, Database,
  Gift, Home, LineChart, Trophy, Zap,
  ChevronDown, ChevronRight, Users, List, Server,
} from 'lucide-react';

interface NavItem {
  label: string;
  href?: string;
  icon: React.ElementType;
  badge?: string | number;
  children?: { label: string; href: string; icon: React.ElementType }[];
}

const NAV: NavItem[] = [
  { label: 'My Performance',   href: '/my-performance',  icon: Trophy },
  { label: 'Wallet',           href: '/wallet',          icon: Home },
  { label: 'Bet Builder',      href: '/bet-builder',     icon: Zap,       badge: 0 },
  { label: 'Parlay Studio',    href: '/parlay-studio',   icon: BookOpen },
  { label: 'Bonuses',          href: '/bonuses',         icon: Gift },
  { label: 'Market Insights',  href: '/market-insights', icon: LineChart },
  { label: 'Historical Props', href: '/all-props',       icon: BarChart2 },
  { label: 'Betting Log',      href: '/betting-log',     icon: Database },
  { label: 'Schedule',         href: '/schedule',        icon: Calendar },
  {
    label: 'Static Data',
    icon: Server,
    children: [
      { label: 'Schedule',      href: '/static-data/schedule',     icon: Calendar },
      { label: 'PFR ID Map',    href: '/static-data/pfr-ids',      icon: List },
      { label: 'Player → Team', href: '/static-data/player-teams', icon: Users },
    ],
  },
];

function NavLink({ href, icon: Icon, label, badge, active }: {
  href: string; icon: React.ElementType; label: string; badge?: string | number; active: boolean;
}) {
  return (
    <Link href={href}
      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
        active ? 'bg-emerald-600/20 text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
      }`}>
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{label}</span>
      {badge !== undefined && (
        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full min-w-[20px] text-center ${
          active ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-slate-400'
        }`}>{badge}</span>
      )}
    </Link>
  );
}

function NavGroup({ item, pathname }: { item: NavItem; pathname: string }) {
  const isAnyChildActive = item.children?.some(c => pathname.startsWith(c.href)) ?? false;
  const [open, setOpen] = useState(isAnyChildActive);

  return (
    <div>
      <button onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
          isAnyChildActive ? 'text-emerald-400' : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
        }`}>
        <item.icon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{item.label}</span>
        {open
          ? <ChevronDown className="h-3.5 w-3.5 opacity-60" />
          : <ChevronRight className="h-3.5 w-3.5 opacity-60" />}
      </button>

      {open && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-slate-800 pl-3">
          {item.children?.map(child => (
            <Link key={child.href} href={child.href}
              className={`flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                pathname.startsWith(child.href)
                  ? 'bg-emerald-600/15 text-emerald-400'
                  : 'text-slate-500 hover:text-white hover:bg-slate-800/40'
              }`}>
              <child.icon className="h-3.5 w-3.5 shrink-0" />
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export function SidebarNav({
  bankroll,
  bonusBalance,
  selectedBetsCount,
}: {
  bankroll?: number;
  bonusBalance?: number;
  selectedBetsCount?: number;
}) {
  const pathname = usePathname();

  // Inject live bet count into Bet Builder badge
  const nav = NAV.map(item =>
    item.href === '/bet-builder'
      ? { ...item, badge: selectedBetsCount ?? 0 }
      : item
  );

  return (
    <aside className="w-full bg-slate-950 border-r border-slate-800/60 flex flex-col h-screen">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-slate-800/60">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Trophy className="h-4 w-4 text-white" />
          </div>
          <span className="font-black text-white text-sm tracking-tight italic uppercase">
            Gridiron Guru
          </span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
        {nav.map(item =>
          item.children ? (
            <NavGroup key={item.label} item={item} pathname={pathname} />
          ) : (
            <NavLink
              key={item.href}
              href={item.href!}
              icon={item.icon}
              label={item.label}
              badge={item.badge}
              active={
                pathname === item.href ||
                (item.href !== '/' && pathname.startsWith(item.href!))
              }
            />
          )
        )}
      </nav>

      {/* Bankroll footer */}
      <div className="px-4 py-4 border-t border-slate-800/60 space-y-1">
        <div>
          <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">Bankroll</p>
          <p className="text-lg font-black text-white font-mono">${(bankroll ?? 0).toFixed(2)}</p>
        </div>
        {(bonusBalance ?? 0) > 0 && (
          <div>
            <p className="text-[10px] text-slate-600 uppercase font-bold tracking-widest">Bonus Balance</p>
            <p className="text-sm font-bold text-emerald-400 font-mono">${(bonusBalance ?? 0).toFixed(2)}</p>
          </div>
        )}
      </div>
    </aside>
  );
}