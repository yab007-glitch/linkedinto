'use client';

import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

function SignInContent() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl') || '/dashboard';
  const error = searchParams.get('error');

  const handleLinkedInSignIn = () => {
    signIn('linkedin', { callbackUrl });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600 mb-2">LinkedInto</h1>
          <p className="text-gray-600">Sign in to manage your LinkedIn content</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
            {error === 'OAuthSignin' && 'Error starting OAuth flow. Please try again.'}
            {error === 'OAuthCallback' && 'Error during OAuth callback. Please try again.'}
            {error === 'OAuthCreateAccount' && 'Could not create account. Please try again.'}
            {error === 'Callback' && 'Error during callback. Please try again.'}
            {error === 'Default' && 'An error occurred. Please try again.'}
            {!['OAuthSignin', 'OAuthCallback', 'OAuthCreateAccount', 'Callback', 'Default'].includes(error) && 
              'An unexpected error occurred.'}
          </div>
        )}

        <button
          type="button"
          onClick={handleLinkedInSignIn}
          className="w-full flex items-center justify-center gap-3 bg-[#0A66C2] hover:bg-[#004182] text-white font-semibold py-4 px-6 rounded-lg transition-colors duration-200"
        >
          <svg
            className="w-6 h-6"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
          </svg>
          Sign in with LinkedIn
        </button>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            By signing in, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <h3 className="text-sm font-medium text-gray-700 mb-3">What you can do:</h3>
          <ul className="text-sm text-gray-600 space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Generate AI-powered LinkedIn posts
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Schedule posts for optimal times
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Track post analytics and engagement
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    }>
      <SignInContent />
    </Suspense>
  );
}
