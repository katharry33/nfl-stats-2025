'use client';

import { MobileNavProvider } from '@/context/MobileNavContext';
import { SidebarNav } from '@/components/nav/SidebarNav';
import { MobileBottomNav } from '@/components/nav/MobileBottomNav';
import { MobileDrawer } from '@/components/nav/MobileDrawer';
import { MobileBetSlipTrigger } from '@/components/nav/MobileBetSlipTrigger';
import { Header } from '@/components/layout/Header';
import { Toaster } from 'sonner';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <MobileNavProvider>
      {/* Main Flex Container: Forces height to exactly 100% of the viewport */}
      <div className="flex h-screen w-full overflow-hidden bg-background">
        
        {/* Fixed Desktop Sidebar */}
        <aside className="hidden md:flex w-64 'shrink-0' border-r border-white/5 h-full bg-card/50">
          <SidebarNav />
        </aside>

        {/* Scrollable Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 h-full relative overflow-hidden">
          <Toaster position="top-right" richColors closeButton />
          
          <Header />

          {/* This div handles the actual scrolling of your pages */}
          <div className="flex-1 overflow-y-auto custom-scrollbar bg-grid pb-32 md:pb-8">
            <div className="w-full max-w-[1400px] mx-auto p-4 md:p-10">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Overlays */}
      <MobileBetSlipTrigger /> 
      <MobileBottomNav />
      <MobileDrawer />
    </MobileNavProvider>
  );
}