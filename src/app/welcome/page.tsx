'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { readJSON } from '@/lib/storage';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { subtleButtonStyles } from '@/styles/theme';

type User = {
  id: string;
  email: string;
  name: string;
  yearBorn?: string;
  class?: string;
  schoolForm?: string;
};

export default function WelcomePage() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const [userData, setUserData] = useState<User | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }

    // Get full user data including additional fields
    const users = readJSON<Array<User & { password: string }>>('schulplaner:users', []);
    const fullUser = users.find((u) => u.id === user.id);
    if (fullUser) {
      const { password, ...userWithoutPassword } = fullUser;
      setUserData(userWithoutPassword);
    }
  }, [user, router]);

  const handleContinue = () => {
    router.push('/onboarding');
  };

  if (!userData) {
    return null;
  }

  return (
    <div className="space-y-12">
      <PageHeader
        badge={t('welcome.welcome')}
        title={t('welcome.title').replace('{name}', userData.name || userData.email)}
        description={t('welcome.description')}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <SectionCard title={t('welcome.yourProfile')}>
          <div className="space-y-4 text-sm">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {t('welcome.name')}
              </p>
              <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                {userData.name || t('welcome.notProvided')}
              </p>
            </div>

            {userData.yearBorn && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('welcome.yearBorn')}
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                  {userData.yearBorn}
                </p>
              </div>
            )}

            {userData.class && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('welcome.class')}
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                  {userData.class}
                </p>
              </div>
            )}

            {userData.schoolForm && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('welcome.schoolForm')}
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">
                  {userData.schoolForm}
                </p>
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard title={t('welcome.getStarted')}>
          <div className="space-y-4 text-sm text-slate-600 dark:text-slate-300">
            <p>{t('welcome.getStartedDescription')}</p>
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <span className="mt-0.5">✓</span>
                <span>{t('welcome.step1')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">✓</span>
                <span>{t('welcome.step2')}</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5">✓</span>
                <span>{t('welcome.step3')}</span>
              </li>
            </ul>
          </div>
        </SectionCard>
      </div>

      <div className="flex justify-end">
        <button
          onClick={handleContinue}
          className={`${subtleButtonStyles} px-8 py-3 text-base`}
        >
          {t('welcome.continue')}
        </button>
      </div>
    </div>
  );
}

