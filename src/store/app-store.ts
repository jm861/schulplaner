/**
 * Zustand Store for Schulplaner App
 * 
 * Centralized state management with entity relationships
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import type {
  Subject,
  Lesson,
  Task,
  Note,
  Material,
  Exam,
  Teacher,
} from '@/types/entities';

// ============================================================================
// STORE STATE
// ============================================================================
interface AppState {
  // Entities
  subjects: Subject[];
  lessons: Lesson[];
  tasks: Task[];
  notes: Note[];
  materials: Material[];
  exams: Exam[];
  teachers: Teacher[];

  // UI State
  selectedSubjectId?: string;
  selectedLessonId?: string;
  isCommandPaletteOpen: boolean;
  isQuickAddOpen: boolean;
  quickAddType?: 'task' | 'note' | 'material';

  // Actions - Subjects
  addSubject: (subject: Omit<Subject, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateSubject: (id: string, updates: Partial<Subject>) => void;
  deleteSubject: (id: string) => void;

  // Actions - Lessons
  addLesson: (lesson: Omit<Lesson, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateLesson: (id: string, updates: Partial<Lesson>) => void;
  deleteLesson: (id: string) => void;

  // Actions - Tasks
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskStatus: (id: string) => void;

  // Actions - Notes
  addNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateNote: (id: string, updates: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  toggleNotePin: (id: string) => void;

  // Actions - Materials
  addMaterial: (material: Omit<Material, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateMaterial: (id: string, updates: Partial<Material>) => void;
  deleteMaterial: (id: string) => void;

  // Actions - Exams
  addExam: (exam: Omit<Exam, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateExam: (id: string, updates: Partial<Exam>) => void;
  deleteExam: (id: string) => void;

  // Actions - Teachers
  addTeacher: (teacher: Omit<Teacher, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTeacher: (id: string, updates: Partial<Teacher>) => void;
  deleteTeacher: (id: string) => void;

  // UI Actions
  setSelectedSubject: (id?: string) => void;
  setSelectedLesson: (id?: string) => void;
  openCommandPalette: () => void;
  closeCommandPalette: () => void;
  openQuickAdd: (type?: 'task' | 'note' | 'material') => void;
  closeQuickAdd: () => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================
function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================
export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set) => ({
        // Initial state
        subjects: [],
        lessons: [],
        tasks: [],
        notes: [],
        materials: [],
        exams: [],
        teachers: [],
        isCommandPaletteOpen: false,
        isQuickAddOpen: false,

        // Subject actions
        addSubject: (subject) =>
          set((state) => ({
            subjects: [
              ...state.subjects,
              {
                ...subject,
                id: generateId(),
                createdAt: now(),
                updatedAt: now(),
              },
            ],
          })),

        updateSubject: (id, updates) =>
          set((state) => ({
            subjects: state.subjects.map((s) =>
              s.id === id ? { ...s, ...updates, updatedAt: now() } : s
            ),
          })),

        deleteSubject: (id) =>
          set((state) => ({
            subjects: state.subjects.filter((s) => s.id !== id),
            // Cascade delete related entities
            lessons: state.lessons.filter((l) => l.subjectId !== id),
            tasks: state.tasks.filter((t) => t.subjectId !== id),
            notes: state.notes.filter((n) => n.subjectId !== id),
            materials: state.materials.filter((m) => m.subjectId !== id),
            exams: state.exams.filter((e) => e.subjectId !== id),
          })),

        // Lesson actions
        addLesson: (lesson) =>
          set((state) => ({
            lessons: [
              ...state.lessons,
              {
                ...lesson,
                id: generateId(),
                createdAt: now(),
                updatedAt: now(),
              },
            ],
          })),

        updateLesson: (id, updates) =>
          set((state) => ({
            lessons: state.lessons.map((l) =>
              l.id === id ? { ...l, ...updates, updatedAt: now() } : l
            ),
          })),

        deleteLesson: (id) =>
          set((state) => ({
            lessons: state.lessons.filter((l) => l.id !== id),
            // Cascade delete related entities
            tasks: state.tasks.filter((t) => t.lessonId !== id),
            notes: state.notes.filter((n) => n.lessonId !== id),
            materials: state.materials.filter((m) => m.lessonId !== id),
          })),

        // Task actions
        addTask: (task) =>
          set((state) => ({
            tasks: [
              ...state.tasks,
              {
                ...task,
                id: generateId(),
                createdAt: now(),
                updatedAt: now(),
              },
            ],
          })),

        updateTask: (id, updates) =>
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === id ? { ...t, ...updates, updatedAt: now() } : t
            ),
          })),

        deleteTask: (id) =>
          set((state) => ({
            tasks: state.tasks.filter((t) => t.id !== id),
            notes: state.notes.filter((n) => n.taskId !== id),
          })),

        toggleTaskStatus: (id) =>
          set((state) => ({
            tasks: state.tasks.map((t) => {
              if (t.id !== id) return t;
              const newStatus =
                t.status === 'todo'
                  ? 'in-progress'
                  : t.status === 'in-progress'
                  ? 'done'
                  : 'todo';
              return {
                ...t,
                status: newStatus,
                completedAt: newStatus === 'done' ? now() : undefined,
                updatedAt: now(),
              };
            }),
          })),

        // Note actions
        addNote: (note) =>
          set((state) => ({
            notes: [
              ...state.notes,
              {
                ...note,
                id: generateId(),
                createdAt: now(),
                updatedAt: now(),
              },
            ],
          })),

        updateNote: (id, updates) =>
          set((state) => ({
            notes: state.notes.map((n) =>
              n.id === id ? { ...n, ...updates, updatedAt: now() } : n
            ),
          })),

        deleteNote: (id) =>
          set((state) => ({
            notes: state.notes.filter((n) => n.id !== id),
          })),

        toggleNotePin: (id) =>
          set((state) => ({
            notes: state.notes.map((n) =>
              n.id === id ? { ...n, isPinned: !n.isPinned, updatedAt: now() } : n
            ),
          })),

        // Material actions
        addMaterial: (material) =>
          set((state) => ({
            materials: [
              ...state.materials,
              {
                ...material,
                id: generateId(),
                createdAt: now(),
                updatedAt: now(),
              },
            ],
          })),

        updateMaterial: (id, updates) =>
          set((state) => ({
            materials: state.materials.map((m) =>
              m.id === id ? { ...m, ...updates, updatedAt: now() } : m
            ),
          })),

        deleteMaterial: (id) =>
          set((state) => ({
            materials: state.materials.filter((m) => m.id !== id),
          })),

        // Exam actions
        addExam: (exam) =>
          set((state) => ({
            exams: [
              ...state.exams,
              {
                ...exam,
                id: generateId(),
                createdAt: now(),
                updatedAt: now(),
              },
            ],
          })),

        updateExam: (id, updates) =>
          set((state) => ({
            exams: state.exams.map((e) =>
              e.id === id ? { ...e, ...updates, updatedAt: now() } : e
            ),
          })),

        deleteExam: (id) =>
          set((state) => ({
            exams: state.exams.filter((e) => e.id !== id),
          })),

        // Teacher actions
        addTeacher: (teacher) =>
          set((state) => ({
            teachers: [
              ...state.teachers,
              {
                ...teacher,
                id: generateId(),
                createdAt: now(),
                updatedAt: now(),
              },
            ],
          })),

        updateTeacher: (id, updates) =>
          set((state) => ({
            teachers: state.teachers.map((t) =>
              t.id === id ? { ...t, ...updates, updatedAt: now() } : t
            ),
          })),

        deleteTeacher: (id) =>
          set((state) => ({
            teachers: state.teachers.filter((t) => t.id !== id),
          })),

        // UI actions
        setSelectedSubject: (id) => set({ selectedSubjectId: id }),
        setSelectedLesson: (id) => set({ selectedLessonId: id }),
        openCommandPalette: () => set({ isCommandPaletteOpen: true }),
        closeCommandPalette: () => set({ isCommandPaletteOpen: false }),
        openQuickAdd: (type) => set({ isQuickAddOpen: true, quickAddType: type }),
        closeQuickAdd: () => set({ isQuickAddOpen: false, quickAddType: undefined }),
      }),
      {
        name: 'schulplaner-store',
        // Only persist entities, not UI state
        partialize: (state) => ({
          subjects: state.subjects,
          lessons: state.lessons,
          tasks: state.tasks,
          notes: state.notes,
          materials: state.materials,
          exams: state.exams,
          teachers: state.teachers,
        }),
      }
    ),
    { name: 'AppStore' }
  )
);

// ============================================================================
// SELECTORS (for computed values)
// ============================================================================

export const selectors = {
  // Get tasks for a specific subject
  getTasksBySubject: (subjectId: string) => (state: AppState) =>
    state.tasks.filter((t) => t.subjectId === subjectId),

  // Get tasks for a specific lesson
  getTasksByLesson: (lessonId: string) => (state: AppState) =>
    state.tasks.filter((t) => t.lessonId === lessonId),

  // Get notes for a specific subject
  getNotesBySubject: (subjectId: string) => (state: AppState) =>
    state.notes.filter((n) => n.subjectId === subjectId),

  // Get materials for a specific subject
  getMaterialsBySubject: (subjectId: string) => (state: AppState) =>
    state.materials.filter((m) => m.subjectId === subjectId),

  // Get upcoming tasks (not done, with due date)
  getUpcomingTasks: (state: AppState) =>
    state.tasks
      .filter((t) => t.status !== 'done' && t.dueDate)
      .sort((a, b) => (a.dueDate || '').localeCompare(b.dueDate || '')),

  // Get next lesson (by day/time)
  getNextLesson: (state: AppState) => {
    const now = new Date();
    const currentDay = now.getDay();
    const currentTime = now.toTimeString().slice(0, 5);

    return state.lessons
      .filter((l) => {
        if (l.dayOfWeek > currentDay) return true;
        if (l.dayOfWeek === currentDay && l.startTime >= currentTime) return true;
        return false;
      })
      .sort((a, b) => {
        if (a.dayOfWeek !== b.dayOfWeek) return a.dayOfWeek - b.dayOfWeek;
        return a.startTime.localeCompare(b.startTime);
      })[0];
  },
};

