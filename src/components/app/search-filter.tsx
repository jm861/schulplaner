/**
 * Search & Filter Component
 * Global search with entity filtering
 */

'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/app-store';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { ListRow } from '@/components/ui/list-row';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { SmartLink, ContextBadge } from '@/components/ui/smart-link';
import { Search, CheckSquare, Calendar, FileText, BookOpen, AlertCircle, GraduationCap } from 'lucide-react';
import { generateDeepLink, type EntityType } from '@/types/entities';
import { useRouter } from 'next/navigation';

interface SearchResult {
  id: string;
  type: EntityType;
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  entity: { type: EntityType; id: string };
}

export function SearchFilter() {
  const router = useRouter();
  const { isCommandPaletteOpen, closeCommandPalette, openCommandPalette } = useAppStore();
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<EntityType | 'all'>('all');

  const { tasks, notes, materials, exams, lessons, subjects } = useAppStore();

  const results = useMemo(() => {
    if (!search.trim()) return [];

    const query = search.toLowerCase();
    const allResults: SearchResult[] = [];

    // Tasks
    if (filterType === 'all' || filterType === 'task') {
      tasks
        .filter(
          (t) =>
            t.title.toLowerCase().includes(query) ||
            t.description?.toLowerCase().includes(query) ||
            t.subjectName?.toLowerCase().includes(query)
        )
        .forEach((task) => {
          allResults.push({
            id: task.id,
            type: 'task',
            title: task.title,
            subtitle: task.subjectName || task.dueDate
              ? `${task.subjectName || ''} ${task.dueDate ? `• ${new Date(task.dueDate).toLocaleDateString('de-DE')}` : ''}`.trim()
              : undefined,
            icon: <CheckSquare className="h-4 w-4" />,
            entity: { type: 'task', id: task.id },
          });
        });
    }

    // Notes
    if (filterType === 'all' || filterType === 'note') {
      notes
        .filter(
          (n) =>
            n.title.toLowerCase().includes(query) ||
            n.content.toLowerCase().includes(query) ||
            n.subjectName?.toLowerCase().includes(query)
        )
        .forEach((note) => {
          allResults.push({
            id: note.id,
            type: 'note',
            title: note.title,
            subtitle: note.subjectName,
            icon: <BookOpen className="h-4 w-4" />,
            entity: { type: 'note', id: note.id },
          });
        });
    }

    // Materials
    if (filterType === 'all' || filterType === 'material') {
      materials
        .filter(
          (m) =>
            m.title.toLowerCase().includes(query) ||
            m.content?.toLowerCase().includes(query) ||
            m.subjectName?.toLowerCase().includes(query)
        )
        .forEach((material) => {
          allResults.push({
            id: material.id,
            type: 'material',
            title: material.title,
            subtitle: material.subjectName,
            icon: <FileText className="h-4 w-4" />,
            entity: { type: 'material', id: material.id },
          });
        });
    }

    // Exams
    if (filterType === 'all' || filterType === 'exam') {
      exams
        .filter(
          (e) =>
            e.title?.toLowerCase().includes(query) ||
            e.subjectName.toLowerCase().includes(query) ||
            e.topics?.toLowerCase().includes(query)
        )
        .forEach((exam) => {
          allResults.push({
            id: exam.id,
            type: 'exam',
            title: exam.title || exam.subjectName,
            subtitle: `${exam.subjectName} • ${new Date(exam.date).toLocaleDateString('de-DE')}`,
            icon: <AlertCircle className="h-4 w-4" />,
            entity: { type: 'exam', id: exam.id },
          });
        });
    }

    // Lessons
    if (filterType === 'all' || filterType === 'lesson') {
      lessons
        .filter(
          (l) =>
            l.subjectName.toLowerCase().includes(query) ||
            l.room?.toLowerCase().includes(query) ||
            l.teacherName?.toLowerCase().includes(query)
        )
        .forEach((lesson) => {
          allResults.push({
            id: lesson.id,
            type: 'lesson',
            title: `${lesson.subjectName} (${lesson.startTime} - ${lesson.endTime})`,
            subtitle: lesson.room || lesson.teacherName,
            icon: <Calendar className="h-4 w-4" />,
            entity: { type: 'lesson', id: lesson.id },
          });
        });
    }

    // Subjects
    if (filterType === 'all' || filterType === 'subject') {
      subjects
        .filter((s) => s.name.toLowerCase().includes(query))
        .forEach((subject) => {
          allResults.push({
            id: subject.id,
            type: 'subject',
            title: subject.name,
            subtitle: subject.shortName,
            icon: <GraduationCap className="h-4 w-4" />,
            entity: { type: 'subject', id: subject.id },
          });
        });
    }

    return allResults.slice(0, 20); // Limit to 20 results
  }, [search, filterType, tasks, notes, materials, exams, lessons, subjects]);

  const filterOptions = [
    { value: 'all' as const, label: 'Alle' },
    { value: 'task' as const, label: 'Aufgaben', icon: <CheckSquare className="h-3 w-3" /> },
    { value: 'note' as const, label: 'Notizen', icon: <BookOpen className="h-3 w-3" /> },
    { value: 'material' as const, label: 'Materialien', icon: <FileText className="h-3 w-3" /> },
    { value: 'exam' as const, label: 'Klausuren', icon: <AlertCircle className="h-3 w-3" /> },
    { value: 'lesson' as const, label: 'Stunden', icon: <Calendar className="h-3 w-3" /> },
    { value: 'subject' as const, label: 'Fächer', icon: <GraduationCap className="h-3 w-3" /> },
  ];

  return (
    <Sheet open={isCommandPaletteOpen} onOpenChange={closeCommandPalette} side="top" size="lg">
      <SheetHeader>
        <SheetTitle>Suche</SheetTitle>
      </SheetHeader>
      <SheetContent>
        <div className="space-y-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Suche nach Aufgaben, Notizen, Materialien..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-3 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
              autoFocus
            />
          </div>

          {/* Filter */}
          <SegmentedControl
            options={filterOptions}
            value={filterType}
            onChange={(value) => setFilterType(value)}
            size="sm"
          />

          {/* Results */}
          <div className="max-h-[60vh] space-y-1 overflow-y-auto">
            {results.length > 0 ? (
              results.map((result) => (
                <ListRow
                  key={`${result.type}-${result.id}`}
                  leading={result.icon}
                  subtitle={result.subtitle}
                  trailing={<ContextBadge type={result.type} />}
                  interactive
                  onClick={() => {
                    router.push(generateDeepLink(result.entity));
                    closeCommandPalette();
                  }}
                >
                  {result.title}
                </ListRow>
              ))
            ) : search.trim() ? (
              <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Keine Ergebnisse gefunden
              </div>
            ) : (
              <div className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                Beginne zu tippen, um zu suchen...
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

