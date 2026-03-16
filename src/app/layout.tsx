import type { Metadata } from "next";
import "./globals.css";
import { SidebarNav } from "@/components/nav/SidebarNav";
import { BetSlipProvider } from "@/context/betslip-context";
import { AuthProvider } from '@/lib/firebase/provider';
import AppShell from "@/components/layout/AppShell";

export const metadata: Metadata = {
  title: "SweetSpot",
  description: "Personalized betting insights.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-[#060606] text-slate-50 antialiased selection:bg-[#FFD700]/30">
        <AuthProvider>
          <BetSlipProvider>
            <AppShell>
              <SidebarNav />
              <main className="flex-1 lg:pl-64">
                {children}
              </main>
            </AppShell>
          </BetSlipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
