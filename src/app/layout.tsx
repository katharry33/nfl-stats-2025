import "./globals.css";
// 1. Ensure the import matches your export name (FirebaseProvider)
import { FirebaseProvider } from '@/lib/firebase/provider';
import { WalletProvider }   from '@/context/WalletContext';
import { BetSlipProvider }  from '@/context/betslip-context';
import { AppLayout }        from '@/components/layout/app-layout';
import { BetSlipPanel }     from '@/components/bets/BetSlipPanel';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased selection:bg-[#FFD700]/30 bg-black text-white">
        {/* 2. Using FirebaseProvider to handle Auth + Firestore initialization */}
        <FirebaseProvider>
          <WalletProvider>
            <BetSlipProvider>
              
              <AppLayout>
                {children}
              </AppLayout>

              {/* 3. IMPORTANT: BetSlipPanel should NOT take props here. 
                It should use 'useBetSlip()' internally. 
                If it still requires props, we need to refactor that component.
              */}
              <BetSlipPanel />

            </BetSlipProvider>
          </WalletProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}