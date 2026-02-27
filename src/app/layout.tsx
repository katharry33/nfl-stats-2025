'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { FirebaseProvider } from '@/context/AuthContext';
import { BetSlipProvider } from '@/context/betslip-context';
import { WalletProvider } from '@/context/wallet-context';
import { AppLayout } from '@/components/layout/app-layout';
import { Toaster } from 'sonner';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body>
          <FirebaseProvider>
            <WalletProvider>
              <BetSlipProvider>
                <Toaster position="top-right" />

                {/* App Shell */}
                <AppLayout>
                  {children}
                </AppLayout>

              </BetSlipProvider>
            </WalletProvider>
          </FirebaseProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
