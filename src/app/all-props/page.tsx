'use client';

import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { useBetSlip } from '@/context/betslip-context'; // FIX: Corrected typo from useBetslip to useBetSlip
import type { BetLeg } from '@/lib/types';

interface PropData {
  id: string;
  player: string;
  team: string;
  prop: string;
  line: number;
  overOdds: number;
  underOdds: number;
  matchup?: string;
  gameDate?: string;
  week?: number;
  Week?: number;
}

export default function AllPropsPage() {
  const [props, setProps] = useState<PropData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    week: '',
    team: '',
    player: '',
    propType: '',
    gameDate: '',
  });

  const [filterOptions, setFilterOptions] = useState({
    weeks: [] as string[],
    propTypes: [] as string[],
  });

  const { addLeg } = useBetSlip();

  // Fetch props
  useEffect(() => {
    async function fetchProps() {
      try {
        setLoading(true);
        const queryParams = new URLSearchParams();
        if (filters.week) queryParams.append('week', filters.week);
        if (filters.team) queryParams.append('team', filters.team);
        if (filters.player) queryParams.append('player', filters.player);
        if (filters.propType) queryParams.append('prop', filters.propType);
        if (filters.gameDate) queryParams.append('gamedate', filters.gameDate);

        const response = await fetch(`/api/all-props?${queryParams}`);
        const data = await response.json();
        setProps(data.props || []);
      } catch (error) {
        console.error('Error fetching props:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchProps();
  }, [filters]);

  // Fetch filter options
  useEffect(() => {
    async function fetchOptions() {
      try {
        const response = await fetch('/api/all-props/options');
        const data = await response.json();
        
        setFilterOptions({
          weeks: data.weeks || [],
          propTypes: data.props || [],
        });
      } catch (error) {
        console.error('Error fetching options:', error);
      }
    }

    fetchOptions();
  }, []);

  const handleAddToSlip = (prop: PropData, selection: 'Over' | 'Under') => {
    const odds = selection === 'Over' ? prop.overOdds : prop.underOdds;
    
    addLeg({
      id: crypto.randomUUID(),
      player: prop.player,
      prop: prop.prop,
      line: prop.line,
      odds: odds,
      selection: selection,
      propId: prop.id,
      team: prop.team,
      matchup: prop.matchup,
      gameDate: prop.gameDate,
      week: prop.week,
      status: 'pending', // <--- ADD THIS LINE
    });
  };

  const handleClearFilters = () => {
    setFilters({
      week: '',
      team: '',
      player: '',
      propType: '',
      gameDate: '',
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">ALL PROPS</h1>
        <p className="text-slate-400">Search and build your custom parlays</p>
      </div>

      {/* Filters */}
      <Card className="bg-slate-900 border-slate-800 mb-6">
        <CardContent className="p-6">
          <div className="flex items-center justify-end mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearFilters}
              className="text-slate-400 hover:text-white"
            >
              Clear All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Week Dropdown */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Week
              </label>
              <Select value={filters.week} onValueChange={(val) => setFilters(prev => ({ ...prev, week: val }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Select week" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Weeks</SelectItem>
                  {filterOptions.weeks.map((week) => (
                    <SelectItem key={week} value={week}>
                      Week {week}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Team Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Team
              </label>
              <Input
                placeholder="e.g. KC"
                value={filters.team}
                onChange={(e) => setFilters(prev => ({ ...prev, team: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            {/* Player Name Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Player Name
              </label>
              <Input
                placeholder="Search player..."
                value={filters.player}
                onChange={(e) => setFilters(prev => ({ ...prev, player: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500"
              />
            </div>

            {/* Prop Type Dropdown */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Prop Type
              </label>
              <Select value={filters.propType} onValueChange={(val) => setFilters(prev => ({ ...prev, propType: val }))}>
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Types</SelectItem>
                  {filterOptions.propTypes.map((type) => (
                    <SelectItem key={type} value={type}>
                      {type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Game Date Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Game Date
              </label>
              <Input
                type="date"
                placeholder="mm/dd/yyyy"
                value={filters.gameDate}
                onChange={(e) => setFilters(prev => ({ ...prev, gameDate: e.target.value }))}
                className="bg-slate-800 border-slate-700 text-white"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Props Grid */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {props.map((prop) => {
            const week = prop.week || prop.Week;
            
            return (
              <Card key={prop.id} className="bg-slate-900 border-slate-800 hover:border-emerald-500 transition-colors">
                <CardContent className="p-4">
                  {/* Header with Week badge */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-bold text-white">{prop.player}</h3>
                      <p className="text-sm text-slate-400">{prop.team}</p>
                      <p className="text-xs text-slate-500">{prop.matchup}</p>
                    </div>
                    {week && (
                      <span className="px-2 py-1 text-xs font-semibold bg-emerald-600 text-white rounded">
                        WK {week}
                      </span>
                    )}
                  </div>

                  {/* Prop Info */}
                  <div className="bg-slate-800 rounded p-3 mb-3">
                    <p className="text-xs text-slate-400 mb-1">{prop.prop}</p>
                    <p className="text-2xl font-bold text-emerald-400">{prop.line}</p>
                  </div>

                  {/* Over/Under Buttons */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      onClick={() => handleAddToSlip(prop, 'Over')}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                      size="sm"
                    >
                      Over {prop.overOdds > 0 ? '+' : ''}{prop.overOdds}
                    </Button>
                    <Button
                      onClick={() => handleAddToSlip(prop, 'Under')}
                      className="bg-slate-700 hover:bg-slate-600 text-white font-semibold"
                      size="sm"
                    >
                      Under {prop.underOdds > 0 ? '+' : ''}{prop.underOdds}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {!loading && props.length === 0 && (
        <div className="text-center py-12">
          <p className="text-slate-400 text-lg">No props found. Try adjusting your filters.</p>
        </div>
      )}
    </div>
  );
}