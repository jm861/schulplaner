/**
 * Notes Page - Apple-like Design
 * Manage notes with deep links to subjects, lessons, and tasks
 */

'use client';

import { useState, useMemo } from 'react';
import { useAppStore } from '@/store/app-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { SmartLink, ContextBadge } from '@/components/ui/smart-link';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useToastActions } from '@/components/ui/toast';
import { BookOpen, Plus, Pin, Search } from 'lucide-react';
import { generateDeepLink } from '@/types/entities';
import { useRouter } from 'next/navigation';

export default function NotesPage() {
  const router = useRouter();
  const { notes, subjects, addNote, updateNote, deleteNote, toggleNotePin } = useAppStore();
  const toast = useToastActions();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pinned'>('all');
  const [search, setSearch] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    subjectId: '',
  });

  const filteredNotes = useMemo(() => {
    let filtered = notes;

    // Filter by pinned
    if (filter === 'pinned') {
      filtered = filtered.filter((n) => n.isPinned);
    }

    // Filter by search
    if (search.trim()) {
      const query = search.toLowerCase();
      filtered = filtered.filter(
        (n) =>
          n.title.toLowerCase().includes(query) ||
          n.content.toLowerCase().includes(query) ||
          n.subjectName?.toLowerCase().includes(query)
      );
    }

    // Sort: pinned first, then by updatedAt
    return filtered.sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return b.updatedAt.localeCompare(a.updatedAt);
    });
  }, [notes, filter, search]);

  const handleSubmit = () => {
    if (!formData.title.trim()) {
      toast.error('Titel erforderlich', 'Bitte gib einen Titel für die Notiz ein.');
      return;
    }

    const selectedSubject = subjects.find((s) => s.id === formData.subjectId);

    if (editingNote) {
      updateNote(editingNote, {
        title: formData.title,
        content: formData.content,
        subjectId: formData.subjectId || undefined,
        subjectName: selectedSubject?.name,
      });
      toast.success('Notiz aktualisiert', formData.title);
    } else {
      addNote({
        title: formData.title,
        content: formData.content,
        subjectId: formData.subjectId || undefined,
        subjectName: selectedSubject?.name,
      });
      toast.success('Notiz hinzugefügt', formData.title);
    }

    setFormData({ title: '', content: '', subjectId: '' });
    setEditingNote(null);
    setIsAddOpen(false);
    setIsEditOpen(false);
  };

  const handleEdit = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (note) {
      setFormData({
        title: note.title,
        content: note.content,
        subjectId: note.subjectId || '',
      });
      setEditingNote(noteId);
      setIsEditOpen(true);
    }
  };

  const handleDelete = (noteId: string) => {
    const note = notes.find((n) => n.id === noteId);
    if (note && confirm(`Möchtest du "${note.title}" wirklich löschen?`)) {
      deleteNote(noteId);
      toast.success('Notiz gelöscht', note.title);
    }
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Notizen</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Verwalte deine Notizen und verknüpfe sie mit Fächern
          </p>
        </div>
        <Button onClick={() => setIsAddOpen(true)}>
          <Plus className="h-4 w-4" />
          Notiz hinzufügen
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <SegmentedControl
          options={[
            { value: 'all' as const, label: 'Alle' },
            { value: 'pinned' as const, label: 'Angepinnt', icon: <Pin className="h-3 w-3" /> },
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
            placeholder="Notizen durchsuchen..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      {/* Notes List */}
      <Card>
        <CardContent className="p-0">
          {filteredNotes.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {filteredNotes.map((note) => (
                <ListRow
                  key={note.id}
                  leading={
                    <div className="flex items-center gap-2">
                      {note.isPinned && <Pin className="h-4 w-4 text-yellow-500 fill-yellow-500" />}
                      <BookOpen className="h-4 w-4 text-gray-400" />
                    </div>
                  }
                  subtitle={
                    <div className="flex items-center gap-2 mt-1">
                      {note.subjectName && (
                        <ContextBadge type="subject" label={note.subjectName} />
                      )}
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(note.updatedAt).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  }
                  trailing={
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => toggleNotePin(note.id)}
                      >
                        <Pin
                          className={`h-4 w-4 ${
                            note.isPinned
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-gray-400'
                          }`}
                        />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEdit(note.id)}>
                        Bearbeiten
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(note.id)}
                      >
                        Löschen
                      </Button>
                    </div>
                  }
                  interactive
                  onClick={() => {
                    router.push(generateDeepLink({ type: 'note', id: note.id }));
                  }}
                >
                  {note.title}
                </ListRow>
              ))}
            </div>
          ) : (
            <EmptyState
              icon={<BookOpen className="h-8 w-8" />}
              title={search ? 'Keine Notizen gefunden' : 'Noch keine Notizen'}
              description={
                search
                  ? 'Versuche andere Suchbegriffe'
                  : 'Erstelle deine erste Notiz, um zu beginnen'
              }
              action={
                !search && (
                  <Button onClick={() => setIsAddOpen(true)}>
                    <Plus className="h-4 w-4" />
                    Notiz hinzufügen
                  </Button>
                )
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Sheet */}
      <Sheet
        open={isAddOpen || isEditOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsAddOpen(false);
            setIsEditOpen(false);
            setEditingNote(null);
            setFormData({ title: '', content: '', subjectId: '' });
          }
        }}
        side="bottom"
        size="lg"
      >
        <SheetHeader>
          <SheetTitle>{editingNote ? 'Notiz bearbeiten' : 'Neue Notiz'}</SheetTitle>
          <SheetDescription>
            Erstelle eine neue Notiz und verknüpfe sie optional mit einem Fach
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
                placeholder="Notiz-Titel..."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                autoFocus
              />
            </div>

            {/* Content */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Inhalt *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Notiz-Inhalt..."
                rows={8}
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsAddOpen(false);
                  setIsEditOpen(false);
                  setEditingNote(null);
                  setFormData({ title: '', content: '', subjectId: '' });
                }}
                className="flex-1"
              >
                Abbrechen
              </Button>
              <Button onClick={handleSubmit} className="flex-1">
                {editingNote ? 'Speichern' : 'Hinzufügen'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

