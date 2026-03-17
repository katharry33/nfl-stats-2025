import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/firebase/provider";
import { BetSlipProvider } from "@/context/betslip-context";
import { WalletProvider } from "@/context/wallet-context";
import { AppLayout } from "@/components/layout/app-layout";

export const metadata: Metadata = {
  title: "SweetSpot",
  description: "Personalized betting insights.",
  icons: {
    icon: "/logo.png",
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
};

// Provider order matters:
//   AuthProvider  (Firebase auth — outermost)
//     WalletProvider  (needs auth)
//       BetSlipProvider  (needs auth, used by nav badges)
//         AppLayout  (consumes all of the above via hooks)

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // NOTE: removed className="dark" — app now uses light theme by default.
    // Add it back (or toggle it dynamically) only if you add a dark mode switch.
    <html lang="en" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased selection:bg-primary/20">
        <AuthProvider>
          <WalletProvider>
            <BetSlipProvider>
              <AppLayout>{children}</AppLayout>
            </BetSlipProvider>
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  );
}