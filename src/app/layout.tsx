// src/app/layout.tsx
import { AuthProvider } from '@/lib/firebase/provider';
import { AppLayout } from '@/components/layout/app-layout';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* 1. AuthProvider MUST be first */}
        <AuthProvider> 
          {/* 2. Then AppLayout provides the UI frame */}
          <AppLayout>
            {children}
          </AppLayout>
        </AuthProvider>
      </body>
    </html>
  );
}