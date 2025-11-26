'use client';

import { useState } from 'react';

import { SectionCard } from '@/components/ui/section-card';
import { WeeklyPlanEditor } from '@/components/study-plan/weekly-plan-editor';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/contexts/auth-context';
import { useWeeklyPlan } from '@/hooks/use-weekly-plan';
import { textareaStyles, subtleButtonStyles } from '@/styles/theme';
import { PlannerShell, PlannerNav } from '@/components/layout/planner-shell';
import { buildPlannerNavItems } from '@/lib/planner-nav';

const aiPrompts = [
  'Summarize Chapter 8 of “Modern Europe” in 5 key points.',
  'Create a quiz for organic chemistry functional groups.',
  'Plan a 3-day countdown for the math exam.',
];

type AIStudyPlan = {
  title: string;
  overview: string;
  steps: string[];
  tips: string[];
  estimatedDuration: string;
  researchLinks?: Array<{
    step: number;
    platform: string;
    title: string;
    url?: string;
    searchTerms?: string;
  }>;
};

// Map German day names to English
const dayMap: Record<string, string> = {
  'Montag': 'Monday',
  'Dienstag': 'Tuesday',
  'Mittwoch': 'Wednesday',
  'Donnerstag': 'Thursday',
  'Freitag': 'Friday',
  'Samstag': 'Saturday',
  'Sonntag': 'Sunday',
};

