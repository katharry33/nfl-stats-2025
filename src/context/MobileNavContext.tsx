'use client';

import * as React from 'react';

// ─── Type ─────────────────────────────────────────────────────────────────────

export interface MobileNavContextType {
  isDrawerOpen: boolean;
  openDrawer:   () => void;
  closeDrawer:  () => void;
  toggleDrawer: () => void;   // ← was missing from the type in your existing file
}

// ─── Context ──────────────────────────────────────────────────────────────────

const MobileNavContext = React.createContext<MobileNavContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [isDrawerOpen, setIsDrawerOpen] = React.useState(false);

  // Body scroll lock — JS behaviour only, not layout
  React.useEffect(() => {
    document.body.style.overflow = isDrawerOpen ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [isDrawerOpen]);

  const value = React.useMemo<MobileNavContextType>(() => ({
    isDrawerOpen,
    openDrawer:   () => setIsDrawerOpen(true),
    closeDrawer:  () => setIsDrawerOpen(false),
    toggleDrawer: () => setIsDrawerOpen(prev => !prev),
  }), [isDrawerOpen]);

  return (
    <MobileNavContext.Provider value={value}>
      {children}
    </MobileNavContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useMobileNav(): MobileNavContextType {
  const ctx = React.useContext(MobileNavContext);
  if (!ctx) throw new Error('useMobileNav must be used inside <MobileNavProvider>');
  return ctx;
}