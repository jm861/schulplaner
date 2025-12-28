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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        type: 'spring',
        stiffness: 300,
        damping: 30,
        mass: 0.8,
      }}
      className="relative w-full min-h-screen overflow-x-hidden"
      style={{ willChange: 'opacity, transform', maxWidth: '100vw' }}
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </motion.div>
  );
}

