'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { inputStyles, subtleButtonStyles } from '@/styles/theme';

export default function LoginPage() {
  const { t } = useLanguage();
  const { login, user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Wait a bit for auth context to initialize
    const timer = setTimeout(() => {
      setIsInitialized(true);
    }, 200);

    return () => clearTimeout(timer);
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    const success = await login(email, password);
    setIsLoading(false);

    if (success) {
      router.push('/');
    } else {
      setError(t('auth.invalidCredentials'));
    }
  }

  // Show message if already logged in, but don't auto-redirect
  if (!isInitialized) {
    return null;
  }

  if (user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white/95 p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900/80">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Schulplaner</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('auth.alreadyLoggedIn')}</p>
          </div>
          <div className="space-y-4">
            <p className="text-center text-sm text-slate-600 dark:text-slate-300">
              {t('auth.loggedInAs')} <strong>{user.email}</strong>
            </p>
            <div className="flex gap-3">
              <Link
                href="/"
                className={`${subtleButtonStyles} flex-1 text-center`}
              >
                {t('auth.goToHome')}
              </Link>
              <Link
                href="/settings"
                className={`${subtleButtonStyles} flex-1 text-center`}
              >
                {t('auth.goToSettings')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white/95 p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Schulplaner</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('auth.loginTitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{t('auth.email')}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputStyles}
              placeholder="admin@schulplaner.de"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{t('auth.password')}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputStyles}
              placeholder="••••••••"
              required
            />
          </label>

          {error && (
            <div className="rounded-2xl border border-rose-400 bg-rose-50/50 p-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className={`${subtleButtonStyles} w-full disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {isLoading ? t('auth.loggingIn') : t('auth.login')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('auth.dontHaveAccount')}{' '}
            <Link href="/register" className="font-semibold text-indigo-600 underline decoration-dotted hover:text-indigo-700 dark:text-indigo-400">
              {t('auth.createAccount')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

