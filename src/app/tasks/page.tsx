/**
 * Tasks Page - Apple-like Design
 * Manage tasks with deep links and context badges
 */

'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/app-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { ContextBadge } from '@/components/ui/smart-link';
import { useToastActions } from '@/components/ui/toast';
import { CheckSquare, Plus, Search, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { generateDeepLink } from '@/types/entities';

export default function TasksPage() {
  const router = useRouter();
  const { tasks, subjects, addTask, updateTask, deleteTask, toggleTaskStatus } = useAppStore();
  const toast = useToastActions();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'todo' | 'in-progress' | 'done'>('all');
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    subjectId: '',
    dueDate: '',
    priority: 'medium' as 'low' | 'medium' | 'high',
  });

  const filteredTasks = useMemo(() => {
    let filtered = tasks;

    // Filter by status
    if (filter !== 'all') {
      filtered = filtered.filter((t) => t.status === filter);
    }

    // Filter by search
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.subjectName?.toLowerCase().includes(query)
      );
    }

    // Sort: by due date (earliest first), then by priority
    return filtered.sort((a, b) => {
      if (a.dueDate && b.dueDate) {
        return a.dueDate.localeCompare(b.dueDate);
      }
      if (a.dueDate) return -1;
      if (b.dueDate) return 1;
      
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }, [tasks, filter, search]);

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      todo: tasks.filter((t) => t.status === 'todo').length,
      inProgress: tasks.filter((t) => t.status === 'in-progress').length,
      done: tasks.filter((t) => t.status === 'done').length,
    };
  }, [tasks]);

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast.error('Titel erforderlich', 'Bitte gib einen Titel für die Aufgabe ein.');
      return;
    }

    const selectedSubject = subjects.find((s) => s.id === formData.subjectId);

    addTask({
      title: formData.title,
      description: formData.description || undefined,
      subjectId: formData.subjectId || undefined,
      subjectName: selectedSubject?.name,
      dueDate: formData.dueDate || undefined,
      priority: formData.priority,
      status: 'todo',
    });

    toast.success('Aufgabe hinzugefügt', formData.title);
    setFormData({
      title: '',
      description: '',
      subjectId: '',
      dueDate: '',
      priority: 'medium',
    });
    setIsAddOpen(false);
  };

  const handleDelete = (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (task && confirm(`Möchtest du "${task.title}" wirklich löschen?`)) {
      deleteTask(taskId);
      toast.success('Aufgabe gelöscht', task.title);
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Aufgaben</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Verwalte deine Aufgaben und To-Dos
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Aufgabe hinzufügen
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Gesamt</CardDescription>
            <CardTitle className="text-2xl">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Offen</CardDescription>
            <CardTitle className="text-2xl">{stats.todo}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>In Bearbeitung</CardDescription>
            <CardTitle className="text-2xl">{stats.inProgress}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Erledigt</CardDescription>
            <CardTitle className="text-2xl">{stats.done}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          options={[
            { value: 'all' as const, label: 'Alle' },
            { value: 'todo' as const, label: 'Offen' },
            { value: 'in-progress' as const, label: 'In Bearbeitung' },
            { value: 'done' as const, label: 'Erledigt' },
          ]}
          value={filter}
          onChange={(value) => setFilter(value)}
          size="sm"
        />

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Aufgaben durchsuchen..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      {/* Tasks List */}
      <Card>
        <CardContent className="p-0">
          {filteredTasks.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredTasks.map((task) => (
                <ListRow
                  key={task.id}
                  leading={
                    <input
                      type="checkbox"
                      checked={task.status === 'done'}
                      onChange={() => toggleTaskStatus(task.id)}
                      className="h-5 w-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                  }
                  subtitle={
                    <div className="flex items-center gap-2 mt-1">
                      {task.subjectName && (
                        <ContextBadge type="task" label={task.subjectName} />
                      )}
                      {task.dueDate && (
                        <>
                          <Calendar className="h-3 w-3 text-gray-400" />
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(task.dueDate).toLocaleDateString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </span>
                        </>
                      )}
                    </div>
                  }
                  trailing={
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                          task.priority === 'high'
                            ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                            : task.priority === 'medium'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                        }`}
                      >
                        {task.priority === 'high' ? 'Hoch' : task.priority === 'medium' ? 'Mittel' : 'Niedrig'}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(task.id)}
                      >
                        Löschen
                      </Button>
                    </div>
                  }
                  interactive
                  onClick={() => {
                    router.push(generateDeepLink({ type: 'task', id: task.id }));
                  }}
                  className={task.status === 'done' ? 'opacity-60' : ''}
                >
                  <span className={task.status === 'done' ? 'line-through' : ''}>
                    {task.title}
                  </span>
                </ListRow>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<CheckSquare className="h-8 w-8" />}
              title={search ? 'Keine Aufgaben gefunden' : 'Noch keine Aufgaben'}
              description={
                search
                  ? 'Versuche andere Suchbegriffe'
                  : 'Erstelle deine erste Aufgabe, um zu beginnen'
              }
              action={
                !search && (
                  <Button onClick={() => setIsAddOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Aufgabe hinzufügen
                  </Button>
                )
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Add Task Sheet */}
      <Sheet
        open={isAddOpen}
        onOpenChange={setIsAddOpen}
        side="bottom"
        size="lg"
      >
        <SheetHeader>
          <SheetTitle>Neue Aufgabe</SheetTitle>
          <SheetDescription>
            Erstelle eine neue Aufgabe und verknüpfe sie optional mit einem Fach
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
                  value={formData.subjectId}
                  onChange={(e) => setFormData({ ...formData, subjectId: e.target.value })}
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
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Aufgabentitel..."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                autoFocus
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Beschreibung (optional)
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Beschreibung..."
                rows={3}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* Due Date */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Fälligkeitsdatum (optional)
              </label>
              <input
                type="datetime-local"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* Priority */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Priorität
              </label>
              <select
                value={formData.priority}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value as 'low' | 'medium' | 'high' })
                }
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
              >
                <option value="low">Niedrig</option>
                <option value="medium">Mittel</option>
                <option value="high">Hoch</option>
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  setFormData({
                    title: '',
                    description: '',
                    subjectId: '',
                    dueDate: '',
                    priority: 'medium',
                  });
                }}
                className="flex-1"
              >
                Abbrechen
              </Button>
              <Button onClick={handleSubmit} className="flex-1">
                Hinzufügen
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
