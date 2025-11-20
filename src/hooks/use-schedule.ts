'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { readJSON, writeJSON } from '@/lib/storage';

export interface ClassEntry {
  id: string;
  title: string;
  time: string;
  room: string;
  subjectColor: string;
}

export interface TaskEntry {
  id: string;
  title: string;
  subject: string;
  due: string;
  subjectColor: string;
}

export interface DayData {
  id: string;
  date: string;
  classes: ClassEntry[];
  tasks: TaskEntry[];
}

const SCHEDULE_STORAGE_KEY = 'schulplaner:schedule';

const SUBJECT_COLOR_MAP: Record<string, string> = {
  mathematics: '#0A84FF',
  math: '#0A84FF',
  english: '#FF9500',
  literature: '#FF9500',
  history: '#FF9F0A',
  physics: '#5E5CE6',
  chemistry: '#FF375F',
  biology: '#30D158',
  sport: '#FFD60A',
  music: '#FF375F',
  art: '#FF9F0A',
  german: '#5856D6',
  default: '#0A84FF',
};

const getWeekStart = (date: Date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
};

const formatDateKey = (date: Date | string) => {
  if (typeof date === 'string') {
    return date.split('T')[0];
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getSubjectColor = (subject: string) => {
  if (!subject) return SUBJECT_COLOR_MAP.default;
  const key = subject.toLowerCase();
  const match = Object.keys(SUBJECT_COLOR_MAP).find((token) => key.includes(token));
  return match ? SUBJECT_COLOR_MAP[match] : SUBJECT_COLOR_MAP.default;
};

const createDefaultWeek = (): DayData[] => {
  const today = new Date();
  const start = getWeekStart(today);
  const days: DayData[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(start);
    date.setDate(start.getDate() + i);
    const dateKey = formatDateKey(date);
    const isMonday = i === 0;

    const classes: ClassEntry[] = isMonday
      ? [
          {
            id: crypto.randomUUID(),
            title: 'Mathematics',
            time: '08:00',
            room: 'B201',
            subjectColor: getSubjectColor('Mathematics'),
          },
          {
            id: crypto.randomUUID(),
            title: 'English Literature',
            time: '09:15',
            room: 'C102',
            subjectColor: getSubjectColor('English'),
          },
        ]
      : [];

    days.push({
      id: crypto.randomUUID(),
      date: dateKey,
      classes,
      tasks: [],
    });
  }

  return days;
};

const normalizeDays = (raw: unknown): DayData[] => {
  if (!Array.isArray(raw)) {
    return createDefaultWeek();
  }

  return raw.map((day: any) => {
    const date = formatDateKey(day?.date || new Date());
    const classes: ClassEntry[] = Array.isArray(day?.classes)
      ? day.classes.map((cls: any) => ({
          id: typeof cls?.id === 'string' ? cls.id : crypto.randomUUID(),
          title: cls?.title || cls?.subject || 'Lesson',
          time: cls?.time || '08:00',
          room: cls?.room || '',
          subjectColor: cls?.subjectColor || getSubjectColor(cls?.title || cls?.subject || ''),
        }))
      : [];

  return {
      id: typeof day?.id === 'string' ? day.id : crypto.randomUUID(),
      date,
      classes,
      tasks: Array.isArray(day?.tasks)
        ? day.tasks.map((task: any) => ({
            id: typeof task?.id === 'string' ? task.id : crypto.randomUUID(),
            title: task?.title || 'Task',
            subject: task?.subject || '',
            due: task?.due || date,
            subjectColor: task?.subjectColor || getSubjectColor(task?.subject || task?.title || ''),
          }))
        : [],
    };
  });
};

type ClassPayload = Omit<ClassEntry, 'id' | 'subjectColor'> &
  Partial<Pick<ClassEntry, 'id' | 'subjectColor'>>;

export function useSchedule() {
  const [days, setDays] = useState<DayData[]>(() =>
    normalizeDays(readJSON(SCHEDULE_STORAGE_KEY, createDefaultWeek()))
  );

  useEffect(() => {
    writeJSON(SCHEDULE_STORAGE_KEY, days);
  }, [days]);

  const getDayByDate = useCallback(
    (input: Date | string): DayData | null => {
      const key = formatDateKey(input);
      return days.find((day) => day.date === key) || null;
    },
    [days]
  );

  const ensureDayForDate = useCallback(
    (input: Date | string): DayData => {
      const key = formatDateKey(input);
      const existing = days.find((day) => day.date === key);
      if (existing) return existing;

      const newDay: DayData = {
        id: crypto.randomUUID(),
        date: key,
        classes: [],
        tasks: [],
      };
      setDays((prev) => [...prev, newDay]);
      return newDay;
    },
    [days]
  );

  const addClassToDay = useCallback((dayId: string, classEntry: ClassPayload) => {
    setDays((prev) =>
      prev.map((day) => {
        if (day.id !== dayId) return day;
        const entry: ClassEntry = {
          id: classEntry.id ?? crypto.randomUUID(),
          title: classEntry.title || 'Lesson',
          time: classEntry.time || '08:00',
          room: classEntry.room || '',
          subjectColor: classEntry.subjectColor || getSubjectColor(classEntry.title || ''),
        };
        const classes = [...day.classes, entry].sort((a, b) => {
          const toMinutes = (val: string) => {
            const [h, m] = val.split(':').map(Number);
            return h * 60 + m;
          };
          return toMinutes(a.time) - toMinutes(b.time);
        });
        return { ...day, classes };
      })
    );
  }, []);

  const removeClassFromDay = useCallback((dayId: string, classId: string) => {
    setDays((prev) =>
      prev.map((day) =>
        day.id === dayId
          ? { ...day, classes: day.classes.filter((cls) => cls.id !== classId) }
          : day
      )
    );
  }, []);

  const updateClassForDay = useCallback(
    (dayId: string, classId: string, updates: Partial<ClassEntry>) => {
      setDays((prev) =>
        prev.map((day) => {
          if (day.id !== dayId) return day;
          const classes = day.classes.map((cls) =>
            cls.id === classId
              ? { ...cls, ...updates, subjectColor: updates.subjectColor || cls.subjectColor }
              : cls
          );
          classes.sort((a, b) => {
            const toMinutes = (val: string) => {
              const [h, m] = val.split(':').map(Number);
              return h * 60 + m;
            };
            return toMinutes(a.time) - toMinutes(b.time);
          });
          return { ...day, classes };
        })
      );
    },
    []
  );

  const getClassesForDate = useCallback(
    (input: Date | string) => getDayByDate(input)?.classes ?? [],
    [getDayByDate]
  );

  const totalClasses = useMemo(() => days.flatMap((day) => day.classes), [days]);

  return {
    days,
    addClassToDay,
    removeClassFromDay,
    updateClassForDay,
    ensureDayForDate,
    getDayByDate,
    getClassesForDate,
    totalClasses,
  };
}
