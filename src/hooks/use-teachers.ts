import { useState, useEffect, useCallback } from 'react';
import { readJSON, writeJSON } from '@/lib/storage';
import { Teacher } from '@/types/teachers';

const TEACHERS_STORAGE_KEY = 'schulplaner:teachers';

export function useTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>(() => {
    try {
      const saved = readJSON<Teacher[]>(TEACHERS_STORAGE_KEY, []);
      // Ensure all teachers have courses array - migrate old data
      const migrated = saved.map((teacher) => {
        // If teacher doesn't have courses property, add empty array
        if (!('courses' in teacher) || !Array.isArray(teacher.courses)) {
          return {
            ...teacher,
            courses: [],
          };
        }
        return teacher;
      });
      // Write back migrated data if it changed
      if (migrated.some((t, i) => !saved[i]?.courses)) {
        writeJSON(TEACHERS_STORAGE_KEY, migrated);
      }
      return migrated;
    } catch {
      return [];
    }
  });

  useEffect(() => {
    // Ensure all teachers have courses array before saving
    const normalized = teachers.map((teacher) => ({
      ...teacher,
      courses: Array.isArray(teacher.courses) ? teacher.courses : [],
    }));
    writeJSON(TEACHERS_STORAGE_KEY, normalized);
  }, [teachers]);

  const addTeacher = useCallback((name: string, email: string, courses: string[] = []) => {
    const newTeacher: Teacher = {
      id: crypto.randomUUID(),
      name: name.trim(),
      email: email.trim().toLowerCase(),
      courses,
      createdAt: new Date().toISOString(),
    };
    setTeachers((prev) => [...prev, newTeacher]);
    return newTeacher;
  }, []);

  const updateTeacher = useCallback((id: string, name: string, email: string, courses: string[] = []) => {
    setTeachers((prev) =>
      prev.map((teacher) =>
        teacher.id === id
          ? { ...teacher, name: name.trim(), email: email.trim().toLowerCase(), courses }
          : teacher
      )
    );
  }, []);

  const updateTeacherCourses = useCallback((id: string, courses: string[]) => {
    setTeachers((prev) =>
      prev.map((teacher) => (teacher.id === id ? { ...teacher, courses } : teacher))
    );
  }, []);

  const deleteTeacher = useCallback((id: string) => {
    setTeachers((prev) => prev.filter((teacher) => teacher.id !== id));
  }, []);

  return {
    teachers,
    addTeacher,
    updateTeacher,
    updateTeacherCourses,
    deleteTeacher,
  };
}

