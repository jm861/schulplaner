/**
 * Page Transition Component
 * Provides smooth page transitions using Framer Motion
 * Ensures pages never disappear during navigation
 */

'use client';

import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      className="relative w-full min-h-full overflow-x-hidden bg-gray-50 dark:bg-gray-950"
      style={{ 
        maxWidth: '100%',
        width: '100%',
        minWidth: 0,
        minHeight: '100%',
      }}
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}

