'use client';

import { useEffect, useMemo, useState } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';

function guessOrgFromHost(host?: string | null) {
  if (!host) return null;
  // dev hosts (localhost / ngrok) won’t have a real subdomain
  if (host.startsWith('localhost') || /^\d+\.\d+\.\d+\.\d+/.test(host)) return null;

  // subdomain.domain.tld → take the first segment, ignore "www"
  const [first] = host.split('.');
  if (!first || first === 'www') return null;
  return first;
}

export default function SignInPage() {
  const params = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const error = params.get('error');
  const callbackUrl = params.get('callbackUrl') || '/dashboard';

  const orgFromQuery = params.get('org') || undefined;
  const orgFromHost = typeof window !== 'undefined' ? guessOrgFromHost(window.location.hostname) : null;
  const org = orgFromQuery || orgFromHost || undefined;

  const requestAccessHref = useMemo(() => {
    const qs = org ? `?org=${encodeURIComponent(org)}` : '';
    return `/need-access${qs}`;
  }, [org]);

  const handleGoogle = async () => {
    setIsLoading(true);
    try {
      await signIn('google', { callbackUrl });
    } finally {
      setIsLoading(false);
    }
  };

  // If NextAuth bounced us here with a callbackUrl, auto-open Google
  useEffect(() => {
    if (params.get('callbackUrl')) handleGoogle();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        {/* Logo & title */}
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-600">
            <Image src="/logo.svg" alt="Rental-Maintenance" width={24} height={24} priority />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Sign in</h1>
          <p className="mt-2 text-sm text-gray-600">
            Use your work Google account to continue to Rental-Maintenance
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error === 'AccessDenied'
              ? 'You do not have access to this application.'
              : 'Authentication error. Please try again.'}
          </div>
        )}

        {/* Google button */}
        <button
          onClick={handleGoogle}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-3 rounded-md border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isLoading ? (
            <svg className="h-5 w-5 animate-spin text-gray-400" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
          )}
          <span>{isLoading ? 'Signing in…' : 'Continue with Google'}</span>
        </button>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>
            By signing in, you agree to our{' '}
            <a href="/terms" className="underline text-blue-600 hover:text-blue-500">Terms of Service</a>{' '}
            and{' '}
            <a href="/privacy" className="underline text-blue-600 hover:text-blue-500">Privacy Policy</a>.
          </p>
        </div>
      </div>

      {/* Request access */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-500">
          Can’t sign in?{' '}
          <a href={requestAccessHref} className="font-medium text-blue-600 hover:text-blue-500">
            Request access
          </a>
        </p>
      </div>
    </div>
  );
}
