'use client';

import React, { useState, useEffect } from "react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

export default function PfrIdsPage() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchPfrIds() {
      const res = await fetch('/api/static-data?type=pfr');
      const json = await res.json();
      setData(json);
      setLoading(false);
    }
    fetchPfrIds();
  }, []);

  return (
    <div className="p-6 bg-slate-950 min-h-screen">
      <h1 className="text-2xl font-bold text-white mb-6 uppercase italic">PFR ID Map</h1>
      <Card className="bg-slate-900 border-slate-800">
        <Table>
          <TableHeader>
            <TableRow className="border-slate-800">
              <TableHead className="text-slate-400">Player Name</TableHead>
              <TableHead className="text-slate-400">PFR ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={2} className="text-center py-10"><Loader2 className="animate-spin mx-auto"/></TableCell></TableRow>
            ) : (
              data.map((item: any) => (
                <TableRow key={item.id} className="border-slate-800">
                  <TableCell className="text-white">{item.PlayerName}</TableCell>
                  <TableCell className="text-slate-400 font-mono">{item.PfrId}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
