'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

// Root page — redirects to the main dashboard view.
// Change '/bet-builder' to whatever your primary landing route should be.
export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/bet-builder');
  }, [router]);

  return (
    <main className="flex items-center justify-center min-h-screen bg-slate-950">
      <p className="text-slate-400 text-sm animate-pulse">Loading…</p>
    </main>
  );
}