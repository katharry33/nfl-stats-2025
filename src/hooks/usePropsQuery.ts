import useSWR from 'swr';
import { PropDoc } from '@/lib/types';

export interface UsePropsQueryArgs {
  league: 'nba' | 'nfl';
  season: number;
  date?: string;
  week?: number | null;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function usePropsQuery({ league, season, date, week }: UsePropsQueryArgs) {
  const params = new URLSearchParams({
    league,
    season: String(season)
  });

  if (league === 'nba' && date) params.set('date', date);
  if (league === 'nfl' && week) params.set('week', String(week));

  const { data, error } = useSWR<{ props: PropDoc[] }>(
    `/api/props?${params.toString()}`,
    fetcher
  );

  return {
    data: data?.props ?? [],
    loading: !data && !error,
    error
  };
}
