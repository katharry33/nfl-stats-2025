'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  X, Hammer, Layers, TrendingUp, BookOpen, BarChart2,
  Wallet, Gift, History, Target, Database, Users, Calendar,
} from 'lucide-react';
import { useMobileNav } from '@/context/MobileNavContext';
import { useBetSlip } from '@/hooks/useBetSlip';
import { useBankroll } from '@/hooks/use-bankroll';
import { SweetSpotLogo } from '@/components/logo/SweetSpotLogo';

// ─── Nav items (mirrors SidebarNav) ──────────────────────────────────────────

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

// ─── DrawerNavItem ────────────────────────────────────────────────────────────

function DrawerNavItem({ href, label, icon: Icon, badge, isSweetSpot = false, onClose }: {
  href: string; label: string; icon: React.ElementType;
  badge?: number; isSweetSpot?: boolean; onClose: () => void;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      onClick={onClose}
      className={`
        group flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150
        ${isActive
          ? 'bg-primary/10 border border-primary/20 text-foreground'
          : 'text-muted-foreground hover:text-foreground hover:bg-foreground/[0.04] border border-transparent'
        }
      `}
    >
      <Icon className={`h-4 w-4 flex-shrink-0 ${
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
    </Link>
  );
}

// ─── SectionLabel ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 pt-5 pb-1.5 text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground/60">
      {children}
    </p>
  );
}

// ─── MobileDrawer ─────────────────────────────────────────────────────────────

export function MobileDrawer() {
  const { isDrawerOpen, closeDrawer } = useMobileNav();
  const { selections } = useBetSlip();
  const { total: bankroll } = useBankroll();
  const slipCount = selections?.length ?? 0;

  return (
    <div className="md:hidden">

      {/* Backdrop */}
      <div
        onClick={closeDrawer}
        className={`
          fixed inset-0 z-40 bg-background/70 backdrop-blur-sm
          transition-opacity duration-300
          ${isDrawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}
        `}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        className={`
          fixed bottom-0 left-0 right-0 z-50
          bg-card border-t border-border
          rounded-t-2xl flex flex-col max-h-[85dvh]
          transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
          ${isDrawerOpen ? 'translate-y-0' : 'translate-y-full'}
        `}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-border" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border flex-shrink-0">
          <SweetSpotLogo />
          <button
            onClick={closeDrawer}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-foreground/[0.06] transition-colors"
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Scrollable nav */}
        <nav className="flex-1 overflow-y-auto px-3 pb-4 overscroll-contain">

          <SectionLabel>Core</SectionLabel>
          {CORE_ITEMS.map(item => (
            <DrawerNavItem key={item.href} {...item} onClose={closeDrawer} />
          ))}

          <SectionLabel>Studio</SectionLabel>
          {STUDIO_ITEMS.map(item => (
            <DrawerNavItem
              key={item.href}
              {...item}
              badge={item.href === '/bet-builder' && slipCount > 0 ? slipCount : undefined}
              onClose={closeDrawer}
            />
          ))}

          <SectionLabel>Insights</SectionLabel>
          {INSIGHTS_ITEMS.map(item => (
            <DrawerNavItem
              key={item.href}
              {...item}
              isSweetSpot={item.href === '/sweet-spots'}
              onClose={closeDrawer}
            />
          ))}

          <SectionLabel>Master Data</SectionLabel>
          {MASTER_DATA.map(item => (
            <DrawerNavItem key={item.href} {...item} onClose={closeDrawer} />
          ))}

        </nav>

        {/* Bankroll footer */}
        <div className="px-3 py-3 border-t border-border flex-shrink-0">
          <Link href="/wallet" onClick={closeDrawer} className="block group">
            <div className="bg-background border border-border group-hover:border-primary/20 rounded-xl px-3 py-2.5 transition-colors">
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

        {/* iOS safe area */}
        <div className="h-[env(safe-area-inset-bottom)] flex-shrink-0" />
      </div>
    </div>
  );
}