import { useState, useEffect, useCallback } from 'react';
import { readJSON, writeJSON } from '@/lib/storage';
import { Course } from '@/types/courses';

const COURSES_STORAGE_KEY = 'schulplaner:courses';

// Default courses for FOS
const DEFAULT_COURSES: Course[] = [
  { id: 'math', name: 'Mathematik', createdAt: new Date().toISOString() },
  { id: 'german', name: 'Deutsch', createdAt: new Date().toISOString() },
  { id: 'english', name: 'Englisch', createdAt: new Date().toISOString() },
  { id: 'physics', name: 'Physik', createdAt: new Date().toISOString() },
  { id: 'chemistry', name: 'Chemie', createdAt: new Date().toISOString() },
  { id: 'biology', name: 'Biologie', createdAt: new Date().toISOString() },
  { id: 'history', name: 'Geschichte', createdAt: new Date().toISOString() },
  { id: 'geography', name: 'Geographie', createdAt: new Date().toISOString() },
  { id: 'sport', name: 'Sport', createdAt: new Date().toISOString() },
  { id: 'religion', name: 'Religion', createdAt: new Date().toISOString() },
  { id: 'ethics', name: 'Ethik', createdAt: new Date().toISOString() },
  { id: 'art', name: 'Kunst', createdAt: new Date().toISOString() },
  { id: 'music', name: 'Musik', createdAt: new Date().toISOString() },
  { id: 'computer-science', name: 'Informatik', createdAt: new Date().toISOString() },
  { id: 'economics', name: 'Wirtschaft', createdAt: new Date().toISOString() },
];

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>(() => {
    try {
      const saved = readJSON<Course[]>(COURSES_STORAGE_KEY, []);
      // Merge with defaults if empty
      if (saved.length === 0) {
        // Write defaults on first load
        setTimeout(() => writeJSON(COURSES_STORAGE_KEY, DEFAULT_COURSES), 0);
        return DEFAULT_COURSES;
      }
      // Merge defaults with saved, avoiding duplicates
      const defaultIds = new Set(DEFAULT_COURSES.map((c) => c.id));
      const savedIds = new Set(saved.map((c) => c.id));
      const merged = [...DEFAULT_COURSES];
      saved.forEach((course) => {
        if (!defaultIds.has(course.id)) {
          merged.push(course);
        }
      });
      const sorted = merged.sort((a, b) => a.name.localeCompare(b.name));
      // Update storage if merged list is different
      if (saved.length !== sorted.length || !savedIds.has(DEFAULT_COURSES[0]?.id)) {
        setTimeout(() => writeJSON(COURSES_STORAGE_KEY, sorted), 0);
      }
      return sorted;
    } catch {
      return DEFAULT_COURSES;
    }
  });

  useEffect(() => {
    if (courses.length > 0) {
      writeJSON(COURSES_STORAGE_KEY, courses);
    }
  }, [courses]);

  const addCourse = useCallback((name: string) => {
    const newCourse: Course = {
      id: crypto.randomUUID(),
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };
    setCourses((prev) => [...prev, newCourse].sort((a, b) => a.name.localeCompare(b.name)));
    return newCourse;
  }, []);

  const updateCourse = useCallback((id: string, name: string) => {
    setCourses((prev) =>
      prev
        .map((course) => (course.id === id ? { ...course, name: name.trim() } : course))
        .sort((a, b) => a.name.localeCompare(b.name))
    );
  }, []);

  const deleteCourse = useCallback((id: string) => {
    setCourses((prev) => prev.filter((course) => course.id !== id));
  }, []);

  const getCourseById = useCallback(
    (id: string) => {
      return courses.find((course) => course.id === id);
    },
    [courses]
  );

  const getCoursesByIds = useCallback(
    (ids: string[]) => {
      return courses.filter((course) => ids.includes(course.id));
    },
    [courses]
  );

  return {
    courses,
    addCourse,
    updateCourse,
    deleteCourse,
    getCourseById,
    getCoursesByIds,
  };
}

