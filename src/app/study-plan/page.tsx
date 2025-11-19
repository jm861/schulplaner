'use client';

import { useState } from 'react';

import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { WeeklyPlanEditor } from '@/components/study-plan/weekly-plan-editor';
import { useLanguage } from '@/contexts/language-context';
import { useWeeklyPlan } from '@/hooks/use-weekly-plan';
import { textareaStyles, subtleButtonStyles } from '@/styles/theme';

const aiPrompts = [
  'Summarize Chapter 8 of “Modern Europe” in 5 key points.',
  'Create a quiz for organic chemistry functional groups.',
  'Plan a 3-day countdown for the math exam.',
];

type AIStudyBlock = {
  day: string;
  start: string;
  duration: string;
  focus: string;
  activity: string;
  tip?: string;
};

export default function StudyPlanPage() {
  const { t } = useLanguage();
  const { slots, loadDemoData, hasDemoData } = useWeeklyPlan();
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [focusInput, setFocusInput] = useState(
    t('studyPlan.focusInput'),
  );
  const [aiBlocks, setAiBlocks] = useState<AIStudyBlock[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleGeneratePlan() {
    if (!focusInput.trim()) {
      setErrorMessage('Bitte gib einen Lernfokus an.');
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMessage(null);

      const response = await fetch('/api/generate-study-plan', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          focus: focusInput,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Plan konnte nicht erstellt werden.');
      }

      const data = (await response.json()) as { blocks?: AIStudyBlock[] };
      setAiBlocks(data.blocks ?? []);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unbekannter Fehler.');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-12">
      <PageHeader
        badge="Study plan"
        title={t('studyPlan.title')}
        description={t('studyPlan.description')}
      />

      {isEditingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <WeeklyPlanEditor onClose={() => setIsEditingPlan(false)} />
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
        <SectionCard
          title={t('studyPlan.weeklyBlueprint')}
          action={
            <div className="flex gap-2">
              {slots.length === 0 && (
                <button
                  onClick={loadDemoData}
                  className={`${subtleButtonStyles} text-sm border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/50`}
                >
                  {t('studyPlan.loadDemo')}
                </button>
              )}
              <button
                onClick={() => setIsEditingPlan(true)}
                className="text-sm font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400"
              >
                {t('studyPlan.editPlan')}
              </button>
            </div>
          }
        >
          {slots.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 p-8 text-center dark:border-slate-700 dark:bg-slate-900/20">
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-400 mb-3">
                {t('studyPlan.noSlots')}
              </p>
              <button
                onClick={loadDemoData}
                className={`${subtleButtonStyles} border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/50`}
              >
                {t('studyPlan.loadDemo')}
              </button>
            </div>
          ) : (
            <ul className="space-y-4">
              {slots.map((slot) => (
                <li
                  key={slot.id}
                  className="rounded-2xl border border-slate-100 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-900/40"
                >
                  <div className="flex items-center justify-between text-sm">
                    <p className="font-semibold text-slate-900 dark:text-white">{slot.day}</p>
                    <span className="text-xs text-slate-500 dark:text-slate-400">{slot.duration}</span>
                  </div>
                  <p className="mt-2 text-sm text-slate-700 dark:text-slate-200">{slot.focus}</p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{slot.aiNote}</p>
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title={t('studyPlan.aiPrompts')}>
          <ul className="space-y-3">
            {aiPrompts.map((prompt) => (
              <li
                key={prompt}
                onClick={() => {
                  setFocusInput(prompt);
                  // Scroll to the input field
                  setTimeout(() => {
                    const textarea = document.querySelector('textarea');
                    if (textarea) {
                      textarea.focus();
                      textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                  }, 100);
                }}
                className="cursor-pointer rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-900 active:scale-[0.98] dark:border-slate-700 dark:text-slate-200 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/50 dark:hover:text-indigo-100"
                title={t('studyPlan.clickToUse')}
              >
                {prompt}
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard title={t('studyPlan.energyTracker')}>
          <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
            <p className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
              🔋 <span className="font-semibold text-slate-900 dark:text-white">Peak window 08:00–11:30</span> — schedule intense subjects here.
            </p>
            <p className="rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
              🌙 Evenings best for review only. Keep AI summaries short and reflective.
            </p>
          </div>
        </SectionCard>

        <div className="lg:col-span-3">
          <SectionCard title={t('studyPlan.generatePlan')}>
            <div className="space-y-4 text-sm">
              <label className="flex flex-col gap-2">
                <span className="font-medium text-slate-700 dark:text-slate-200">{t('studyPlan.focusLabel')}</span>
                <textarea
                  rows={3}
                  value={focusInput}
                  onChange={(e) => setFocusInput(e.target.value)}
                  className={textareaStyles}
                  placeholder="e.g., Prüfungswoche mit Fokus auf Mathe, Englisch und Biologie"
                />
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleGeneratePlan}
                  disabled={isGenerating}
                  className={`${subtleButtonStyles} px-6 disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {isGenerating ? t('studyPlan.generatePlan') + '…' : t('studyPlan.generatePlan')}
                </button>
                {errorMessage ? <p className="text-xs font-semibold text-rose-500">{errorMessage}</p> : null}
              </div>
              {aiBlocks.length > 0 ? (
                <div className="grid gap-4 md:grid-cols-2">
                  {aiBlocks.map((block, index) => (
                    <div
                      key={`${block.day}-${block.start}-${index}`}
                      className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4 text-slate-800 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-100"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                        {block.day} • {block.start} ({block.duration})
                      </p>
                      <p className="mt-2 text-base font-semibold">{block.focus}</p>
                      <p className="text-sm text-slate-600 dark:text-slate-300">{block.activity}</p>
                      {block.tip ? (
                        <p className="mt-2 text-xs text-slate-500 italic dark:text-slate-400">{block.tip}</p>
                      ) : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  {t('studyPlan.noBlocks')}
                </p>
              )}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

