// src/app/layout.tsx
'use client';

import { FirebaseProvider } from '@/context/AuthContext';
import { BetslipProvider } from '@/context/betslip-context';
import { AppLayout } from '@/components/layout/app-layout';
import { Toaster } from 'sonner';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <FirebaseProvider>
          <BetslipProvider>
            <Toaster position="top-right" />
            <AppLayout>{children}</AppLayout>
          </BetslipProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}
