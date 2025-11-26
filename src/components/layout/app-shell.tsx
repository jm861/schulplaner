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

const PUBLIC_ROUTES = ['/login', '/register', '/forgot-password', '/reset-password'];
// Routes that use PlannerShell and should bypass AppShell wrapper
const PLANNER_SHELL_ROUTES = [
  '/',
  '/calendar',
  '/tasks',
  '/exams',
  '/study-plan',
  '/settings',
  '/materials',
  '/chat',
  '/substitution-plan',
  '/onboarding',
  '/welcome',
];

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { t } = useLanguage();
  const { user, isAdmin, isOperator } = useAuth();
  const today = new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date());

  // Get user's name - prioritize the logged-in user object first
  const userName = useMemo(() => {
    if (!user) return null;
    
    // First, use the name from the logged-in user object (most reliable)
    if (user.name) {
      return user.name;
    }
    
    try {
      // Then try to get from users array by matching ID or email
      const users = readJSON<Array<{ id: string; name?: string; email?: string }>>('schulplaner:users', []);
      const currentUser = users.find(
        (u) =>
          u.id === user.id ||
          u.email?.toLowerCase().trim() === user.email?.toLowerCase().trim()
      );
      if (currentUser?.name) {
        return currentUser.name;
      }
      
      // Last resort: check settings, but ensure it matches the current user
      const settings = readJSON<{ profile?: { name?: string; email?: string } }>('schulplaner:settings', {});
      if (
        settings.profile?.name &&
        (!settings.profile?.email ||
          settings.profile.email.toLowerCase().trim() === user.email?.toLowerCase().trim())
      ) {
        return settings.profile.name;
      }
      
      return null;
    } catch {
      return null;
    }
  }, [user]);

  // Determine greeting based on time of day
  const greeting = useMemo(() => {
    const now = new Date();
    const hour = now.getHours();
    const minute = now.getMinutes();
    const isMorning = hour < 11 || (hour === 11 && minute < 30);
    if (hour >= 18 || hour < 5) {
      return t('common.goodEvening');
    }
    if (isMorning && hour >= 5) {
      return t('common.goodMorning');
    }
    return t('common.hello');
  }, [t]);

  // For public routes like login, render children directly without shell
  if (PUBLIC_ROUTES.includes(pathname)) {
    return <>{children}</>;
  }

  // For routes that use PlannerShell, render children directly (PlannerShell handles its own layout)
  if (PLANNER_SHELL_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'))) {
    return <>{children}</>;
  }

  return (
    <div className="relative flex justify-center bg-gray-50 text-gray-900 dark:bg-black dark:text-gray-100" style={{ transform: 'none' }}>
      <div className="flex w-full max-w-[430px] flex-col gap-5 px-4 pb-28 pt-4 sm:max-w-[100rem] sm:gap-8 sm:px-6 sm:pt-6 md:gap-10 md:px-8 md:pb-0 lg:gap-12 lg:px-20 xl:px-24 2xl:px-28 lg:pt-12" style={{ transform: 'none' }}>
        <header className="flex flex-col gap-3 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:gap-4 sm:p-6 md:flex-row md:items-center md:justify-between md:gap-6 md:p-8">
          <div className="flex flex-col gap-1.5 sm:gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500 sm:text-xs sm:tracking-[0.4em]">
              Schulplaner
            </p>
            <div>
              <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-white sm:text-2xl md:text-3xl">
                {userName ? `${greeting}, ${userName}` : 'Daily Flow'}
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400 sm:text-sm">{today}</p>
            </div>
          </div>
          <MainNav className="hidden md:flex" />
        </header>


        <main className="rounded-3xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900 sm:rounded-3xl sm:p-6 md:rounded-3xl md:p-8 xl:p-16">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}

