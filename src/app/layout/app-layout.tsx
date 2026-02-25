'use client';

import { useBetSlip } from '@/context/betslip-context';
import { useWallet } from '@/context/wallet-context'; 
import { SidebarNav } from '@/components/layout/sidebar-nav';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { selections } = useBetSlip();
  const { bankroll, bonusBalance } = useWallet();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 hidden md:flex flex-col flex-shrink-0">
        <SidebarNav 
          bankroll={bankroll} 
          bonusBalance={bonusBalance} 
          selectedBetsCount={selections?.length || 0}
        />
      </aside>

      <main className="flex-1 relative overflow-y-auto bg-background">
        {children}
      </main>
    </div>
  );
}
