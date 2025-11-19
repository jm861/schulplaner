'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useLanguage } from '@/contexts/language-context';
import { navLinks } from '@/lib/nav';

export function BottomNav() {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav className="fixed inset-x-0 bottom-4 z-50 mx-auto w-[calc(100%-2rem)] max-w-xl rounded-3xl border border-slate-200 bg-white/90 px-4 py-3 text-xs font-medium text-slate-600 shadow-xl backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-200 md:hidden">
      <ul className="flex items-center justify-between gap-2">
        {navLinks.map((link) => {
          const isActive =
            link.href === '/'
              ? pathname === '/'
              : pathname.startsWith(link.href);

          return (
            <li key={link.href} className="flex-1">
              <Link
                href={link.href}
                className={`flex flex-col items-center gap-1 rounded-2xl px-2 py-1 transition ${
                  isActive
                    ? 'text-slate-900 dark:text-white'
                    : 'text-slate-500 dark:text-slate-400'
                }`}
              >
                <span
                  className={`h-1 w-full rounded-full transition ${
                    isActive
                      ? 'bg-slate-900 dark:bg-white'
                      : 'bg-transparent'
                  }`}
                />
                <span>{t(link.labelKey)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

