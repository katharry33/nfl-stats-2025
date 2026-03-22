'use client';

import React, { useState } from 'react';

interface PostGameModalProps {
  isOpen: boolean;
  onClose: () => void;
  gameDate: string;
}

export function PostGameModal({ isOpen, onClose, gameDate }: PostGameModalProps) {
  const [status, setStatus] = useState<'idle' | 'loading' | 'done'>('idle');

  if (!isOpen) return null;

  const handleGrade = async () => {
    setStatus('loading');
    try {
      await fetch('/api/nba/grade', {
        method: 'POST',
        body: JSON.stringify({ date: gameDate, season: 2025 }),
      });
      setStatus('done');
    } catch (e) {
      setStatus('idle');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
        <h2 className="text-xl font-bold mb-2">Grade Slate: {gameDate}</h2>
        <p className="text-gray-500 text-sm mb-6">
          This will fetch actual stats from Basketball-Reference and determine which props won or lost.
        </p>
        
        <div className="flex gap-3">
          <button 
            onClick={onClose}
            className="flex-1 py-2 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={handleGrade}
            disabled={status !== 'idle'}
            className="flex-1 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            {status === 'loading' ? 'Grading...' : status === 'done' ? 'Success!' : 'Confirm Grading'}
          </button>
        </div>
      </div>
    </div>
  );
}