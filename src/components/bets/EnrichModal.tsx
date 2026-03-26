'use client';

import React, { useState } from 'react';
import { X, Loader2, UploadCloud, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

interface IngestEnrichModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  league: 'nba' | 'nfl';
  defaultDate: string;
  defaultSeason: number;
  props: any[]; // small manual seed rows (optional)
  uploadId?: string | null; // optional uploadId for CSV flows
}

export function IngestEnrichModal({
  isOpen,
  onClose,
  onComplete,
  league,
  defaultDate,
  defaultSeason,
  props,
  uploadId = null
}: IngestEnrichModalProps) {
  const [loading, setLoading] = useState(false);

  const pollJobStatus = async (jobId: string) => {
    const start = Date.now();
    try {
      while (true) {
        const s = await fetch(`/api/${league}/enrich/status?jobId=${jobId}`);
        if (!s.ok) {
          const err = await s.json().catch(() => ({ error: 'Unknown' }));
          toast.error('Job status error', { description: err?.error || 'Failed to fetch job status' });
          return;
        }
        const body = await s.json();
        if (body.status === 'completed') {
          toast.success('Protocol Complete', {
            description: `${body.created ?? 0} props created, ${body.updated ?? 0} updated.`
          });
          onComplete();
          onClose();
          return;
        }
        if (body.status === 'failed') {
          toast.error('Enrichment failed', { description: body.error || 'See server logs' });
          return;
        }
        // timeout after 5 minutes
        if (Date.now() - start > 1000 * 60 * 5) {
          toast('Processing', { description: 'Job still running. Check job status later.' });
          return;
        }
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (err: any) {
      toast.error('Polling error', { description: err?.message || 'Unknown error' });
    }
  };

  const handleRun = async () => {
    setLoading(true);
    try {
      const payload: any = {
        date: defaultDate,
        season: defaultSeason
      };
      if (uploadId) payload.uploadId = uploadId;
      else if (props && props.length > 0) payload.rows = props;

      const res = await fetch(`/api/${league}/enrich`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.error || 'Enrichment failed');
      }

      // If server returned a jobId, poll it
      if (json.jobId) {
        toast('Started enrichment job', { description: `Job ${json.jobId} started.` });
        pollJobStatus(json.jobId);
      } else if (json.enriched) {
        // synchronous small-batch response
        toast.success('Protocol Complete', { description: 'Data seeded and enriched.' });
        onComplete();
        onClose();
      } else {
        toast.success('Protocol Complete', { description: 'Operation completed.' });
        onComplete();
        onClose();
      }
    } catch (err: any) {
      toast.error('Error', { description: err?.message || 'Unknown error' });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-[#121214] border border-white/10 rounded-[32px] w-full max-w-md p-8 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-black uppercase italic tracking-tight">
            Seed <span className="text-orange-500">Enrichment</span>
          </h2>
          <button onClick={onClose} className="text-zinc-500 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="space-y-4 mb-8">
          <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-2xl flex gap-4">
            <UploadCloud className="text-orange-500 shrink-0" />
            <p className="text-xs text-zinc-400 leading-relaxed">
              This will pull the latest lines for <span className="text-white font-bold">{defaultDate}</span> and
              cross-reference them with Guru projections.
            </p>