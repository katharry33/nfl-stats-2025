'use client';

import React, { useState } from 'react';
import { RefreshCw, Database, CheckCircle, AlertCircle, Play } from 'lucide-react';

export default function SyncDashboard() {
  const [loading, setLoading] = useState<string | null>(null);
  const [status, setStatus] = useState<{ msg: string; type: 'success' | 'error' | null }>({ msg: '', type: null });

  const runTask = async (endpoint: string, method: string = 'GET') => {
    const taskName = endpoint.split('/').pop();
    setLoading(taskName || 'running');
    setStatus({ msg: `Running ${taskName}...`, type: null });

    try {
      const res = await fetch(endpoint, { method });
      const data = await res.json();
      
      if (res.ok) {
        setStatus({ msg: `Successfully processed ${data.enriched || data.graded || 'all'} items.`, type: 'success' });
      } else {
        setStatus({ msg: data.message || 'Task failed', type: 'error' });
      }
    } catch (err) {
      setStatus({ msg: 'Network error occurred', type: 'error' });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <header className="flex justify-between items-center border-b pb-4">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Database className="w-6 h-6 text-blue-600" />
          NBA Data Sync Center
        </h1>
        <div className="text-xs text-gray-500">Season: 2025-26</div>
      </header>

      {status.msg && (
        <div className={`p-4 rounded-lg flex items-center gap-3 ${
          status.type === 'success' ? 'bg-green-50 text-green-700' : 
          status.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
        }`}>
          {status.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-medium">{status.msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Step 1: Ingest */}
        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
          <div className="font-semibold text-gray-700">1. Ingest Slate</div>
          <p className="text-xs text-gray-500">Pull today's props from OddsAPI/Provider into Firebase.</p>
          <button 
            disabled={!!loading}
            onClick={() => runTask('/api/nba/ingest')}
            className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading === 'ingest' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Start Ingest
          </button>
        </div>

        {/* Step 2: Enrich */}
        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
          <div className="font-semibold text-gray-700">2. Enrich & Score</div>
          <p className="text-xs text-gray-500">Fetch BBRef logs, TR rankings, and compute EV/Edge.</p>
          <button 
            disabled={!!loading}
            onClick={() => runTask('/api/nba/enrich')}
            className="w-full py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading === 'enrich' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Enrich Slate
          </button>
        </div>

        {/* Step 3: Grade */}
        <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
          <div className="font-semibold text-gray-700">3. Grade Results</div>
          <p className="text-xs text-gray-500">Check final scores and mark props as Won/Lost.</p>
          <button 
            disabled={!!loading}
            onClick={() => runTask('/api/nba/grade', 'POST')}
            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-all disabled:opacity-50"
          >
            {loading === 'grade' ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            Run Grading
          </button>
        </div>
      </div>
    </div>
  );
}