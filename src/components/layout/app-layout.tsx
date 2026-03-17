'use client';

// ⚠️  This file is the LAYOUT SHELL ONLY.
// Auth, BetSlip, and Wallet providers must live in app/layout.tsx — NOT here.
// Adding them here causes duplicate context trees and broken hook reads.

import { MobileNavProvider } from '@/context/MobileNavContext';
import { SidebarNav } from '@/components/nav/SidebarNav';
import { MobileBottomNav } from '@/components/nav/MobileBottomNav';
import { MobileDrawer } from '@/components/nav/MobileDrawer';
import { NavigationProgress } from '@/components/ui/NavigationProgress';
import { Toaster } from 'sonner';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileNavProvider>

      {/* Teal progress bar on every client-side route change */}
      <NavigationProgress />

      {/* Desktop: fixed left sidebar (hidden on mobile) */}
      <SidebarNav />

      {/* Page content
          · md:ml-56 offsets right of the sidebar on desktop
          · pb-20    clears the fixed bottom tab bar on mobile
          · min-h-screen ensures short pages still fill the viewport    */}
      <main className="md:ml-56 min-h-screen pb-20 md:pb-0">
        <Toaster position="top-right" richColors />
        {children}
      </main>

      {/* Mobile-only — md:hidden removes from desktop layout entirely */}
      <MobileBottomNav />
      <MobileDrawer />

    </MobileNavProvider>
  );
}