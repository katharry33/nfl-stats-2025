'use client';

import React from 'react';
import { useFirestore } from '../lib/firebase/provider';

export default function PipelineAdmin() {
  const firestore = useFirestore();

  if (!firestore) {
    return <div className="p-6 text-center text-gray-500">Connecting...</div>;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Pipeline Admin</h1>
      <p className="text-gray-600">
        Pipeline management interface. Configure your data pipelines here.
      </p>
    </div>
  );
}
