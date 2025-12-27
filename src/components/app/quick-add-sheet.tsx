/**
 * Quick Add Sheet Component
 * Fast way to add tasks, notes, or materials with smart defaults
 */

'use client';

import { useAppStore } from '@/store/app-store';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { CheckSquare, FileText, BookOpen } from 'lucide-react';

export function QuickAddSheet() {
  const { isQuickAddOpen, closeQuickAdd, quickAddType, addTask, addNote, addMaterial, selectedSubjectId, selectedLessonId, subjects, lessons } = useAppStore();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subjectId, setSubjectId] = useState<string | undefined>(selectedSubjectId);

  // Reset form when sheet opens/closes
  useEffect(() => {
    if (isQuickAddOpen) {
      setTitle('');
      setDescription('');
      setSubjectId(selectedSubjectId);
    }
  }, [isQuickAddOpen, selectedSubjectId]);

  const handleSubmit = () => {
    if (!title.trim()) return;

    const now = new Date();
    const currentTime = now.toTimeString().slice(0, 5);
    const currentDay = now.getDay();

    // Find current or next lesson for smart defaults
    const currentLesson = lessons.find(
      (l) => l.dayOfWeek === currentDay && l.startTime <= currentTime && l.endTime >= currentTime
    );

    const selectedSubject = subjects.find((s) => s.id === subjectId);
    const selectedLesson = lessons.find((l) => l.id === selectedLessonId);

    if (quickAddType === 'task') {
      addTask({
        title,
        description: description || undefined,
        subjectId: subjectId || selectedLesson?.subjectId,
        subjectName: selectedSubject?.name || selectedLesson?.subjectName,
        lessonId: selectedLessonId || currentLesson?.id,
        priority: 'medium',
        status: 'todo',
      });
    } else if (quickAddType === 'note') {
      addNote({
        title,
        content: description || '',
        subjectId: subjectId || selectedLesson?.subjectId,
        subjectName: selectedSubject?.name || selectedLesson?.subjectName,
        lessonId: selectedLessonId || currentLesson?.id,
      });
    } else if (quickAddType === 'material') {
      addMaterial({
        title,
        type: 'text',
        content: description || undefined,
        subjectId: subjectId || selectedLesson?.subjectId,
        subjectName: selectedSubject?.name || selectedLesson?.subjectName,
        lessonId: selectedLessonId || currentLesson?.id,
      });
    }

    closeQuickAdd();
  };

  const typeConfig = {
    task: {
      icon: <CheckSquare className="h-5 w-5" />,
      label: 'Aufgabe',
      placeholder: 'Aufgabentitel...',
      descriptionPlaceholder: 'Beschreibung (optional)',
    },
    note: {
      icon: <FileText className="h-5 w-5" />,
      label: 'Notiz',
      placeholder: 'Notiz-Titel...',
      descriptionPlaceholder: 'Inhalt...',
    },
    material: {
      icon: <BookOpen className="h-5 w-5" />,
      label: 'Material',
      placeholder: 'Material-Titel...',
      descriptionPlaceholder: 'Beschreibung (optional)',
    },
  };

  const config = quickAddType ? typeConfig[quickAddType] : null;

  if (!config || !quickAddType) return null;

  return (
    <Sheet open={isQuickAddOpen} onOpenChange={closeQuickAdd} side="bottom" size="md">
      <SheetHeader>
        <SheetTitle className="flex items-center gap-2">
          {config.icon}
          {config.label} hinzufügen
        </SheetTitle>
        <SheetDescription>
          Schnell {config.label.toLowerCase()} mit intelligenten Standardwerten erstellen
        </SheetDescription>
      </SheetHeader>
      <SheetContent>
        <div className="space-y-4">
          {/* Subject Selection */}
          {subjects.length > 0 && (
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Fach (optional)
              </label>
              <select
                value={subjectId || ''}
                onChange={(e) => setSubjectId(e.target.value || undefined)}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
              >
                <option value="">Kein Fach</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Titel *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={config.placeholder}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
              {quickAddType === 'note' ? 'Inhalt' : 'Beschreibung'} {quickAddType === 'note' ? '*' : '(optional)'}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={config.descriptionPlaceholder}
              rows={quickAddType === 'note' ? 6 : 3}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={closeQuickAdd} className="flex-1">
              Abbrechen
            </Button>
            <Button onClick={handleSubmit} disabled={!title.trim()} className="flex-1">
              Hinzufügen
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

