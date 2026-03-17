'use client';
import { useState } from 'react';

export function MobileBetSlipDrawer({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const [step, setStep] = useState('review'); 

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose}>
      <div className="absolute bottom-0 left-0 right-0 bg-card h-3/4 p-4 rounded-t-2xl shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-lg font-bold">Bet Slip</h2>
        <p>Drawer content goes here...</p>
        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground">X</button>
      </div>
    </div>
  );
}
