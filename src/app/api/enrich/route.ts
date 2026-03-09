// src/app/api/enrich/route.ts
// Streams SSE enrichment progress to the client

import { NextRequest } from 'next/server';

export const dynamic    = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { week, season = 2025, collection = 'weekly', force = false } = body;

  const encoder = new TextEncoder();
  const stream  = new TransformStream();
  const writer  = stream.writable.getWriter();

  function send(data: object) {
    writer.write(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
  }

  (async () => {
    try {
      send({ type: 'start', message: `Starting enrichment — ${collection === 'all' ? 'allProps' : 'weeklyProps'}_${season}${week ? ` week ${week}` : ''}` });

      const mod = await import('@/lib/enrichment/enrichProps');

      let count = 0;
      if (collection === 'all') {
        send({ type: 'progress', message: `Loading from allProps_${season}${week ? ` week ${week}` : ' (all weeks)'}...` });
        count = await mod.enrichAllPropsCollection({
          season,
          week:          week ?? undefined,
          skipEnriched:  !force,
        });
      } else {
        if (!week) throw new Error('week is required for weekly enrichment');
        send({ type: 'progress', message: `Loading from weeklyProps_${season} week ${week}...` });
        count = await mod.enrichPropsForWeek({ week, season, skipEnriched: !force });
      }

      send({ type: 'done', count, message: `Done — ${count} props enriched` });
    } catch (err: any) {
      send({ type: 'error', message: err?.message ?? 'Enrichment failed' });
    } finally {
      writer.close();
    }
  })();

  return new Response(stream.readable, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  });
}