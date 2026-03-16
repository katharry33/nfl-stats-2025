'use client';

import React, { useState } from 'react';
import { SidebarNav } from '@/components/nav/SidebarNav';
import { MobileBottomNav } from '@/components/nav/MobileBottomNav';
import { MobileDrawer } from '@/components/nav/MobileDrawer';

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-[#060606]">
      {/* 1. Desktop Sidebar: Hidden on mobile, visible on medium screens and up */}
      <aside className="hidden md:flex fixed left-0 top-0 bottom-0 w-64 border-r border-white/[0.06] bg-[#0a0c0f]">
        <SidebarNav />
      </aside>

      {/* 2. Main Content: No margin on mobile, margin-left 64 on desktop */}
      <main className="flex-1 w-full md:ml-64 pb-20 md:pb-0">
        <div className="max-w-7xl mx-auto p-4 md:p-8">
          {children}
        </div>
      </main>

      {/* 3. Mobile Navigation Elements */}
      <MobileBottomNav onOpenDrawer={() => setIsDrawerOpen(true)} />
      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />
    </div>
  );
}