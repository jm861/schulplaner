'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';

import { useLanguage } from '@/contexts/language-context';
import { inputStyles, subtleButtonStyles } from '@/styles/theme';

export default function ForgotPasswordPage() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage('');
    setError('');

    setIsSubmitting(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await response.json().catch(() => ({}));
      
      if (!response.ok) {
        // Show detailed error message, including details in development
        const errorMsg = data.error || 'Failed to send reset link.';
        const details = data.details ? `\n\nDetails: ${JSON.stringify(data.details, null, 2)}` : '';
        const resetUrl = data.resetUrl ? `\n\nReset URL (dev only): ${data.resetUrl}` : '';
        throw new Error(errorMsg + details + resetUrl);
      }

      setMessage(t('auth.resetEmailSent'));
      setEmail('');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      if (process.env.NODE_ENV === 'development') {
        console.warn('[forgot-password] Error:', errorMessage);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 py-8 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white/95 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">{t('auth.forgotPasswordTitle')}</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('auth.resetInstructions')}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{t('auth.email')}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputStyles}
              placeholder="you@example.com"
              required
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
            {isSubmitting ? t('common.loading') : t('auth.sendResetLink')}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-slate-500 dark:text-slate-400">
          {t('auth.rememberPassword')}{' '}
          <Link href="/login" className="font-semibold text-indigo-600 underline decoration-dotted hover:text-indigo-700 dark:text-indigo-400">
            {t('auth.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}


