'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

import { SectionCard } from '@/components/ui/section-card';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/contexts/auth-context';
import { readJSON, writeJSON } from '@/lib/storage';
import { inputStyles, textareaStyles, subtleButtonStyles } from '@/styles/theme';
import { PlannerShell, PlannerNav } from '@/components/layout/planner-shell';
import { buildPlannerNavItems } from '@/lib/planner-nav';

type Exam = {
  id: string;
  subject: string;
  date: string;
  topics: string;
  notes: string;
  studyDays?: number; // Number of days to study before the exam
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
  const { isAdmin, isOperator } = useAuth();
  const [exams, setExams] = useState<Exam[]>(() => readJSON(EXAMS_STORAGE_KEY, initialExams));
  const [formData, setFormData] = useState({
    subject: '',
    date: '',
    topics: '',
    notes: '',
    studyDays: '',
  });
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
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

    if (editingExam) {
      // Update existing exam
      setExams((prev) =>
        prev.map((exam) =>
          exam.id === editingExam.id
            ? {
                ...exam,
                subject: formData.subject,
                date: formData.date,
                topics: formData.topics,
                notes: formData.notes,
                studyDays: formData.studyDays ? parseInt(formData.studyDays, 10) : undefined,
              }
            : exam
        )
      );
      setEditingExam(null);
    } else {
      // Create new exam
      setExams((prev) => [
        {
          id: crypto.randomUUID(),
          subject: formData.subject,
          date: formData.date,
          topics: formData.topics,
          notes: formData.notes,
          studyDays: formData.studyDays ? parseInt(formData.studyDays, 10) : undefined,
        },
        ...prev,
      ]);
    }

    setFormData({
      subject: '',
      date: '',
      topics: '',
      notes: '',
      studyDays: '',
    });
    setSummary(null);
    setErrorMessage(null);
  }

  function handleEdit(exam: Exam) {
    setEditingExam(exam);
    setFormData({
      subject: exam.subject,
      date: exam.date,
      topics: exam.topics,
      notes: exam.notes,
      studyDays: exam.studyDays?.toString() || '',
    });
    setSummary(null);
    setErrorMessage(null);
    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleDelete(examId: string) {
    if (confirm(t('exams.confirmDelete'))) {
      setExams((prev) => prev.filter((exam) => exam.id !== examId));
      if (editingExam?.id === examId) {
        setEditingExam(null);
        setFormData({
          subject: '',
          date: '',
          topics: '',
          notes: '',
          studyDays: '',
        });
      }
    }
  }

  function handleCancel() {
    setEditingExam(null);
    setFormData({
      subject: '',
      date: '',
      topics: '',
      notes: '',
      studyDays: '',
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

  const calculateStudyStartDate = (examDate: string, studyDays?: number) => {
    if (!examDate || !studyDays) return null;
    const date = new Date(examDate);
    date.setDate(date.getDate() - studyDays);
    return date;
  };

  const formatStudyStartDate = (date: Date) => {
    return new Intl.DateTimeFormat('de-DE', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const navItems = buildPlannerNavItems(t, { isAdmin, isOperator });
  const nextExam = sortedExams.find((exam) => exam.date) ?? null;

  return (
    <PlannerShell
      sidebar={
        <>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Q1 1. Term</p>
            <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">{t('exams.title')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('exams.description')}</p>
          </div>
          <PlannerNav items={navItems} label={t('planner.navigation')} />
          {nextExam ? (
            <div className="mt-8 space-y-2 rounded-2xl border border-yellow-200 bg-yellow-50 p-4 text-sm dark:border-yellow-800 dark:bg-yellow-900/20">
              <p className="text-xs uppercase tracking-[0.3em] text-yellow-700 dark:text-yellow-300">{t('exams.nextExam')}</p>
              <p className="text-lg font-semibold text-gray-900 dark:text-white">{nextExam.subject}</p>
              <p className="text-xs text-gray-700 dark:text-gray-300">{formatExamDate(nextExam.date)}</p>
            </div>
          ) : null}
        </>
      }
    >
          <div className="grid gap-4 sm:gap-6 lg:grid-cols-3">
            <div className="space-y-4 sm:space-y-6 lg:col-span-2 min-w-0">
          <SectionCard title={editingExam ? t('exams.editExam') : t('exams.planExam')}>
            <form className="space-y-4 text-sm" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-1">
                <span className="font-medium text-gray-700 dark:text-gray-200">{t('exams.examSubject')}</span>
                <input
                  value={formData.subject}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                  className={inputStyles}
                  placeholder="e.g., Chemistry"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-medium text-gray-700 dark:text-gray-200">{t('exams.examDate')}</span>
                <input
                  type="datetime-local"
                  value={formData.date}
                  onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
                  className={inputStyles}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-medium text-gray-700 dark:text-gray-200">{t('exams.studyDays')}</span>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={formData.studyDays}
                  onChange={(e) => setFormData((prev) => ({ ...prev, studyDays: e.target.value }))}
                  className={inputStyles}
                  placeholder="z.B. 5 für 5 Tage"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400">{t('exams.studyDaysHint')}</p>
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-medium text-gray-700 dark:text-gray-200">{t('exams.topics')}</span>
                <textarea
                  rows={3}
                  value={formData.topics}
                  onChange={(e) => setFormData((prev) => ({ ...prev, topics: e.target.value }))}
                  className={textareaStyles}
                  placeholder="List chapters, problem types, lab modules..."
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-medium text-gray-700 dark:text-gray-200">{t('exams.notes')}</span>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  className={`${textareaStyles} min-h-[110px]`}
                  placeholder="Reminders, study partners, AI prompts..."
                />
              </label>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="submit"
                  className="flex-1 rounded-2xl bg-blue-500 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-600 hover:shadow-md active:scale-[0.98] dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  {editingExam ? t('exams.updateExam') : t('exams.saveExam')}
                </button>
                {editingExam && (
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                  >
                    {t('common.cancel')}
                  </button>
                )}
              </div>
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
                    className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-800"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-semibold text-gray-900 dark:text-white truncate">{exam.subject}</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{formatExamDate(exam.date)}</p>
                        {exam.studyDays && exam.date && (
                          <p className="mt-1 text-xs font-medium text-blue-600 dark:text-blue-400">
                            {t('exams.startStudying')}: {formatStudyStartDate(calculateStudyStartDate(exam.date, exam.studyDays)!)}
                            {' '}({exam.studyDays} {exam.studyDays === 1 ? t('exams.day') : t('exams.days')} {t('exams.beforeExam')})
                          </p>
                        )}
                      </div>
                          <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
                        <span className="rounded-full bg-gray-900 px-3 py-1 text-xs font-semibold text-white dark:bg-gray-100 dark:text-gray-900">
                          {exam.date ? new Date(exam.date).toLocaleDateString('de-DE', { month: 'short', day: 'numeric' }) : 'TBD'}
                        </span>
                        <button
                          onClick={() => handleEdit(exam)}
                          className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-all hover:bg-blue-100 active:scale-[0.98] dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-300 dark:hover:bg-blue-900/50"
                        >
                          {t('exams.edit')}
                        </button>
                        <button
                          onClick={() => handleDelete(exam.id)}
                          className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 transition-all hover:bg-red-100 active:scale-[0.98] dark:border-red-800 dark:bg-red-900/30 dark:text-red-300 dark:hover:bg-red-900/50"
                        >
                          {t('exams.delete')}
                        </button>
                      </div>
                    </div>
                    <div className="mt-3 space-y-2 text-sm text-gray-700 dark:text-gray-300">
                      <p className="font-medium text-gray-900 dark:text-white">{t('exams.topics')}</p>
                      <p className="text-sm">{exam.topics || t('exams.addTopics')}</p>
                      <p className="font-medium text-gray-900 dark:text-white">{t('exams.notes')}</p>
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
                <button
                  key={item}
                  onClick={() => {
                    // Add functionality here - could open a modal, navigate, or trigger an action
                    console.log('Clicked:', item);
                  }}
                  className="w-full rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-left transition-all hover:border-gray-300 hover:bg-gray-100 active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600 dark:hover:bg-gray-700"
                >
                  {item}
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title={t('exams.aiInsights')}>
            <div className="space-y-3 text-sm">
              <button
                onClick={() => {
                  // Add functionality for suggested focus
                  console.log('Clicked: Suggested focus');
                }}
                className="w-full rounded-2xl border border-blue-200 bg-blue-50 p-4 text-left transition-all hover:bg-blue-100 hover:shadow-sm active:scale-[0.98] dark:border-blue-800 dark:bg-blue-950/30 dark:hover:bg-blue-900/50"
              >
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
                  Suggested focus
                </p>
                <p className="mt-2 text-sm text-gray-900 dark:text-white">
                  "Shift 30 minutes from social time on Thursday to expand calculus practice—confidence is at 62%."
                </p>
              </button>
              <button
                onClick={() => {
                  // Add functionality for history essay prep
                  console.log('Clicked: History essay prep');
                }}
                className="w-full rounded-2xl border border-gray-200 bg-white p-4 text-left text-sm transition-all hover:bg-gray-50 hover:shadow-sm active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <p className="font-semibold text-gray-900 dark:text-white">History essay prep</p>
                <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                  AI draft: 3 key arguments + counterpoints. Schedule review with study partner.
                </p>
              </button>
            </div>
          </SectionCard>
        </div>
      </div>
    </PlannerShell>
  );
}

