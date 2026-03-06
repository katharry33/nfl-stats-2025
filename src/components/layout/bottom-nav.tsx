'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Zap, LineChart, Trophy, Database } from 'lucide-react';

export function BottomNav({ selectedBetsCount }: { selectedBetsCount?: number }) {
  const pathname = usePathname();

  const ACTIONS = [
    { label: 'Home',     href: '/',             icon: Home },
    { label: 'Builder',  href: '/bet-builder',  icon: Zap,      badge: selectedBetsCount },
    { label: 'Insights', href: '/market-insights', icon: LineChart },
    { label: 'Performance', href: '/my-performance', icon: Trophy },
    { label: 'Log',      href: '/betting-log',   icon: Database },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-[#060606]/80 backdrop-blur-md border-t border-white/[0.06] px-2 pb-safe pt-2 z-50">
      <div className="flex items-center justify-around max-w-md mx-auto">
        {ACTIONS.map(({ label, href, icon: Icon, badge }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href));
          
          return (
            <Link 
              key={href} 
              href={href} 
              className="flex flex-col items-center gap-1 min-w-[64px] py-1 transition-all relative"
            >
              <div className={`
                p-2 rounded-xl transition-colors
                ${active ? 'bg-[#FFD700]/10 text-[#FFD700]' : 'text-zinc-500'}
              `}>
                <Icon className={`h-5 w-5 ${active ? 'animate-in fade-in zoom-in duration-300' : ''}`} />
                
                {/* Badge for Bet Builder */}
                {badge !== undefined && badge > 0 && (
                  <span className="absolute top-1 right-3 bg-[#FFD700] text-black text-[10px] font-black px-1 rounded-full min-w-[16px] border-2 border-[#060606]">
                    {badge}
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-bold tracking-tight ${active ? 'text-[#FFD700]' : 'text-zinc-600'}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}