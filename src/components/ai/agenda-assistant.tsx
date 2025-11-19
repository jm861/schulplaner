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

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Zusammenfassung konnte nicht erstellt werden.');
      }

      const data = (await response.json()) as { summary?: string };
      setSummary(data.summary ?? 'Keine Zusammenfassung verfügbar.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unbekannter Fehler.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SectionCard title="AI Agenda Cleaner" className="mt-4">
      <div className="space-y-4 text-sm">
        <p className="text-slate-600 dark:text-slate-300">
          Füge deine Agenda, Mitschrift oder Aufgabenliste ein und erhalte eine strukturierte, bereinigte Zusammenfassung.
        </p>
        <textarea
          className={textareaStyles}
          rows={4}
          placeholder="Z. B. Mathehausaufgaben, Basketball um 17 Uhr, Lernsession für Chemie..."
          value={text}
          onChange={(event) => setText(event.target.value)}
        />
        <div className="flex flex-wrap gap-2">
          {toneOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setTone(option.value as typeof tone)}
              className={`${subtleButtonStyles} text-xs ${
                tone === option.value ? 'border-indigo-400 text-indigo-600 dark:text-indigo-300' : ''
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
            disabled={loading}
            className={`${subtleButtonStyles} px-6 disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {loading ? 'Generiere…' : 'Agenda bereinigen'}
          </button>
          {error ? <p className="text-xs font-semibold text-rose-500">{error}</p> : null}
        </div>
        {summary ? (
          <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/50 dark:text-slate-200">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
              Ergebnis
            </p>
            <p className="mt-2 whitespace-pre-line">{summary}</p>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

