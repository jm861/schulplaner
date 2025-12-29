/**
 * Page Transition Component
 * Provides smooth page transitions using Framer Motion
 * Ensures pages never disappear during navigation
 */

'use client';

import { usePathname } from 'next/navigation';
import { type ReactNode, useEffect, useRef } from 'react';

export function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const containerRef = useRef<HTMLDivElement>(null);

  // #region agent log
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const container = containerRef.current;
    if (!container) return;
    
    const checkDimensions = () => {
      const rect = container.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const scrollWidth = document.documentElement.scrollWidth;
      fetch('http://127.0.0.1:7242/ingest/1d09eedf-cddd-4c68-a262-7d0bbd80b9b8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page-transition.tsx:useEffect',message:'Container dimensions check',data:{containerWidth:rect.width,viewportWidth,scrollWidth,containerLeft:rect.left,containerRight:rect.right,pathname},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'A'})}).catch(()=>{});
    };
    
    checkDimensions();
    const interval = setInterval(checkDimensions, 50);
    const timeout = setTimeout(() => clearInterval(interval), 1000);
    
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [pathname]);
  // #endregion

  // #region agent log
  useEffect(() => {
    if (typeof window === 'undefined') return;
    fetch('http://127.0.0.1:7242/ingest/1d09eedf-cddd-4c68-a262-7d0bbd80b9b8',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page-transition.tsx:mount',message:'PageTransition mounted',data:{pathname,viewportWidth:window.innerWidth,scrollWidth:document.documentElement.scrollWidth},timestamp:Date.now(),sessionId:'debug-session',runId:'run1',hypothesisId:'B'})}).catch(()=>{});
  }, [pathname]);
  // #endregion

  return (
    <div
      ref={containerRef}
      key={pathname}
      className="relative w-full min-h-screen overflow-x-hidden bg-gray-50 dark:bg-gray-950"
      style={{ 
        maxWidth: '100%',
        width: '100%',
        minWidth: 0,
        contain: 'layout style paint',
        position: 'relative',
        left: 0,
        right: 0,
      }}
    >
      <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {children}
      </div>
    </div>
  );
}

