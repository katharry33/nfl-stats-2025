'use client';

import BettingLogLoader from '@/components/bets/betting-log-loader';
import React from 'react';

export default function BettingLogPage() {
  return (
    <div className="p-6">
      <h1 className="text-3xl font-black text-white tracking-tighter italic">Betting Log</h1>
      <p className="text-slate-500 text-sm mb-6">A detailed history of all your past and present bets.</p>
      <BettingLogLoader />
    </div>
  );
}
