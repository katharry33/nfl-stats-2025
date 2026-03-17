'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { FirebaseProvider } from '@/context/AuthContext';
import { BetSlipProvider } from '@/context/betslip-context';
import { WalletProvider } from '@/context/wallet-context';
import { MobileNavProvider } from '@/context/MobileNavContext';
import { SidebarNav } from '@/components/nav/SidebarNav';
import { MobileBottomNav } from '@/components/nav/MobileBottomNav';
import { MobileDrawer } from '@/components/nav/MobileDrawer';
import { NavigationProgress } from '@/components/ui/NavigationProgress';
import { Toaster } from 'sonner';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <FirebaseProvider>
        <WalletProvider>
          <BetSlipProvider>
            <MobileNavProvider>

              {/* Top-of-page progress bar on route changes */}
              <NavigationProgress />

              {/* Desktop sidebar — hidden on mobile via CSS */}
              <SidebarNav />

              {/* Main content
                  · Desktop : offset by sidebar width (ml-56)
                  · Mobile  : full-width + bottom padding for tab bar */}
              <main className="md:ml-56 min-h-screen pb-20 md:pb-0">
                <Toaster position="top-right" />
                {children}
              </main>

              {/* Mobile nav surfaces — md:hidden keeps them off desktop */}
              <MobileBottomNav />
              <MobileDrawer />

            </MobileNavProvider>
          </BetSlipProvider>
        </WalletProvider>
      </FirebaseProvider>
    </ClerkProvider>
  );
}