'use client';

import { useTheme } from 'next-themes';

import { useLanguage } from '@/contexts/language-context';
import { subtleButtonStyles } from '@/styles/theme';

const themes = [
  { value: 'light', labelKey: 'common.light' },
  { value: 'dark', labelKey: 'common.dark' },
  { value: 'system', labelKey: 'common.system' },
];

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const currentTheme = theme || 'system';

  return (
    <div className="flex flex-wrap gap-2">
      {themes.map((themeOption) => (
        <button
          key={themeOption.value}
          type="button"
          onClick={() => setTheme(themeOption.value)}
          className={`${subtleButtonStyles} flex-1 ${
            currentTheme === themeOption.value
              ? 'border-indigo-400 bg-indigo-50 text-indigo-600 dark:border-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-300'
              : ''
          }`}
        >
          {t(themeOption.labelKey)}
        </button>
      ))}
    </div>
  );
}

