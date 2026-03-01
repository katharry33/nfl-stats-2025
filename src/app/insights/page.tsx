"use client";

import React, { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";

const RecentInsights = () => (
  <div className="p-6 bg-[#0f1115] border border-white/[0.06] rounded-3xl text-zinc-400 text-sm italic">
    Upcoming Prop Insights...
  </div>
);

export default function BetIntelPage() {
  return (
    <div className="min-h-screen bg-[#060606] p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        <PageHeader
          title="Market Insights"
          description="Analyze your betting performance and AI-driven trends."
        />
        <Suspense
          fallback={
            <div className="h-40 animate-pulse bg-[#0f1115] border border-white/[0.06] rounded-3xl" />
          }
        >
          <RecentInsights />
        </Suspense>
      </div>
    </div>
  );
}