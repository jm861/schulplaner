'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { readJSON, writeJSON } from '@/lib/storage';
import { subtleButtonStyles } from '@/styles/theme';

type User = {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
};

type UserWithPassword = User & { password: string };

export default function AdminPage() {
  const { t } = useLanguage();
  const { user, logout, isAdmin } = useAuth();
  const router = useRouter();
  const [users, setUsers] = useState<UserWithPassword[]>([]);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!isAdmin) {
      router.push('/');
      return;
    }

    const allUsers = readJSON<UserWithPassword[]>('schulplaner:users', []);
    setUsers(allUsers);
  }, [isAdmin, router]);

  const handleDeleteUser = (userId: string, userEmail: string) => {
    // Prevent deleting yourself
    if (userId === user?.id) {
      alert(t('admin.cannotDeleteSelf'));
      return;
    }

    if (!confirm(t('admin.confirmDelete').replace('{email}', userEmail))) {
      return;
    }

    const updatedUsers = users.filter((u) => u.id !== userId);
    writeJSON('schulplaner:users', updatedUsers);
    setUsers(updatedUsers);
  };

  const togglePasswordVisibility = (userId: string) => {
    setShowPasswords((prev) => ({
      ...prev,
      [userId]: !prev[userId],
    }));
  };

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
                className="rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/60"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{u.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{u.email}</p>
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs text-slate-600 dark:text-slate-400">{t('admin.password')}:</span>
                      <span className="font-mono text-xs text-slate-900 dark:text-white">
                        {showPasswords[u.id] ? u.password : '••••••••'}
                      </span>
                      <button
                        onClick={() => togglePasswordVisibility(u.id)}
                        className="text-xs font-semibold text-indigo-600 underline decoration-dotted hover:text-indigo-700 dark:text-indigo-400"
                      >
                        {showPasswords[u.id] ? t('admin.hidePassword') : t('admin.showPassword')}
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        u.role === 'admin'
                          ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-200'
                          : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {u.role === 'admin' ? t('admin.roleAdmin') : t('admin.roleUser')}
                    </span>
                    {u.id !== user?.id && (
                      <button
                        onClick={() => handleDeleteUser(u.id, u.email)}
                        className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/50"
                      >
                        {t('admin.delete')}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </SectionCard>
    </div>
  );
}

