'use client';

import React from 'react';
import Link from 'next/link';
import { X, Activity, Gift, Calendar, Fingerprint, Map } from 'lucide-react';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] md:hidden">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      {/* Drawer Content */}
      <div className="absolute right-0 top-0 bottom-0 w-[80%] max-w-sm bg-[#0a0c0f] border-l border-white/10 p-6 flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-xl font-black italic uppercase text-white">Navigation</h2>
          <button onClick={onClose} className="p-2 text-zinc-500"><X className="h-6 w-6" /></button>
        </div>

        <div className="space-y-6 overflow-y-auto">
          <DrawerSection title="Insights">
            <DrawerLink href="/my-performance" icon={Activity} label="Performance Lab" onClick={onClose} />
            <DrawerLink href="/bonuses" icon={Gift} label="Promos" onClick={onClose} />
          </DrawerSection>

          <DrawerSection title="Data Management">
            <DrawerLink href="/admin/schedule" icon={Calendar} label="Schedule" onClick={onClose} />
            <DrawerLink href="/admin/pfr-ids" icon={Fingerprint} label="PFR IDs" onClick={onClose} />
            <DrawerLink href="/admin/mapping" icon={Map} label="Team Mapping" onClick={onClose} />
          </DrawerSection>
        </div>
      </div>
    </div>
  );
}

function DrawerSection({ title, children }: any) {
  return (
    <div className="space-y-3">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-600">{title}</p>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

function DrawerLink({ href, icon: Icon, label, onClick }: any) {
  return (
    <Link href={href} onClick={onClick} className="flex items-center gap-4 py-3 px-4 rounded-xl hover:bg-white/5 text-zinc-300">
      <Icon className="h-5 w-5" />
      <span className="text-sm font-bold uppercase tracking-wide">{label}</span>
    </Link>
  );
}