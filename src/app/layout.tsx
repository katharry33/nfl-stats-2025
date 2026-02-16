// src/app/layout.tsx
'use client'; // This file now uses client-side context, so it must be a client component.

import { FirebaseProvider } from '@/lib/firebase/provider';
import { BetSlipProvider, useBetSlip } from '@/context/betslip-context';
import { SidebarNav } from '@/components/layout/sidebar-nav';
import { BetSlip } from '@/components/bets/betslip'; // Import the main BetSlip component
import { Toaster } from 'sonner';
import './globals.css';

// A new inner component to access the bet slip count
function AppLayout({ children }: { children: React.ReactNode }) {
  // FIX: Alias 'selections' to 'slip' for local component consistency.
  const { selections: slip } = useBetSlip();

  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-64 hidden md:flex flex-col flex-shrink-0">
        {/* The sidebar now shows the live count of bets in the slip */}
        <SidebarNav bankroll={1000} bonusBalance={250} selectedBetsCount={slip.length} />
      </aside>

      <main className="flex-1 relative overflow-y-auto bg-background">
        {children}
      </main>

      {/* The BetSlip component is always rendered but manages its own visibility */}
      <BetSlip />
    </div>
  );
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <FirebaseProvider>
          {/* BetSlipProvider wraps the entire layout */}
          <BetSlipProvider>
            <Toaster position="top-right" />
            <AppLayout>{children}</AppLayout>
          </BetSlipProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}
