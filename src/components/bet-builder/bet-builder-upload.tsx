'use client';

import React, { useRef } from 'react';
import Papa from 'papaparse';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Upload } from 'lucide-react';

interface BetBuilderUploadProps {
  onUploadComplete: (data: any[]) => void;
}

export function BetBuilderUpload({ onUploadComplete }: BetBuilderUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading('Parsing CSV...');
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        toast.info('Enriching props...', { id: toastId });
        try {
          const res = await fetch('/api/props/enrich', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ props: results.data }),
          });

          if (!res.ok) {
            throw new Error('Enrichment failed');
          }

          const enrichedData = await res.json();
          toast.success('Enrichment complete!', { id: toastId });
          onUploadComplete(enrichedData);
        } catch (error) {
          console.error('Enrichment error:', error);
          toast.error('Enrichment failed.', { id: toastId });
        }
      },
      error: (error) => {
        console.error('CSV parsing error:', error);
        toast.error('Failed to parse CSV.', { id: toastId });
      },
    });
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        className="hidden"
        accept=".csv"
      />
      <Button onClick={triggerFileInput}>
        <Upload className="mr-2 h-4 w-4" />
        Upload CSV
      </Button>
    </>
  );
}
