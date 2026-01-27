'use client';

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error('App Error:', error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
      <div className="text-center p-8 bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md mx-4">
        <h2 className="text-2xl font-bold text-red-600 mb-4">Something went wrong!</h2>
        <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded mb-6 text-left">
          <p className="font-mono text-sm text-red-500 break-words">
            {error.message || 'An unexpected error occurred'}
          </p>
          {error.digest && (
             <p className="text-xs text-gray-500 mt-2">Digest: {error.digest}</p>
          )}
        </div>
        <button
          type="button"
          onClick={() => reset()}
          className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
