'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { readJSON } from '@/lib/storage';
import { subtleButtonStyles } from '@/styles/theme';

type User = {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
};

export default function AdminPage() {
  const { t } = useLanguage();
  const { user, logout, isAdmin } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<Array<User & { password?: string }>>([]);

  useEffect(() => {
    if (!isAdmin) {
      router.push('/');
      return;
    }

    const allUsers = readJSON<Array<User & { password: string }>>('schulplaner:users', []);
    // Remove passwords for display
    const usersWithoutPasswords = allUsers.map(({ password, ...user }) => user);
    setUsers(usersWithoutPasswords);
  }, [isAdmin, router]);

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="space-y-12">
      <PageHeader
        badge="Admin"
        title={t('admin.title')}
        description={t('admin.description')}
      />

      <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60">
        <div>
          <p className="text-sm font-semibold text-slate-900 dark:text-white">{t('admin.loggedInAs')}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{user?.email}</p>
        </div>
        <button onClick={logout} className={subtleButtonStyles}>
          {t('admin.logout')}
        </button>
      </div>

      <SectionCard title={t('admin.allUsers')}>
        <div className="space-y-3">
          {users.length === 0 ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('admin.noUsers')}</p>
          ) : (
            users.map((u) => (
              <div
                key={u.id}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{u.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                </div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    u.role === 'admin'
                      ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
                      : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {u.role === 'admin' ? t('admin.roleAdmin') : t('admin.roleUser')}
                </span>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}