export default function StudyPlanPage() {
  const { t } = useLanguage();
  const { isAdmin, isOperator } = useAuth();
  const { slots, loadDemoData, addSlot } = useWeeklyPlan();
  const [isEditingPlan, setIsEditingPlan] = useState(false);
  const [focusInput, setFocusInput] = useState('');
  const [aiPlan, setAiPlan] = useState<AIStudyPlan | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isAdded, setIsAdded] = useState(false);

  async function handleGeneratePlan(retryCount = 0) {
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
        const errorMessage = data.error || 'Plan konnte nicht erstellt werden.';
        
        // Don't auto-retry for rate limits - let user retry manually
        if (response.status === 429) {
          throw new Error('rate_limit');
        }
        
        throw new Error(errorMessage);
      }

      const data = (await response.json()) as { plan?: AIStudyPlan };
      setAiPlan(data.plan || null);
      setIsAdded(false);
      setErrorMessage(null);
    } catch (error) {
      if (error instanceof Error && error.message === 'rate_limit') {
        setErrorMessage('rate_limit');
      } else {
        setErrorMessage(error instanceof Error ? error.message : 'Unbekannter Fehler.');
      }
    } finally {
      setIsGenerating(false);
    }
  }

  const handleGenerateClick = () => {
    handleGeneratePlan(0);
  };

  function handleAddPlan() {
    if (!aiPlan) return;
    
    // Add the plan as a single slot
    addSlot({
      day: 'Monday', // Default day, user can edit later
      focus: aiPlan.title,
      duration: aiPlan.estimatedDuration,
      aiNote: `${aiPlan.overview}\n\nSchritte:\n${aiPlan.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}\n\nTipps:\n${aiPlan.tips.map((tip, i) => `• ${tip}`).join('\n')}`,
    });
    
    setIsAdded(true);
    
    // Show feedback
    setTimeout(() => {
      setIsAdded(false);
    }, 3000);
  }

  const navItems = buildPlannerNavItems(t, { isAdmin, isOperator });

  return (
    <PlannerShell
      sidebar={
        <>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.4em] text-slate-400">Study Plan</p>
            <h2 className="text-2xl font-semibold text-white">{t('studyPlan.title')}</h2>
            <p className="text-sm text-slate-400">{t('studyPlan.description')}</p>
          </div>
          <PlannerNav items={navItems} label={t('planner.navigation')} />
          <div className="mt-8 space-y-3 rounded-3xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Slots</p>
            <p className="text-3xl font-semibold text-white">{slots.length}</p>
            <p className="text-xs text-slate-400">{t('studyPlan.slotsConfigured')}</p>
          </div>
        </>
      }
    >
      {isEditingPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <WeeklyPlanEditor onClose={() => setIsEditingPlan(false)} />
          </div>
        </div>
      )}

      <div className="grid gap-4 sm:gap-6 md:gap-8 lg:grid-cols-3">
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

            <div className="lg:col-span-3 min-w-0">
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
                  onClick={handleGenerateClick}
                  disabled={isGenerating}
                  className={`${subtleButtonStyles} px-6 disabled:cursor-not-allowed disabled:opacity-60`}
                >
                  {isGenerating ? t('studyPlan.generatePlan') + '…' : t('studyPlan.generatePlan')}
                </button>
                {errorMessage ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-4 dark:border-rose-800 dark:bg-rose-950/40">
                    <p className="text-sm font-semibold text-rose-700 dark:text-rose-300 mb-2">
                      {errorMessage.includes('OPENAI_API_KEY') || errorMessage.includes('not configured') ? (
                        <>
                          <span className="block mb-2">⚠️ {t('studyPlan.openaiNotConfigured')}</span>
                          <span className="text-xs font-normal text-rose-600 dark:text-rose-400 block">
                            {t('studyPlan.openaiNotConfiguredDescription')}
                          </span>
                          <span className="text-xs font-normal text-rose-600 dark:text-rose-400 block mt-1">
                            {t('studyPlan.openaiNotConfiguredHint')}
                          </span>
                        </>
                      ) : errorMessage === 'rate_limit' || errorMessage.includes('rate limit') ? (
                        <>
                          <span className="block mb-2">⏱️ {t('studyPlan.rateLimitExceeded')}</span>
                          <span className="text-xs font-normal text-rose-600 dark:text-rose-400 block mb-3">
                            {t('studyPlan.rateLimitDescription')}
                          </span>
                          <button
                            type="button"
                            onClick={handleGenerateClick}
                            disabled={isGenerating}
                            className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isGenerating ? t('studyPlan.generating') : t('studyPlan.retry')}
                          </button>
                        </>
                      ) : (
                        errorMessage
                      )}
                    </p>
                  </div>
                ) : null}
              </div>
              {aiPlan ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      Generierter Lernplan
                    </p>
                    <button
                      onClick={handleAddPlan}
                      disabled={isAdded}
                      className={`${subtleButtonStyles} px-4 py-2 text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${
                        isAdded
                          ? 'border-green-300 bg-green-50 text-green-700 dark:border-green-700 dark:bg-green-950/50 dark:text-green-300'
                          : ''
                      }`}
                    >
                      {isAdded ? (
                        <span className="flex items-center gap-2">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                          Zum Plan hinzugefügt
                        </span>
                      ) : (
                        <span className="flex items-center gap-2">
                          <svg
                            className="h-4 w-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 4v16m8-8H4"
                            />
                          </svg>
                          Plan hinzufügen
                        </span>
                      )}
                    </button>
                  </div>
                  <div
                    className={`rounded-2xl border p-6 transition-all ${
                      isAdded
                        ? 'border-green-300 bg-green-50/80 dark:border-green-700 dark:bg-green-950/40'
                        : 'border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-900/40'
                    }`}
                  >
                    {isAdded && (
                      <div className="mb-4 flex items-center gap-2 rounded-full bg-green-500 px-3 py-1.5 text-xs font-semibold text-white shadow-sm w-fit">
                        <svg
                          className="h-3.5 w-3.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Zum Plan hinzugefügt
                      </div>
                    )}
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                      {aiPlan.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                      {aiPlan.overview}
                    </p>
                    <div className="mt-4 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                        Lernschritte
                      </p>
                      <ol className="space-y-2">
                        {aiPlan.steps.map((step, index) => {
                          const stepNumber = index + 1;
                          const researchLink = aiPlan.researchLinks?.find(link => link.step === stepNumber);
                          const isResearchStep = step.toLowerCase().includes('online recherchieren') || step.toLowerCase().includes('recherchiere online');
                          
                          return (
                            <li
                              key={index}
                              className="flex gap-3 text-sm text-slate-700 dark:text-slate-300"
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300">
                                {stepNumber}
                              </span>
                              <div className="flex-1 space-y-2">
                                <span>{step}</span>
                                {isResearchStep && researchLink && (
                                  <div className="mt-2 rounded-lg border border-indigo-200 bg-indigo-50/50 p-2.5 dark:border-indigo-800 dark:bg-indigo-950/30">
                                    <div className="flex items-start gap-2">
                                      {researchLink.platform === 'YouTube' ? (
                                        <svg
                                          className="mt-0.5 h-4 w-4 shrink-0 text-red-600 dark:text-red-400"
                                          fill="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                                        </svg>
                                      ) : (
                                        <svg
                                          className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600 dark:text-indigo-400"
                                          fill="none"
                                          stroke="currentColor"
                                          viewBox="0 0 24 24"
                                        >
                                          <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                                          />
                                        </svg>
                                      )}
                                      <div className="flex-1 space-y-1">
                                        <p className="text-xs font-semibold text-indigo-900 dark:text-indigo-200">
                                          {researchLink.platform}: {researchLink.title}
                                        </p>
                                        {researchLink.url ? (
                                          <a
                                            href={researchLink.url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 underline hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                                          >
                                            <span>Link öffnen</span>
                                            <svg
                                              className="h-3 w-3"
                                              fill="none"
                                              stroke="currentColor"
                                              viewBox="0 0 24 24"
                                            >
                                              <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={2}
                                                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                                              />
                                            </svg>
                                          </a>
                                        ) : researchLink.searchTerms ? (
                                          <p className="text-xs text-indigo-700 dark:text-indigo-300">
                                            Suche nach: <span className="font-medium">"{researchLink.searchTerms}"</span>
                                          </p>
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>
                                )}
                                {isResearchStep && !researchLink && (
                                  <div className="mt-2 rounded-lg border border-slate-200 bg-slate-50/50 p-2.5 dark:border-slate-700 dark:bg-slate-900/30">
                                    <p className="text-xs text-slate-600 dark:text-slate-400">
                                      💡 Tipp: Nutze konkrete Suchbegriffe für bessere Ergebnisse
                                    </p>
                                  </div>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ol>
                    </div>
                    {aiPlan.tips.length > 0 && (
                      <div className="mt-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                          Tipps
                        </p>
                        <ul className="space-y-1.5">
                          {aiPlan.tips.map((tip, index) => (
                            <li
                              key={index}
                              className="flex gap-2 text-sm text-slate-600 dark:text-slate-400"
                            >
                              <span className="text-indigo-600 dark:text-indigo-400">•</span>
                              <span>{tip}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-4 flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span>Geschätzte Dauer: {aiPlan.estimatedDuration}</span>
                    </div>
                  </div>
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
    </PlannerShell>
  );
}

