'use client';

import { useEffect, useState, useCallback } from 'react';

import { SectionCard } from '@/components/ui/section-card';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { inputStyles, subtleButtonStyles } from '@/styles/theme';
import { readJSON, writeJSON } from '@/lib/storage';
import { PlannerShell, PlannerNav } from '@/components/layout/planner-shell';
import { buildPlannerNavItems } from '@/lib/planner-nav';

type SubstitutionEntry = {
  id: string;
  date: string;
  class: string;
  period: string;
  subject: string;
  originalTeacher?: string;
  substituteTeacher?: string;
  room?: string;
  note?: string;
};

const STORAGE_KEY = 'schulplaner:substitution-plan';

export default function SubstitutionPlanPage() {
  const { user, isAdmin, isOperator } = useAuth();
  const { t } = useLanguage();
  const [url, setUrl] = useState('https://www.feldbergschule.de/klassenvertretungen/index.html');
  const [className, setClassName] = useState('12Fo-b');
  const [entries, setEntries] = useState<SubstitutionEntry[]>([]);
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
      // Load saved data
    try {
      const saved = readJSON<{ entries: SubstitutionEntry[]; url: string; className?: string; lastUpdated: string }>(STORAGE_KEY, { entries: [], url: '', lastUpdated: '' });
      if (saved.entries) {
        setEntries(saved.entries);
      }
      if (saved.url) {
        setUrl(saved.url);
      }
      if (saved.className) {
        setClassName(saved.className);
      }
      if (saved.lastUpdated) {
        setLastUpdated(new Date(saved.lastUpdated));
      }
    } catch (error) {
      console.error('Error loading substitution plan:', error);
    }
  }, []);

  const handleFetch = useCallback(async (silent = false) => {
    if (!url.trim()) {
      if (!silent) setError('Bitte gib eine URL ein');
      return;
    }

    if (!user) {
      if (!silent) setError('Bitte melde dich an');
      return;
    }

    if (!silent) {
      setIsFetching(true);
      setError(null);
    }

    try {
      const response = await fetch('/api/fetch-substitution-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, className: className.trim() || undefined }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || 'Fehler beim Abrufen des Vertretungsplans');
      }

      const data = await response.json();
      
      if (data.entries && Array.isArray(data.entries)) {
        setEntries(data.entries);
        setLastUpdated(new Date());
        
        // Save to localStorage
        writeJSON(STORAGE_KEY, {
          entries: data.entries,
          url,
          className,
          lastUpdated: new Date().toISOString(),
        });
        
        if (!silent) {
          setError(null);
        }
      } else {
        throw new Error('Ungültiges Datenformat erhalten');
      }
    } catch (error) {
      console.error('Error fetching substitution plan:', error);
      if (!silent) {
        setError(error instanceof Error ? error.message : 'Unbekannter Fehler');
      }
    } finally {
      if (!silent) {
        setIsFetching(false);
      }
    }
  }, [url, className, user]);

  // Auto-refresh every 5 seconds
  useEffect(() => {
    if (!autoRefresh || !url.trim() || !user) return;

    // Initial fetch
    handleFetch(true);

    // Set up interval for auto-refresh
    const interval = setInterval(() => {
      handleFetch(true);
    }, 5000);

    return () => clearInterval(interval);
  }, [autoRefresh, url, className, user, handleFetch]);

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return new Intl.DateTimeFormat('de-DE', {
        weekday: 'short',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(date);
    } catch {
      return dateString;
    }
  };

  const navItems = buildPlannerNavItems(t, { isAdmin, isOperator });

  return (
    <PlannerShell
      sidebar={
        <>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.4em] text-slate-400">Vertretungsplan</p>
            <h2 className="text-2xl font-semibold text-white">{t('substitutionPlan.title')}</h2>
            <p className="text-sm text-slate-400">{t('substitutionPlan.description')}</p>
          </div>
          <PlannerNav items={navItems} label={t('planner.navigation')} />
          <div className="mt-8 space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Einträge</p>
            <p className="text-3xl font-semibold text-white">{entries.length}</p>
            <p className="text-xs text-slate-400">{t('substitutionPlan.entriesFound')}</p>
          </div>
        </>
      }
    >
      <div className="space-y-6">
        <SectionCard title="Website konfigurieren">
        <div className="space-y-4">
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {t('substitutionPlan.url')}
            </span>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t('substitutionPlan.urlPlaceholder')}
              className={inputStyles}
              disabled={isFetching}
            />
          </label>
          <label className="flex flex-col gap-2">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
              Klasse
            </span>
            <input
              type="text"
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="z.B. 12Fo-b"
              className={inputStyles}
              disabled={isFetching}
            />
          </label>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="autoRefresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            <label htmlFor="autoRefresh" className="text-sm text-slate-700 dark:text-slate-200">
              Automatisch alle 5 Sekunden aktualisieren
            </label>
          </div>
          <button
            onClick={() => handleFetch(false)}
            disabled={isFetching || !url.trim() || !user}
            className={`${subtleButtonStyles} w-full disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {isFetching ? t('substitutionPlan.fetching') : t('substitutionPlan.fetch')}
          </button>
          {error && (
            <div className="space-y-2 rounded-xl border border-rose-400 bg-rose-50/50 px-4 py-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-100">
              <p className="font-semibold">{error}</p>
              <p className="text-xs opacity-80">
                Tipp: Überprüfe die Vercel-Logs für mehr Details. Falls das Problem weiterhin besteht, könnte die Website Anfragen von Vercel-Servern blockieren.
              </p>
            </div>
          )}
          {lastUpdated && (
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('substitutionPlan.lastUpdated')}: {new Intl.DateTimeFormat('de-DE', {
                day: '2-digit',
                month: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              }).format(lastUpdated)}
            </p>
          )}
        </div>
      </SectionCard>

      {entries.length > 0 ? (
        <SectionCard title="Vertretungen">
          <div className="space-y-4">
            {entries.map((entry) => (
              <div
                key={entry.id}
                className="rounded-2xl border border-slate-200 bg-white/80 p-4 dark:border-slate-700 dark:bg-slate-900/40"
              >
                <div className="flex flex-wrap items-center gap-2 text-sm">
                  <span className="font-semibold text-slate-900 dark:text-white">
                    {formatDate(entry.date)}
                  </span>
                  {entry.period && (
                    <span className="rounded-full bg-indigo-100 px-2 py-1 text-xs font-medium text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300">
                      {entry.period}. Stunde
                    </span>
                  )}
                  {entry.class && (
                    <span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                      {entry.class}
                    </span>
                  )}
                </div>
                <div className="mt-2 space-y-1.5 text-sm">
                  {entry.subject && (
                    <p className="text-slate-700 dark:text-slate-300">
                      <span className="font-medium">{t('substitutionPlan.subject')}:</span> {entry.subject}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-3">
                    {entry.originalTeacher && (
                      <p className="text-slate-600 dark:text-slate-400">
                        <span className="font-medium">{t('substitutionPlan.originalTeacher')}:</span> {entry.originalTeacher}
                      </p>
                    )}
                    {entry.substituteTeacher && (
                      <p className="text-indigo-600 dark:text-indigo-400">
                        <span className="font-medium">{t('substitutionPlan.substituteTeacher')}:</span> {entry.substituteTeacher}
                      </p>
                    )}
                    {entry.room && (
                      <p className="text-slate-600 dark:text-slate-400">
                        <span className="font-medium">{t('substitutionPlan.room')}:</span> {entry.room}
                      </p>
                    )}
                  </div>
                  {entry.note && (
                    <p className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                      <span className="font-medium">{t('substitutionPlan.note')}:</span> {entry.note}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : (
        <SectionCard title="Vertretungen">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('substitutionPlan.noData')}
          </p>
        </SectionCard>
      )}
      </div>
    </PlannerShell>
  );
}

