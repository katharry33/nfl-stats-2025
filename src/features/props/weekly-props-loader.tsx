'use client';

import { useEffect, useState } from 'react';
import { WeeklyProps } from '@/components/bets/weekly-props';
// Updated import path to match your actual file structure
import type { WeeklyProp } from '@/lib/types';

export function WeeklyPropsLoader() {
  const [props, setProps] = useState<WeeklyProp[]>([]);
  // Added loading state to satisfy the WeeklyProps component requirement
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProps = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/weekly-props');
        const data = await response.json();
        setProps(data);
      } catch (error) {
        console.error('Failed to load props:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchProps();
  }, []);

  // Pass both props and the now-required loading boolean
  return <WeeklyProps props={props} loading={loading} />;
}