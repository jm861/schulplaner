'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ReactNode, useState } from 'react';
import { useLanguage } from '@/contexts/language-context';

export type PlannerNavItem = {
  label: string;
  href: string;
  badge?: string;
};

export const PLANNER_FONT = "font-['SF Pro Text','-apple-system','BlinkMacSystemFont','system-ui','sans-serif']";

type PlannerShellProps = {
  sidebar: ReactNode;
  children: ReactNode;
  backgroundClassName?: string;
  mainClassName?: string;
  sidebarClassName?: string;
};

export function PlannerShell({
  sidebar,
  children,
  backgroundClassName = 'bg-gray-50 dark:bg-black',
  mainClassName = 'rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 md:p-8 lg:p-10 dark:border-gray-800 dark:bg-gray-900',
  sidebarClassName = 'w-full max-w-sm rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6 dark:border-gray-800 dark:bg-gray-900',
}: PlannerShellProps) {
  return (
    <div className={`${backgroundClassName} pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1rem,env(safe-area-inset-bottom))] text-gray-900 dark:text-gray-100 sm:pt-6 sm:pb-6 md:pt-8 md:pb-8 lg:pt-12 lg:pb-12 w-full max-w-full min-h-0 overflow-x-visible`}>
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-4 sm:gap-6 md:gap-8 lg:flex-row lg:items-start px-4 sm:px-6 md:px-8 lg:px-12 xl:px-16 overflow-x-visible">
        <aside className={`${sidebarClassName} lg:sticky lg:top-[max(1rem,env(safe-area-inset-top))] lg:self-start lg:max-h-[calc(100vh-env(safe-area-inset-top,0px)-env(safe-area-inset-bottom,0px)-2rem)] lg:overflow-y-auto lg:w-[384px] lg:flex-shrink-0 lg:min-w-[384px] lg:z-10`}>{sidebar}</aside>
        <section className={`flex-1 w-full min-w-0 ${mainClassName} overflow-x-auto`}>{children}</section>
      </div>
    </div>
  );
}

type PlannerNavProps = {
  items: PlannerNavItem[];
  label?: string;
};

export function PlannerNav({ items, label = 'Navigation' }: PlannerNavProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const { t } = useLanguage();
  const isHomeActive = pathname === '/';

  return (
    <div className="mt-6">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
      >
        <span>{label}</span>
        <svg
          className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      <nav
        className={`mt-2 space-y-1 text-sm font-medium transition-all duration-300 ease-in-out ${
          isOpen
            ? 'max-h-[800px] opacity-100'
            : 'max-h-0 overflow-hidden opacity-0'
        }`}
      >
        {items.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setIsOpen(false)}
              className={`flex w-full items-center justify-between rounded-xl px-4 py-2.5 transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 ${
                isActive
                  ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400'
                  : 'text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800'
              }`}
            >
              <span>{item.label}</span>
              {isActive && item.badge ? (
                <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">{item.badge}</span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      
      <div className="mt-4">
        <Link
          href="/"
          className={`flex w-full items-center gap-2 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium transition-all hover:bg-gray-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 ${
            isHomeActive
              ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800'
              : ''
          }`}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
            />
          </svg>
          <span>{t('common.backToHome')}</span>
        </Link>
      </div>
    </div>
  );
}

