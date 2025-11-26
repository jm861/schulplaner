import { useCallback, useEffect, useMemo, useState } from 'react';
import { readJSON, writeJSON } from '@/lib/storage';

export type Exam = {
  id: string;
  subject: string;
  date: string;
  topics: string;
  notes: string;
  studyDays?: number; // Number of days to study before the exam
};

type CreateExamPayload = {
  subject: string;
  date?: string;
  topics?: string;
  notes?: string;
  studyDays?: number;
};

const EXAMS_STORAGE_KEY = 'schulplaner:exams';

export function useExams() {
  const [exams, setExams] = useState<Exam[]>(() => readJSON(EXAMS_STORAGE_KEY, []));

  useEffect(() => {
    writeJSON(EXAMS_STORAGE_KEY, exams);
  }, [exams]);

  const addExam = useCallback((exam: CreateExamPayload) => {
    setExams((prev) => [
      {
        id: crypto.randomUUID(),
        subject: exam.subject,
        date: exam.date ?? '',
        topics: exam.topics ?? '',
        notes: exam.notes ?? '',
        studyDays: exam.studyDays,
      },
      ...prev,
    ]);
  }, []);

  const updateExam = useCallback((id: string, updates: Partial<Exam>) => {
    setExams((prev) =>
      prev.map((exam) => (exam.id === id ? { ...exam, ...updates } : exam))
    );
  }, []);

  const deleteExam = useCallback((id: string) => {
    setExams((prev) => prev.filter((exam) => exam.id !== id));
  }, []);

  const sortedExams = useMemo(() => {
    return [...exams].sort((a, b) => {
      const aTime = a.date ? new Date(a.date).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.date ? new Date(b.date).getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });
  }, [exams]);

  return {
    exams,
    sortedExams,
    addExam,
    updateExam,
    deleteExam,
  };
}

