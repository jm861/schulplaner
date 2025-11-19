'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { readJSON, writeJSON } from '@/lib/storage';
import { inputStyles, subtleButtonStyles } from '@/styles/theme';

type User = {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'operator';
  password: string;
};

const USERS_STORAGE_KEY = 'schulplaner:users';

export default function RegisterPage() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError(t('auth.passwordsDontMatch'));
      return;
    }

    if (formData.password.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    setIsLoading(true);

    try {
      const users = readJSON<Array<User>>(USERS_STORAGE_KEY, []);
      
      // Check if email already exists
      if (users.some((u) => u.email === formData.email)) {
        setError(t('auth.emailExists'));
        setIsLoading(false);
        return;
      }

      // Create new user
      const newUser: User = {
        id: crypto.randomUUID(),
        email: formData.email,
        name: formData.name,
        role: 'user',
        password: formData.password,
      };

      users.push(newUser);
      writeJSON(USERS_STORAGE_KEY, users);

      // Auto-login the new user
      const success = await login(formData.email, formData.password);
      setIsLoading(false);

      if (success) {
        router.push('/onboarding');
      } else {
        setError(t('auth.registrationFailed'));
      }
    } catch (error) {
      setIsLoading(false);
      setError(t('auth.registrationFailed'));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white/95 p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Schulplaner</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('auth.registerTitle')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{t('auth.fullName')}</span>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              className={inputStyles}
              placeholder={t('auth.fullNamePlaceholder')}
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{t('auth.email')}</span>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData((prev) => ({ ...prev, email: e.target.value }))}
              className={inputStyles}
              placeholder="your.email@example.com"
              required
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{t('auth.password')}</span>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData((prev) => ({ ...prev, password: e.target.value }))}
              className={inputStyles}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{t('auth.confirmPassword')}</span>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))}
              className={inputStyles}
              placeholder="••••••••"
              required
              minLength={6}
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
            {isLoading ? t('auth.creatingAccount') : t('auth.createAccount')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link href="/login" className="font-semibold text-indigo-600 underline decoration-dotted hover:text-indigo-700 dark:text-indigo-400">
              {t('auth.signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

