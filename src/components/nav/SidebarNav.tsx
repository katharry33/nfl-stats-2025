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
  FileCode,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';

const CORE_ITEMS = [
  { title: "Command Center", href: "/", icon: LayoutDashboard },
  { title: "Betting Log", href: "/betting-log", icon: History },
  { title: "Bet Builder", href: "/bet-builder", icon: Zap },
  { title: "Insights", href: "/insights", icon: Target },
];

const SYSTEM_DATA_ITEMS = [
  {
    title: "PFR ID Map",
    href: "/static-data/pfr-ids",
    icon: FileCode
  },
  {
    title: "Schedule",
    href: "/static-data/schedule",
    icon: History // Or use 'Calendar' if you have it imported
  },
  {
    title: "Player Teams",
    href: "/static-data/player-teams",
    icon: ShieldCheck
  },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col h-full bg-[#07080a] border-r border-white/5 w-64 p-4">
      {/* SECTION: NAVIGATION */}
      <div className="mb-8">
        <p className="px-4 mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
          Navigation
        </p>
        <div className="space-y-1">
          {CORE_ITEMS.map((item) => (
            <NavButton key={item.href} item={item} active={pathname === item.href} />
          ))}
        </div>
      </div>

      {/* SECTION: DATA MANAGEMENT (Static Data) */}
      <div className="mb-8">
        <p className="px-4 mb-4 text-[10px] font-black uppercase tracking-[0.3em] text-zinc-600">
          System Reference Data
        </p>
        <div className="space-y-1">
          {SYSTEM_DATA_ITEMS.map((item) => (
            <NavButton key={item.href} item={item} active={pathname === item.href} />
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

// Sub-component to keep the code clean and fix the layout issues
function NavButton({ item, active }: { item: any, active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group w-full",
        active 
          ? "bg-cyan-500/10 text-cyan-400 border border-cyan-500/10" 
          : "text-zinc-500 hover:bg-white/[0.03] hover:text-zinc-200 border border-transparent"
      )}
    >
      <item.icon className={cn(
        "h-4 w-4 transition-colors",
        active ? "text-cyan-400" : "text-zinc-600 group-hover:text-zinc-300"
      )} />
      <span className="font-bold text-sm tracking-tight">{item.title}</span>
    </Link>
  );
}
