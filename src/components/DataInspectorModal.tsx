'use client';

import React from 'react';
import { X, Copy } from 'lucide-react';
import { toast } from 'sonner';

export function DataInspectorModal({
  isOpen,
  onClose,
  data
}: {
  isOpen: boolean;
  onClose: () => void;
  data: any;
}) {
  if (!isOpen) return null;

  const json = JSON.stringify(data, null, 2);

  const copy = () => {
    navigator.clipboard.writeText(json);
    toast.success("Copied to clipboard");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-[#0d0d0d] border border-white/10 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 bg-zinc-900/40">
          <h2 className="text-sm font-black uppercase tracking-widest text-white">
            Data Inspector
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition"
          >
            <X size={18} className="text-zinc-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 max-h-[70vh] overflow-auto">
          <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
            {json}
          </pre>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-white/10 bg-zinc-900/40 flex justify-end gap-3">
          <button
            onClick={copy}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold uppercase tracking-widest text-zinc-300"
          >
            <Copy size={14} />
            Copy JSON
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold uppercase tracking-widest text-white"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
