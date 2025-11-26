'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import { readJSON, writeJSON } from '@/lib/storage';

export interface ClassEntry {
  id: string;
  title: string;
  time: string;
  room: string;
  subjectColor: string;
  durationMinutes?: number;
  participants?: string[];
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
            durationMinutes: 45,
          },
          {
            id: crypto.randomUUID(),
            title: 'English Literature',
            time: '09:15',
            room: 'C102',
            subjectColor: getSubjectColor('English'),
            durationMinutes: 45,
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

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const normalizeClassEntry = (value: unknown): ClassEntry => {
  if (!isRecord(value)) {
    return {
      id: crypto.randomUUID(),
      title: 'Lesson',
      time: '08:00',
      room: '',
      subjectColor: getSubjectColor(''),
      durationMinutes: 45,
      participants: [],
    };
  }

  const participants = Array.isArray(value.participants)
    ? value.participants.filter((participant): participant is string => typeof participant === 'string')
    : [];

  const title =
    typeof value.title === 'string'
      ? value.title
      : typeof value.subject === 'string'
        ? value.subject
        : 'Lesson';

  return {
    id: typeof value.id === 'string' ? value.id : crypto.randomUUID(),
    title,
    time: typeof value.time === 'string' ? value.time : '08:00',
    room: typeof value.room === 'string' ? value.room : '',
    subjectColor:
      typeof value.subjectColor === 'string'
        ? value.subjectColor
        : getSubjectColor(typeof value.subject === 'string' ? value.subject : title),
    durationMinutes: typeof value.durationMinutes === 'number' ? value.durationMinutes : 45,
    participants,
  };
};

const normalizeTaskEntry = (value: unknown, fallbackDate: string): TaskEntry => {
  if (!isRecord(value)) {
    return {
      id: crypto.randomUUID(),
      title: 'Task',
      subject: '',
      due: fallbackDate,
      subjectColor: getSubjectColor(''),
    };
  }

  const subject = typeof value.subject === 'string' ? value.subject : '';

  return {
    id: typeof value.id === 'string' ? value.id : crypto.randomUUID(),
    title: typeof value.title === 'string' ? value.title : 'Task',
    subject,
    due: typeof value.due === 'string' ? value.due : fallbackDate,
    subjectColor:
      typeof value.subjectColor === 'string'
        ? value.subjectColor
        : getSubjectColor(subject || (typeof value.title === 'string' ? value.title : '')),
  };
};

const normalizeDays = (raw: unknown): DayData[] => {
  if (!Array.isArray(raw)) {
    return createDefaultWeek();
  }

  return raw.map((rawDay) => {
    const dayRecord = isRecord(rawDay) ? rawDay : {};
    const rawDate = isRecord(dayRecord) ? dayRecord.date : undefined;
    const date = formatDateKey(
      typeof rawDate === 'string' || rawDate instanceof Date ? rawDate : new Date()
    );
    const classes: ClassEntry[] = Array.isArray(dayRecord.classes)
      ? dayRecord.classes.map((cls) => normalizeClassEntry(cls))
      : [];

    return {
      id: typeof dayRecord.id === 'string' ? dayRecord.id : crypto.randomUUID(),
      date,
      classes,
      tasks: Array.isArray(dayRecord.tasks)
        ? dayRecord.tasks.map((task) => normalizeTaskEntry(task, date))
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
          durationMinutes:
            typeof classEntry.durationMinutes === 'number' ? classEntry.durationMinutes : 45,
          participants: Array.isArray(classEntry.participants)
            ? classEntry.participants.filter((p) => typeof p === 'string')
            : [],
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
              ? {
                  ...cls,
                  ...updates,
                  subjectColor: updates.subjectColor || cls.subjectColor,
                  durationMinutes:
                    typeof updates.durationMinutes === 'number'
                      ? updates.durationMinutes
                      : cls.durationMinutes,
                  participants: Array.isArray(updates.participants)
                    ? updates.participants.filter((p) => typeof p === 'string')
                    : cls.participants,
                }
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
