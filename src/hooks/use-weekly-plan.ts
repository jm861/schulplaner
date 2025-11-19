import { useCallback, useEffect, useState } from 'react';

import { readJSON, writeJSON } from '@/lib/storage';

export type WeeklyPlanSlot = {
  id: string;
  day: string;
  focus: string;
  duration: string;
  aiNote: string;
};

const WEEKLY_PLAN_STORAGE_KEY = 'schulplaner:weeklyPlan';
const DEMO_DATA_KEY = 'schulplaner:weeklyPlanHasDemo';

export const DEMO_WEEKLY_PLAN: WeeklyPlanSlot[] = [
  { id: 'demo-1', day: 'Monday', focus: 'Math problem set', duration: '90 min', aiNote: 'Use spaced repetition deck.' },
  { id: 'demo-2', day: 'Tuesday', focus: 'Chemistry lab review', duration: '60 min', aiNote: 'Summarize reactions via GPT.' },
  { id: 'demo-3', day: 'Wednesday', focus: 'History essay draft', duration: '75 min', aiNote: 'Ask for thesis variations.' },
  { id: 'demo-4', day: 'Thursday', focus: 'English reading', duration: '45 min', aiNote: 'Generate discussion questions.' },
  { id: 'demo-5', day: 'Friday', focus: 'Physics simulation', duration: '60 min', aiNote: 'Request formula cheat sheet.' },
];

export function useWeeklyPlan() {
  const [slots, setSlots] = useState<WeeklyPlanSlot[]>(() => 
    readJSON(WEEKLY_PLAN_STORAGE_KEY, [])
  );

  useEffect(() => {
    writeJSON(WEEKLY_PLAN_STORAGE_KEY, slots);
  }, [slots]);

  const updateSlot = useCallback((id: string, updates: Partial<WeeklyPlanSlot>) => {
    setSlots((prev) =>
      prev.map((slot) => (slot.id === id ? { ...slot, ...updates } : slot))
    );
  }, []);

  const addSlot = useCallback((slot: Omit<WeeklyPlanSlot, 'id'>) => {
    setSlots((prev) => [
      ...prev,
      {
        ...slot,
        id: crypto.randomUUID(),
      },
    ]);
  }, []);

  const deleteSlot = useCallback((id: string) => {
    setSlots((prev) => prev.filter((slot) => slot.id !== id));
  }, []);

  const loadDemoData = useCallback(() => {
    setSlots([...DEMO_WEEKLY_PLAN]);
    writeJSON(DEMO_DATA_KEY, true);
  }, []);

  const removeDemoData = useCallback(() => {
    // Remove all demo slots (those with 'demo-' prefix in id)
    setSlots((prev) => prev.filter((slot) => !slot.id.startsWith('demo-')));
    writeJSON(DEMO_DATA_KEY, false);
  }, []);

  const hasDemoData = useCallback(() => {
    return slots.some((slot) => slot.id.startsWith('demo-'));
  }, [slots]);

  return {
    slots,
    updateSlot,
    addSlot,
    deleteSlot,
    loadDemoData,
    removeDemoData,
    hasDemoData: hasDemoData(),
  };
}

