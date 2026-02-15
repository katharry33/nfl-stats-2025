'use client';

import { useEffect } from 'react';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Global Error:', error);
  }, [error]);

  return (
    <html>
      <body>
        <div className="flex items-center justify-center min-h-screen p-4 bg-slate-50">
          <div className="w-full max-w-md bg-white rounded-lg shadow-lg p-6">
            <div className="text-center space-y-4">
              <h2 className="text-2xl font-bold text-red-600">Error</h2>
              <p className="text-gray-600">{error.message || 'Something went wrong'}</p>
              <div className="space-y-2">
                <button 
                  onClick={reset} 
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Try again
                </button>
                <button 
                  onClick={() => window.location.href = '/'} 
                  className="w-full px-4 py-2 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Go home
                </button>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
