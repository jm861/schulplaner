'use client';

import { useEffect, useState } from 'react';

import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/contexts/auth-context';
import { useWeeklyPlan } from '@/hooks/use-weekly-plan';
import { readJSON, writeJSON } from '@/lib/storage';
import { type Language } from '@/lib/i18n';
import { inputStyles, selectStyles, textareaStyles, subtleButtonStyles } from '@/styles/theme';

type NotificationSetting = {
  label: string;
  description: string;
  enabled: boolean;
};

type SettingsState = {
  profile: {
    name: string;
    grade: string;
    timezone: string;
  };
  notifications: NotificationSetting[];
  ai: {
    tone: string;
    template: string;
  };
};

const DEFAULT_SETTINGS: SettingsState = {
  profile: {
    name: 'Lina Schneider',
    grade: '11',
    timezone: 'Europe/Berlin (CET)',
  },
  notifications: [
    { label: 'Daily schedule digest', description: 'Send every day at 07:00', enabled: true },
    { label: 'Homework reminder', description: '2 hours before due time', enabled: true },
    { label: 'Study plan drift alert', description: 'Trigger when 2 sessions skipped', enabled: false },
  ],
  ai: {
    tone: 'Friendly & encouraging',
    template: 'Summarize the homework requirements and suggest a plan...',
  },
};

const SETTINGS_STORAGE_KEY = 'schulplaner:settings';

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const { user, logout } = useAuth();
  const { hasDemoData, removeDemoData } = useWeeklyPlan();
  const [settings, setSettings] = useState<SettingsState>(() => {
    try {
      const saved = readJSON(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
      // Ensure all required fields exist
      if (!saved.profile) saved.profile = DEFAULT_SETTINGS.profile;
      if (!saved.notifications) saved.notifications = DEFAULT_SETTINGS.notifications;
      if (!saved.ai) saved.ai = DEFAULT_SETTINGS.ai;
      return saved;
    } catch (error) {
      console.error('Error loading settings:', error);
      return DEFAULT_SETTINGS;
    }
  });

  useEffect(() => {
    writeJSON(SETTINGS_STORAGE_KEY, settings);
  }, [settings]);

  const updateProfile = (key: keyof SettingsState['profile'], value: string) => {
    setSettings((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        [key]: value,
      },
    }));
  };

  const updateAI = (key: keyof SettingsState['ai'], value: string) => {
    setSettings((prev) => ({
      ...prev,
      ai: {
        ...prev.ai,
        [key]: value,
      },
    }));
  };

  const toggleNotification = (label: string) => {
    setSettings((prev) => ({
      ...prev,
      notifications: prev.notifications.map((item) =>
        item.label === label ? { ...item, enabled: !item.enabled } : item,
      ),
    }));
  };


  return (
    <div className="space-y-12">
      <PageHeader
        badge="Settings"
        title={t('settings.title')}
        description={t('settings.description')}
      />

      <div className="grid gap-8 lg:grid-cols-2">
        <SectionCard title={t('settings.profile')}>
          <form className="space-y-4 text-sm">
            <label className="flex flex-col gap-1">
              <span className="font-medium text-slate-700 dark:text-slate-200">Full name</span>
              <input
                className={inputStyles}
                value={settings.profile.name}
                onChange={(event) => updateProfile('name', event.target.value)}
                placeholder="e.g., Lina Schneider"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium text-slate-700 dark:text-slate-200">Grade / Year</span>
              <input
                className={inputStyles}
                value={settings.profile.grade}
                onChange={(event) => updateProfile('grade', event.target.value)}
                placeholder="11"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium text-slate-700 dark:text-slate-200">Home timezone</span>
              <select
                className={selectStyles}
                value={settings.profile.timezone}
                onChange={(event) => updateProfile('timezone', event.target.value)}
              >
                <option>Europe/Berlin (CET)</option>
                <option>Europe/Vienna</option>
                <option>Europe/Zurich</option>
              </select>
            </label>
          </form>
        </SectionCard>

        <SectionCard title={t('settings.notifications')}>
          <ul className="space-y-4 text-sm">
            {settings.notifications.map((item) => (
              <li key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-white">{item.label}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleNotification(item.label)}
                  className={`rounded-full px-4 py-1 text-xs font-semibold ${
                    item.enabled
                      ? 'bg-emerald-500 text-white'
                      : 'border border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-300'
                  }`}
                >
                  {item.enabled ? 'On' : 'Off'}
                </button>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title={t('settings.ai')}>
          <div className="space-y-4 text-sm">
            <label className="flex flex-col gap-1">
              <span className="font-medium text-slate-700 dark:text-slate-200">Tone</span>
              <select
                className={selectStyles}
                value={settings.ai.tone}
                onChange={(event) => updateAI('tone', event.target.value)}
              >
                <option>Friendly & encouraging</option>
                <option>Direct & concise</option>
                <option>Detailed & academic</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium text-slate-700 dark:text-slate-200">Default prompt template</span>
              <textarea
                rows={4}
                className={textareaStyles}
                value={settings.ai.template}
                onChange={(event) => updateAI('template', event.target.value)}
                placeholder="Summarize the homework requirements and suggest a plan..."
              />
            </label>
          </div>
        </SectionCard>

        <SectionCard title={t('settings.theme')}>
          <div className="space-y-4">
            <ThemeToggle />
          </div>
        </SectionCard>

        <SectionCard title={t('settings.language')}>
          <div className="space-y-4 text-sm">
            <label className="flex flex-col gap-1">
              <span className="font-medium text-slate-700 dark:text-slate-200">{t('settings.language')}</span>
              <select
                className={selectStyles}
                value={language}
                onChange={(event) => setLanguage(event.target.value as Language)}
              >
                <option value="en">{t('common.english')}</option>
                <option value="de">{t('common.german')}</option>
              </select>
            </label>
          </div>
        </SectionCard>

        {hasDemoData && (
          <SectionCard title={t('settings.demoData')}>
            <div className="space-y-4 text-sm">
              <p className="text-slate-600 dark:text-slate-300">
                {t('settings.demoDataDescription')}
              </p>
              <button
                onClick={removeDemoData}
                className={`${subtleButtonStyles} w-full border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/50`}
              >
                {t('settings.removeDemoData')}
              </button>
            </div>
          </SectionCard>
        )}

        <SectionCard title={t('settings.account')}>
          <div className="space-y-4 text-sm">
            {user && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('settings.loggedInAs')}
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{user.email}</p>
                {user.name && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{user.name}</p>
                )}
              </div>
            )}
            <button
              onClick={logout}
              className={`${subtleButtonStyles} w-full border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/50`}
            >
              {t('settings.logout')}
            </button>
          </div>
        </SectionCard>
      </div>
    </div>
  );
}

