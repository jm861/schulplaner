import { useCallback, useEffect, useState } from 'react';

import { readJSON, writeJSON } from '@/lib/storage';

export type ClassSession = {
  id: string;
  time: string;
  subject: string;
  room: string;
};

const SCHEDULE_STORAGE_KEY = 'schulplaner:schedule';

const DEFAULT_CLASSES: ClassSession[] = [
  { id: '1', time: '08:00', subject: 'Mathematics', room: 'B201' },
  { id: '2', time: '09:00', subject: 'English Literature', room: 'C102' },
  { id: '3', time: '10:15', subject: 'Physics Lab', room: 'Lab 3' },
];

export function useSchedule() {
  const [classes, setClasses] = useState<ClassSession[]>(() => 
    readJSON(SCHEDULE_STORAGE_KEY, DEFAULT_CLASSES)
  );

  useEffect(() => {
    writeJSON(SCHEDULE_STORAGE_KEY, classes);
  }, [classes]);

  const addClass = useCallback((classSession: Omit<ClassSession, 'id'>) => {
    setClasses((prev) => [
      ...prev,
      {
        ...classSession,
        id: crypto.randomUUID(),
      },
    ]);
  }, []);

  const updateClass = useCallback((id: string, updates: Partial<ClassSession>) => {
    setClasses((prev) =>
      prev.map((cls) => (cls.id === id ? { ...cls, ...updates } : cls))
    );
  }, []);

  const deleteClass = useCallback((id: string) => {
    setClasses((prev) => prev.filter((cls) => cls.id !== id));
  }, []);

  const sortedClasses = [...classes].sort((a, b) => {
    const [aHours, aMinutes] = a.time.split(':').map(Number);
    const [bHours, bMinutes] = b.time.split(':').map(Number);
    const aTime = aHours * 60 + aMinutes;
    const bTime = bHours * 60 + bMinutes;
    return aTime - bTime;
  });

  return {
    classes: sortedClasses,
    addClass,
    updateClass,
    deleteClass,
  };
}

