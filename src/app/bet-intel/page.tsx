"use client";

import React, { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
// We use a default div for now if recent-insights isn't ready
const RecentInsights = () => <div className="p-4 bg-slate-50 rounded-xl">Upcoming Prop Insights...</div>;

export default function BetIntelPage() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="space-y-8">
        <PageHeader 
          title="Betting Insights" 
          description="Analyze your betting performance and AI-driven trends."
        />
        <Suspense fallback={<div className="h-40 animate-pulse bg-slate-100 rounded-2xl" />}>
          <RecentInsights />
        </Suspense>
      </div>
    </div>
  );
}