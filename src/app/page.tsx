/**
 * Home Page - Redirects to Dashboard
 * The new dashboard is at /dashboard
 */

'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard
    router.replace('/dashboard');
  }, [router]);

  // Show loading state while redirecting
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600 mx-auto"></div>
        <p className="text-sm text-gray-600 dark:text-gray-400">Lade Dashboard...</p>
      </div>
    </div>
  );
}
