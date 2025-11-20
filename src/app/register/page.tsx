'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { readJSON, writeJSON } from '@/lib/storage';
import { inputStyles, selectStyles, subtleButtonStyles } from '@/styles/theme';

type User = {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin' | 'operator';
  password: string;
  yearBorn?: string;
  class?: string;
  schoolForm?: string;
  registeredAt?: string;
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
    yearBorn: '',
    class: '',
    schoolForm: '',
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

      // Create new user - normalize email for consistency
      const normalizedEmail = formData.email.toLowerCase().trim();
      const newUser: User = {
        id: crypto.randomUUID(),
        email: normalizedEmail, // Store normalized email
        name: formData.name,
        role: 'user',
        password: formData.password, // Store password as-is (no trimming to preserve spaces if intentional)
        yearBorn: formData.yearBorn || undefined,
        class: formData.class || undefined,
        schoolForm: formData.schoolForm || undefined,
        registeredAt: new Date().toISOString(),
      };

      users.push(newUser);
      const writeSuccess = writeJSON(USERS_STORAGE_KEY, users);
      
      // Verify write on mobile
      if (!writeSuccess) {
        console.warn('[register] Initial write may have failed, retrying...');
        await new Promise(resolve => setTimeout(resolve, 100));
        const retrySuccess = writeJSON(USERS_STORAGE_KEY, users);
        if (!retrySuccess) {
          console.error('[register] Failed to write user to localStorage after retry');
        }
      }
      
      // Verify user was actually saved
      const verifyUsers = readJSON<Array<User & { password: string }>>(USERS_STORAGE_KEY, []);
      const userSaved = verifyUsers.some(u => u.email.toLowerCase().trim() === normalizedEmail);
      console.log('[register] User saved verification:', {
        writeSuccess,
        userSaved,
        totalUsers: verifyUsers.length,
        savedEmail: normalizedEmail
      });
      
      if (!userSaved) {
        console.error('[register] User was not saved correctly!');
        setError('Fehler beim Speichern des Benutzers. Bitte versuche es erneut.');
        setIsLoading(false);
        return;
      }

      // Sync to API (server-side storage)
      try {
        await fetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'create', user: newUser }),
        });
      } catch (error) {
        console.warn('Failed to sync user to API:', error);
        // Continue anyway - localStorage is updated
      }

      // Auto-login the new user - use normalized email
      console.log('[register] Attempting auto-login with:', {
        email: normalizedEmail,
        passwordLength: formData.password.length
      });
      
      const success = await login(normalizedEmail, formData.password);
      setIsLoading(false);

      if (success) {
        // Wait a bit for mobile state sync
        await new Promise(resolve => setTimeout(resolve, 200));
        router.push('/welcome');
      } else {
        console.error('[register] Auto-login failed after registration');
        setError('Registrierung erfolgreich, aber automatische Anmeldung fehlgeschlagen. Bitte melde dich manuell an.');
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

          <div className="border-t border-slate-200 pt-4 dark:border-slate-800">
            <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('auth.additionalInfo')}
            </p>
            
            <label className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-200">{t('auth.yearBorn')}</span>
              <input
                type="number"
                value={formData.yearBorn}
                onChange={(e) => setFormData((prev) => ({ ...prev, yearBorn: e.target.value }))}
                className={inputStyles}
                placeholder="2007"
                min="1990"
                max={new Date().getFullYear()}
              />
            </label>

            <label className="flex flex-col gap-1 text-sm mt-4">
              <span className="font-medium text-slate-700 dark:text-slate-200">{t('auth.class')}</span>
              <input
                type="text"
                value={formData.class}
                onChange={(e) => setFormData((prev) => ({ ...prev, class: e.target.value }))}
                className={inputStyles}
                placeholder="11a"
              />
            </label>

            <label className="flex flex-col gap-1 text-sm mt-4">
              <span className="font-medium text-slate-700 dark:text-slate-200">{t('auth.schoolForm')}</span>
              <select
                value={formData.schoolForm}
                onChange={(e) => setFormData((prev) => ({ ...prev, schoolForm: e.target.value }))}
                className={selectStyles}
              >
                <option value="">{t('auth.selectSchoolForm')}</option>
                <option value="Gymnasium">Gymnasium</option>
                <option value="Realschule">Realschule</option>
                <option value="FOS">FOS (Fachoberschule)</option>
                <option value="BOS">BOS (Berufsoberschule)</option>
                <option value="Gesamtschule">Gesamtschule</option>
                <option value="Hauptschule">Hauptschule</option>
                <option value="Other">{t('auth.other')}</option>
              </select>
            </label>
          </div>

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

