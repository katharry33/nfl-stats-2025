"use client";

import React, { Suspense } from "react";
import { ScrollablePage } from "@/components/layout/scrollable-page";
import { PageHeader } from "@/components/layout/page-header";
// We use a default div for now if recent-insights isn't ready
const RecentInsights = () => <div className="p-4 bg-slate-50 rounded-xl">Upcoming Prop Insights...</div>;

export default function BetIntelPage() {
  return (
    <ScrollablePage
      header={
        <PageHeader 
          title="Betting Insights" 
          description="Analyze your betting performance and AI-driven trends."
        />
      }
    >
      <div className="space-y-8 p-6">
        <Suspense fallback={<div className="h-40 animate-pulse bg-slate-100 rounded-2xl" />}>
          <RecentInsights />
        </Suspense>
      </div>
    </ScrollablePage>
  );
}