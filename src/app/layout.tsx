// src/app/layout.tsx
import "./globals.css";
import { AuthProvider } from '@/lib/firebase/provider';
import { WalletProvider } from '@/context/WalletContext'; // Import your WalletProvider
import { AppLayout } from '@/components/layout/app-layout';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>
        <AuthProvider> 
          {/* 1. WalletProvider usually sits inside Auth because 
                 wallet data often depends on the logged-in user ID */}
          <WalletProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </WalletProvider>
        </AuthProvider>
      </body>
    </html>
  );
}