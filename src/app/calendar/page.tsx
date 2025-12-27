'use client';

import { useEffect, useMemo, useState } from 'react';

import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/contexts/auth-context';
import {
  useSchedule,
  getSubjectColor,
  type DayData,
  type ClassEntry,
} from '@/hooks/use-schedule';
import { useTasks, type Task } from '@/hooks/use-tasks';
import { PlannerShell, PlannerNav } from '@/components/layout/planner-shell';
import { buildPlannerNavItems } from '@/lib/planner-nav';
import { useHolidays } from '@/hooks/use-holidays';
import { useTeachers } from '@/hooks/use-teachers';
import { ScheduleEditor } from '@/components/schedule/schedule-editor';

const DEFAULT_DURATION = 45;

type WeekContextDay = {
  dayId: string;
  isoDate: string;
  label: string;
};

type ClassEditorState = {
  mode: 'add' | 'edit';
  baseDayId: string;
  dateLabel: string;
  weekContext: WeekContextDay[];
  classId?: string;
  initial?: {
    title: string;
    time: string;
    room: string;
    subjectColor: string;
    durationMinutes?: number;
    participants?: string[];
  };
};

type EditorPayload = {
  title: string;
  time: string;
  room: string;
  subjectColor: string;
  durationMinutes: number;
  repeatDayIds: string[];
  participants: string[];
  repeatEveryWeek?: boolean;
  repeatWeeksCount?: number;
};

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

