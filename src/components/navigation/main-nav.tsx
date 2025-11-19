'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { useLanguage } from '@/contexts/language-context';
import { navLinks } from '@/lib/nav';

type MainNavProps = {
  className?: string;
};

export function MainNav({ className = '' }: MainNavProps) {
  const pathname = usePathname();
  const { t } = useLanguage();

  return (
    <nav
      className={`flex flex-wrap items-center gap-1 rounded-full border border-slate-200 bg-white/70 p-1 text-sm shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70 ${className}`}
    >
      {navLinks.map((link) => {
        const isActive =
          link.href === '/'
            ? pathname === '/'
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full px-4 py-2 font-medium transition-colors ${
              isActive
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
            }`}
          >
            {t(link.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

