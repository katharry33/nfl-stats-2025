'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

export function AppLayout({
  children,
  appName = "SweetSpot",
}: {
  children: React.ReactNode;
  appName?: string;
}) {
  const pathname = usePathname();

  const navItems = [
    { href: '/bet-builder', label: 'Bet Builder' },
    { href: '/parlay-studio', label: 'Parlay Studio' },
    { href: '/insights', label: 'Insights' },
    { href: '/upload-weekly-props', label: 'Upload Props' },
    { href: '/manage-bonuses', label: 'Bonuses' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#0B0B0D] text-white">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0F0F12]">
        <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between">
          <div className="text-2xl font-bold tracking-tight">
            {appName}
          </div>

          <nav className="flex gap-6 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "hover:text-white transition-colors",
                  pathname === item.href ? "text-white" : "text-gray-400"
                )}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl w-full px-6 py-8">
        {children}
      </main>
    </div>
  );
}
