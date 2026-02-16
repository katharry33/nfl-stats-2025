'use client';

import React from 'react';
import { SidebarNav } from './sidebar-nav';
// import NotificationCenter from './notification-center'; // FIX: Commented out missing component
import { useFirebaseBets } from '../../hooks/useBets'; 
import { useBankroll } from '../../hooks/use-bankroll';
import { useActiveBonuses } from '../../hooks/use-active-bonuses';
import { useFirestore, useAuth } from '../../lib/firebase/provider'; 

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const firestore = useFirestore(); 
  const auth = useAuth();
  
  const userId = auth?.user?.uid || 'demo-user'; // FIX: Changed currentUser to user

  const { bets: selectedBets } = useFirebaseBets(userId);
  const bankrollData = useBankroll();
  const activeBonuses = useActiveBonuses();

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
    const val = bonus.value || bonus.amount || 0;
    return acc + (typeof val === 'number' ? val : 0);
  }, 0);

  return (
    <div className="flex min-h-screen bg-slate-950">
      {/* Sidebar - Fixed position */}
      <aside className="w-64 fixed inset-y-0 left-0 z-50 bg-green-900 border-r border-green-800">
        <SidebarNav 
          bankroll={bankrollData?.available ?? 0} 
          bonusBalance={bonusBalance} 
          selectedBetsCount={selectedBets?.length || 0} 
        />
      </aside>
      
      {/* <NotificationCenter /> */}
      
      {/* Main content with left margin to account for fixed sidebar */}
      <main className="flex-1 ml-64 min-h-screen bg-slate-950">
        <div className="max-w-7xl w-full mx-auto p-4 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}