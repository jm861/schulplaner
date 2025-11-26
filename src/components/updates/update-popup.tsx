'use client';

import { useState, useEffect } from 'react';
import { useLanguage } from '@/contexts/language-context';

const CURRENT_VERSION = '1.2.0';
const VERSION_STORAGE_KEY = 'schulplaner:lastSeenVersion';

type UpdateInfo = {
  version: string;
  date: string;
  title: string;
  changes: string[];
};

const UPDATES: UpdateInfo[] = [
  {
    version: '1.2.0',
    date: '2024-01-15',
    title: 'Neue Features & Verbesserungen',
    changes: [
      '✨ Lerntage-Funktion für Klausuren: Gib an, wie viele Tage vor der Prüfung du lernen möchtest',
      '🔔 Push-Benachrichtigungen: Aktiviere Push-Benachrichtigungen in den Einstellungen',
      '📚 Verbesserte Lernplanerstellung: Vollständige Zusammenfassungen des Themas mit ChatGPT',
      '🔄 Automatische Wiederholung bei Rate-Limits: Die App versucht automatisch erneut',
      '🎨 Verbesserte Fehlermeldungen: Spezifischere und hilfreichere Fehlermeldungen',
    ],
  },
  {
    version: '1.1.0',
    date: '2024-01-10',
    title: 'Lehrer & Ferien-Verwaltung',
    changes: [
      '👨‍🏫 Lehrer-Verwaltung: Füge Lehrer mit Name und E-Mail hinzu',
      '📅 Ferien-Verwaltung: Verwalte Ferien für verschiedene Bundesländer',
      '📆 Kalender-Integration: Ferien werden im Kalender angezeigt',
      '🏠 Zur Startseite Button: Schneller Zugriff auf die Startseite',
    ],
  },
  {
    version: '1.0.0',
    date: '2024-01-01',
    title: 'Erste Version',
    changes: [
      '📅 Kalender mit Wochenansicht',
      '✅ Aufgaben-Verwaltung',
      '📝 Prüfungsplanung',
      '📚 KI-gestützte Lernplanerstellung',
      '💬 Chat-Funktion',
      '📄 Materialien-Upload mit OCR',
    ],
  },
];

export function UpdatePopup() {
  const { t } = useLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const [currentUpdate, setCurrentUpdate] = useState<UpdateInfo | null>(null);

  useEffect(() => {
    // Check if user has seen the current version
    const lastSeenVersion = localStorage.getItem(VERSION_STORAGE_KEY);
    
    if (lastSeenVersion !== CURRENT_VERSION) {
      // Find the most recent update
      const latestUpdate = UPDATES[0]; // Updates are sorted by newest first
      setCurrentUpdate(latestUpdate);
      setIsOpen(true);
    }
  }, []);

  const handleClose = () => {
    setIsOpen(false);
    // Mark current version as seen
    localStorage.setItem(VERSION_STORAGE_KEY, CURRENT_VERSION);
  };

  if (!isOpen || !currentUpdate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
              🎉 {t('updates.newUpdate')}
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Version {currentUpdate.version} • {new Date(currentUpdate.date).toLocaleDateString('de-DE')}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-full p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-300 transition"
            aria-label={t('common.close')}
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-3">
            {currentUpdate.title}
          </h3>
          <ul className="space-y-2">
            {currentUpdate.changes.map((change, index) => (
              <li key={index} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                <span className="text-slate-400 dark:text-slate-500 mt-0.5">•</span>
                <span>{change}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end">
          <button
            onClick={handleClose}
            className="rounded-2xl bg-slate-900 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
          >
            {t('updates.gotIt')}
          </button>
        </div>
      </div>
    </div>
  );
}


