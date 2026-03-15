'use client';
// src/app/sweet-spots/page.tsx

import React from 'react';
import { Target } from 'lucide-react';
import { SweetSpotPanel } from '@/components/bets/SweetSpotPanel';

export default function SweetSpotsPage() {
  return (
    <main className="min-h-screen bg-[#060606] text-white p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-end justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-1">
              <div className="relative">
                <Target className="h-5 w-5 text-[#FFD700]" />
                <span className="absolute -top-1 -right-1 text-[8px]">🏈</span>
              </div>
              <h1 className="text-2xl font-black italic uppercase tracking-tight">Sweet Spot Engine</h1>
            </div>
            <p className="text-zinc-600 text-[10px] font-bold uppercase tracking-widest">
              Patterns from your winning bets · where you consistently find edge
            </p>
          </div>
        </div>

        <SweetSpotPanel />
      </div>
    </main>
  );
}