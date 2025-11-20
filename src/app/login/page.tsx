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
  const [showPassword, setShowPassword] = useState(false);
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
    event.stopPropagation(); // Prevent mobile browser form handling issues
    
    setError('');
    setIsLoading(true);

    // Normalize email (lowercase, trim) for mobile compatibility
    const normalizedEmail = email.toLowerCase().trim();
    const trimmedPassword = password.trim();

    // Validate inputs
    if (!normalizedEmail || !trimmedPassword) {
      setError('Bitte fülle alle Felder aus');
      setIsLoading(false);
      return;
    }

    try {
      const success = await login(normalizedEmail, trimmedPassword);
      
      if (success) {
        // On mobile, wait longer for state to update and localStorage to sync
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Use window.location for mobile compatibility (more reliable than router.push)
        // Check if user state is actually set before navigating
        const checkUser = () => {
          try {
            const authData = localStorage.getItem('schulplaner:auth');
            if (authData) {
              return true;
            }
          } catch {
            // localStorage might not be available
          }
          return false;
        };
        
        // Give it a moment for mobile localStorage to sync
        let userSet = checkUser();
        if (!userSet) {
          await new Promise(resolve => setTimeout(resolve, 200));
          userSet = checkUser();
        }
        
        // Navigate - use window.location on mobile for better compatibility
        if (typeof window !== 'undefined') {
          // Try router first, fallback to window.location
          try {
            router.push('/');
            // Also set window.location as backup for mobile
            setTimeout(() => {
              if (window.location.pathname === '/login') {
                window.location.href = '/';
              }
            }, 300);
          } catch (navError) {
            console.warn('[login] Router navigation failed, using window.location:', navError);
            window.location.href = '/';
          }
        }
      } else {
        setError(t('auth.invalidCredentials'));
        setIsLoading(false);
      }
    } catch (err) {
      console.error('[login] Login error:', err);
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      setError(t('auth.invalidCredentials') + (errorMsg ? ` (${errorMsg})` : ''));
      setIsLoading(false);
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
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 via-slate-50 to-white px-4 py-8 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white/95 p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900/80 sm:p-8">
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
              placeholder="your.email@example.com"
              required
              autoComplete="email"
              autoCapitalize="none"
              autoCorrect="off"
            />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{t('auth.password')}</span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={inputStyles}
                placeholder="••••••••"
                required
                autoComplete="current-password"
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck="false"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-lg font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 touch-manipulation min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={0}
              >
                {showPassword ? '👁️' : '👁️‍🗨️'}
              </button>
            </div>
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
            aria-busy={isLoading}
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

