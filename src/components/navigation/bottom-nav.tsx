'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useLanguage } from '@/contexts/language-context';
import { navLinks } from '@/lib/nav';

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <div className="sticky bottom-0 z-[200] w-full px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden backdrop-blur">
      <nav className="mx-auto w-full max-w-[40rem] rounded-3xl border border-slate-200 bg-white/95 px-2 py-2 text-[10px] font-medium text-slate-600 shadow-2xl dark:border-slate-800 dark:bg-slate-900/95 dark:text-slate-200">
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

