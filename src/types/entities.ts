/**
 * Entity Model for Schulplaner
 * 
 * Defines all core entities with IDs and relationships for deep linking
 */

// ============================================================================
// BASE ENTITY
// ============================================================================
export interface BaseEntity {
  id: string;
  createdAt: string;
  updatedAt: string;
}

// ============================================================================
// SUBJECT (Fach)
// ============================================================================
export interface Subject extends BaseEntity {
  name: string;
  shortName?: string;
  color?: string; // Hex color for visual identification
  teacherId?: string; // Optional teacher reference
}

// ============================================================================
// LESSON (Stunde / Unterricht)
// ============================================================================
export interface Lesson extends BaseEntity {
  subjectId: string;
  subjectName: string; // Denormalized for quick access
  dayOfWeek: number; // 0 = Sunday, 1 = Monday, etc.
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  room?: string;
  teacherId?: string;
  teacherName?: string;
  notes?: string;
  repeatWeekly?: boolean;
  repeatUntil?: string; // ISO date
}

// ============================================================================
// TASK (Aufgabe)
// ============================================================================
export interface Task extends BaseEntity {
  title: string;
  description?: string;
  subjectId?: string;
  subjectName?: string;
  lessonId?: string; // Optional: linked to specific lesson
  dueDate?: string; // ISO date
  priority: 'low' | 'medium' | 'high';
  status: 'todo' | 'in-progress' | 'done';
  completedAt?: string;
  estimatedMinutes?: number;
  tags?: string[];
}

// ============================================================================
// NOTE (Notiz)
// ============================================================================
export interface Note extends BaseEntity {
  title: string;
  content: string;
  subjectId?: string;
  subjectName?: string;
  lessonId?: string; // Optional: linked to specific lesson
  taskId?: string; // Optional: linked to specific task
  tags?: string[];
  isPinned?: boolean;
}

// ============================================================================
// MATERIAL (Material)
// ============================================================================
export interface Material extends BaseEntity {
  title: string;
  type: 'pdf' | 'image' | 'link' | 'text';
  content?: string; // For text materials or OCR'd content
  url?: string; // For links or file URLs
  subjectId?: string;
  subjectName?: string;
  lessonId?: string; // Optional: linked to specific lesson
  tags?: string[];
  fileSize?: number;
  mimeType?: string;
}

// ============================================================================
// EXAM (Klausur / Prüfung)
// ============================================================================
export interface Exam extends BaseEntity {
  subjectId: string;
  subjectName: string;
  title?: string;
  date: string; // ISO date
  startTime?: string; // HH:mm format
  endTime?: string; // HH:mm format
  room?: string;
  topics?: string; // Comma-separated or structured
  notes?: string;
  studyDays?: number; // Days to prepare
  aiSummary?: string; // AI-generated summary
  status: 'upcoming' | 'completed' | 'cancelled';
  grade?: string;
}

// ============================================================================
// TEACHER (Lehrer)
// ============================================================================
export interface Teacher extends BaseEntity {
  name: string;
  email?: string;
  phone?: string;
  subjects?: string[]; // Array of subject IDs
}

// ============================================================================
// DEEP LINK HELPERS
// ============================================================================

export type EntityType = 'subject' | 'lesson' | 'task' | 'note' | 'material' | 'exam' | 'teacher';

export interface DeepLink {
  type: EntityType;
  id: string;
  params?: Record<string, string>;
}

/**
 * Generate a deep link path from entity
 */
export function generateDeepLink(entity: DeepLink): string {
  const base = `/${entity.type}s/${entity.id}`;
  if (entity.params) {
    const query = new URLSearchParams(entity.params).toString();
    return `${base}?${query}`;
  }
  return base;
}

/**
 * Parse a deep link path to entity reference
 */
export function parseDeepLink(path: string): DeepLink | null {
  const match = path.match(/\/(\w+)s\/([^?]+)(?:\?(.+))?/);
  if (!match) return null;

  const [, type, id, query] = match;
  const params = query ? Object.fromEntries(new URLSearchParams(query)) : undefined;

  return {
    type: type as EntityType,
    id,
    params,
  };
}

