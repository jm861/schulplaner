'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { useLanguage } from '@/contexts/language-context';
import { readJSON, writeJSON } from '@/lib/storage';
import { inputStyles, textareaStyles, subtleButtonStyles } from '@/styles/theme';

type Exam = {
  id: string;
  subject: string;
  date: string;
  topics: string;
  notes: string;
};

const initialExams: Exam[] = [
  {
    id: '1',
    subject: 'Chemistry',
    date: addDaysISO(3, 9),
    topics: 'Thermodynamics lab, calorimetry setup, safety checklist',
    notes: 'Finish lab report and print diagrams.',
  },
  {
    id: '2',
    subject: 'History',
    date: addDaysISO(7, 10),
    topics: 'Interwar period, Treaty of Versailles debate points',
    notes: 'Run AI flashcard session Wednesday.',
  },
  {
    id: '3',
    subject: 'Mathematics',
    date: addDaysISO(14, 8),
    topics: 'Limits, derivatives, optimization word problems',
    notes: 'Review error log and redo tricky problems.',
  },
];

function addDaysISO(daysAhead: number, hour = 9) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString().slice(0, 16);
}

const reviewChecklist = [
  'Summarize key chapters with ChatGPT',
  'Schedule two mock tests this week',
  'Share study plan with learning group',
];

const EXAMS_STORAGE_KEY = 'schulplaner:exams';

export default function ExamsPage() {
  const { t } = useLanguage();
  const [exams, setExams] = useState<Exam[]>(() => readJSON(EXAMS_STORAGE_KEY, initialExams));
  const [formData, setFormData] = useState({
    subject: '',
    date: '',
    topics: '',
    notes: '',
  });
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    writeJSON(EXAMS_STORAGE_KEY, exams);
  }, [exams]);

  const sortedExams = useMemo(() => {
    return [...exams].sort((a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.date ? new Date(b.date).getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });
  }, [exams]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formData.subject.trim()) return;

    setExams((prev) => [
      {
        id: crypto.randomUUID(),
        subject: formData.subject,
        date: formData.date,
        topics: formData.topics,
        notes: formData.notes,
      },
      ...prev,
    ]);

    setFormData({
      subject: '',
      date: '',
      topics: '',
      notes: '',
    });
    setSummary(null);
    setErrorMessage(null);
  }

  async function handleGenerateSummary() {
    try {
      setIsGenerating(true);
      setErrorMessage(null);

      const response = await fetch('/api/exam-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subject: formData.subject,
          topics: formData.topics,
          notes: formData.notes,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Konnte Zusammenfassung nicht erstellen.');
      }

      const data = (await response.json()) as { summary?: string };
      setSummary(data.summary ?? 'Keine Zusammenfassung verfügbar.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unbekannter Fehler.');
    } finally {
      setIsGenerating(false);
    }
  }

  const formatExamDate = (value: string) => {
    if (!value) return 'Date TBD';
    return new Intl.DateTimeFormat('de-DE', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  };

  return (
    <div className="space-y-12">
      <PageHeader
        badge="Exams"
        title={t('exams.title')}
        description={t('exams.description')}
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title={t('exams.planExam')}>
            <form className="space-y-4 text-sm" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-1">
                <span className="font-medium text-slate-700 dark:text-slate-200">{t('exams.examSubject')}</span>
                <input
                  value={formData.subject}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                  className={inputStyles}
                  placeholder="e.g., Chemistry"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-medium text-slate-700 dark:text-slate-200">{t('exams.examDate')}</span>
                <input
                  type="datetime-local"
                  value={formData.date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                  className={inputStyles}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-medium text-slate-700 dark:text-slate-200">{t('exams.topics')}</span>
                <textarea
                  rows={3}
                  value={formData.topics}
                  onChange={(e) => setFormData((prev) => ({ ...prev, topics: e.target.value }))}
                  className={textareaStyles}
                  placeholder="List chapters, problem types, lab modules..."
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-medium text-slate-700 dark:text-slate-200">{t('exams.notes')}</span>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  className={`${textareaStyles} min-h-[110px]`}
                  placeholder="Reminders, study partners, AI prompts..."
                />
              </label>

              <button
                type="submit"
                className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
              >
                {t('exams.saveExam')}
              </button>
            </form>
            <div className="mt-4 flex flex-col gap-3 text-sm">
              <button
                type="button"
                onClick={handleGenerateSummary}
                disabled={isGenerating || !formData.subject}
                className={`${subtleButtonStyles} disabled:cursor-not-allowed disabled:opacity-60`}
              >
                {isGenerating ? t('exams.generateSummary') + '…' : t('exams.generateSummary')}
              </button>
              {errorMessage ? (
                <p className="text-xs font-semibold text-rose-500">{errorMessage}</p>
              ) : null}
              {summary ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/80 p-3 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">
                    KI-Zusammenfassung
                  </p>
                  <p className="mt-2 whitespace-pre-line text-sm">{summary}</p>
                </div>
              ) : null}
            </div>
          </SectionCard>

          <SectionCard title={t('exams.upcomingExams')}>
            {sortedExams.length === 0 ? (
              <p className="text-sm text-slate-500">{t('exams.noExams')}</p>
            ) : (
              <ul className="space-y-4">
                {sortedExams.map((exam) => (
                  <li
                    key={exam.id}
                    className="rounded-2xl border border-slate-100 bg-white/70 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/50"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-base font-semibold text-slate-900 dark:text-white">{exam.subject}</p>
                        <p className="text-xs text-slate-500">{formatExamDate(exam.date)}</p>
                      </div>
                      <span className="rounded-full bg-slate-900 px-3 py-1 text-xs font-semibold text-white dark:bg-white dark:text-slate-900">
                        {exam.date ? new Date(exam.date).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' }) : 'TBD'}
                      </span>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
                      <p className="font-medium text-slate-900 dark:text-white">{t('exams.topics')}</p>
                      <p className="text-sm">{exam.topics || t('exams.addTopics')}</p>
                      <p className="font-medium text-slate-900 dark:text-white">{t('exams.notes')}</p>
                      <p className="text-sm">{exam.notes || t('exams.noNotes')}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title={t('exams.prepRoadmap')}>
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
              {reviewChecklist.map((item) => (
                <div key={item} className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 dark:border-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </SectionCard>

          <SectionCard title={t('exams.aiInsights')}>
            <div className="space-y-3 text-sm">
              <article className="rounded-2xl border border-slate-200 bg-gradient-to-br from-indigo-500/10 to-cyan-500/10 p-4 text-slate-900 dark:border-slate-800 dark:from-indigo-500/20 dark:to-cyan-500/20 dark:text-white">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-300">
                  Suggested focus
                </p>
                <p className="mt-2 text-sm">
                  “Shift 30 minutes from social time on Thursday to expand calculus practice—confidence is at 62%.”
                </p>
              </article>
              <article className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                <p className="font-semibold text-slate-900 dark:text-white">History essay prep</p>
                <p className="mt-1 text-xs">
                  AI draft: 3 key arguments + counterpoints. Schedule review with study partner.
                </p>
              </article>
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

