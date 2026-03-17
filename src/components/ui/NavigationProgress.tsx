'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

/**
 * Thin teal progress bar that fires on every route change.
 * Add <NavigationProgress /> once inside AppLayout, above <main>.
 *
 * Works by watching pathname changes — when the pathname changes
 * the bar animates to 80%, then completes and fades out.
 */
export function NavigationProgress() {
  const pathname = usePathname();
  const [progress, setProgress]   = useState(0);
  const [visible, setVisible]     = useState(false);
  const [animating, setAnimating] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const prevPath = useRef(pathname);

  useEffect(() => {
    if (pathname === prevPath.current) return;
    prevPath.current = pathname;

    // Clear any ongoing animation
    if (timerRef.current) clearTimeout(timerRef.current);

    // Start: show bar at 0, race to 80%
    setVisible(true);
    setAnimating(true);
    setProgress(0);

    // Tick to 80% over ~300ms (CSS transition handles smoothness)
    requestAnimationFrame(() => setProgress(80));

    // Complete to 100% after a short pause
    timerRef.current = setTimeout(() => {
      setProgress(100);
      // Fade out after completion
      timerRef.current = setTimeout(() => {
        setVisible(false);
        setAnimating(false);
        setProgress(0);
      }, 300);
    }, 250);

    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [pathname]);

  if (!visible) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[9999] h-[2px] pointer-events-none"
      aria-hidden="true"
    >
      <div
        className="h-full bg-primary transition-all ease-out"
        style={{
          width:            `${progress}%`,
          transitionDuration: animating ? '300ms' : '150ms',
          boxShadow:        '0 0 8px 0 hsl(var(--primary) / 0.7)',
        }}
      />
    </div>
  );
}