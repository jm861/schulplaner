'use client';

import { ReactNode, useMemo } from 'react';
import { usePathname } from 'next/navigation';

import { MainNav } from '@/components/navigation/main-nav';
import { BottomNav } from '@/components/navigation/bottom-nav';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { readJSON } from '@/lib/storage';
import { navLinks } from '@/lib/nav';

type AppShellProps = {
  children: ReactNode;
};

const PUBLIC_ROUTES = ['/login', '/register'];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user, isAdmin, isOperator } = useAuth();
  const today = new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  // Get user's name from settings or user data
  const userName = useMemo(() => {
    if (!user) return null;
    
    try {
      // Try to get name from settings first
      const settings = readJSON<{ profile?: { name?: string } }>('schulplaner:settings', {});
      if (settings.profile?.name) {
        return settings.profile.name;
      }
      
      // Fallback to user data
      const users = readJSON<Array<{ id: string; name?: string }>>('schulplaner:users', []);
      const currentUser = users.find(u => u.id === user.id);
      return currentUser?.name || user.name || null;
    } catch {
      return user.name || null;
    }
  }, [user]);

  // Determine greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const isMorning = hour >= 5 && hour < 18; // 5 AM to 6 PM is morning/day
    return isMorning ? t('common.goodMorning') : t('common.goodEvening');
  }, [t]);

  // For public routes like login, render children directly without shell
  if (PUBLIC_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-slate-50 to-white text-slate-900 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:text-slate-100" style={{ position: 'relative' }}>
      <div className="mx-auto flex min-h-screen w-full max-w-[100rem] flex-col gap-6 px-3 py-4 pb-20 sm:gap-8 sm:px-6 sm:py-6 sm:pb-8 md:gap-10 md:px-8 md:py-8 md:pb-8 lg:gap-12 lg:px-20 xl:px-24 2xl:px-28 lg:py-16">
        <header className="flex flex-col gap-4 rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-lg backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/80 sm:gap-5 sm:rounded-3xl sm:p-6 md:flex-row md:items-center md:justify-between md:gap-6 md:rounded-[36px] md:p-8 md:shadow-[0_30px_60px_-35px_rgba(15,23,42,0.75)]">
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 sm:text-xs sm:tracking-[0.4em]">
              Schulplaner
            </p>
            <div>
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl md:text-3xl">
                {userName ? `${greeting}, ${userName}` : 'Daily Flow'}
              </h1>
              <p className="text-xs text-slate-500 sm:text-sm">{today}</p>
            </div>
          </div>
          <MainNav className="hidden md:flex" />
        </header>

        <section className="grid grid-cols-2 gap-2.5 text-xs text-slate-600 dark:text-slate-300 sm:gap-3 sm:text-sm sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
          {navLinks.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="rounded-2xl border border-slate-200 bg-white/60 px-3 py-3 shadow-sm backdrop-blur transition active:scale-95 hover:-translate-y-0.5 hover:border-indigo-200 hover:bg-white dark:border-slate-800 dark:bg-slate-900/50 dark:hover:border-indigo-500/40 sm:rounded-3xl sm:px-4 sm:py-3.5 md:px-5 md:py-4"
            >
              <p className="font-medium text-slate-900 dark:text-white text-[11px] leading-tight sm:text-sm">{t(link.labelKey)}</p>
              <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-tight mt-0.5 sm:text-xs sm:mt-1">{t(link.descriptionKey)}</p>
            </a>
          ))}
          {(isAdmin || isOperator) && (
            <a
              href="/admin"
              className={`rounded-3xl border px-5 py-4 shadow-sm backdrop-blur transition hover:-translate-y-0.5 ${
                isAdmin
                  ? 'border-indigo-200 bg-indigo-50/60 hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:hover:border-indigo-700'
                  : 'border-amber-200 bg-amber-50/60 hover:border-amber-300 hover:bg-amber-100 dark:border-amber-800 dark:bg-amber-950/50 dark:hover:border-amber-700'
              }`}
            >
              <p className={`font-medium ${isAdmin ? 'text-indigo-900 dark:text-indigo-100' : 'text-amber-900 dark:text-amber-100'}`}>
                {isAdmin ? 'Admin' : 'Operator'}
              </p>
              <p className={`text-xs ${isAdmin ? 'text-indigo-600 dark:text-indigo-400' : 'text-amber-600 dark:text-amber-400'}`}>
                Dashboard
              </p>
            </a>
          )}
        </section>

        <main className="flex-1 rounded-2xl border border-slate-200/70 bg-white/95 p-4 shadow-lg backdrop-blur dark:border-slate-800 dark:bg-slate-900/80 sm:rounded-3xl sm:p-6 md:rounded-[36px] md:p-8 md:shadow-[0_30px_60px_-45px_rgba(15,23,42,0.8)] xl:p-16">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

