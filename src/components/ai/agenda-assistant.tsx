'use client';

import { useState } from 'react';

import { SectionCard } from '@/components/ui/section-card';
import { subtleButtonStyles, textareaStyles } from '@/styles/theme';

const toneOptions = [
  { value: 'concise', label: 'Kompakt' },
  { value: 'friendly', label: 'Freundlich' },
  { value: 'motivating', label: 'Motivierend' },
];

export function AgendaAssistantCard() {
  const [text, setText] = useState('');
  const [tone, setTone] = useState<'concise' | 'friendly' | 'motivating'>('concise');
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    if (loading) return; // Prevent multiple simultaneous requests
    
    if (!text.trim()) {
      setError('Bitte gib eine Agenda oder einen Text ein.');
      return;
    }

    try {
      setLoading(true);
      setSummary(null);
      setError(null);

      const response = await fetch('/api/ai-summarize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text, tone }),
      });

      const data = await response.json();

      if (!response.ok || (data as any).ok === false) {
        const errorData = data as { ok?: boolean; status?: number; raw?: string };
        const status = errorData.status || response.status;
        const raw = errorData.raw || '';
        
        let errorMsg = 'Unbekannter Fehler';
        if (status === 429) {
          errorMsg = 'Rate limit exceeded. Bitte warte kurz.';
        } else if (status === 401) {
          errorMsg = 'OpenAI API Key ungültig oder falsch konfiguriert.';
        } else if (status === 500) {
          errorMsg = 'Interner Serverfehler beim Zusammenfassen.';
        } else {
          try {
            const rawParsed = JSON.parse(raw);
            errorMsg = `Fehler: ${rawParsed.message || raw}`;
          } catch {
            errorMsg = `Unbekannter Fehler: ${raw || status}`;
          }
        }
        
        setError(errorMsg);
        return;
      }

      setSummary((data as { summary?: string }).summary ?? 'Keine Zusammenfassung verfügbar.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCard title="AI Agenda Cleaner" className="mt-4">
      <div className="space-y-4 text-sm">
        <p className="text-gray-600 dark:text-gray-300">
          Füge deine Agenda, Mitschrift oder Aufgabenliste ein und erhalte eine strukturierte, bereinigte Zusammenfassung.
        </p>
        <textarea
          className={textareaStyles}
          rows={4}
          placeholder="Z. B. Mathehausaufgaben, Basketball um 17 Uhr, Lernsession für Chemie..."
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={loading}
        />
        <div className="flex flex-wrap gap-2">
          {toneOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTone(option.value as typeof tone)}
              disabled={loading}
              className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
                tone === option.value
                  ? 'border-blue-400 bg-blue-50 text-blue-600 dark:border-blue-600 dark:bg-blue-900/30 dark:text-blue-300'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !text.trim()}
            className="flex items-center gap-2 rounded-2xl border border-blue-200 bg-blue-50 px-4 py-2.5 text-sm font-semibold text-blue-700 transition-all hover:bg-blue-100 hover:shadow-sm active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
          >
            {loading ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Generiere…</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
                <span>Agenda bereinigen</span>
              </>
            )}
          </button>
          {summary && (
            <button
              type="button"
              onClick={() => {
                setSummary(null);
                setError(null);
                setText('');
              }}
              className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-600 transition-all hover:bg-gray-50 active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Zurücksetzen
            </button>
          )}
        </div>
        {error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-950/40">
            <p className="text-sm font-semibold text-red-700 dark:text-red-300 mb-2">⚠️ Fehler</p>
            <p className="text-xs text-red-600 dark:text-red-400 mb-3">{error}</p>
            <button
              type="button"
              onClick={handleGenerate}
              disabled={loading}
              className="rounded-xl bg-red-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Erneut versuchen
            </button>
          </div>
        ) : null}
        {summary ? (
          <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center gap-2 mb-3">
              <svg className="h-5 w-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">
                Bereinigte Zusammenfassung
              </p>
            </div>
            <div className="prose prose-sm max-w-none text-gray-700 dark:text-gray-300">
              <p className="whitespace-pre-line text-sm leading-relaxed">{summary}</p>
            </div>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

