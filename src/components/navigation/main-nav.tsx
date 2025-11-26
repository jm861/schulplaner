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
      className={`flex flex-wrap items-center gap-1 rounded-full border border-gray-200 bg-white p-1 text-sm shadow-sm dark:border-gray-800 dark:bg-gray-900 ${className}`}
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
            className={`rounded-full px-4 py-2 font-medium transition-all ${
              isActive
                ? 'bg-blue-500 text-white dark:bg-blue-600'
                : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
            }`}
          >
            {t(link.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}

