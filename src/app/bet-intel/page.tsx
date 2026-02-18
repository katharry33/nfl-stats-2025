"use client";

import React, { Suspense } from "react";
import { AppLayout } from "@/components/layout/app-layout";
import { PageHeader } from "@/components/layout/page-header";
// We use a default div for now if recent-insights isn't ready
const RecentInsights = () => <div className="p-4 bg-slate-50 rounded-xl">Upcoming Prop Insights...</div>;

export default function BetIntelPage() {
  return (
    <AppLayout>
      <div className="space-y-8 p-6">
        <PageHeader 
          title="Betting Insights" 
          description="Analyze your betting performance and AI-driven trends."
        />
        <Suspense fallback={<div className="h-40 animate-pulse bg-slate-100 rounded-2xl" />}>
          <RecentInsights />
        </Suspense>
      </div>
    </AppLayout>
  );
}