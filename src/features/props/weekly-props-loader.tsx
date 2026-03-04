'use client';

import { useEffect, useState } from 'react';
import { WeeklyProps } from '@/components/bets/weekly-props';
import type { WeeklyProp } from '@/lib/types';

export function WeeklyPropsLoader() {
  const [props, setProps] = useState<WeeklyProp[]>([]);
  const [loading, setLoading] = useState(true);

  // Default filters - these can be connected to UI elements
  const [filters, setFilters] = useState({ propType: '', team: '' });
  const [season, setSeason] = useState(new Date().getFullYear());
  const [week, setWeek] = useState(1);

  useEffect(() => {
    const fetchProps = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams({
          week: week.toString(),
          season: season.toString(),
          ...(filters.propType && { prop: filters.propType }),
          ...(filters.team && { team: filters.team })
        });
        
        const res = await fetch(`/api/props?${params.toString()}`);
        const data = await res.json();
        setProps(data.props || []); // API returns { props: [...] }
      } catch (error) {
        console.error('Failed to load props:', error);
        setProps([]); // Set to empty array on error
      } finally {
        setLoading(false);
      }
    };
    
    fetchProps();
  }, [week, season, filters]); // Re-fetch when filters change

  return <WeeklyProps props={props} loading={loading} />;
}
