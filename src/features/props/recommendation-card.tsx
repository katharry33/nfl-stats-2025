"use client";

import { useBankroll } from '../../hooks/use-bankroll';
import { calculateRecommendation } from '../../lib/bankroll-math';
import { Flame } from 'lucide-react';

// Define the shape of the props to fix TypeScript "Implicit Any" errors
interface RecommendationCardProps {
  propHitRate: number;
  currentOdds: number;
  activeBonus?: {
    name: string;
    value: number;
  } | null;
}

export const RecommendationCard = ({ 
  propHitRate, 
  currentOdds, 
  activeBonus 
}: RecommendationCardProps) => {
  const { available } = useBankroll();
  
  const { suggestedWager, expectedValue } = calculateRecommendation(
    propHitRate, 
    currentOdds, 
    available, 
    activeBonus?.value || 0
  );

  const isHighEV = expectedValue > 5; // Over 5% EV is a "Great" bet

  return (
    <div className={`p-6 rounded-3xl border-2 transition-all ${
      isHighEV ? 'border-emerald-500 bg-emerald-50/30' : 'border-slate-100 bg-white'
    }`}>
      <div className="flex justify-between items-start mb-4">
        <div>
          <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Smart Stake</h4>
          <p className="text-3xl font-black text-slate-900">${suggestedWager}</p>
        </div>
        {isHighEV && (
          <span className="flex items-center gap-1 bg-emerald-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse">
            <Flame size={14} /> HIGH EV
          </span>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-slate-500 font-medium">ExpectedValue (Edge)</span>
          <span className="text-emerald-600 font-bold">+{expectedValue.toFixed(2)}%</span>
        </div>
        
        {activeBonus && (
          <div className="flex justify-between text-sm bg-blue-100/50 p-2 rounded-lg border border-blue-200">
            <span className="text-blue-700 font-medium">Applied: {activeBonus.name}</span>
            <span className="text-blue-700 font-bold">+{activeBonus.value}%</span>
          </div>
        )}
      </div>

      <button className="w-full mt-6 bg-slate-900 text-white py-4 rounded-2xl font-bold hover:bg-slate-800 transition-transform active:scale-95">
        Add to Parlay Studio
      </button>
    </div>
  );
};