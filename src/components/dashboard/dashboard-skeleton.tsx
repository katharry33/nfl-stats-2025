'use client';
import React from 'react';

export function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-[#0D1117] p-6 space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex justify-between items-end border-b border-white/5 pb-10">
        <div className="space-y-3">
          <div className="h-10 w-64 bg-white/5 rounded-lg" />
          <div className="h-3 w-40 bg-white/5 rounded-md" />
        </div>
        <div className="h-16 w-48 bg-[#161B22] rounded-2xl border border-white/5" />
      </div>

      {/* Hero Stats Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 h-48 bg-[#161B22] rounded-[2rem] border border-white/5" />
        <div className="h-48 bg-[#161B22] rounded-[2rem] border border-white/5" />
      </div>

      {/* Nav Cards Skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 bg-[#161B22] rounded-[2rem] border border-white/5" />
        ))}
      </div>

      {/* Lower Section Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-[300px] bg-[#161B22] rounded-[2rem] border border-white/5" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-white/5 rounded-2xl border border-white/5" />
          ))}
        </div>
      </div>
    </div>
  );
}