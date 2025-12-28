/**
 * Page Transition Component
 * Provides smooth page transitions using Framer Motion
 * Ensures pages never disappear during navigation
 */

'use client';

import { motion } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <motion.div
      key={pathname}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'tween',
        ease: [0.4, 0, 0.2, 1],
        duration: 0.2,
      }}
      className="relative w-full min-h-screen"
    >
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </motion.div>
  );
}

