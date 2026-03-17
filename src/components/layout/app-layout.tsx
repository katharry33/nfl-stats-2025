'use client';

import { MobileNavProvider } from '@/context/MobileNavContext';
import { SidebarNav } from '@/components/nav/SidebarNav';
import { MobileBottomNav } from '@/components/nav/MobileBottomNav';
import { MobileDrawer } from '@/components/nav/MobileDrawer';
import { MobileBetSlipTrigger } from '@/components/nav/MobileBetSlipTrigger'; // 1. Import the trigger
import { NavigationProgress } from '@/components/ui/NavigationProgress';
import { Toaster } from 'sonner';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileNavProvider>
      <NavigationProgress />

      {/* Desktop Navigation */}
      <SidebarNav />

      {/* Main Content Logic:
        - md:ml-56: Desktop sidebar offset
        - pb-40: Mobile bottom safety (BottomNav + Floating Bet Slip + Padding)
        - md:pb-0: Reset padding for desktop
      */}
      <main className="md:ml-56 min-h-screen pb-40 md:pb-0 relative">
        <Toaster position="top-right" richColors closeButton />
        {children}
      </main>

      {/* Mobile Layers:
        Note: The Trigger is placed here so it can sit 
        visually above the BottomNav in the stacking context.
      */}
      <MobileBetSlipTrigger /> 
      <MobileBottomNav />
      <MobileDrawer />

    </MobileNavProvider>
  );
}