'use client';

import React from 'react';
import { usePerformance } from '@/hooks/use-performance';
import { DollarSign, TrendingUp, Target, Activity } from 'lucide-react';
import { KpiCard } from '@/components/ui/kpi-card'; 
import { PerformanceLoader } from '@/components/ui/loaders'; 

// Inside PerformancePage.tsx
export default function PerformancePage() {
  const { stats, loading } = usePerformance(); // Everything comes from the hook now

  if (loading) return <PerformanceLoader />;

  return (
    <div className="min-h-screen bg-[#060606] text-white p-4 md:p-8">
       {/* Use stats.totalProfit, stats.winRate, etc. */}
       <KpiCard 
          title="Net Profit" 
          value={`$${stats.totalProfit.toFixed(2)}`} 
          color={stats.totalProfit >= 0 ? 'text-emerald-400' : 'text-red-400'} 
          icon={DollarSign} 
       />
       {/* ... the rest of your UI ... */}
    </div>
  );
}