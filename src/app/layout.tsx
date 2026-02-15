import { FirebaseProvider } from '@/context/AuthContext';
import { ClientProvider } from '@/lib/client-provider';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* FirebaseProvider MUST be the outermost wrapper */}
        <FirebaseProvider>
          <ClientProvider>
            {children}
          </ClientProvider>
        </FirebaseProvider>
      </body>
    </html>
  );
}