'use client';

import React from 'react';
import { User, Bell, Search } from 'lucide-react';
import Link from 'next/link';

export function Header() {
  return (
    <header className="dark h-16 bg-[#060606] border-b border-white/5 flex items-center justify-between px-8 sticky top-0 z-40">
      {/* Search Bar - Integrated look */}
      <div className="flex-1 max-w-xl">
        <div className="relative group">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
          <input 
            type="text" 
            placeholder="Search props, players, or teams..." 
            className="w-full bg-white/5 border border-white/5 rounded-xl py-2 pl-10 pr-4 text-xs font-medium text-white placeholder:text-zinc-600 focus:outline-none focus:border-primary/50 transition-all"
          />
        </div>
      </div>

      {/* Right Side Actions */}
      <div className="flex items-center gap-6">
        <nav className="hidden md:flex items-center gap-6">
          {['Bet Builder', 'Parlay Studio', 'Insights', 'Bonuses'].map((item) => (
            <Link 
              key={item}
              href={`/${item.toLowerCase().replace(' ', '-')}`}
              className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 hover:text-primary transition-colors"
            >
              {item}
            </Link>
          ))}
        </nav>

        <div className="h-4 w-[1px] bg-zinc-800 mx-2" />

        <div className="flex items-center gap-4">
          <button className="relative p-2 text-zinc-500 hover:text-white transition-colors">
            <Bell className="h-5 w-5" />
            <span className="absolute top-2 right-2 h-2 w-2 bg-primary rounded-full border-2 border-[#060606]" />
          </button>
          <button className="flex items-center gap-2 pl-2 border-l border-zinc-800">
            <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-amber-300 flex items-center justify-center shadow-lg shadow-primary/20">
              <User className="h-4 w-4 text-black" />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
