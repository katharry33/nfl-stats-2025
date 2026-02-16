// src/app/layout.tsx
import { FirebaseProvider } from '@/lib/firebase/provider';
import { BetslipProvider } from '@/context/betslip-context';
import { SidebarNav } from '@/components/layout/sidebar-nav'; // Corrected path
import { Toaster } from 'sonner';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark"> {/* Added dark class for your theme */}
      <body className="flex h-screen overflow-hidden">
        <FirebaseProvider>
          <BetslipProvider>
            <Toaster position="top-right" />
            
            {/* 1. Sidebar stays fixed on the left */}
            <aside className="w-64 hidden md:flex flex-col flex-shrink-0">
              <SidebarNav bankroll={1000} bonusBalance={250} selectedBetsCount={0} />
            </aside>

            {/* 2. Main content area scrolls independently */}
            <main className="flex-1 relative overflow-y-auto bg-background">
              {children}
            </main>

          </BetslipProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}