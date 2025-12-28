/**
 * Page Transition Component
 * Provides smooth page transitions using Framer Motion
 * Ensures pages never disappear during navigation
 */

'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import { type ReactNode } from 'react';

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="relative w-full min-h-screen">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={pathname}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{
            type: 'tween',
            ease: [0.4, 0, 0.2, 1],
            duration: 0.2,
          }}
          className="w-full"
        >
          <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

