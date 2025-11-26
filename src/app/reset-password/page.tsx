'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

import { useLanguage } from '@/contexts/language-context';
import { inputStyles, subtleButtonStyles } from '@/styles/theme';

export default function ResetPasswordPage() {
  const { t } = useLanguage();
  const params = useSearchParams();
  const token = params.get('token') || '';

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');

    if (password !== confirmPassword) {
      setError(t('auth.passwordsDontMatch'));
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json().catch(() => ({}));
      console.log('[reset-password] API response:', { ok: response.ok, data });
      
      if (!response.ok) {
        const errorMsg = data.error || 'Failed to reset password.';
        const details = data.details ? `\n\nDetails: ${JSON.stringify(data.details, null, 2)}` : '';
        throw new Error(errorMsg + details);
      }

      setMessage(t('auth.passwordResetSuccess'));
      setPassword('');
      setConfirmPassword('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (!token) {
    console.log('[reset-password] No token in URL params');
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 py-8 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
        <div className="w-full max-w-md rounded-[32px] border border-rose-200 bg-white/95 p-6 text-center shadow-xl dark:border-rose-900/60 dark:bg-slate-900/80 sm:p-8">
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">{t('auth.tokenMissing')}</h1>
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{t('auth.resetInstructions')}</p>
          <Link href="/forgot-password" className={`${subtleButtonStyles} mt-6 inline-flex w-full justify-center`}>
            {t('auth.forgotPassword')}
          </Link>
        </div>
      </div>
    );
  }
  
  console.log('[reset-password] Token found in URL:', token.substring(0, 10) + '...');

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 py-8 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white/95 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">{t('auth.resetPasswordTitle')}</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('auth.resetPasswordDescription')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{t('auth.newPassword')}</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputStyles}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{t('auth.confirmNewPassword')}</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className={inputStyles}
              placeholder="••••••••"
              required
              minLength={6}
            />
          </label>

          {message && (
            <div className="rounded-2xl border border-emerald-300 bg-emerald-50/70 p-3 text-sm text-emerald-900 dark:border-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-100">
              {message}
            </div>
          )}

          {error && (
            <div className="rounded-2xl border border-rose-400 bg-rose-50/50 p-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className={`${subtleButtonStyles} w-full disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {isSubmitting ? t('common.loading') : t('auth.resetPassword')}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          <Link href="/login" className="font-semibold text-indigo-600 underline decoration-dotted hover:text-indigo-700 dark:text-indigo-400">
            {t('auth.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}