function formatFullDate(date: Date) {
  return new Intl.DateTimeFormat('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(date);
}

function getCountdownDays(targetMonth = 11, targetDay = 21) {
  const now = new Date();
  const target = new Date(now.getFullYear(), targetMonth, targetDay);
  if (target < now) {
    target.setFullYear(target.getFullYear() + 1);
  }
  return Math.max(0, Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
}

function formatTimeRange(startTime: string, durationMinutes?: number) {
  if (!durationMinutes) return startTime;
  const [hours, minutes] = startTime.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return startTime;
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  const pad = (val: number) => String(val).padStart(2, '0');
  return `${pad(startDate.getHours())}:${pad(startDate.getMinutes())} – ${pad(endDate.getHours())}:${pad(
    endDate.getMinutes()
  )}`;
}

export default function CalendarPage() {
  const { t } = useLanguage();
  const {
    getDayByDate,
    ensureDayForDate,
    addClassToDay,
    updateClassForDay,
    removeClassFromDay,
    days,
  } = useSchedule();
  const { tasks } = useTasks();
  const { isAdmin, isOperator } = useAuth();
  const { holidays, isHoliday, getHolidaysForDate } = useHolidays();
  const { teachers } = useTeachers();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [classEditor, setClassEditor] = useState<ClassEditorState | null>(null);
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const navItems = buildPlannerNavItems(t, { isAdmin, isOperator });
  
  // Get next holiday
  const nextHoliday = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return holidays
      .filter((h) => h.startDate >= today)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))[0];
  }, [holidays]);
  
  const getCountdownToNextHoliday = () => {
    if (!nextHoliday) return null;
    const now = new Date();
    const target = new Date(nextHoliday.startDate);
    const diff = Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  const weekDays = useMemo(() => {
    const start = getWeekStart(currentWeek);
    return Array.from({ length: 7 }).map((_, index) => {
      const d = new Date(start);
      d.setDate(start.getDate() + index);
      return d;
    });
  }, [currentWeek]);

  useEffect(() => {
    weekDays.forEach((date) => {
      if (!getDayByDate(date)) {
        ensureDayForDate(date);
      }
    });
  }, [weekDays, getDayByDate, ensureDayForDate]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    if (classEditor) {
      root.classList.add('calendar-modal-open');
    } else {
      root.classList.remove('calendar-modal-open');
    }
    return () => root.classList.remove('calendar-modal-open');
  }, [classEditor]);

  const today = new Date();
  const todaysDayData = getDayByDate(today) ?? ensureDayForDate(today);
  const todaysClasses = [...todaysDayData.classes].sort((a, b) => a.time.localeCompare(b.time));
  const todaysTasks = tasks
    .filter((task) => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
      return taskDate === today.toISOString().split('T')[0];
    })
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''));
  const displayDays = weekDays.slice(0, 5);
  const rangeLabel = formatRangeLabel(weekDays[0], weekDays[weekDays.length - 1]);
  const goToToday = () => setCurrentWeek(new Date());
  const navigateWeek = (direction: 'prev' | 'next') => {
    setCurrentWeek((prev) => {
      const next = new Date(prev);
      next.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));
      return next;
    });
  };
  const buildWeekContext = (): WeekContextDay[] =>
    weekDays.slice(0, 5).map((date) => {
      const dayData = getDayByDate(date) ?? ensureDayForDate(date);
      return {
        dayId: dayData.id,
        isoDate: date.toISOString().split('T')[0],
        label: formatDayLabel(date),
      };
    });

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">{t('calendar.title')}</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{rangeLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={() => setIsEditingSchedule(true)}
            className="rounded-xl bg-blue-500 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-blue-600 hover:shadow-sm active:scale-[0.98] whitespace-nowrap"
          >
            {t('schedule.editSchedule')}
          </button>
          <button onClick={() => navigateWeek('prev')} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 whitespace-nowrap">
            {t('calendar.prevWeek')}
          </button>
          <button onClick={goToToday} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 whitespace-nowrap">
            {t('calendar.goToToday')}
          </button>
          <button onClick={() => navigateWeek('next')} className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 whitespace-nowrap">
            {t('calendar.nextWeek')}
          </button>
        </div>
      </div>

      {/* Next Holiday Card */}
      {nextHoliday && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
          <p className="text-xs uppercase tracking-[0.3em] text-blue-600 dark:text-blue-400">Ferien Countdown</p>
          <div className="mt-3 flex items-baseline gap-2">
            <p className="text-4xl font-semibold text-gray-900 dark:text-white">{getCountdownToNextHoliday() ?? 0}</p>
            <span className="text-sm text-gray-600 dark:text-gray-400">Tage</span>
          </div>
          <p className="text-sm text-gray-700 dark:text-gray-300">bis {nextHoliday.name}</p>
        </div>
      )}

      {/* Today Overview */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
        <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400 mb-3">Heute</p>
        <TodayOverview classes={todaysClasses} tasks={todaysTasks} t={t} />
      </div>
      {isEditingSchedule && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 my-8">
            <ScheduleEditor onClose={() => setIsEditingSchedule(false)} />
          </div>
        </div>
      )}

      {/* Calendar Grid */}
      <div className="grid grid-cols-1 gap-3 sm:gap-4 max-w-3xl mx-auto">
            {displayDays.map((date) => {
              const dayData = getDayByDate(date) ?? ensureDayForDate(date);
              const dateStr = date.toISOString().split('T')[0];
              const dayHolidays = getHolidaysForDate(date);
              const isHolidayDay = isHoliday(date);
              const holidayName = dayHolidays.length > 0 ? dayHolidays[0].name : undefined;
              
              return (
                <MiniDayColumn
                  key={dateStr}
                  date={date}
                  dayData={dayData}
                  t={t}
                  isHoliday={isHolidayDay}
                  holidayName={holidayName}
                  onAddClass={() => {
                    const weekContext = buildWeekContext();
                    const dayContext = weekContext.find((d) => d.isoDate === dateStr);
                    if (dayContext) {
                      setClassEditor({
                        mode: 'add',
                        baseDayId: dayContext.dayId,
                        dateLabel: formatFullDate(date),
                        weekContext,
                      });
                    }
                  }}
                  onEditClass={(cls) =>
                    setClassEditor({
                      mode: 'edit',
                      baseDayId: dayData.id,
                      dateLabel: formatFullDate(date),
                      classId: cls.id,
                      weekContext: buildWeekContext(),
                      initial: {
                        title: cls.title,
                        time: cls.time,
                        room: cls.room,
                        subjectColor: cls.subjectColor,
                        durationMinutes: cls.durationMinutes ?? DEFAULT_DURATION,
                        participants: cls.participants || [],
                      },
                    })
                  }
                  onDeleteClass={(classId) => {
                    // Find the class to get its properties
                    const classToDelete = dayData.classes.find((cls) => cls.id === classId);
                    if (!classToDelete) {
                      removeClassFromDay(dayData.id, classId);
                      return;
                    }

                    // Delete from current day
                    removeClassFromDay(dayData.id, classId);

                    // Find and delete all future occurrences
                    const dayOfWeek = date.getDay() === 0 ? 7 : date.getDay(); // Monday = 1, Sunday = 7
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const baseDate = new Date(date);
                    baseDate.setHours(0, 0, 0, 0);

                    // Check all days in the schedule
                    days.forEach((day) => {
                      const dayDate = new Date(day.date);
                      dayDate.setHours(0, 0, 0, 0);
                      
                      // Only check future days on the same day of week
                      if (dayDate > baseDate && dayDate.getDay() === date.getDay()) {
                        // Find matching classes (same title, time, and room)
                        const matchingClasses = day.classes.filter(
                          (cls) =>
                            cls.title === classToDelete.title &&
                            cls.time === classToDelete.time &&
                            cls.room === classToDelete.room &&
                            (cls.durationMinutes ?? DEFAULT_DURATION) === (classToDelete.durationMinutes ?? DEFAULT_DURATION)
                        );
                        
                        // Delete all matching classes
                        matchingClasses.forEach((cls) => {
                          removeClassFromDay(day.id, cls.id);
                        });
                      }
                    });
                  }}
                />
              );
            })}
          </div>

      {classEditor && (
        <ClassEditorModal
          state={classEditor}
          t={t}
          teachers={teachers}
          onClose={() => setClassEditor(null)}
          onSave={(data) => {
            const payload = {
              title: data.title.trim(),
              time: data.time,
              room: data.room,
              subjectColor: data.subjectColor || getSubjectColor(data.title),
              durationMinutes: data.durationMinutes,
              participants: data.participants,
            };

            if (classEditor.mode === 'edit' && classEditor.classId) {
              updateClassForDay(classEditor.baseDayId, classEditor.classId, payload);
            } else {
              const targets = data.repeatDayIds.length > 0 ? data.repeatDayIds : [classEditor.baseDayId];
              const uniqueTargets = Array.from(new Set(targets));
              
              // Add to current week
              uniqueTargets.forEach((dayId) => addClassToDay(dayId, payload));
              
              // If repeat every week is enabled, add to future weeks
              if (data.repeatEveryWeek && data.repeatWeeksCount && data.repeatWeeksCount > 0) {
                const weeksCount = data.repeatWeeksCount;
                // Find the base date and day of week for each selected day
                uniqueTargets.forEach((dayId) => {
                  const dayContext = classEditor.weekContext.find((d: WeekContextDay) => d.dayId === dayId);
                  if (dayContext) {
                    const baseDate = new Date(dayContext.isoDate);
                    
                    // Add to future weeks
                    for (let weekOffset = 1; weekOffset <= weeksCount; weekOffset++) {
                      const futureDate = new Date(baseDate);
                      futureDate.setDate(baseDate.getDate() + (weekOffset * 7));
                      const futureDayData = ensureDayForDate(futureDate);
                      addClassToDay(futureDayData.id, payload);
                    }
                  }
                });
              }
            }

            setClassEditor(null);
          }}
        />
      )}
    </div>
  );
}

