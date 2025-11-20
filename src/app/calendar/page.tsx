'use client';

import { useMemo, useState } from 'react';

import { useLanguage } from '@/contexts/language-context';
import { useSchedule, getSubjectColor, type DayData } from '@/hooks/use-schedule';
import { useTasks, type Task } from '@/hooks/use-tasks';

function getWeekStart(date: Date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatRangeLabel(start: Date, end: Date) {
  const formatter = new Intl.DateTimeFormat('de-DE', { day: '2-digit', month: 'short' });
  return `${formatter.format(start)} – ${formatter.format(end)}`;
}

function formatDayLabel(date: Date) {
  return new Intl.DateTimeFormat('de-DE', { weekday: 'short', day: 'numeric' }).format(date);
}

const DAY_FONT = "font-['SF Pro Text','-apple-system','BlinkMacSystemFont','system-ui','sans-serif']";

export default function CalendarPage() {
  const { t } = useLanguage();
  const { days, getDayByDate } = useSchedule();
  const { tasks } = useTasks();
  const [currentWeek, setCurrentWeek] = useState(new Date());

  const weekDays = useMemo(() => {
    const start = getWeekStart(currentWeek);
    return Array.from({ length: 7 }).map((_, index) => {
      const d = new Date(start);
      d.setDate(start.getDate() + index);
      return d;
    });
  }, [currentWeek]);

  const rangeLabel = formatRangeLabel(weekDays[0], weekDays[6]);

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
  };

  const goToToday = () => setCurrentWeek(new Date());

  return (
    <div className={`space-y-6 bg-[#F5F5F7] px-4 py-8 sm:px-8 ${DAY_FONT}`}>
      <div className="space-y-1">
        <p className="text-xs uppercase tracking-[0.2em] text-gray-500">{t('calendar.title')}</p>
        <p className="text-sm text-gray-500">{t('calendar.description')}</p>
      </div>

      <div className="flex flex-wrap items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 shadow-sm">
        <div className="flex gap-2 text-sm font-semibold text-blue-600">
          <button onClick={() => navigateWeek('prev')} className="rounded-full px-3 py-1 hover:bg-gray-100">{t('calendar.prevWeek')}</button>
          <button onClick={goToToday} className="rounded-full px-3 py-1 hover:bg-gray-100">{t('calendar.goToToday')}</button>
          <button onClick={() => navigateWeek('next')} className="rounded-full px-3 py-1 hover:bg-gray-100">{t('calendar.nextWeek')}</button>
        </div>
        <p className="text-lg font-semibold text-gray-900">{rangeLabel}</p>
      </div>

      <div className="overflow-x-auto pb-4">
        <div className="flex min-w-[900px] gap-4 pr-4">
          {weekDays.map((date) => (
            <DayColumn
              key={date.toISOString()}
              date={date}
              dayData={getDayByDate(date)}
              tasks={tasks}
              t={t}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface DayColumnProps {
  date: Date;
  dayData: DayData | null;
  tasks: Task[];
  t: (key: string) => string;
}

function DayColumn({ date, dayData, tasks, t }: DayColumnProps) {
  const classes = dayData?.classes ?? [];
  const isoDate = date.toISOString().split('T')[0];
  const dayTasks = tasks.filter((task) => {
    if (!task.dueDate) return false;
    const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
    return taskDate === isoDate;
  });

  const isToday = (() => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  })();

  return (
    <div className="flex min-w-[220px] flex-1 flex-col rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-baseline justify-between border-b border-gray-100 pb-2">
        <span className={`text-xs uppercase tracking-[0.15em] text-gray-500 ${isToday ? 'text-blue-600' : ''}`}>
          {formatDayLabel(date)}
        </span>
        <span className={`text-xl font-semibold ${isToday ? 'text-blue-600' : 'text-gray-900'}`}>{date.getDate()}</span>
      </div>

      <div className="space-y-4">
        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{t('calendar.classes')}</p>
          {classes.length === 0 ? (
            <p className="text-xs text-gray-400">{t('calendar.noItems')}</p>
          ) : (
            <div className="space-y-2">
              {classes.map((cls) => (
                <div key={cls.id} className="relative rounded-lg border border-gray-200 bg-gray-50 p-3 shadow-sm">
                  <span
                    className="absolute left-2 top-2 bottom-2 w-1 rounded-full"
                    style={{ backgroundColor: cls.subjectColor }}
                  />
                  <div className="pl-4">
                    <p className="truncate text-sm font-semibold text-gray-900">{cls.title}</p>
                    <p className="text-xs text-gray-500">
                      {cls.time} • {cls.room || '—'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{t('calendar.tasks')}</p>
          {dayTasks.length === 0 ? (
            <p className="text-xs text-gray-400">{t('calendar.noItems')}</p>
          ) : (
            <div className="space-y-2">
              {dayTasks.map((task) => {
                const color = getSubjectColor(task.subject || task.title);
                return (
                  <div key={task.id} className="relative rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
                    <span className="absolute left-2 top-2 bottom-2 w-1 rounded-full" style={{ backgroundColor: color }} />
                    <div className="pl-4">
                      <p className="truncate text-sm font-semibold text-gray-900">{task.title}</p>
                      <p className="text-xs text-gray-500">{task.subject || 'Allgemein'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
