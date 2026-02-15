'use client';

import React from 'react';
import { Loader2 } from 'lucide-react';

export default function Loading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-slate-100/50 backdrop-blur-sm z-[100]">
      <div className="flex items-center gap-3 text-slate-700">
        <Loader2 className="h-8 w-8 animate-spin text-emerald-500" />
        <span className="text-lg font-medium">Loading...</span>
      </div>
    </div>
  );
}
