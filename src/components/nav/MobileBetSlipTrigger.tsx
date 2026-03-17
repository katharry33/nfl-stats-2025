'use client';

import React, { useState } from 'react';
import { useBetSlip } from '@/hooks/useBetSlip';
import { ArrowRight, Layers } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { MobileBetSlipDrawer } from './MobileBetSlipDrawer';

export function MobileBetSlipTrigger() {
  const { selections } = useBetSlip();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const count = selections?.length ?? 0;

  return (
    <>
      <AnimatePresence>
        {count > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="md:hidden fixed bottom-[76px] left-0 right-0 px-4 z-40 pointer-events-none"
          >
            <button
              onClick={() => setIsDrawerOpen(true)}
              className="pointer-events-auto w-full h-14 bg-primary shadow-[0_8px_30px_rgb(0,0,0,0.12)] 
                         backdrop-blur-md rounded-2xl flex items-center justify-between px-5 
                         active:scale-[0.97] transition-all border border-primary/20"
            >
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Layers className="w-5 h-5 text-primary-foreground" />
                  <span className="absolute -top-2 -right-2 bg-white text-primary text-[10px] font-black 
                                 w-4 h-4 rounded-full flex items-center justify-center shadow-sm">
                    {count}
                  </span>
                </div>
                <div className="flex flex-col items-start">
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary-foreground/70 leading-none">
                    Review Parlay
                  </span>
                  <span className="text-sm font-bold text-white italic tracking-tighter">
                    {count} {count === 1 ? 'Selection' : 'Selections'} Added
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 bg-white/10 py-1.5 pl-3 pr-2 rounded-xl">
                <span className="text-[11px] font-black text-white uppercase italic">View Slip</span>
                <ArrowRight className="w-4 h-4 text-white" />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <MobileBetSlipDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
      />
    </>
  );
}