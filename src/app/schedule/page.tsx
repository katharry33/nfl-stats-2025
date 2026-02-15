'use client';

import { useState, useEffect } from 'react';
import { FlexibleDataTable, ColumnDef } from '@/components/data-table/flexible-data-table';
import { PageHeader } from '@/components/layout/page-header';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/lib/firebase";
import { collection, query, onSnapshot, QuerySnapshot, DocumentData, orderBy, where } from "firebase/firestore";

// Define the shape of our schedule data
interface ScheduleRow {
  id: string;
  week?: number;
  gameDate?: string;
  gameTime?: string;
  matchup?: string;
}

// Define the list of seasons
const seasons = ["2022-2023", "2023-2024", "2024-2025"];

export default function SchedulePage() {
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSeason, setSelectedSeason] = useState<string>(seasons[seasons.length - 1]);

  useEffect(() => {
    setIsLoading(true);
    const q = query(
      collection(db, "static_schedule"), 
      where("season", "==", selectedSeason), 
      orderBy("week")
    );

    const unsubscribe = onSnapshot(q, (snapshot: QuerySnapshot<DocumentData>) => {
      const data = snapshot.docs.map((doc) => {
        const docData = doc.data();
        return {
          id: doc.id,
          week: docData.week,
          gameDate: docData['game date'],
          gameTime: docData['game time'],
          matchup: docData.matchup,
        }
      }) as ScheduleRow[];
      setSchedule(data);
      setIsLoading(false);
    }, (error: Error) => {
      console.error("Fetch error:", error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [selectedSeason]);

  const columns: ColumnDef<ScheduleRow>[] = [
    {
      accessorKey: 'week',
      header: 'Week',
      sortable: true,
    },
    {
      accessorKey: 'gameDate',
      header: 'Game Date',
      sortable: true,
      cell: (value: any) => {
        if (!value) return 'N/A';
        try {
          const date = new Date(value);
          return date.toLocaleDateString('en-US', {
            weekday: 'short',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          });
        } catch {
          return 'Invalid Date';
        }
      },
    },
    {
      accessorKey: 'gameTime',
      header: 'Game Time',
      sortable: true,
      cell: (value: any) => value || 'N/A',
    },
    {
      accessorKey: 'matchup',
      header: 'Matchup',
      sortable: true,
    },
  ];

  return (
    <div className='container mx-auto py-8 px-4 max-w-full'>
      <PageHeader
        title='Game Schedule'
        description='View and filter the upcoming game schedule.'
      />

      <div className='mt-8'>
        <div className="mb-4">
          <Select onValueChange={setSelectedSeason} defaultValue={selectedSeason}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select a season" />
            </SelectTrigger>
            <SelectContent>
              {seasons.map(season => (
                <SelectItem key={season} value={season}>{season}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {error && (
          <Card className='border-red-200 bg-red-50 mb-4'>
            <CardContent className='pt-6'>
              <p className='text-red-600'>Error: {error}</p>
            </CardContent>
          </Card>
        )}

        <Card className='border-none shadow-md'>
          <CardHeader className='bg-slate-50/50 border-b'>
            <CardTitle>Schedule</CardTitle>
          </CardHeader>
          <CardContent className='p-0'>
            <FlexibleDataTable
              data={schedule}
              columns={columns}
              isLoading={isLoading}
              searchPlaceholder='Filter games...'
              emptyMessage='No games found.'
              tableId="schedule-table"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
