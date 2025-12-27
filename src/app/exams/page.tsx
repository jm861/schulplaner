/**
 * Exams Page - Apple-like Design
 * Manage exams with AI summaries and study planning
 */

'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ContextBadge } from '@/components/ui/smart-link';
import { useToastActions } from '@/components/ui/toast';
import { AlertCircle, Plus, Calendar, Sparkles } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { generateDeepLink } from '@/types/entities';

export default function ExamsPage() {
  const router = useRouter();
  const { exams, subjects, addExam, updateExam, deleteExam } = useAppStore();
  const toast = useToastActions();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [expandedSummaries, setExpandedSummaries] = useState<Set<string>>(new Set());

  const [formData, setFormData] = useState({
    subjectId: '',
    title: '',
    date: '',
    startTime: '',
    endTime: '',
    room: '',
    topics: '',
    notes: '',
    studyDays: '',
  });

  const sortedExams = useMemo(() => {
    return [...exams]
      .filter((e) => e.status === 'upcoming')
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [exams]);

  const nextExam = sortedExams[0] || null;

  const subjectSuggestions = useMemo(() => {
    return subjects.map((s) => s.name).sort((a, b) => a.localeCompare(b, 'de', { sensitivity: 'base' }));
  }, [subjects]);

  const handleSubmit = () => {
    if (!formData.subjectId) {
      toast.error('Fach erforderlich', 'Bitte wähle ein Fach aus.');
      return;
    }

    const selectedSubject = subjects.find((s) => s.id === formData.subjectId);
    if (!selectedSubject) return;

    const examData = {
      subjectId: formData.subjectId,
      subjectName: selectedSubject.name,
      title: formData.title || undefined,
      date: formData.date,
      startTime: formData.startTime || undefined,
      endTime: formData.endTime || undefined,
      room: formData.room || undefined,
      topics: formData.topics || undefined,
      notes: formData.notes || undefined,
      studyDays: formData.studyDays ? parseInt(formData.studyDays, 10) : undefined,
      status: 'upcoming' as const,
      aiSummary: summary || undefined,
    };

    if (editingExam) {
      updateExam(editingExam, examData);
      toast.success('Klausur aktualisiert', selectedSubject.name);
    } else {
      addExam(examData);
      toast.success('Klausur hinzugefügt', selectedSubject.name);
    }

    setFormData({
      subjectId: '',
      title: '',
      date: '',
      startTime: '',
      endTime: '',
      room: '',
      topics: '',
      notes: '',
      studyDays: '',
    });
    setSummary(null);
    setErrorMessage(null);
    setEditingExam(null);
    setIsAddOpen(false);
  };

  const handleEdit = (examId: string) => {
    const exam = exams.find((e) => e.id === examId);
    if (exam) {
      setFormData({
        subjectId: exam.subjectId,
        title: exam.title || '',
        date: exam.date,
        startTime: exam.startTime || '',
        endTime: exam.endTime || '',
        room: exam.room || '',
        topics: exam.topics || '',
        notes: exam.notes || '',
        studyDays: exam.studyDays?.toString() || '',
      });
      setSummary(exam.aiSummary || null);
      setEditingExam(examId);
      setIsAddOpen(true);
    }
  };

  const handleDelete = (examId: string) => {
    const exam = exams.find((e) => e.id === examId);
    if (exam && confirm(`Möchtest du die Klausur "${exam.subjectName}" wirklich löschen?`)) {
      deleteExam(examId);
      toast.success('Klausur gelöscht', exam.subjectName);
    }
  };

  async function handleGenerateSummary() {
    if (isGenerating) return;

    try {
      setIsGenerating(true);
      setErrorMessage(null);

      const response = await fetch('/api/exam-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subject: subjects.find((s) => s.id === formData.subjectId)?.name || formData.title,
          topics: formData.topics,
          notes: formData.notes,
        }),
      });

      const data = await response.json();

      if (!response.ok || (data as any).ok === false) {
        const errorData = data as { ok?: boolean; status?: number; raw?: string };
        const status = errorData.status || response.status;

        let errorMsg = 'Unbekannter Fehler';
        if (status === 429) {
          errorMsg = 'Rate limit exceeded. Bitte warte kurz.';
        } else if (status === 401) {
          errorMsg = 'OpenAI API Key ungültig oder falsch konfiguriert.';
        } else if (status === 500) {
          errorMsg = 'Interner Serverfehler beim Zusammenfassen.';
        }

        setErrorMessage(errorMsg);
        return;
      }

      setSummary((data as { summary?: string }).summary ?? 'Keine Zusammenfassung verfügbar.');
      toast.success('Zusammenfassung generiert', 'KI-Zusammenfassung wurde erstellt.');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unbekannter Fehler.');
    } finally {
      setIsGenerating(false);
    }
  }

  const formatExamDate = (date: string) => {
    return new Intl.DateTimeFormat('de-DE', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(date));
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Klausuren</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Plane deine Prüfungen und Klausuren
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Klausur hinzufügen
        </Button>
      </div>

      {/* Next Exam Card */}
      {nextExam && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
          <CardHeader>
            <CardDescription className="text-yellow-700 dark:text-yellow-300">
              Nächste Klausur
            </CardDescription>
            <CardTitle className="text-xl">{nextExam.subjectName}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {formatExamDate(nextExam.date)}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Exams List */}
      <Card>
        <CardHeader>
          <CardTitle>Anstehende Klausuren</CardTitle>
          <CardDescription>
            {sortedExams.length} {sortedExams.length === 1 ? 'Klausur' : 'Klausuren'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {sortedExams.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {sortedExams.map((exam) => (
                <ListRow
                  key={exam.id}
                  leading={<AlertCircle className="h-4 w-4 text-red-500" />}
                  subtitle={
                    <div className="flex items-center gap-2 mt-1">
                      <Calendar className="h-3 w-3 text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatExamDate(exam.date)}
                      </span>
                      {exam.room && (
                        <>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Raum: {exam.room}
                          </span>
                        </>
                      )}
                    </div>
                  }
                  trailing={
                    <div className="flex items-center gap-2">
                      <ContextBadge type="exam" label={exam.subjectName} />
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(exam.id)}>
                        Bearbeiten
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(exam.id)}
                      >
                        Löschen
                      </Button>
                    </div>
                  }
                  interactive
                  onClick={() => {
                    router.push(generateDeepLink({ type: 'exam', id: exam.id }));
                  }}
                >
                  {exam.title || exam.subjectName}
                </ListRow>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<AlertCircle className="h-8 w-8" />}
              title="Keine anstehenden Klausuren"
              description="Füge deine erste Klausur hinzu, um zu beginnen"
              action={
                <Button onClick={() => setIsAddOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Klausur hinzufügen
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Sheet */}
      <Sheet
        open={isAddOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setEditingExam(null);
            setFormData({
              subjectId: '',
              title: '',
              date: '',
              startTime: '',
              endTime: '',
              room: '',
              topics: '',
              notes: '',
              studyDays: '',
            });
            setSummary(null);
            setErrorMessage(null);
          }
        }}
        side="bottom"
        size="lg"
      >
        <SheetHeader>
          <SheetTitle>{editingExam ? 'Klausur bearbeiten' : 'Neue Klausur'}</SheetTitle>
          <SheetDescription>
            Plane eine neue Klausur mit optionaler KI-Zusammenfassung
          </SheetDescription>
        </SheetHeader>
        <SheetContent>
          <div className="space-y-4">
            {/* Subject */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Fach *
              </label>
              <select
                value={formData.subjectId}
                onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                required
              >
                <option value="">Fach auswählen</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Titel (optional)
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="z.B. Zwischenprüfung, Abschlussprüfung..."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* Date */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Datum *
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                required
              />
            </div>

            {/* Time */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Startzeit (optional)
                </label>
                <input
                  type="time"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Endzeit (optional)
                </label>
                <input
                  type="time"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                />
              </div>
            </div>

            {/* Room */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Raum (optional)
              </label>
              <input
                type="text"
                value={formData.room}
                onChange={(e) => setFormData({ ...formData, room: e.target.value })}
                placeholder="z.B. A101"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* Study Days */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Lerntage (optional)
              </label>
              <input
                type="number"
                min="1"
                max="365"
                value={formData.studyDays}
                onChange={(e) => setFormData({ ...formData, studyDays: e.target.value })}
                placeholder="z.B. 5 für 5 Tage"
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Anzahl der Tage, die du vor der Klausur lernen möchtest
              </p>
            </div>

            {/* Topics */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Themen (optional)
              </label>
              <textarea
                rows={3}
                value={formData.topics}
                onChange={(e) => setFormData({ ...formData, topics: e.target.value })}
                placeholder="Liste Kapitel, Problemtypen, Lab-Module..."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* Notes */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Notizen (optional)
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Erinnerungen, Lerngruppen, KI-Prompts..."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* AI Summary Generation */}
            <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
                  KI-Zusammenfassung
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerateSummary}
                disabled={isGenerating || !formData.subjectId}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generiere...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Zusammenfassung generieren
                  </>
                )}
              </Button>
              {errorMessage && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/30">
                  <p className="text-xs text-red-700 dark:text-red-300">{errorMessage}</p>
                </div>
              )}
              {summary && (
                <div className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
                  <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 mb-2">
                    KI-Zusammenfassung
                  </p>
                  <p className="whitespace-pre-line text-sm text-gray-700 dark:text-gray-300">
                    {summary}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  setEditingExam(null);
                  setFormData({
                    subjectId: '',
                    title: '',
                    date: '',
                    startTime: '',
                    endTime: '',
                    room: '',
                    topics: '',
                    notes: '',
                    studyDays: '',
                  });
                  setSummary(null);
                  setErrorMessage(null);
                }}
                className="flex-1"
              >
                Abbrechen
              </Button>
              <Button onClick={handleSubmit} className="flex-1">
                {editingExam ? 'Speichern' : 'Hinzufügen'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
