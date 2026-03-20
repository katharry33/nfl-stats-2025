// src/app/layout.tsx
import "./globals.css";
import { AuthProvider }    from '@/lib/firebase/provider';
import { WalletProvider }  from '@/context/WalletContext';
import { BetSlipProvider } from '@/context/betslip-context';  // ← was missing
import { AppLayout }       from '@/components/layout/app-layout';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // ↓ removed className="dark" — that was forcing dark mode regardless of globals.css
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthProvider>
          {/* WalletProvider: needs auth (user.uid) */}
          <WalletProvider>
            {/* BetSlipProvider: needs wallet (bankroll for Kelly calc) */}
            <BetSlipProvider>
              {/* AppLayout: needs betslip (nav badges, sidebar slip) */}
              <AppLayout>
                {children}
              </AppLayout>
            </BetSlipProvider>
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  );
}