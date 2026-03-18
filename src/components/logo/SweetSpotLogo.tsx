// @/components/logo/SweetSpotLogo.tsx
import React from 'react';
import { Target } from 'lucide-react'; // Add this line
export function SweetSpotLogo() {
  return (
    <div className="flex items-center gap-2 group select-none">
      <div className="bg-cyan-500/20 p-1.5 rounded-lg border border-cyan-500/30">
        <Target className="h-5 w-5 text-cyan-400" />
      </div>
      <span className="text-2xl font-black italic uppercase tracking-tighter leading-none">
        <span className="text-white">SWEET</span>
        <span className="text-cyan-400">SPOT</span>
      </span>
    </div>
  );
}