import { useState, useEffect, useCallback } from 'react';
import { readJSON, writeJSON } from '@/lib/storage';
import { Holiday, GERMAN_STATES } from '@/types/holidays';

const HOLIDAYS_STORAGE_KEY = 'schulplaner:holidays';

export function useHolidays() {
  const [holidays, setHolidays] = useState<Holiday[]>(() => {
    try {
      return readJSON<Holiday[]>(HOLIDAYS_STORAGE_KEY, []);
    } catch {
      return [];
    }
  });

  useEffect(() => {
    writeJSON(HOLIDAYS_STORAGE_KEY, holidays);
  }, [holidays]);

  const addHoliday = useCallback(
    (name: string, startDate: string, endDate: string, state: string) => {
      const newHoliday: Holiday = {
        id: crypto.randomUUID(),
        name: name.trim(),
        startDate,
        endDate,
        state,
        createdAt: new Date().toISOString(),
      };
      setHolidays((prev) => [...prev, newHoliday].sort((a, b) => a.startDate.localeCompare(b.startDate)));
      return newHoliday;
    },
    []
  );

  const updateHoliday = useCallback(
    (id: string, name: string, startDate: string, endDate: string, state: string) => {
      setHolidays((prev) =>
        prev
          .map((holiday) =>
            holiday.id === id
              ? { ...holiday, name: name.trim(), startDate, endDate, state }
              : holiday
          )
          .sort((a, b) => a.startDate.localeCompare(b.startDate))
      );
    },
    []
  );

  const deleteHoliday = useCallback((id: string) => {
    setHolidays((prev) => prev.filter((holiday) => holiday.id !== id));
  }, []);

  const getHolidaysForDate = useCallback(
    (date: Date | string) => {
      const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
      return holidays.filter(
        (holiday) => dateStr >= holiday.startDate && dateStr <= holiday.endDate
      );
    },
    [holidays]
  );

  const isHoliday = useCallback(
    (date: Date | string, state?: string) => {
      const dateStr = typeof date === 'string' ? date : date.toISOString().split('T')[0];
      return holidays.some(
        (holiday) =>
          dateStr >= holiday.startDate &&
          dateStr <= holiday.endDate &&
          (!state || holiday.state === state || holiday.state === 'ALL')
      );
    },
    [holidays]
  );

  return {
    holidays,
    addHoliday,
    updateHoliday,
    deleteHoliday,
    getHolidaysForDate,
    isHoliday,
    states: GERMAN_STATES,
  };
}


