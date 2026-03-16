'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Hammer, Layers, TrendingUp, BookOpen, BarChart2,
  Wallet, Gift, History, Target, Zap, ChevronRight,
} from 'lucide-react';
import { useBetSlip } from '@/hooks/useBetSlip';
import { useBankroll } from '@/hooks/use-bankroll';
import { SweetSpotLogo } from '@/components/logo/SweetSpotLogo';

// ─── Nav structure ────────────────────────────────────────────────────────────

const CORE_ITEMS = [
  { href: '/my-performance', label: 'My Performance', icon: BarChart2 },
  { href: '/wallet',         label: 'Wallet',         icon: Wallet     },
];

const STUDIO_ITEMS = [
  { href: '/bet-builder',   label: 'Bet Builder',    icon: Hammer  },
  { href: '/parlay-studio', label: 'Parlay Studio',  icon: Layers  },
];

const INSIGHTS_ITEMS = [
  { href: '/bonuses',        label: 'Bonuses',           icon: Gift      },
  { href: '/market-insights',label: 'Market Insights',   icon: TrendingUp},
  { href: '/all-props',      label: 'Historical Props',  icon: History   },
  { href: '/betting-log',    label: 'Betting Log',       icon: BookOpen  },
  { href: '/sweet-spots',    label: 'Sweet Spot Engine', icon: Target    },
];

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({
  href, label, icon: Icon, badge, isSweetSpot = false,
}: {
  href:         string;
  label:        string;
  icon:         React.ElementType;
  badge?:       number;
  isSweetSpot?: boolean;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`
        group flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-150
        ${isActive
          ? isSweetSpot
            ? 'bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700]'
            : 'bg-[#FFD700]/10 border border-[#FFD700]/20 text-white'
          : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/[0.04] border border-transparent'
        }
      `}
    >
      <Icon className={`h-4 w-4 flex-shrink-0 transition-colors ${
        isActive
          ? isSweetSpot ? 'text-[#FFD700]' : 'text-[#FFD700]'
          : 'text-zinc-600 group-hover:text-zinc-400'
      }`} />

      <span className={`text-[11px] font-black uppercase tracking-wide flex-1 ${
        isSweetSpot && isActive ? 'text-[#FFD700]' : ''
      }`}>
        {label}
      </span>

      {badge != null && badge > 0 && (
        <span className="bg-[#FFD700] text-black text-[9px] font-black rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
          {badge}
        </span>
      )}

      {isSweetSpot && (
        <span className="text-[8px]">🎯</span>
      )}

      {isActive && !badge && !isSweetSpot && (
        <ChevronRight className="h-3 w-3 text-[#FFD700]/40" />
      )}
    </Link>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-5 pb-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-zinc-700">
      {children}
    </p>
  );
}

// ─── Main Sidebar ─────────────────────────────────────────────────────────────

export function SidebarNav() {
  const { selections } = useBetSlip();
  const { total: bankroll } = useBankroll();

  const slipCount = selections?.length ?? 0;

  return (
    <aside className="hidden md:flex flex-col w-56 h-screen fixed top-0 left-0 bg-[#060606] border-r border-white/[0.06] z-40">

      {/* Logo */}
      <div className="px-4 py-5 border-b border-white/[0.06]">
        <SweetSpotLogo />
      </div>

      {/* Nav links */}
      <nav className="flex-1 overflow-y-auto px-2 pb-4 scrollbar-none">

        <SectionLabel>Core</SectionLabel>
        {CORE_ITEMS.map(item => (
          <NavItem key={item.href} {...item} />
        ))}

        <SectionLabel>Studio</SectionLabel>
        {STUDIO_ITEMS.map(item => (
          <NavItem
            key={item.href}
            {...item}
            badge={item.href === '/bet-builder' && slipCount > 0 ? slipCount : undefined}
          />
        ))}

        <SectionLabel>Insights</SectionLabel>
        {INSIGHTS_ITEMS.map(item => (
          <NavItem
            key={item.href}
            {...item}
            isSweetSpot={item.href === '/sweet-spots'}
          />
        ))}

      </nav>

      {/* Bankroll footer */}
      <div className="px-3 py-3 border-t border-white/[0.06]">
        <Link href="/wallet" className="block group">
          <div className="bg-black/40 border border-white/[0.06] group-hover:border-[#FFD700]/20 rounded-xl px-3 py-2.5 transition-colors">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[8px] font-black uppercase tracking-widest text-zinc-700">Bankroll</span>
              <Wallet className="h-2.5 w-2.5 text-zinc-700" />
            </div>
            <p className="text-sm font-black font-mono text-white">
              ${(bankroll ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[8px] font-black uppercase text-zinc-700 mt-0.5">Tier: Pro</p>
          </div>
        </Link>
      </div>

    </aside>
  );
}
