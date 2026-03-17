'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Hammer, Layers, TrendingUp, BookOpen, BarChart2,
  Wallet, Gift, History, Target, ChevronRight,
  Database, Users, Calendar,
} from 'lucide-react';
import { useBetSlip } from '@/hooks/useBetSlip';
import { useBankroll } from '@/hooks/use-bankroll';
import { SweetSpotLogo } from '@/components/logo/SweetSpotLogo';

// ─── Nav structure ────────────────────────────────────────────────────────────

const CORE_ITEMS = [
  { href: '/my-performance', label: 'My Performance', icon: BarChart2 },
  { href: '/wallet',         label: 'Wallet',         icon: Wallet    },
];

const STUDIO_ITEMS = [
  { href: '/bet-builder',   label: 'Bet Builder',   icon: Hammer },
  { href: '/parlay-studio', label: 'Parlay Studio', icon: Layers },
];

const INSIGHTS_ITEMS = [
  { href: '/bonuses',         label: 'Bonuses',           icon: Gift       },
  { href: '/market-insights', label: 'Market Insights',   icon: TrendingUp },
  { href: '/all-props',       label: 'Historical Props',  icon: History    },
  { href: '/betting-log',     label: 'Betting Log',       icon: BookOpen   },
  { href: '/sweet-spots',     label: 'Sweet Spot Engine', icon: Target     },
];

const MASTER_DATA = [
  { href: '/pfr-ids',      label: 'PFR IDs',             icon: Database },
  { href: '/player-teams', label: 'Player Team Mapping', icon: Users    },
  { href: '/schedule',     label: 'Schedule',            icon: Calendar },
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
          ? 'bg-primary/10 border border-primary/20 text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] border border-transparent'
        }
      `}
    >
      <Icon className={`h-4 w-4 flex-shrink-0 transition-colors ${
        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground/60'
      }`} />

      <span className={`text-[11px] font-black uppercase tracking-wide flex-1 ${
        isSweetSpot && isActive ? 'text-primary' : ''
      }`}>
        {label}
      </span>

      {badge != null && badge > 0 && (
        <span className="bg-primary text-primary-foreground text-[9px] font-black rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
          {badge}
        </span>
      )}

      {isSweetSpot && <span className="text-[8px]">🎯</span>}

      {isActive && !badge && !isSweetSpot && (
        <ChevronRight className="h-3 w-3 text-primary/40" />
      )}
    </Link>
  );
}

// ─── Section label ────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-5 pb-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
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
    <aside className="hidden md:flex fixed top-0 left-0 h-screen w-56 bg-background border-r border-border flex-col z-40">

      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
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

        <SectionLabel>Master Data</SectionLabel>
        {MASTER_DATA.map(item => (
          <NavItem key={item.href} {...item} />
        ))}

      </nav>

      {/* Bankroll footer */}
      <div className="px-3 py-3 border-t border-border">
        <Link href="/wallet" className="block group">
          <div className="bg-card border border-border group-hover:border-primary/20 rounded-xl px-3 py-2.5 transition-colors">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground/60">Bankroll</span>
              <Wallet className="h-2.5 w-2.5 text-muted-foreground/60" />
            </div>
            <p className="text-sm font-black font-mono text-foreground">
              ${(bankroll ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[8px] font-black uppercase text-muted-foreground/60 mt-0.5">Tier: Pro</p>
          </div>
        </Link>
      </div>

    </aside>
  );
}