function TodayOverview({
  classes,
  tasks,
  t,
}: {
  classes: ClassEntry[];
  tasks: Task[];
  t: (key: string) => string;
}) {
  return (
    <div className="mt-8 space-y-5">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Heute</p>
        <div className="mt-3 space-y-3">
          {classes.length === 0 ? (
            <p className="text-sm text-gray-500 dark:text-gray-400">{t('schedule.noClasses')}</p>
          ) : (
            classes.map((cls) => (
              <div key={cls.id} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-400">
                  {formatTimeRange(cls.time, cls.durationMinutes ?? DEFAULT_DURATION)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{cls.title}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{cls.room || '—'}</p>
                </div>
                <span className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: cls.subjectColor }} />
              </div>
            ))
          )}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Open Homework</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {tasks.length === 0 ? (
            <span className="text-xs text-gray-500 dark:text-gray-400">{t('calendar.noItems')}</span>
          ) : (
            tasks.slice(0, 4).map((task) => (
              <span key={task.id} className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                {task.title}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

const MiniDayColumn = ({ date, dayData, t, onAddClass, onEditClass, onDeleteClass, isHoliday, holidayName }: { date: Date; dayData: DayData; t: (key: string) => string; onAddClass: () => void; onEditClass: (cls: ClassEntry) => void; onDeleteClass: (classId: string) => void; isHoliday: boolean; holidayName?: string; }) => {
  const isToday = (() => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  })();

  return (
    <div className={`rounded-2xl border border-gray-200 bg-white p-3 sm:p-4 min-h-[300px] sm:min-h-[400px] md:min-h-[500px] flex flex-col shadow-sm dark:border-gray-700 dark:bg-gray-800 ${isToday ? 'ring-2 ring-blue-500' : ''} ${isHoliday ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800' : ''}`}>
      <div className="flex flex-col gap-2 text-xs sm:text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">{formatDayLabel(date)}</p>
          <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white">{date.getDate()}</p>
          {isHoliday && holidayName && (
            <p className="text-[10px] sm:text-xs text-yellow-700 dark:text-yellow-300 mt-1 truncate">🏖️ {holidayName}</p>
          )}
        </div>
        {!isHoliday && (
          <button onClick={onAddClass} className="rounded-xl border border-gray-200 bg-white px-2.5 py-1 sm:px-3 text-[10px] sm:text-xs font-semibold text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98] whitespace-nowrap flex-shrink-0 sm:ml-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700 w-full sm:w-auto flex justify-center">
            + {t('calendar.addClassButton')}
          </button>
        )}
      </div>
      {isHoliday ? (
        <div className="mt-4 flex-1 flex items-center justify-center">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">Ferien</p>
        </div>
      ) : (
        <div className="mt-4 space-y-3 flex-1">
          {dayData.classes.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('schedule.noClasses')}</p>
          ) : (
            dayData.classes.map((cls) => (
              <MiniClassCard key={cls.id} entry={cls} onEdit={() => onEditClass(cls)} onDelete={() => onDeleteClass(cls.id)} />
            ))
          )}
        </div>
      )}
    </div>
  );
};

const MiniClassCard = ({ entry, onEdit, onDelete }: { entry: ClassEntry; onEdit: () => void; onDelete: () => void }) => (
    <div className="rounded-xl border border-gray-200 bg-gray-50 p-2.5 sm:p-3 shadow-sm dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">{entry.title}</p>
          <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 truncate">
            {formatTimeRange(entry.time, entry.durationMinutes ?? DEFAULT_DURATION)} • {entry.room || '—'}
          </p>
        </div>
        <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
          <button onClick={onEdit} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs transition-all hover:bg-gray-50 active:scale-[0.95] min-w-[32px] min-h-[32px] flex items-center justify-center dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700">
            ✏️
          </button>
          <button onClick={onDelete} className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-xs transition-all hover:bg-gray-50 active:scale-[0.95] min-w-[32px] min-h-[32px] flex items-center justify-center dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700">
            🗑️
          </button>
        </div>
      </div>
    </div>
  );

 type ClassEditorModalProps = {
  state: ClassEditorState;
  onClose: () => void;
  onSave: (values: EditorPayload) => void;
  t: (key: string) => string;
  teachers: Array<{ id: string; name: string; email: string }>;
};

function ClassEditorModal({ state, onClose, onSave, t, teachers }: ClassEditorModalProps) {
  const [form, setForm] = useState({
    title: state.initial?.title ?? '',
    time: state.initial?.time ?? '08:00',
    room: state.initial?.room ?? '',
    subjectColor: state.initial?.subjectColor ?? '#0A84FF',
    durationMinutes: state.initial?.durationMinutes ?? DEFAULT_DURATION,
  });
  const [selectedTeacherIds, setSelectedTeacherIds] = useState<string[]>(
    () => {
      // Match participants with teachers by email or name
      if (!state.initial?.participants || teachers.length === 0) return [];
      return teachers
        .filter((teacher) =>
          state.initial?.participants?.some(
            (p) => p.toLowerCase() === teacher.email.toLowerCase() || p === teacher.name
          )
        )
        .map((t) => t.id);
    }
  );
  const [customParticipants, setCustomParticipants] = useState<string>(
    () => {
      // Get participants that don't match any teacher
      if (!state.initial?.participants || teachers.length === 0) {
        return state.initial?.participants?.join(', ') ?? '';
      }
      const teacherEmails = new Set(teachers.map((t) => t.email.toLowerCase()));
      const teacherNames = new Set(teachers.map((t) => t.name));
      return state.initial.participants
        .filter((p) => !teacherEmails.has(p.toLowerCase()) && !teacherNames.has(p))
        .join(', ');
    }
  );
  const [selectedDays, setSelectedDays] = useState<string[]>(() => [state.baseDayId]);
  const [repeatEveryWeek, setRepeatEveryWeek] = useState(false);
  const [repeatWeeksCount, setRepeatWeeksCount] = useState(8);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.title.trim()) return;
    
    // Combine selected teachers and custom participants
    const teacherParticipants = selectedTeacherIds
      .map((id) => {
        const teacher = teachers.find((t) => t.id === id);
        return teacher ? teacher.name : null;
      })
      .filter((p): p is string => p !== null);
    
    const customParts = customParticipants
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);
    
    const participants = [...teacherParticipants, ...customParts];
    
    onSave({
      ...form,
      participants,
      repeatDayIds: state.mode === 'edit' ? [state.baseDayId] : selectedDays,
      repeatEveryWeek: state.mode === 'add' ? repeatEveryWeek : false,
      repeatWeeksCount: state.mode === 'add' ? repeatWeeksCount : undefined,
    });
  };

  const durationOptions = [30, 45, 60, 75, 90];

  const toggleDay = (dayId: string) => {
    if (state.mode === 'edit') return;
    setSelectedDays((prev) => {
      if (prev.includes(dayId)) {
        return prev.length === 1 ? prev : prev.filter((id) => id !== dayId);
      }
      return [...prev, dayId];
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/50 p-4 pt-16 backdrop-blur-sm sm:items-center sm:pt-4">
      <div className="w-full max-w-lg">
        <form
          onSubmit={handleSubmit}
          className="max-h-[min(85vh,720px)] space-y-5 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
              {state.mode === 'edit' ? t('calendar.modalEditTitle') : t('calendar.modalAddTitle')}
            </p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white">{state.dateLabel}</p>
          </div>
          <button type="button" onClick={onClose} className="text-sm text-slate-500 hover:text-slate-900 dark:hover:text-white">
            ✕
          </button>
        </div>

        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
          {t('schedule.subject')}
          <input
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900/40 dark:text-white"
            required
          />
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
            {t('schedule.time')}
            <input
              type="time"
              value={form.time}
              onChange={(e) => setForm((prev) => ({ ...prev, time: e.target.value }))}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900/40 dark:text-white"
              required
            />
          </label>
        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
            {t('schedule.room')}
            <input
              value={form.room}
              onChange={(e) => setForm((prev) => ({ ...prev, room: e.target.value }))}
              className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900/40 dark:text-white"
            />
          </label>
        </div>

        {teachers.length > 0 && (
          <div className="flex flex-col gap-2 text-sm text-slate-700 dark:text-slate-200">
            <label>{t('calendar.participantsLabel')}</label>
            <div className="flex flex-wrap gap-2">
              {teachers.map((teacher) => (
                <button
                  key={teacher.id}
                  type="button"
                  onClick={() => {
                    setSelectedTeacherIds((prev) =>
                      prev.includes(teacher.id)
                        ? prev.filter((id) => id !== teacher.id)
                        : [...prev, teacher.id]
                    );
                  }}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
                    selectedTeacherIds.includes(teacher.id)
                      ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-200'
                      : 'border-slate-200 text-slate-600 hover:border-blue-200 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-400'
                  }`}
                >
                  {teacher.name}
                </button>
              ))}
            </div>
          </div>
        )}
        
        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
          {teachers.length > 0 ? 'Weitere Teilnehmer (optional)' : t('calendar.participantsLabel')}
          <textarea
            value={customParticipants}
            onChange={(e) => setCustomParticipants(e.target.value)}
            rows={2}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900/40 dark:text-white"
            placeholder={t('calendar.participantsPlaceholder')}
          />
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
          {t('calendar.durationLabel')}
          <select
            value={form.durationMinutes}
            onChange={(e) => setForm((prev) => ({ ...prev, durationMinutes: Number(e.target.value) }))}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900/40 dark:text-white"
          >
            {durationOptions.map((option) => (
              <option key={option} value={option}>
                {option} {t('calendar.minutes')}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-sm text-slate-700 dark:text-slate-200">
          {t('calendar.accentColor')}
          <div className="flex flex-wrap gap-2">
            {['#0A84FF', '#FF3B30', '#34C759', '#FF9500', '#AF52DE'].map((color) => (
              <button
                type="button"
                key={color}
                onClick={() => setForm((prev) => ({ ...prev, subjectColor: color }))}
                className={`h-8 w-8 rounded-full border-2 ${
                  form.subjectColor === color ? 'border-gray-900' : 'border-transparent'
                }`}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>
        </label>

        {state.mode === 'add' && (
          <>
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-300">
                {t('calendar.repeatThisWeek')}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {state.weekContext.map((day) => (
                  <button
                    type="button"
                    key={day.dayId}
                    onClick={() => toggleDay(day.dayId)}
                    className={`rounded-2xl border px-3 py-2 text-xs font-semibold transition ${
                      selectedDays.includes(day.dayId)
                        ? 'border-blue-500 bg-blue-50 text-blue-700 dark:border-indigo-500 dark:bg-indigo-500/10 dark:text-indigo-200'
                        : 'border-slate-200 text-slate-500 hover:border-blue-200 dark:border-slate-700 dark:text-slate-300 dark:hover:border-indigo-400'
                    }`}
                  >
                    {day.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={repeatEveryWeek}
                  onChange={(e) => setRepeatEveryWeek(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-700"
                />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {t('calendar.repeatEveryWeek')}
                </span>
              </label>
              {repeatEveryWeek && (
                <div className="ml-7 space-y-2">
                  <label className="flex flex-col gap-1 text-xs text-slate-600 dark:text-slate-300">
                    {t('calendar.repeatWeeksCount')}
                    <select
                      value={repeatWeeksCount}
                      onChange={(e) => setRepeatWeeksCount(Number(e.target.value))}
                      className="rounded-xl border border-slate-300 px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-600 dark:bg-slate-700 dark:text-white"
                    >
                      <option value={4}>4 {t('calendar.weeks')}</option>
                      <option value={8}>8 {t('calendar.weeks')}</option>
                      <option value={12}>12 {t('calendar.weeks')}</option>
                      <option value={16}>16 {t('calendar.weeks')}</option>
                      <option value={20}>20 {t('calendar.weeks')}</option>
                      <option value={40}>40 {t('calendar.weeks')}</option>
                    </select>
                  </label>
                </div>
              )}
            </div>
          </>
        )}

        <div className="flex gap-3">
          <button type="submit" className="flex-1 rounded-2xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-500 dark:bg-indigo-500 dark:hover:bg-indigo-400">
            {state.mode === 'edit' ? t('calendar.saveClassUpdate') : t('calendar.saveClassAdd')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-2xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800/70"
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
      </div>
    </div>
  );
}
