'use client';

import { FormEvent, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/contexts/auth-context';
import { readJSON, writeJSON } from '@/lib/storage';
import { inputStyles, subtleButtonStyles } from '@/styles/theme';

type User = {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  password: string;
};

const USERS_STORAGE_KEY = 'schulplaner:users';

export default function VerifyPage() {
  const { t } = useLanguage();
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get('email') || '';
  
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (!email) {
      router.push('/register');
      return;
    }

    // Start countdown for resend
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [email, router]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/verify-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code }),
      });

      const data = await response.json();
      setIsLoading(false);

      if (!response.ok) {
        setError(data.error || t('auth.verificationFailed'));
        return;
      }

      // Verification successful - create user account
      try {
        const pendingUserStr = sessionStorage.getItem('pendingUser');
        if (!pendingUserStr) {
          setError(t('auth.sessionExpired'));
          router.push('/register');
          return;
        }

        const pendingUser: User = JSON.parse(pendingUserStr);
        const users = readJSON<Array<User>>(USERS_STORAGE_KEY, []);
        
        // Create user
        users.push(pendingUser);
        writeJSON(USERS_STORAGE_KEY, users);
        
        // Clear pending user
        sessionStorage.removeItem('pendingUser');

        // Auto-login the new user
        const success = await login(pendingUser.email, pendingUser.password);
        
        if (success) {
          router.push('/onboarding');
        } else {
          router.push(`/login?verified=true&email=${encodeURIComponent(email)}`);
        }
      } catch (error) {
        setError(t('auth.accountCreationFailed'));
      }
    } catch (error) {
      setIsLoading(false);
      setError(t('auth.verificationFailed'));
    }
  }

  async function handleResend() {
    setError('');
    setIsResending(true);

    try {
      const response = await fetch('/api/send-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      setIsResending(false);

      if (!response.ok) {
        setError(data.error || t('auth.resendFailed'));
        return;
      }

      // Reset countdown
      setCountdown(60);
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Show success message
      alert(t('auth.codeResent'));
    } catch (error) {
      setIsResending(false);
      setError(t('auth.resendFailed'));
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white/95 p-8 shadow-xl dark:border-slate-800 dark:bg-slate-900/80">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-white">Schulplaner</h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{t('auth.verifyTitle')}</p>
        </div>

        <div className="mb-6 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 text-sm text-indigo-900 dark:border-indigo-900 dark:bg-indigo-950/50 dark:text-indigo-100">
          <p className="font-semibold">{t('auth.checkEmail')}</p>
          <p className="mt-1">{email}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{t('auth.verificationCode')}</span>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              className={inputStyles}
              placeholder="000000"
              maxLength={6}
              required
            />
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('auth.enterCode')}</p>
          </label>

          {error && (
            <div className="rounded-2xl border border-rose-400 bg-rose-50/50 p-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading || code.length !== 6}
            className={`${subtleButtonStyles} w-full disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {isLoading ? t('auth.verifying') : t('auth.verify')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
            {t('auth.didntReceiveCode')}
          </p>
          <button
            type="button"
            onClick={handleResend}
            disabled={isResending || countdown > 0}
            className="text-xs font-semibold text-indigo-600 underline decoration-dotted hover:text-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed dark:text-indigo-400"
          >
            {isResending
              ? t('auth.resending')
              : countdown > 0
                ? t('auth.resendIn').replace('{seconds}', countdown.toString())
                : t('auth.resendCode')}
          </button>
        </div>
      </div>
    </div>
  );
}

