import { PageLoader } from '@/components/ui/LoadingSpinner';

// Next.js App Router automatically shows this while the page Suspense resolves.
// Copy this file into any route folder, e.g.:
//   app/betting-log/loading.tsx
//   app/bet-builder/loading.tsx
//   app/my-performance/loading.tsx  etc.

export default function Loading() {
  return <PageLoader />;
}