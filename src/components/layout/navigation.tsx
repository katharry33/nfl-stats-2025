// components/layout/Navigation.tsx
import { usePathname, useRouter } from 'next/navigation';
import { 
  Target, 
  Zap, 
  Database, 
  TrendingUp, 
  FileText, 
  Wallet, 
  DollarSign, 
  CalendarDays, 
  LucideIcon,
  BookOpen,
  LayoutGrid,
  Combine,
  Shield,
  BarChart,
  History
} from 'lucide-react';

interface NavigationProps {
  bankroll?: number;
  bonusBalance?: number;
  selectedBetsCount?: number;
}

interface NavItemProps {
  icon: LucideIcon;
  label: string;
  page: string;
  badge?: number;
}

const Navigation: React.FC<NavigationProps> = ({ 
  bankroll = 5000, 
  bonusBalance = 250, 
  selectedBetsCount = 0 
}) => {
  const router = useRouter();
  const pathname = usePathname();
  const currentPage = pathname.split('/')[1] || 'fixtures';

  const navigateTo = (page: string) => {
    router.push(`/${page}`);
  };

  const NavItem: React.FC<NavItemProps> = ({ icon: Icon, label, page, badge }) => {
    const isActive = currentPage === page;
    
    return (
      <button
        onClick={() => navigateTo(page)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${
          isActive 
            ? 'bg-gradient-to-r from-emerald-500/20 to-blue-500/20 text-white border border-emerald-500/30' 
            : 'text-gray-400 hover:text-white hover:bg-white/5'
        }`}
      >
        <Icon className="w-4 h-4" />
        <span className="text-sm font-medium flex-1 text-left">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="bg-emerald-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
            {badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <nav className="fixed top-0 left-0 h-screen w-64 bg-[#0a0a0a] border-r border-[#1a1a1a] flex flex-col z-50">
      {/* Logo */}
      <div className="p-6 border-b border-[#1a1a1a]">
        <div className="flex items-center gap-2 mb-2">
          <Target className="w-8 h-8 text-emerald-400" />
          <h1 className="text-xl font-bold text-white tracking-tight">EdgeQuant</h1>
        </div>
        <p className="text-xs text-gray-500 font-medium">Predictive Betting Intelligence</p>
      </div>
      
      {/* Navigation Items */}
      <div className="flex-1 p-4 space-y-1 overflow-y-auto">
        <NavItem icon={LayoutGrid} label="Fixtures" page="fixtures" />
        <NavItem icon={Zap} label="Bet Builder" page="bet-builder" badge={selectedBetsCount} />
        <NavItem icon={Combine} label="Parlay Studio" page="parlay-studio" />
        <NavItem icon={Database} label="Bet Intel" page="bet-intel" />
        <NavItem icon={History} label="Betting Log" page="betting-log" />
        <NavItem icon={BarChart} label="Performance" page="performance" />
        <NavItem icon={TrendingUp} label="Insights" page="insights" />
        <NavItem icon={Shield} label="Bonuses" page="bonuses" />
        <NavItem icon={Wallet} label="Wallet" page="wallet" />
        <NavItem icon={CalendarDays} label="Schedule" page="schedule" />
        <NavItem icon={FileText} label="All Props" page="all-props" />
        <NavItem icon={BookOpen} label="API Docs" page="api-docs" />
      </div>


      {/* Bankroll Display */}
      <div className="p-4 border-t border-[#1a1a1a]">
        <div className="bg-gradient-to-br from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-lg p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400 font-medium">Bankroll</span>
            <DollarSign className="w-3 h-3 text-emerald-400" />
          </div>
          <p className="text-lg font-bold text-white">${bankroll.toLocaleString()}</p>
          <p className="text-xs text-emerald-400 mt-1">+${bonusBalance} bonus</p>
        </div>
      </div>
    </nav>
  );
};

export default Navigation;
