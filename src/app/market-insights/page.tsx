"use client";

import React, { useState, useEffect } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { MarketInsightsList } from "@/components/bets/MarketInsightsList";
import { TrendingUp, BarChart3, Zap, Search } from "lucide-react";

// 1. Define the shape of your data
interface Insight {
  player: string;
  prop: string;
  hitRate: number;
  won: number;
  total: number;
  avgLine: number;
  recentHitRate?: number; // Optional fields for the new logic
  edge?: number;
}

export default function MarketInsightsPage() {
  // 2. Tell useState to expect an array of Insights
  const [insights, setInsights] = useState<Insight[]>([]); 
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    async function getInsights() {
      try {
        const res = await fetch('/api/insights');
        const data = await res.json();
        setInsights(data.insights || []);
      } catch (err) {
        console.error("Failed to load insights", err);
      } finally {
        setLoading(false);
      }
    }
    getInsights();
  }, []);

  // Filter insights based on search (player name)
  const filteredInsights = insights.filter((i: Insight) => 
    i.player.toLowerCase().includes(search.toLowerCase())
  );

  const topInsight: Insight | undefined = insights[0];

  return (
    <div className="min-h-screen bg-[#060606] p-4 md:p-8">
      <div className="max-w-[1400px] mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <PageHeader
            title="Market Insights"
            description="Historical hit rates and algorithmic patterns across all tracked props."
          />
          
          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-600" />
            <input 
              type="text"
              placeholder="Search player trends..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#0f1115] border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white outline-none focus:border-[#FFD700]/40 transition-all"
            />
          </div>
        </div>

        {/* Top Analytics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <InsightCard 
            label="Top Pattern" 
            value={topInsight ? `${topInsight.player} ${topInsight.prop}` : "---"} 
            sub={topInsight ? `${topInsight.hitRate.toFixed(0)}% Hit Rate` : "Analyzing data..."}
            icon={<TrendingUp className="text-[#FFD700]" />}
          />
          <InsightCard 
            label="Patterns Tracked" 
            value={insights.length} 
            sub="Unique player-prop combinations"
            icon={<BarChart3 className="text-blue-400" />}
          />
          <InsightCard 
            label="Data Status" 
            value="Synchronized" 
            sub="Aggregated from allProps_2025"
            icon={<Zap className="text-emerald-400" />}
          />
        </div>

        {/* Main Content Area */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <div className="h-1.5 w-1.5 rounded-full bg-[#FFD700] animate-pulse" />
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">
              Consistency Leaders (Min. 3 Game Sample)
            </h2>
          </div>
          
          <MarketInsightsList 
            data={filteredInsights} 
            isLoading={loading} 
          />
        </div>
      </div>
    </div>
  );
}

function InsightCard({ label, value, sub, icon }: any) {
  return (
    <div className="p-6 bg-[#0f1115] border border-white/[0.06] rounded-2xl flex items-start gap-4">
      <div className="p-3 bg-white/5 rounded-xl border border-white/5">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-[9px] text-zinc-600 font-black uppercase tracking-widest mb-1">{label}</p>
        <p className="text-lg font-black italic text-white uppercase truncate">{value}</p>
        <p className="text-[10px] text-zinc-500 font-medium mt-0.5">{sub}</p>
      </div>
    </div>
  );
}
