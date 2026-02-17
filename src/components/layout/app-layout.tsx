// src/components/layout/app-layout.tsx
'use client';

import { useBetSlip } from '@/context/betslip-context';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { BetSlip } from '@/components/bets/betslip'; 

export function AppLayout({ children }: { children: React.ReactNode }) {
  const { selections: slip } = useBetSlip();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 hidden md:flex flex-col flex-shrink-0">
        <SidebarNav bankroll={1000} bonusBalance={250} selectedBetsCount={slip.length} />
      </aside>

      <main className="flex-1 relative overflow-y-auto bg-background">
        {children}
      </main>

      <BetSlip />
    </div>
  );
}