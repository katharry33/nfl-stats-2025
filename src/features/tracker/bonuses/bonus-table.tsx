"use client";

import React from "react";
import { format, parseISO } from "date-fns";
import { Edit, Trash2 } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import type { Bonus } from "@/lib/types";

interface BonusTableProps {
  bonuses: Bonus[];
  onEdit: (bonus: Bonus) => void;
  onDelete: (id: string) => void;
}

export function BonusTable({ bonuses, onEdit, onDelete }: BonusTableProps) {
  // Helper to normalize Firestore Timestamps or ISO strings into Javascript Dates
  const normalizeDate = (dateField: any): Date | null => {
    if (!dateField) return null;
    // Handle Firestore Timestamp { seconds, nanoseconds }
    if (typeof dateField.toDate === 'function') return dateField.toDate();
    // Handle ISO string
    if (typeof dateField === 'string') return parseISO(dateField);
    // Handle raw Date object
    if (dateField instanceof Date) return dateField;
    return null;
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Max Bet</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bonuses.length === 0 ? (
                <TableRow>
                  <TableCell 
                    colSpan={6} 
                    className="text-center text-muted-foreground py-8"
                  >
                    No active bonuses found.
                  </TableCell>
                </TableRow>
              ) : (
                bonuses.map((bonus) => {
                  const dateObj = normalizeDate(bonus.expirationDate);
                  const expirationDisplay = dateObj 
                    ? format(dateObj, 'MMM d, h:mm a') 
                    : "No Date";

                  // Cast to any to bypass missing property errors until types.ts is updated
                  const bonusData = bonus as any;

                  return (
                    <TableRow key={bonus.id}>
                      <TableCell className="font-medium">
                        {bonus.name}
                      </TableCell>
                      <TableCell className="capitalize">
                        {bonusData.type || 'N/A'}
                      </TableCell>
                      <TableCell>
                        {bonus.description || 'Any'}
                      </TableCell>
                      <TableCell className="text-right">
                        ${Number(bonusData.amount || 0).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-sm">
                        {expirationDisplay}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => onEdit(bonus)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="text-destructive hover:text-destructive"
                            onClick={() => onDelete(bonus.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}