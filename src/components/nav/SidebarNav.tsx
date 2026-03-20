'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  History, 
  Zap, 
  Target, 
  Settings,
  Database,
  ChevronRight,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CORE_ITEMS = [
  { title: "Command Center", href: "/", icon: LayoutDashboard },
  { title: "Betting Log", href: "/betting-log", icon: History },
  { title: "Bet Builder", href: "/bet-builder", icon: Zap },
  { title: "Insights", href: "/insights", icon: Target },
];

// Consolidated into the Admin Hub
const ADMIN_ITEMS = [
  {
    title: "Data Hub",
    href: "/admin/hub", // Matches your new consolidated page
    icon: Database
  },
  {title:"Historical Props",
    href: "/all-props",
    icon: Clock
  }
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col h-full bg-card/50 backdrop-blur-md border-r border-white/5 w-64 p-4">
      {/* BRANDING / LOGO AREA */}
      <div className="px-4 mb-10 pt-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(34,211,238,0.4)]">
            <Zap className="h-5 w-5 text-black fill-current" />
          </div>
          <span className="font-black italic tracking-tighter text-xl uppercase">Gridiron</span>
        </div>
      </div>

      {/* SECTION: NAVIGATION */}
      <div className="mb-8">
        <p className="px-4 mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
          Main Menu
        </p>
        <div className="space-y-1">
          {CORE_ITEMS.map((item) => (
            <NavButton key={item.href} item={item} active={pathname === item.href} />
          ))}
        </div>
      </div>

      {/* SECTION: ADMINISTRATION (Consolidated Hub) */}
      <div className="mb-8">
        <p className="px-4 mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
          System Management
        </p>
        <div className="space-y-1">
          {ADMIN_ITEMS.map((item) => (
            <NavButton key={item.href} item={item} active={pathname.startsWith(item.href)} />
          ))}
        </div>
      </div>

      {/* FOOTER: SETTINGS */}
      <div className="mt-auto pt-4 border-t border-white/5">
        <NavButton 
          item={{ title: "Settings", href: "/settings", icon: Settings }} 
          active={pathname === "/settings"} 
        />
      </div>
    </nav>
  );
}

function NavButton({ item, active }: { item: any, active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-300 group w-full border",
        active 
          ? "bg-primary/10 text-primary border-primary/20 shadow-[inset_0_0_10px_rgba(34,211,238,0.05)]" 
          : "text-zinc-500 hover:bg-white/3 hover:text-zinc-200 border-transparent"
      )}
    >
      <div className="flex items-center gap-3">
        <item.icon className={cn(
          "h-4 w-4 transition-all duration-300",
          active ? "text-primary scale-110" : "text-zinc-600 group-hover:text-zinc-300"
        )} />
        <span className="font-bold text-sm tracking-tight">{item.title}</span>
      </div>
      
      {active && <ChevronRight className="h-3 w-3 text-primary animate-pulse" />}
    </Link>
  );
}