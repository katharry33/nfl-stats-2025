"use client";

import React from 'react';
import { Clock, ExternalLink, Ticket, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils'; // Ensure this is fixed in your src/lib/utils.ts

interface Bonus {
  id: string;
  name: string;
  sportsbook: string;
  value: number; // e.g. 30 for 30%
  type: 'profit_boost' | 'risk_free' | 'bonus_bet' | 'any';
  expiration: string;
  minOdds?: string;
}

export const BonusCard = ({ bonus }: { bonus: Bonus }) => {
  // Logic to calculate if expiration is within 24 hours
  const expiryDate = new Date(bonus.expiration);
  const hoursLeft = Math.floor((expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60));
  const isExpiringSoon = hoursLeft > 0 && hoursLeft < 24;

  return (
    <div className="group relative bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow-md hover:border-blue-300 transition-all">
      {/* Top Row: Sportsbook & Boost Tag */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
            <Ticket className="text-slate-400" size={16} />
          </div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">
            {bonus.sportsbook}
          </span>
        </div>
        
        <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-full flex items-center gap-1">
          <TrendingUp size={14} className="font-bold" />
          <span className="text-sm font-black">{bonus.value}%</span>
        </div>
      </div>

      {/* Title & Type */}
      <div className="mb-6">
        <h3 className="text-lg font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">
          {bonus.name}
        </h3>
        <p className="text-xs text-slate-500 mt-1 capitalize">
          {bonus.type.replace('_', ' ')} {bonus.minOdds ? `• Min ${bonus.minOdds}+` : ''}
        </p>
      </div>

      {/* Bottom Row: Expiration & Action */}
      <div className="flex justify-between items-center pt-4 border-t border-slate-50">
        <div className={cn(
          "flex items-center gap-1.5 text-xs font-medium",
          isExpiringSoon ? "text-rose-500 animate-pulse" : "text-slate-400"
        )}>
          <Clock size={14} />
          <span>
            {isExpiringSoon ? `Expires in ${hoursLeft}h` : expiryDate.toLocaleDateString()}
          </span>
        </div>

        <button className="text-slate-400 hover:text-blue-600 transition-colors">
          <ExternalLink size={18} />
        </button>
      </div>

      {/* High-confidence indicator for Bet Builder sync */}
      {bonus.value >= 50 && (
        <div className="absolute -top-2 -right-2 bg-orange-500 text-white text-[10px] font-black px-2 py-0.5 rounded shadow-lg rotate-12">
          HOT
        </div>
      )}
    </div>
  );
};