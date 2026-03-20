import BetBuilderClient from '@/features/bet-builder-client';

interface Props {
  searchParams: { date?: string, league?: 'nfl' | 'nba' };
}

export default function BetBuilderPage({ searchParams }: Props) {
  const league = searchParams?.league || 'nba'; // Default to NBA now
  const today = new Date().toISOString().split('T')[0];
  
  return (
    <div className="min-h-screen bg-background">
      <BetBuilderClient 
        initialDate={searchParams?.date || today} 
        league={league}
        season={2025} 
      />
    </div>
  );
}