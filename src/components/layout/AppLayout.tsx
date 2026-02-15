'use client';

import React from 'react';
import { SidebarNav } from './sidebar-nav';
import { useFirebaseBets } from '../../hooks/useBets';
import { useBankroll } from '../../hooks/use-bankroll';
import { useActiveBonuses } from '../../hooks/use-active-bonuses';
import { useFirestore, useAuth } from '@/context/AuthContext';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore();
  const { user } = useAuth(); // Correctly get the user object

  // Get user ID from the user object
  const userId = user?.uid;

  const { bets: selectedBets } = useFirebaseBets(userId);
  const bankrollData = useBankroll();
  const activeBonuses = useActiveBonuses();

  // Initialization guard
  if (!firestore) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950 text-emerald-500">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-emerald-500 border-t-transparent" />
          <p className="text-sm font-mono uppercase tracking-widest animate-pulse">
            Establishing Secure Link...
          </p>
        </div>
      </div>
    );
  }

  const bonusBalance = (activeBonuses || []).reduce((acc, bonus) => {
    // @ts-ignore
    const val = bonus.value || bonus.amount || 0;
    return acc + (typeof val === 'number' ? val : 0);
  }, 0);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="w-64 fixed inset-y-0 left-0 z-50 block border-r border-border bg-card">
        <SidebarNav
          bankroll={bankrollData?.available ?? 0}
          bonusBalance={bonusBalance}
          selectedBetsCount={selectedBets?.length || 0}
        />
      </aside>
      <main className="flex-1 ml-64 flex flex-col overflow-x-hidden">
        <div className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
