'use client';

import React from 'react';
// src/components/bets/PropsTable.tsx
// Adapter between BetBuilderClient and BetBuilderTable.
// BetBuilderClient passes slipIds (Set); BetBuilderTable wants isInBetSlip (fn).

import { FlexibleDataTable } from '@/components/data-table/flexible-data-table';
import type { NormalizedProp } from '@/hooks/useAllProps';

interface PropsTableProps {
  props:          NormalizedProp[];
  league:         string;
  isLoading:      boolean;
  onAddToBetSlip: (prop: NormalizedProp) => void;
  slipIds:        Set<string>;
}

export function PropsTable({
  props,
  league,
  isLoading,
  onAddToBetSlip,
  slipIds,
}: PropsTableProps) {
  return (
    <FlexibleDataTable
      props={props as any}
      isLoading={isLoading}
      isInBetSlip={(id: string) => slipIds.has(id)}
      onAddToBetSlip={onAddToBetSlip}
      onRemoveFromBetSlip={() => {}}  // removal handled via BetSlip panel
    />
  );
}