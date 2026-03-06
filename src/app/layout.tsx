import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs"; // Added ClerkProvider
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { BottomNav } from "@/components/layout/bottom-nav";
import { BetSlipProvider } from "@/context/betslip-context";
import { AuthProvider } from '@/lib/firebase/provider';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#060606',
};

export const metadata: Metadata = {
  title: "SweetSpot",
  description: "Personalized betting insights.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "SweetSpot",
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // ClerkProvider must wrap everything to fix the Middleware handshake error
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className="bg-[#060606] text-slate-50 antialiased overflow-x-hidden">
          <AuthProvider>
            <BetSlipProvider>
              <div className="flex min-h-screen flex-col lg:flex-row">
                {/* Desktop Sidebar - Hidden on Mobile */}
                <aside className="hidden lg:block">
                  <SidebarNav />
                </aside>

                <main className="flex-1 pb-20 lg:pb-0 lg:pl-64">
                  {children}
                </main>

                {/* Mobile Bottom Navigation - Hidden on Desktop */}
                <nav className="fixed bottom-0 left-0 right-0 z-50 lg:hidden">
                  <BottomNav />
                </nav>
              </div>
            </BetSlipProvider>
          </AuthProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}