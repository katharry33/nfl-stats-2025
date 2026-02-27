'use client';

import { ClerkProvider } from '@clerk/nextjs';
import { FirebaseProvider } from '@/context/AuthContext';
import { BetSlipProvider } from '@/context/betslip-context';
import { WalletProvider } from '@/context/wallet-context';
import { Toaster } from 'sonner';

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider>
      <FirebaseProvider>
        <WalletProvider>
          <BetSlipProvider>
            <Toaster position="top-right" />
            {children}
          </BetSlipProvider>
        </WalletProvider>
      </FirebaseProvider>
    </ClerkProvider>
  );
}
