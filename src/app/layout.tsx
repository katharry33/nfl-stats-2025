import type { Metadata } from "next";
import "./globals.css";
import { SidebarNav } from "@/components/layout/sidebar-nav";
import { BetSlipProvider } from "@/context/betslip-context";
import { AuthProvider } from '@/lib/firebase/provider'; // Import AuthProvider

export const metadata: Metadata = {
  title: "SweetSpot",
  description: "Personalized betting insights.",
  icons: {
    icon: "/logo.png", // This points to your public/logo.png
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#060606] text-slate-50 antialiased">
        <AuthProvider> {/* Wrap with AuthProvider */}
          <BetSlipProvider>
            <div className="flex min-h-screen">
              {/* Ensure SidebarNav is inside the flex container */}
              <SidebarNav />
              <main className="flex-1 lg:pl-64">
                {children}
              </main>
            </div>
          </BetSlipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
