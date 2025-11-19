import { useCallback, useEffect, useMemo, useState } from 'react';

import { readJSON, writeJSON } from '@/lib/storage';

export type TaskPriority = 'Low' | 'Medium' | 'High';

export type Task = {
  id: string;
  title: string;
  subject: string;
  dueDate: string;
  priority: TaskPriority;
  done: boolean;
};

type CreateTaskPayload = {
  title: string;
  subject?: string;
  dueDate?: string;
  priority?: TaskPriority;
};

function futureDate(daysAhead: number, hour = 9) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  date.setHours(hour, 0, 0, 0);
  return date.toISOString().slice(0, 16);
}

const INITIAL_TASKS: Task[] = [
  { id: '1', title: 'Biology worksheet', subject: 'Biology', dueDate: futureDate(0, 14), priority: 'High', done: false },
  { id: '2', title: 'History essay outline', subject: 'History', dueDate: futureDate(1, 9), priority: 'Medium', done: false },
  { id: '3', title: 'Math problem set', subject: 'Mathematics', dueDate: futureDate(3, 8), priority: 'High', done: false },
];

const STORAGE_KEY = 'schulplaner:tasks';

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>(() => readJSON(STORAGE_KEY, INITIAL_TASKS));

  useEffect(() => {
    writeJSON(STORAGE_KEY, tasks);
  }, [tasks]);

  const addTask = useCallback(({ title, subject, dueDate, priority = 'Medium' }: CreateTaskPayload) => {
    setTasks((prev) => [
      {
        id: crypto.randomUUID(),
        title,
        subject: subject || 'General',
        dueDate: dueDate ?? '',
        priority,
        done: false,
      },
      ...prev,
    ]);
  }, []);

  const deleteTask = useCallback((id: string) => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  }, []);

  const toggleTask = useCallback((id: string) => {
    setTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              done: !task.done,
            }
          : task,
      ),
    );
  }, []);

  const sortedTasks = useMemo(() => {
    return [...tasks].sort((a, b) => {
      const aTime = a.dueDate ? new Date(a.dueDate).getTime() : Number.POSITIVE_INFINITY;
      const bTime = b.dueDate ? new Date(b.dueDate).getTime() : Number.POSITIVE_INFINITY;
      return aTime - bTime;
    });
  }, [tasks]);

  return {
    tasks,
    sortedTasks,
    addTask,
    deleteTask,
    toggleTask,
  };
}

