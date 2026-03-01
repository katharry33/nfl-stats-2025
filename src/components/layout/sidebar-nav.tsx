'use client';

import Link from 'next/link';
import Image from 'next/image';
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
  { label: 'Bet Builder',      href: '/bet-builder',     icon: Zap,    badge: 0 },
  { label: 'Parlay Studio',    href: '/parlay-studio',   icon: BookOpen },
  { label: 'Bonuses',          href: '/bonuses',         icon: Gift },
  { label: 'Market Insights',  href: '/market-insights', icon: LineChart },
  { label: 'Historical Props', href: '/all-props',       icon: BarChart2 },
  { label: 'Betting Log',      href: '/betting-log',     icon: Database },
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
  href: string; icon: React.ElementType; label: string;
  badge?: string | number; active: boolean;
}) {
  return (
    <Link href={href} className={`
      flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all border
      ${active
        ? 'bg-[#FFD700]/10 text-[#FFD700] border-[#FFD700]/15'
        : 'text-zinc-500 hover:text-white hover:bg-white/[0.04] border-transparent'}
    `}>
      <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-[#FFD700]' : ''}`} />
      <span className="flex-1 tracking-tight">{label}</span>
      {badge !== undefined && (
        <span className={`
          text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[20px] text-center
          ${active ? 'bg-[#FFD700] text-black' : 'bg-white/[0.06] text-zinc-600'}
        `}>{badge}</span>
      )}
    </Link>
  );
}

function NavGroup({ item, pathname }: { item: NavItem; pathname: string }) {
  const isAnyChildActive = item.children?.some(c => pathname.startsWith(c.href)) ?? false;
  const [open, setOpen] = useState(isAnyChildActive);

  return (
    <div>
      <button onClick={() => setOpen(o => !o)} className={`
        w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-bold transition-all border
        ${isAnyChildActive
          ? 'text-[#FFD700] bg-[#FFD700]/[0.07] border-[#FFD700]/10'
          : 'text-zinc-500 hover:text-white hover:bg-white/[0.04] border-transparent'}
      `}>
        <item.icon className={`h-4 w-4 shrink-0 ${isAnyChildActive ? 'text-[#FFD700]' : ''}`} />
        <span className="flex-1 text-left tracking-tight">{item.label}</span>
        {open
          ? <ChevronDown  className="h-3.5 w-3.5 opacity-40" />
          : <ChevronRight className="h-3.5 w-3.5 opacity-40" />}
      </button>

      {open && (
        <div className="ml-4 mt-1 space-y-0.5 border-l border-white/[0.06] pl-3">
          {item.children?.map(child => (
            <Link key={child.href} href={child.href} className={`
              flex items-center gap-2.5 px-2 py-1.5 rounded-lg text-xs font-bold transition-all
              ${pathname.startsWith(child.href)
                ? 'text-[#FFD700] bg-[#FFD700]/10'
                : 'text-zinc-600 hover:text-white hover:bg-white/[0.04]'}
            `}>
              <child.icon className="h-3.5 w-3.5 shrink-0" />
              {child.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

const SECTIONS = [
  { label: 'Core',     items: NAV.slice(0, 2) },
  { label: 'Studio',   items: NAV.slice(2, 5) },
  { label: 'Insights', items: NAV.slice(5)    },
];

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

  const navWithBadge = NAV.map(item =>
    item.href === '/bet-builder' ? { ...item, badge: selectedBetsCount ?? 0 } : item
  );

  const sections = [
    { label: 'Core',     items: navWithBadge.slice(0, 2) },
    { label: 'Studio',   items: navWithBadge.slice(2, 5) },
    { label: 'Insights', items: navWithBadge.slice(5)    },
  ];

  return (
    <aside className="fixed left-0 top-0 h-full w-64 bg-[#060606] border-r border-white/[0.06] z-40 hidden lg:flex flex-col">

      {/* Brand */}
      <div className="px-5 pt-6 pb-5 border-b border-white/[0.06]">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative h-9 w-9 shrink-0">
            <Image src="/logo.png" alt="SweetSpot" fill className="object-contain" priority />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-xl tracking-tighter text-white leading-none italic">
              SWEET<span className="text-[#FFD700]">SPOT</span>
            </span>
          </div>
        </Link>
      </div>

      {/* Nav sections */}
      <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
        {sections.map(({ label, items }) => (
          <div key={label}>
            <p className="text-[9px] font-black text-zinc-700 uppercase tracking-[0.25em] px-3 mb-1.5">
              {label}
            </p>
            <div className="space-y-0.5">
              {items.map(item =>
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
                      (!!item.href && item.href !== '/' && pathname.startsWith(item.href))
                    }
                  />
                )
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* Bankroll footer */}
      <div className="px-5 py-5 border-t border-white/[0.06]">
        <div className="flex items-center gap-1.5 mb-1">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
          <p className="text-[9px] text-zinc-600 uppercase font-black tracking-[0.25em]">Bankroll</p>
        </div>
        <p className="text-2xl font-black text-white italic">${(bankroll ?? 0).toFixed(2)}</p>
        <p className="text-[9px] text-zinc-700 font-black uppercase tracking-wider mt-0.5">Tier: Pro</p>
      </div>
    </aside>
  );
}