"use client";

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
  { title: "Bet Builder", href: "/bet-builder", icon: Zap },
  { title: "Betting Log", href: "/betting-log", icon: History },
  { title: "Insights", href: "/market-insights", icon: Target },
  { title: "Sweet Spots", href: "/sweet-spots", icon: Target }
];

const ADMIN_ITEMS = [
  { title: "Data Hub", href: "/admin/hub", icon: Database },
  { title: "Historical Props", href: "/props", icon: Clock }
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col h-full bg-zinc-950/80 backdrop-blur-xl border-r border-white/5 w-64 p-4">
      {/* BRANDING AREA */}
      <div className="px-4 mb-12 pt-6 group cursor-pointer">
        <Link href="/" className="flex items-center gap-3">
          <div className="relative">
            <div className="w-9 h-9 bg-cyan-500/10 rounded-xl flex items-center justify-center border border-cyan-500/20 group-hover:border-cyan-400/50 transition-all duration-500 shadow-[0_0_15px_rgba(34,211,238,0.1)] group-hover:shadow-[0_0_20px_rgba(34,211,238,0.3)]">
              <Target className="h-5 w-5 text-cyan-400 group-hover:scale-110 transition-transform duration-500" />
            </div>
            <div className="absolute -inset-1 bg-cyan-500/5 rounded-2xl blur opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          </div>

          <div className="flex flex-col">
            <h1 className="font-black italic tracking-tighter text-xl uppercase leading-none">
              <span className="text-white">Sweet</span>
              <span className="text-cyan-400">Spot</span>
            </h1>
            <p className="text-[7px] font-bold text-zinc-500 uppercase tracking-[0.4em] mt-1.5 group-hover:text-cyan-500 transition-colors">
              Intelligence
            </p>
          </div>
        </Link>
      </div>

      {/* NAVIGATION */}
      <div className="mb-10">
        <p className="px-4 mb-4 text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600/80">
          Main Menu
        </p>
        <div className="space-y-1.5">
          {CORE_ITEMS.map((item) => (
            <NavButton key={item.href} item={item} active={pathname === item.href} />
          ))}
        </div>
      </div>

      <div className="mb-10">
        <p className="px-4 mb-4 text-[9px] font-black uppercase tracking-[0.3em] text-zinc-600/80">
          System Management
        </p>
        <div className="space-y-1.5">
          {ADMIN_ITEMS.map((item) => (
            <NavButton key={item.href} item={item} active={pathname.startsWith(item.href)} />
          ))}
        </div>
      </div>

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
          ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20 shadow-[0_0_15px_rgba(34,211,238,0.1)]" 
          : "text-zinc-500 hover:bg-white/5 hover:text-zinc-200 border-transparent"
      )}
    >
      <div className="flex items-center gap-3">
        <item.icon className={cn(
          "h-4 w-4 transition-all duration-300",
          active ? "text-cyan-400 scale-110" : "text-zinc-600 group-hover:text-zinc-300"
        )} />
        <span className={cn(
          "font-bold text-sm tracking-tight",
          active ? "text-cyan-50" : ""
        )}>{item.title}</span>
      </div>
      
      {active && <ChevronRight className="h-3 w-3 text-cyan-400 animate-pulse" />}
    </Link>
  );
}