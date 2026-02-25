'use client';

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function SchedulePage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSchedule() {
      const res = await fetch('/api/static-data?type=schedule');
      const json = await res.json();
      setData(json);
      setLoading(false);
    }
    fetchSchedule();
  }, []);

  return (
    <div className="p-6 bg-slate-950 min-h-screen">
      <h1 className="text-2xl font-bold text-white mb-6 uppercase italic">2025 NFL Schedule</h1>
      <Card className="bg-slate-900 border-slate-800">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800">
              <TableHead className="text-slate-400">Week</TableHead>
              <TableHead className="text-slate-400">Matchup</TableHead>
              <TableHead className="text-slate-400">Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={3} className="text-center py-10"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
            ) : (
              data.map((item: any) => (
                <TableRow key={item.id} className="border-slate-800">
                  <TableCell className="text-white font-mono">W{item.Week}</TableCell>
                  <TableCell className="text-white">{item.AwayTeam} @ {item.HomeTeam}</TableCell>
                  <TableCell className="text-slate-400">{item.Date}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}