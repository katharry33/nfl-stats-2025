'use client';

import { MobileNavProvider } from '@/context/MobileNavContext';
import { SidebarNav } from '@/components/nav/SidebarNav';
import { MobileBottomNav } from '@/components/nav/MobileBottomNav';
import { MobileDrawer } from '@/components/nav/MobileDrawer';
import { MobileBetSlipTrigger } from '@/components/nav/MobileBetSlipTrigger';
import { NavigationProgress } from '@/components/ui/NavigationProgress';
import { Header } from '@/components/layout/Header';
import { Toaster } from 'sonner';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileNavProvider>
      <NavigationProgress />

      {/* Main Container: Prevents body scroll, allows internal scroll */}
      <div className="flex h-screen overflow-hidden bg-[#07080a]">
        
        {/* Desktop Sidebar: Fixed width */}
        <aside className="hidden md:flex w-64 flex-shrink-0 border-r border-white/5 h-full">
          <SidebarNav />
        </aside>

        {/* Main Content: This is the only scrollable area */}
        <main className="flex-1 overflow-y-auto relative pb-40 md:pb-0 scroll-smooth">
          <Toaster position="top-right" richColors closeButton />
          
          {/* Sticky Header: z-40 ensures it stays above table content */}
          <Header />

          <div className="w-full max-w-[1600px] mx-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Mobile Nav Elements */}
      <MobileBetSlipTrigger /> 
      <MobileBottomNav />
      <MobileDrawer />
    </MobileNavProvider>
  );
}