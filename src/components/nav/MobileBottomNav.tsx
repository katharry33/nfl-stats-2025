'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, Wallet, Target, Hammer, MoreHorizontal } from 'lucide-react';
import { useMobileNav } from '@/context/MobileNavContext';
import { useBetSlip } from '@/hooks/useBetSlip';

const TABS = [
  { href: '/my-performance', label: 'Home',    icon: BarChart2 },
  { href: '/wallet',         label: 'Wallet',  icon: Wallet    },
  { href: '/sweet-spots',    label: 'Spots',   icon: Target    },
  { href: '/bet-builder',    label: 'Builder', icon: Hammer    },
] as const;

// ─── LinkTab ─────────────────────────────────────────────────────────────────

function LinkTab({ href, label, icon: Icon, badge }: {
  href: string; label: string; icon: React.ElementType; badge?: number;
}) {
  const pathname = usePathname();
  const isActive = pathname === href || (href !== '/' && pathname.startsWith(href));

  return (
    <Link
      href={href}
      className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 relative group"
    >
      <span className={`
        relative flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200
        ${isActive ? 'bg-primary/10' : 'group-active:bg-foreground/5'}
      `}>
        <Icon className={`h-[18px] w-[18px] transition-colors duration-200 ${
          isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
        }`} />
        {badge != null && badge > 0 && (
          <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[8px] font-black rounded-full min-w-[14px] h-3.5 px-0.5 flex items-center justify-center leading-none">
            {badge}
          </span>
        )}
      </span>
      <span className={`text-[9px] font-black uppercase tracking-wider transition-colors duration-200 ${
        isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground/70'
      }`}>
        {label}
      </span>
      {isActive && (
        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1 h-0.5 rounded-full bg-primary" />
      )}
    </Link>
  );
}

// ─── MenuTab ─────────────────────────────────────────────────────────────────

function MenuTab({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 group"
      aria-label="Open navigation menu"
    >
      <span className={`
        flex items-center justify-center w-8 h-8 rounded-xl transition-all duration-200
        ${isOpen ? 'bg-primary/10' : 'group-active:bg-foreground/5'}
      `}>
        <MoreHorizontal className={`h-[18px] w-[18px] transition-colors duration-200 ${
          isOpen ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
        }`} />
      </span>
      <span className={`text-[9px] font-black uppercase tracking-wider transition-colors duration-200 ${
        isOpen ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground/70'
      }`}>
        Menu
      </span>
    </button>
  );
}

// ─── MobileBottomNav ─────────────────────────────────────────────────────────

export function MobileBottomNav() {
  const { isDrawerOpen, toggleDrawer } = useMobileNav();
  const { selections } = useBetSlip();
  const slipCount = selections?.length ?? 0;

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      <div className="bg-background/90 backdrop-blur-xl border-t border-border flex items-stretch">
        {TABS.map(tab => (
          <LinkTab
            key={tab.href}
            {...tab}
            badge={tab.href === '/bet-builder' && slipCount > 0 ? slipCount : undefined}
          />
        ))}
        <MenuTab isOpen={isDrawerOpen} onToggle={toggleDrawer} />
      </div>
      {/* iOS safe area */}
      <div className="bg-background/90 h-[env(safe-area-inset-bottom)]" />
    </nav>
  );
}