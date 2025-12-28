/**
 * AppShell V2 - Apple-like Navigation
 * Responsive sidebar (desktop) / tabbar (mobile) with integrated features
 */

'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';
import { cn } from '@/lib/cn';
import { SearchFilter } from './search-filter';
import { QuickAddSheet } from './quick-add-sheet';
import { useAppStore } from '@/store/app-store';
import {
  Home,
  CheckSquare,
  Calendar,
  FileText,
  BookOpen,
  Settings,
  Plus,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { PageTransition } from './page-transition';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <Home className="h-5 w-5" /> },
  { href: '/tasks', label: 'Aufgaben', icon: <CheckSquare className="h-5 w-5" /> },
  { href: '/calendar', label: 'Kalender', icon: <Calendar className="h-5 w-5" /> },
  { href: '/materials', label: 'Materialien', icon: <FileText className="h-5 w-5" /> },
  { href: '/notes', label: 'Notizen', icon: <BookOpen className="h-5 w-5" /> },
  { href: '/settings', label: 'Einstellungen', icon: <Settings className="h-5 w-5" /> },
];

export function AppShellV2({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { openCommandPalette, openQuickAdd } = useAppStore();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Routes that use PlannerShell directly and should bypass AppShellV2
  const PLANNER_SHELL_ROUTES = [
    '/study-plan',
    '/chat',
    '/substitution-plan',
    '/admin',
  ];

  // Check if current route should use AppShell
  const shouldUseShell = !pathname.startsWith('/login') &&
    !pathname.startsWith('/register') &&
    !pathname.startsWith('/forgot-password') &&
    !pathname.startsWith('/reset-password') &&
    !pathname.startsWith('/verify') &&
    !pathname.startsWith('/welcome') &&
    !pathname.startsWith('/onboarding') &&
    !PLANNER_SHELL_ROUTES.some(route => pathname === route || pathname.startsWith(route + '/'));

  if (!shouldUseShell) {
    return <>{children}</>;
  }

  return (
    <>
      <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950">
        {/* Sidebar - Desktop */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:border-r lg:border-gray-200 lg:bg-white dark:lg:border-gray-800 dark:lg:bg-gray-900">
          <div className="flex flex-1 flex-col gap-4 p-4">
            {/* Logo/Brand */}
            <div className="px-4 py-2">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Schulplaner
              </h1>
            </div>

            {/* Quick Actions */}
            <div className="space-y-2">
              <Button
                variant="default"
                size="sm"
                className="w-full"
                onClick={() => openQuickAdd('task')}
              >
                <Plus className="h-4 w-4" />
                Schnell hinzufügen
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={openCommandPalette}
              >
                <Search className="h-4 w-4" />
                ⌘K Suchen
              </Button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href || 
                  (item.href !== '/' && pathname.startsWith(item.href));
                return (
                  <motion.button
                    key={item.href}
                    onClick={() => router.push(item.href)}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl px-4 py-2.5 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-400'
                        : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {item.icon}
                    {item.label}
                    {item.badge && (
                      <span className="ml-auto rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
                        {item.badge}
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-x-hidden bg-gray-50 dark:bg-gray-950">
          <PageTransition>{children}</PageTransition>
        </main>
      </div>

      {/* Bottom Tabbar - Mobile */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white/80 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-900/80 lg:hidden pb-[env(safe-area-inset-bottom,0px)]">
        <div className="flex h-16 items-center justify-around">
          {navItems.slice(0, 5).map((item) => {
            const isActive = pathname === item.href || 
              (item.href !== '/' && pathname.startsWith(item.href));
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className={cn(
                  'flex flex-col items-center gap-1 px-3 py-2 text-xs transition-colors',
                  isActive
                    ? 'text-blue-600 dark:text-blue-400'
                    : 'text-gray-500 dark:text-gray-400'
                )}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Floating Action Button - Mobile */}
      <motion.button
        className="fixed bottom-20 right-4 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg lg:hidden mb-[calc(env(safe-area-inset-bottom,0px)+1rem)]"
        onClick={() => openQuickAdd('task')}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Plus className="h-6 w-6" />
      </motion.button>

      {/* Global Components */}
      <SearchFilter />
      <QuickAddSheet />
    </>
  );
}

