// src/app/bet-builder/page.tsx
import BetBuilderClient from '@/features/bet-builder-client'; // Adjust this path if your file is named differently

export default function BetBuilderPage({ searchParams }: { searchParams: { date?: string } }) {
  // Use the CA locale to get YYYY-MM-DD reliably
  const today = new Date().toLocaleDateString('en-CA');
  const activeDate = searchParams.date || today;

  return (
    <BetBuilderClient 
      initialDate={activeDate} 
      league="nba" 
      season={2025} 
    />
  );
}