import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/firebase/provider";
import { BetSlipProvider } from "@/context/betslip-context";
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

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-background text-foreground antialiased selection:bg-primary/30">
        <AuthProvider>
          <BetSlipProvider>
            <AppLayout>{children}</AppLayout>
          </BetSlipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
