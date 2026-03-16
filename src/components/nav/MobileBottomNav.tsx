'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart2, Hammer, Layers, Wallet, Menu } from 'lucide-react';

export function MobileBottomNav({ onOpenDrawer }: { onOpenDrawer: () => void }) {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Home', icon: BarChart2 },
    { href: '/bet-builder', label: 'Build', icon: Hammer },
    { href: '/parlay-studio', label: 'Studio', icon: Layers },
    { href: '/wallet', label: 'Wallet', icon: Wallet },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-[#0f1115]/80 backdrop-blur-xl border-t border-white/[0.06] md:hidden px-2 pb-safe-area-inset-bottom">
      <div className="flex items-center justify-around h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={`flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${
                isActive ? 'text-[#FFD700]' : 'text-zinc-500'
              }`}
            >
              <item.icon className="h-5 w-5" strokeWidth={isActive ? 2.5 : 2} />
              <span className="text-[10px] font-black uppercase tracking-tighter">{item.label}</span>
            </Link>
          );
        })}
        {/* The Drawer Trigger */}
        <button 
          onClick={onOpenDrawer}
          className="flex flex-col items-center justify-center gap-1 w-full h-full text-zinc-500"
        >
          <Menu className="h-5 w-5" />
          <span className="text-[10px] font-black uppercase tracking-tighter">More</span>
        </button>
      </div>
    </nav>
  );
}