'use client';

import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useLanguage } from '@/contexts/language-context';
import { navLinks } from '@/lib/nav';

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [mounted, setMounted] = useState(false);
  const navRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Portal requires client-side mounting
    if (typeof window !== 'undefined') {
      setMounted(true);
    }
  }, []);

  useEffect(() => {
    if (!mounted || !navRef.current) return;

    const nav = navRef.current;
    
    // Aggressive position fixing for iOS Safari
    const fixPosition = () => {
      if (!nav) return;
      
      // Force fixed position with explicit values
      nav.style.cssText = `
        position: fixed !important;
        bottom: 0 !important;
        left: 0 !important;
        right: 0 !important;
        top: auto !important;
        z-index: 9999 !important;
        transform: translate3d(0, 0, 0) !important;
        -webkit-transform: translate3d(0, 0, 0) !important;
        will-change: transform !important;
        isolation: isolate !important;
        pointer-events: none !important;
      `;
      
      // Verify position
      requestAnimationFrame(() => {
        if (!nav) return;
        const rect = nav.getBoundingClientRect();
        const viewportHeight = window.innerHeight || window.visualViewport?.height || 0;
        const expectedBottom = 0;
        const actualBottom = viewportHeight - rect.bottom;
        
        // If position is wrong, force it again
        if (Math.abs(actualBottom - expectedBottom) > 2) {
          nav.style.bottom = '0px';
          nav.style.top = 'auto';
        }
      });
    };

    // Fix on all possible events
    const events = ['scroll', 'resize', 'orientationchange', 'touchmove', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, fixPosition, { passive: true });
      document.addEventListener(event, fixPosition, { passive: true });
    });
    
    // Fix immediately and continuously
    fixPosition();
    const interval = setInterval(fixPosition, 50); // Check every 50ms
    const rafInterval = setInterval(() => {
      requestAnimationFrame(fixPosition);
    }, 100);

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, fixPosition);
        document.removeEventListener(event, fixPosition);
      });
      clearInterval(interval);
      clearInterval(rafInterval);
    };
  }, [mounted]);

  const navContent = (
    <div 
      ref={navRef}
      className="mobile-bottom-nav pointer-events-none fixed bottom-0 left-0 right-0 z-[200] md:hidden" 
      style={{ 
        position: 'fixed', 
        bottom: 0, 
        left: 0, 
        right: 0, 
        transform: 'translate3d(0, 0, 0)',
        WebkitTransform: 'translate3d(0, 0, 0)',
        isolation: 'isolate',
        willChange: 'transform',
      }}
    >
      <nav className="pointer-events-auto mx-auto w-full max-w-[430px] rounded-3xl border border-gray-200 bg-white px-2 py-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-[10px] font-medium text-gray-600 shadow-lg dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
        <ul className="flex items-center justify-between gap-1">
        {navLinks.map((link) => {
          const isActive =
            link.href === '/'
              ? pathname === '/'
              : pathname.startsWith(link.href);

          return (
            <li key={link.href} className="flex-1">
              <Link
                href={link.href}
                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 transition-all active:scale-95 min-h-[60px] justify-center ${
                  isActive
                    ? 'text-gray-900 dark:text-white bg-gray-100 dark:bg-gray-800'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              >
                <span
                  className={`h-1 w-8 rounded-full transition ${
                    isActive
                      ? 'bg-blue-500 dark:bg-blue-400'
                      : 'bg-transparent'
                  }`}
                />
                <span className="text-[10px] leading-tight text-center">{t(link.labelKey)}</span>
              </Link>
            </li>
          );
        })}
        </ul>
      </nav>
    </div>
  );

  if (!mounted) {
    return null;
  }

  return createPortal(navContent, document.body);
}

