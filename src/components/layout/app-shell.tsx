'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';

import { MainNav } from '@/components/navigation/main-nav';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { navLinks } from '@/lib/nav';

type AppShellProps = {
  children: ReactNode;
};

const PUBLIC_ROUTES = ['/login', '/register', '/verify'];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const today = new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  // For public routes like login, render children directly without shell
  if (PUBLIC_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-[100rem] flex-col gap-12 px-4 py-8 sm:px-8 lg:px-20 xl:px-24 2xl:px-28 lg:py-16">
        <header className="flex flex-col gap-6 rounded-[36px] border border-slate-200/80 bg-white/90 p-8 shadow-[0_30px_60px_-35px_rgba(15,23,42,0.75)] backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold uppercase tracking-[0.4em] text-slate-500">
              Schulplaner
            </p>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight">Daily Flow</h1>
              <p className="text-sm text-slate-500">{today}</p>
            </div>
          </div>
          <MainNav className="hidden md:flex" />
        </header>

        <section className="grid gap-4 text-sm text-slate-600 dark:text-slate-300 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-3xl border border-slate-200 bg-white/60 px-5 py-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-indigo-500/40"
            >
              <p className="font-medium text-slate-900 dark:text-white">{t(link.labelKey)}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t(link.descriptionKey)}</p>
            </a>
          ))}
          {isAdmin && (
            <a
              href="/admin"
              className="rounded-3xl border border-indigo-200 bg-indigo-50/60 px-5 py-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:hover:border-indigo-700"
            >
              <p className="font-medium text-indigo-900 dark:text-indigo-100">Admin</p>
              <p className="text-xs text-indigo-600 dark:text-indigo-400">Dashboard</p>
            </a>
          )}
        </section>

        <main className="flex-1 rounded-[36px] border border-slate-200/70 bg-white/95 p-8 shadow-[0_30px_60px_-45px_rgba(15,23,42,0.8)] backdrop-blur xl:p-16 dark:border-slate-800 dark:bg-slate-900/80 md:p-12">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

