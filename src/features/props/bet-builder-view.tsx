'use client';

import React, { useState, useMemo } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Search, PlusCircle, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { PropData } from '@/lib/types';
import { cn } from "@/lib/utils";

interface BetBuilderViewProps {
  props: PropData[];
}

export const BetBuilderView = ({ props = [] }: BetBuilderViewProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPropIds, setSelectedPropIds] = useState<string[]>([]);
  const [weekFilter, setWeekFilter] = useState("");
  const [propFilter, setPropFilter] = useState("");
  const [gamedateFilter, setGamedateFilter] = useState("");
  const [gametimeFilter, setGametimeFilter] = useState("");

  const uniqueWeeks = useMemo(() => {
    if (!props) return [];
    const weeks = new Set(props.map(p => p.Week).filter((w): w is number => w !== undefined && w !== null));
    return Array.from(weeks).sort((a, b) => a - b);
  }, [props]);

  const uniqueProps = useMemo(() => {
    if (!props) return [];
    const propTypes = new Set(
      props
        .map(p => p.Prop)
        .filter((p): p is string => typeof p === 'string' && p.trim() !== '')
        .map(p => p.trim())
    );
    return Array.from(propTypes).sort();
  }, [props]);

  const uniqueGameDates = useMemo(() => {
    if (!props) return [];
    const dates = new Set(
      props
        .map(p => p.GameDate)
        .filter((d): d is string => typeof d === 'string' && d.trim() !== '')
        .map(d => d.trim())
    );
    const formattedDates = new Set<string>();
    dates.forEach(d => {
      try {
        const date = new Date(d);
        if (!isNaN(date.getTime())) {
          const month = String(date.getUTCMonth() + 1).padStart(2, '0');
          const day = String(date.getUTCDate()).padStart(2, '0');
          const year = date.getUTCFullYear();
          formattedDates.add(`${month}-${day}-${year}`);
        }
      } catch (e) {}
    });
    return Array.from(formattedDates).sort();
  }, [props]);

  const uniqueGameTimes = useMemo(() => {
    if (!props) return [];
    const times = new Set(
      props
        .map(p => p.GameTime)
        .filter((t): t is string => typeof t === 'string' && t.trim() !== '')
        .map(t => t.trim())
    );
    return Array.from(times).sort();
  }, [props]);

  const filteredProps = useMemo(() => {
    const search = searchTerm.toLowerCase().trim();

    return props.filter(p => {
      const playerName = p?.Player?.toLowerCase() ?? "";
      const teamName = p?.Team?.toLowerCase() ?? "";
      const playerSearch = playerName.includes(search) || teamName.includes(search);

      const weekMatch = weekFilter ? String(p.Week) === weekFilter : true;
      const propMatch = propFilter ? p.Prop === propFilter : true;
      const gametimeMatch = gametimeFilter ? p.GameTime === gametimeFilter : true;

      const gamedateMatch = gamedateFilter ? (() => {
        if (!p.GameDate) return false;
        let formattedDate = "";
        try {
          const date = new Date(p.GameDate);
          if (!isNaN(date.getTime())) {
            const month = String(date.getUTCMonth() + 1).padStart(2, '0');
            const day = String(date.getUTCDate()).padStart(2, '0');
            const year = date.getUTCFullYear();
            formattedDate = `${month}-${day}-${year}`;
          } else {
            return false;
          }
        } catch (e) {
          return false;
        }
        return formattedDate === gamedateFilter;
      })() : true;

      return playerSearch && weekMatch && propMatch && gamedateMatch && gametimeMatch;
    });
  }, [props, searchTerm, weekFilter, propFilter, gamedateFilter, gametimeFilter]);

  const toggleSelect = (id: string | undefined) => {
    if (!id) return;
    setSelectedPropIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-col md:flex-row gap-2">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players or teams..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={weekFilter} onValueChange={setWeekFilter}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Filter by week..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Weeks</SelectItem>
                {uniqueWeeks.map(week => (
                  <SelectItem key={week} value={String(week)}>
                    Week {week}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={propFilter} onValueChange={setPropFilter}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Filter by prop type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Props</SelectItem>
                {uniqueProps.filter(prop => prop).map(prop => (
                  <SelectItem key={prop} value={prop}>
                    {prop}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={gamedateFilter} onValueChange={setGamedateFilter}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Filter by game date..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Dates</SelectItem>
                {uniqueGameDates.filter(date => date).map(date => (
                  <SelectItem key={date} value={date}>
                    {date}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={gametimeFilter} onValueChange={setGametimeFilter}>
              <SelectTrigger className="max-w-xs">
                <SelectValue placeholder="Filter by game time..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Times</SelectItem>
                {uniqueGameTimes.filter(time => time).map(time => (
                  <SelectItem key={time} value={time}>
                    {time}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <Badge variant="outline" className="px-3 py-1 bg-white">
            {selectedPropIds.length} Selected
          </Badge>
          {selectedPropIds.length > 0 && (
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
              Build Parlay
            </Button>
          )}
        </div>
      </div>

      <Card className="border-none shadow-sm">
        <CardHeader className="pb-3 px-6">
          <CardTitle>Weekly Prop Market</CardTitle>
          <CardDescription>Select props to evaluate your parlay probability.</CardDescription>
        </CardHeader>
        <CardContent className="px-6">
          <div className="rounded-xl border overflow-hidden">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold">Player</TableHead>
                  <TableHead>Game Date</TableHead>
                  <TableHead>Game Time</TableHead>
                  <TableHead>Prop Type</TableHead>
                  <TableHead className="text-center">Line</TableHead>
                  <TableHead className="text-center">Odds</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredProps.length > 0 ? (
                  filteredProps.map((prop) => {
                    const isSelected = prop.id ? selectedPropIds.includes(prop.id) : false;
                    let formattedDate = "N/A";
                    if (prop.GameDate) {
                        try {
                            const date = new Date(prop.GameDate);
                            if (!isNaN(date.getTime())) {
                                const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                                const day = String(date.getUTCDate()).padStart(2, '0');
                                const year = date.getUTCFullYear();
                                formattedDate = `${month}-${day}-${year}`;
                            } else {
                                formattedDate = prop.GameDate;
                            }
                        } catch (e) {
                            formattedDate = prop.GameDate;
                        }
                    }
                    return (
                      <TableRow key={prop.id} className={cn("transition-colors", isSelected && "bg-blue-50/50")}>
                        <TableCell>
                          <div className="font-medium">{prop.Player || "Unknown Player"}</div>
                          <div className="text-xs text-muted-foreground">{prop.Team || "No Team"}</div>
                        </TableCell>
                        <TableCell>{formattedDate}</TableCell>
                        <TableCell>{prop.GameTime || 'N/A'}</TableCell>
                        <TableCell className="capitalize">{prop.Prop}</TableCell>
                        <TableCell className="text-center font-mono">
                          <span className="text-muted-foreground mr-1">{prop['Over/Under?']}</span>
                          {prop.Line}
                        </TableCell>
                        <TableCell className="text-center font-mono font-medium text-emerald-600">
                          {Number(prop.Odds) > 0 ? `+${prop.Odds}` : prop.Odds}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant={isSelected ? "default" : "ghost"} 
                            size="sm"
                            className={cn("h-9 w-9 p-0 rounded-full", isSelected && "bg-blue-600")}
                            onClick={() => toggleSelect(prop.id)}
                          >
                            {isSelected ? (
                              <CheckCircle2 className="h-4 w-4 text-white" />
                            ) : (
                              <PlusCircle className="h-4 w-4" />
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                      {searchTerm || weekFilter || propFilter || gamedateFilter || gametimeFilter ? "No matches found." : "No props available this week."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};