import { useState, useEffect } from 'react';

export function useNbaStats(bdlId: number | null, propType: string, line: number) {
  const [stats, setStats] = useState<{ hitRate: number; last10: any[] } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!bdlId) return;

    const fetchStats = async () => {
      setLoading(true);
      try {
        // Fetch last 10 games from BallDontLie
        const res = await fetch(`https://api.balldontlie.io/v1/stats?player_ids[]=${bdlId}&per_page=10`, {
          headers: { 'Authorization': process.env.NEXT_PUBLIC_BDL_API_KEY! }
        });
        const { data } = await res.json();

        // Calculate how many times they went OVER the current line
        const hits = data.filter((game: any) => {
          const actual = game[propType] || 0; // e.g., 'pts'
          return actual > line;
        }).length;

        setStats({
          hitRate: (hits / data.length) * 100,
          last10: data
        });
      } catch (err) {
        console.error("NBA Stat Fetch Error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [bdlId, propType, line]);

  return { stats, loading };
}