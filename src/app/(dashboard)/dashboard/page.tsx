/**
 * Dashboard Page - Apple-like Design
 * Shows overview with context links to other entities
 */

'use client';

import { useAppStore, selectors } from '@/store/app-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { EmptyState } from '@/components/ui/empty-state';
import { SmartLink, ContextBadge } from '@/components/ui/smart-link';
import { Button } from '@/components/ui/button';
import { CheckSquare, Calendar, BookOpen, FileText, Clock, AlertCircle } from 'lucide-react';
import { useMemo } from 'react';
import { generateDeepLink } from '@/types/entities';

export default function DashboardPage() {
  const {
    tasks,
    notes,
    materials,
    exams,
    lessons,
    subjects,
  } = useAppStore();

  const upcomingTasks = useMemo(() => {
    const allTasks = useAppStore.getState().tasks;
    return allTasks
      .filter((t) => t.status !== 'done' && t.dueDate)
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || ''))
      .slice(0, 5);
  }, [tasks]);

  const nextLesson = useMemo(() => {
    const allLessons = useAppStore.getState().lessons;
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    return allLessons
      .filter((l) => {
        if (l.dayOfWeek > currentDay) return true;
        if (l.dayOfWeek === currentDay && l.startTime >= currentTime) return true;
        return false;
      })
      .sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        return a.startTime.localeCompare(b.startTime);
      })[0];
  }, [lessons]);

  const recentNotes = useMemo(() => {
    return useAppStore
      .getState()
      .notes.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 3);
  }, [notes]);

  const recentMaterials = useMemo(() => {
    return useAppStore
      .getState()
      .materials.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
      .slice(0, 3);
  }, [materials]);

  const upcomingExams = useMemo(() => {
    return useAppStore
      .getState()
      .exams.filter((e) => e.status === 'upcoming')
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 3);
  }, [exams]);

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Übersicht über deine Aufgaben, Notizen und Materialien
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Aufgaben</CardDescription>
            <CardTitle className="text-2xl">
              {tasks.filter((t) => t.status !== 'done').length}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Notizen</CardDescription>
            <CardTitle className="text-2xl">{notes.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Materialien</CardDescription>
            <CardTitle className="text-2xl">{materials.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Klausuren</CardDescription>
            <CardTitle className="text-2xl">
              {exams.filter((e) => e.status === 'upcoming').length}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming Tasks */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Nächste Aufgaben
            </CardTitle>
            <CardDescription>
              Aufgaben mit Fälligkeitsdatum
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcomingTasks.length > 0 ? (
              <div className="space-y-1">
                {upcomingTasks.map((task) => (
                  <ListRow
                    key={task.id}
                    leading={<CheckSquare className="h-4 w-4 text-gray-400" />}
                    subtitle={
                      task.dueDate
                        ? new Date(task.dueDate).toLocaleDateString('de-DE', {
                            day: '2-digit',
                            month: '2-digit',
                          })
                        : undefined
                    }
                    trailing={
                      task.subjectId && (
                        <ContextBadge type="task" label={task.subjectName} />
                      )
                    }
                    interactive
                    onClick={() => {
                      window.location.href = generateDeepLink({
                        type: 'task',
                        id: task.id,
                      });
                    }}
                  >
                    {task.title}
                  </ListRow>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<CheckSquare className="h-8 w-8" />}
                title="Keine anstehenden Aufgaben"
                description="Alle Aufgaben sind erledigt oder haben kein Fälligkeitsdatum."
              />
            )}
          </CardContent>
        </Card>

        {/* Next Lesson */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Nächste Stunde
            </CardTitle>
            <CardDescription>
              Deine nächste Unterrichtsstunde
            </CardDescription>
          </CardHeader>
          <CardContent>
            {nextLesson ? (
              <div className="space-y-3">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <ContextBadge type="subject" label={nextLesson.subjectName} />
                    <span className="text-sm text-gray-500 dark:text-gray-400">
                      {nextLesson.startTime} - {nextLesson.endTime}
                    </span>
                  </div>
                  {nextLesson.room && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Raum: {nextLesson.room}
                    </p>
                  )}
                </div>
                <SmartLink
                  entity={{ type: 'lesson', id: nextLesson.id }}
                  showBadge
                >
                  Details anzeigen
                </SmartLink>
              </div>
            ) : (
              <EmptyState
                icon={<Calendar className="h-8 w-8" />}
                title="Keine nächste Stunde"
                description="Es sind keine weiteren Stunden für heute geplant."
              />
            )}
          </CardContent>
        </Card>

        {/* Recent Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Letzte Notizen
            </CardTitle>
            <CardDescription>
              Zuletzt bearbeitete Notizen
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentNotes.length > 0 ? (
              <div className="space-y-1">
                {recentNotes.map((note) => (
                  <ListRow
                    key={note.id}
                    leading={<BookOpen className="h-4 w-4 text-gray-400" />}
                    subtitle={note.subjectName}
                    trailing={
                      note.subjectId && (
                        <ContextBadge type="note" label={note.subjectName} />
                      )
                    }
                    interactive
                    onClick={() => {
                      window.location.href = generateDeepLink({
                        type: 'note',
                        id: note.id,
                      });
                    }}
                  >
                    {note.title}
                  </ListRow>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<BookOpen className="h-8 w-8" />}
                title="Keine Notizen"
                description="Erstelle deine erste Notiz, um zu beginnen."
              />
            )}
          </CardContent>
        </Card>

        {/* Recent Materials */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Letzte Materialien
            </CardTitle>
            <CardDescription>
              Zuletzt hinzugefügte Materialien
            </CardDescription>
          </CardHeader>
          <CardContent>
            {recentMaterials.length > 0 ? (
              <div className="space-y-1">
                {recentMaterials.map((material) => (
                  <ListRow
                    key={material.id}
                    leading={<FileText className="h-4 w-4 text-gray-400" />}
                    subtitle={material.subjectName}
                    trailing={
                      material.subjectId && (
                        <ContextBadge type="material" label={material.subjectName} />
                      )
                    }
                    interactive
                    onClick={() => {
                      window.location.href = generateDeepLink({
                        type: 'material',
                        id: material.id,
                      });
                    }}
                  >
                    {material.title}
                  </ListRow>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={<FileText className="h-8 w-8" />}
                title="Keine Materialien"
                description="Füge Materialien hinzu, um sie hier zu sehen."
              />
            )}
          </CardContent>
        </Card>

        {/* Upcoming Exams */}
        {upcomingExams.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Anstehende Klausuren
              </CardTitle>
              <CardDescription>
                Nächste Prüfungen und Klausuren
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-1">
                {upcomingExams.map((exam) => (
                  <ListRow
                    key={exam.id}
                    leading={<AlertCircle className="h-4 w-4 text-red-500" />}
                    subtitle={new Date(exam.date).toLocaleDateString('de-DE', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'long',
                    })}
                    trailing={
                      <ContextBadge type="exam" label={exam.subjectName} />
                    }
                    interactive
                    onClick={() => {
                      window.location.href = generateDeepLink({
                        type: 'exam',
                        id: exam.id,
                      });
                    }}
                  >
                    {exam.title || exam.subjectName}
                  </ListRow>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

