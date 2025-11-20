'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useLanguage } from '@/contexts/language-context';
import { navLinks } from '@/lib/nav';

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <div 
      className="fixed bottom-0 left-0 right-0 z-[100] mx-auto w-full max-w-xl md:hidden"
      style={{ 
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        margin: '0 auto',
        maxWidth: '42rem',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        WebkitTransform: 'translateZ(0)',
        transform: 'translateZ(0)',
        WebkitBackfaceVisibility: 'hidden',
        backfaceVisibility: 'hidden',
        willChange: 'transform'
      }}
    >
      <nav className="rounded-t-3xl border-t border-slate-200 bg-white/95 px-2 py-2 text-[10px] font-medium text-slate-600 shadow-2xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-200">
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
                className={`flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 transition active:scale-95 min-h-[60px] justify-center ${
                  isActive
                    ? 'text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <span
                  className={`h-1 w-8 rounded-full transition ${
                    isActive
                      ? 'bg-indigo-600 dark:bg-indigo-400'
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
}

