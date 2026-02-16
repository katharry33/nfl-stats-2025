// src/app/layout.tsx - Update imports
import { FirebaseProvider } from '@/lib/firebase/provider';
import { BetslipProvider } from '@/context/betslip-context'; // Note: lowercase 's'
import { Toaster } from 'sonner';
import './globals.css';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FirebaseProvider>
          <BetslipProvider>
            <Toaster position="top-right" />
            {children}
          </BetslipProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}
