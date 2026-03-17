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
  { href: 'static-data/pfr-ids',      label: 'PFR IDs',             icon: Database },
  { href: 'static-data/player-teams', label: 'Player Team Mapping', icon: Users    },
  { href: 'static-data/schedule',     label: 'Schedule',            icon: Calendar },
];

// ─── NavItem ──────────────────────────────────────────────────────────────────

function NavItem({ href, label, icon: Icon, badge, isSweetSpot = false }: {
  href: string; label: string; icon: React.ElementType;
  badge?: number; isSweetSpot?: boolean;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className={`
        group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-150
        ${isActive
          ? 'bg-primary/10 text-primary border border-primary/20'
          : 'text-muted-foreground hover:text-foreground hover:bg-secondary border border-transparent'
        }
      `}
    >
      <Icon className={`h-4 w-4 'shrink-0' transition-colors ${
        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground/70'
      }`} />

      <span className="text-[11px] font-semibold tracking-wide flex-1">{label}</span>

      {badge != null && badge > 0 && (
        <span className="bg-primary text-primary-foreground text-[9px] font-bold rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
          {badge}
        </span>
      )}

      {isSweetSpot && <span className="text-[9px]">🎯</span>}

      {isActive && !badge && !isSweetSpot && (
        <ChevronRight className="h-3 w-3 text-primary/50" />
      )}
    </Link>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pt-5 pb-1.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/70">
      {children}
    </p>
  );
}

// ─── SidebarNav ───────────────────────────────────────────────────────────────

export function SidebarNav() {
  const { selections } = useBetSlip();
  const { total: bankroll } = useBankroll();
  const slipCount = selections?.length ?? 0;

  return (
    <aside className="hidden md:flex fixed top-0 left-0 h-screen w-56 bg-card border-r border-border flex-col z-40 shadow-sm">

      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <SweetSpotLogo />
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2 scrollbar-none">
        <SectionLabel>Core</SectionLabel>
        {CORE_ITEMS.map(i => <NavItem key={i.href} {...i} />)}

        <SectionLabel>Studio</SectionLabel>
        {STUDIO_ITEMS.map(i => (
          <NavItem key={i.href} {...i}
            badge={i.href === '/bet-builder' && slipCount > 0 ? slipCount : undefined}
          />
        ))}

        <SectionLabel>Insights</SectionLabel>
        {INSIGHTS_ITEMS.map(i => (
          <NavItem key={i.href} {...i} isSweetSpot={i.href === '/sweet-spots'} />
        ))}

        <SectionLabel>Master Data</SectionLabel>
        {MASTER_DATA.map(i => <NavItem key={i.href} {...i} />)}
      </nav>

      {/* Bankroll footer */}
      <div className="px-3 py-3 border-t border-border">
        <Link href="/wallet" className="block group">
          <div className="bg-primary/5 border border-primary/15 group-hover:border-primary/30 rounded-lg px-3 py-2.5 transition-colors">
            <div className="flex items-center justify-between mb-0.5">
              <span className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground">Bankroll</span>
              <Wallet className="h-3 w-3 text-primary/60" />
            </div>
            <p className="text-sm font-bold font-mono text-foreground">
              ${(bankroll ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
            <p className="text-[9px] font-semibold text-muted-foreground mt-0.5">Tier: Pro</p>
          </div>
        </Link>
      </div>

    </aside>
  );
}