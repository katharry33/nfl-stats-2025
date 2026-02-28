'use client';

import { AppLayout } from '@/components/layout/app-layout';
import { PageHeader } from '@/components/layout/page-header';

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="p-6 space-y-6 bg-slate-50 text-slate-900">
        <PageHeader 
          title="Settings" 
          description="Manage your application settings."
        />
        <div className="bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
          <h2 className="text-lg font-semibold text-slate-800">Coming Soon</h2>
          <p className="text-slate-500 mt-2">
            This page is under construction. More settings and options will be available here in a future update.
          </p>
        </div>
      </div>
    </AppLayout>
  );
}