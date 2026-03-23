import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

// Context Providers
import { FirebaseProvider } from '@/lib/firebase/provider';
import { WalletProvider } from '@/context/WalletContext';
import { BetSlipProvider } from '@/context/betslip-context';
import QueryProvider from '@/components/providers/QueryProvider'; // New Provider

// Layout Components
import { AppLayout } from '@/components/layout/app-layout';
import { BetSlipPanel } from '@/components/bets/BetSlipPanel';
import { Toaster } from 'sonner';

// 1. Define Fonts for the UI
const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
  title: "Prop Archive & Bet Slip",
  description: "Historical NFL & NBA Prop Data with Integrated Betting Log",
};

// 2. Prevent mobile devices from zooming in when clicking inputs/selects
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#000000",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${mono.variable}`}>
      <body className="antialiased selection:bg-[#FFD700]/30 bg-black text-white min-h-screen font-sans">
        
        {/* Auth & Database Layer */}
        <FirebaseProvider>
          
          {/* TanStack Query Layer - Handles API Caching & Infinite Scroll State */}
          <QueryProvider>

            {/* Financial/User Context Layer */}
            <WalletProvider>
              
              {/* Betting Logic Layer */}
              <BetSlipProvider>
                
                {/* Main UI Wrapper (Sidebars, Navigation) */}
                <AppLayout>
                  <main className="relative flex-1">
                    {children}
                  </main>
                </AppLayout>

                {/* Floating Bet Slip (Hidden when empty) */}
                <BetSlipPanel />

                {/* Global Notifications for Edit/Delete/Add actions */}
                <Toaster 
                  position="top-right" 
                  richColors 
                  closeButton 
                  theme="dark" 
                  toastOptions={{
                    style: { background: '#0f172a', border: '1px solid #1e293b' }
                  }}
                />

              </BetSlipProvider>
            </WalletProvider>
          </QueryProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}