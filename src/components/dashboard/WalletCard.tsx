import React from 'react';
import { Wallet } from 'lucide-react'; // Add this line

export function WalletCard({ balance }: { balance: number }) {
  return (
    <div className="bg-gradient-to-br from-[#1a1d23] to-[#0d1117] border border-white/10 rounded-3xl p-6 min-w-[280px] shadow-2xl relative overflow-hidden group">
      {/* Decorative background glow */}
      <div className="absolute -right-4 -top-4 w-24 h-24 bg-cyan-500/10 blur-3xl group-hover:bg-cyan-500/20 transition-all" />
      
      <div className="flex justify-between items-start mb-4">
        <div className="p-2 bg-white/5 rounded-xl border border-white/5">
          <Wallet className="h-5 w-5 text-zinc-400" />
        </div>
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Prop Wallet</p>
      </div>

      <div className="space-y-1">
        <p className="text-3xl font-black italic tracking-tighter">
          ${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}
        </p>
        <div className="flex items-center gap-2">
           <div className={`h-1.5 w-1.5 rounded-full ${balance >= 0 ? 'bg-emerald-500' : 'bg-red-500'}`} />
           <p className="text-[10px] font-bold uppercase text-zinc-500 tracking-wider">
             {balance >= 0 ? 'Surplus Account' : 'Deficit Recovery'}
           </p>
        </div>
      </div>
    </div>
  );
}