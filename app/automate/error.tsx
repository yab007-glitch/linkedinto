'use client';

import { useEffect } from 'react';

export default function AutomateError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Automation Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <div className="text-center p-8 bg-slate-800 rounded-xl border border-slate-700 shadow-xl max-w-md mx-4">
        <h2 className="text-2xl font-bold text-red-400 mb-4">Automation Error</h2>
        <div className="bg-red-900/20 border border-red-500/30 p-4 rounded mb-6 text-left">
          <p className="font-mono text-sm text-red-300 break-words">
            {error.message || 'An unexpected error occurred during automation'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => reset()}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
