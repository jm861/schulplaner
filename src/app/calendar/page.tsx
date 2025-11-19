'use client';

import { useMemo, useState, FormEvent } from 'react';

import { useLanguage } from '@/contexts/language-context';
import { useSchedule } from '@/hooks/use-schedule';
import { useTasks, TaskPriority } from '@/hooks/use-tasks';
import { useExams } from '@/hooks/use-exams';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { inputStyles, selectStyles, textareaStyles, subtleButtonStyles } from '@/styles/theme';

export default function CalendarPage() {
  const { t, language } = useLanguage();
  const { classes } = useSchedule();
  const { tasks, addTask, deleteTask, updateTask } = useTasks();
  const { exams, addExam, deleteExam, updateExam } = useExams();
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showWeekends, setShowWeekends] = useState(true);
  const [editingItem, setEditingItem] = useState<{
    type: 'task' | 'exam';
    id?: string;
    date: Date;
  } | null>(null);

  // Get start of week (Monday)
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    return new Date(d.setDate(diff));
  };

  // Get all days of the week
  const allWeekDays = useMemo(() => {
    const start = getWeekStart(currentWeek);
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(start);
      day.setDate(start.getDate() + i);
      days.push(day);
    }
    return days;
  }, [currentWeek]);

  // Get localized day names based on language
  const getDayName = (date: Date, format: 'long' | 'short' = 'long') => {
    const locale = language === 'de' ? 'de-DE' : 'en-US';
    return new Intl.DateTimeFormat(locale, { weekday: format }).format(date);
  };
  
  // Get day names for all 7 days (always use full week for names)
  const allDayNames = useMemo(() => allWeekDays.map(day => getDayName(day, 'long')), [allWeekDays, language]);
  const allDayNamesShort = useMemo(() => allWeekDays.map(day => getDayName(day, 'short')), [allWeekDays, language]);

  // Filter to show only weekdays if weekends are hidden
  const weekDays = useMemo(() => {
    if (showWeekends) {
      return allWeekDays;
    }
    return allWeekDays.slice(0, 5); // Only Mon-Fri
  }, [allWeekDays, showWeekends]);

  // Get items for a specific day
  const getDayItems = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];

    // Classes for this day of week - show classes on weekdays (Mon-Fri)
    // In a future version, classes would have a weekday field
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;
    const dayClasses = isWeekend ? [] : classes;

    // Tasks due on this date
    const dayTasks = tasks.filter((task) => {
      if (!task.dueDate) return false;
      const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
      return taskDate === dateStr;
    });

    // Exams on this date
    const dayExams = exams.filter((exam) => {
      if (!exam.date) return false;
      const examDate = new Date(exam.date).toISOString().split('T')[0];
      return examDate === dateStr;
    });

    return { classes: dayClasses, tasks: dayTasks, exams: dayExams };
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentWeek);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate);
  };

  const goToToday = () => {
    setCurrentWeek(new Date());
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('de-DE', { month: 'short', day: 'numeric' });
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  return (
    <div className="space-y-12">
      <PageHeader
        badge="Calendar"
        title={t('calendar.title')}
        description={t('calendar.description')}
      />

      {/* Edit/Add Modal */}
      {editingItem && (
        <EditItemModal
          editingItem={editingItem}
          onClose={() => setEditingItem(null)}
          onSave={(data) => {
            if (editingItem.type === 'task') {
              if (editingItem.id) {
                updateTask(editingItem.id, data);
              } else {
                addTask(data);
              }
            } else {
              if (editingItem.id) {
                updateExam(editingItem.id, data);
              } else {
                addExam(data);
              }
            }
            setEditingItem(null);
          }}
          tasks={tasks}
          exams={exams}
          t={t}
        />
      )}

      <div className="relative flex items-center justify-between rounded-2xl border border-slate-200 bg-white/70 px-6 py-4 dark:border-slate-800 dark:bg-slate-900/60">
        <button
          onClick={() => navigateWeek('prev')}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
        >
          ← {t('calendar.prevWeek')}
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-slate-900 dark:text-white">
            {formatDate(weekDays[0])} - {formatDate(weekDays[weekDays.length - 1])}
          </p>
          <button
            onClick={goToToday}
            className="text-xs text-slate-500 underline decoration-dotted hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            {t('calendar.goToToday')}
          </button>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowWeekends(!showWeekends)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${
              showWeekends
                ? 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                : 'border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300 dark:hover:bg-indigo-900/50'
            }`}
            title={showWeekends ? t('calendar.hideWeekends') : t('calendar.showWeekends')}
          >
            {showWeekends ? '5' : '7'}
          </button>
          <button
            onClick={() => navigateWeek('next')}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:bg-slate-800"
          >
            {t('calendar.nextWeek')} →
          </button>
        </div>
      </div>

      <div className={`grid gap-8 ${showWeekends ? 'md:grid-cols-7' : 'md:grid-cols-5'}`}>
        {weekDays.map((day, index) => {
          const items = getDayItems(day);
          // Find the index in the full week to get the correct day name
          const fullWeekIndex = allWeekDays.findIndex(d => 
            d.getTime() === day.getTime()
          );
          const dayNameShort = fullWeekIndex >= 0 ? allDayNamesShort[fullWeekIndex] : '';
          const isTodayDate = isToday(day);

          return (
            <SectionCard
              key={day.toISOString()}
              className="min-h-[350px]"
              title={
                <div className="flex items-center justify-between w-full">
                  <span className={`text-lg ${isTodayDate ? 'font-bold text-indigo-600 dark:text-indigo-400' : ''}`}>
                    {dayNameShort}
                  </span>
                  <span className={`text-base ${isTodayDate ? 'font-bold text-indigo-600 dark:text-indigo-400' : 'text-slate-500 dark:text-slate-400'}`}>
                    {day.getDate()}
                  </span>
                </div>
              }
            >
              <div className="space-y-5 text-sm">
                {/* Quick Add Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => setEditingItem({ type: 'task', date: day })}
                    className="flex-1 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    + {t('calendar.addTask')}
                  </button>
                  <button
                    onClick={() => setEditingItem({ type: 'exam', date: day })}
                    className="flex-1 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400 dark:hover:bg-slate-800"
                  >
                    + {t('calendar.addExam')}
                  </button>
                </div>

                {/* Classes */}
                {items.classes.length > 0 && (
                  <div>
                    <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('calendar.classes')}
                    </p>
                    {items.classes.map((cls) => (
                      <div
                        key={cls.id}
                        className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/40"
                      >
                        <p className="text-base font-semibold text-slate-900 dark:text-white">{cls.subject}</p>
                        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
                          {cls.time} • {cls.room || t('schedule.noRoom')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Tasks */}
                {items.tasks.length > 0 && (
                  <div>
                    <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('calendar.tasks')}
                    </p>
                    {items.tasks.map((task) => (
                      <div
                        key={task.id}
                        className={`group relative mb-4 rounded-xl border p-4 ${
                          task.priority === 'High'
                            ? 'border-rose-200 bg-rose-50 dark:border-rose-900 dark:bg-rose-950/40'
                            : task.priority === 'Medium'
                              ? 'border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40'
                              : 'border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/40'
                        }`}
                      >
                        <button
                          onClick={() => {
                            const taskDate = task.dueDate ? new Date(task.dueDate) : day;
                            setEditingItem({ type: 'task', id: task.id, date: taskDate });
                          }}
                          className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100"
                        >
                          <span className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">✏️</span>
                        </button>
                        <button
                          onClick={() => deleteTask(task.id)}
                          className="absolute right-2 top-8 opacity-0 transition group-hover:opacity-100"
                        >
                          <span className="text-xs text-rose-500 hover:text-rose-700">🗑️</span>
                        </button>
                        <p className="text-base font-semibold text-slate-900 dark:text-white pr-8">{task.title}</p>
                        <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">{task.subject || t('common.general')}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Exams */}
                {items.exams.length > 0 && (
                  <div>
                    <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {t('calendar.exams')}
                    </p>
                    {items.exams.map((exam) => (
                      <div
                        key={exam.id}
                        className="group relative mb-4 rounded-xl border border-indigo-200 bg-indigo-50 p-4 dark:border-indigo-900 dark:bg-indigo-950/40"
                      >
                        <button
                          onClick={() => {
                            const examDate = exam.date ? new Date(exam.date) : day;
                            setEditingItem({ type: 'exam', id: exam.id, date: examDate });
                          }}
                          className="absolute right-2 top-2 opacity-0 transition group-hover:opacity-100"
                        >
                          <span className="text-xs text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">✏️</span>
                        </button>
                        <button
                          onClick={() => deleteExam(exam.id)}
                          className="absolute right-2 top-8 opacity-0 transition group-hover:opacity-100"
                        >
                          <span className="text-xs text-rose-500 hover:text-rose-700">🗑️</span>
                        </button>
                        <p className="text-base font-semibold text-indigo-900 dark:text-indigo-100 pr-8">{exam.subject}</p>
                        <p className="mt-1.5 text-sm text-indigo-600 dark:text-indigo-400">
                            {new Date(exam.date).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {items.classes.length === 0 && items.tasks.length === 0 && items.exams.length === 0 && (
                  <p className="text-center text-slate-400 dark:text-slate-500">{t('calendar.noItems')}</p>
                )}
              </div>
            </SectionCard>
          );
        })}
      </div>
    </div>
  );
}

type EditItemModalProps = {
  editingItem: { type: 'task' | 'exam'; id?: string; date: Date };
  onClose: () => void;
  onSave: (data: any) => void;
  tasks: any[];
  exams: any[];
  t: (key: string) => string;
};

function EditItemModal({ editingItem, onClose, onSave, tasks, exams, t }: EditItemModalProps) {
  const formatDateTimeLocal = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  const existingItem = editingItem.id
    ? editingItem.type === 'task'
      ? tasks.find((t) => t.id === editingItem.id)
      : exams.find((e) => e.id === editingItem.id)
    : null;

  const [formData, setFormData] = useState({
    title: existingItem?.title || '',
    subject: existingItem?.subject || '',
    dueDate: existingItem?.dueDate || (editingItem.type === 'task' ? formatDateTimeLocal(editingItem.date) : formatDateTimeLocal(editingItem.date)),
    priority: (existingItem as any)?.priority || 'Medium',
    topics: (existingItem as any)?.topics || '',
    notes: (existingItem as any)?.notes || '',
  });

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (editingItem.type === 'task') {
      if (!formData.title.trim()) return;
      onSave({
        title: formData.title,
        subject: formData.subject,
        priority: formData.priority,
        dueDate: formData.dueDate,
      });
    } else {
      if (!formData.subject.trim()) return;
      onSave({
        subject: formData.subject,
        topics: formData.topics,
        notes: formData.notes,
        date: formData.dueDate,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
        <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-white">
          {editingItem.id
            ? editingItem.type === 'task'
              ? t('calendar.editTask')
              : t('calendar.editExam')
            : editingItem.type === 'task'
              ? t('calendar.addTask')
              : t('calendar.addExam')}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {editingItem.type === 'task' ? (
            <>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">{t('tasks.taskTitle')}</span>
                <input
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className={inputStyles}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">{t('tasks.subject')}</span>
                <input
                  value={formData.subject}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                  className={inputStyles}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">{t('tasks.dueDate')}</span>
                <input
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className={inputStyles}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">{t('tasks.priority')}</span>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
                  className={selectStyles}
                >
                  <option value="Low">{t('common.low')}</option>
                  <option value="Medium">{t('common.medium')}</option>
                  <option value="High">{t('common.high')}</option>
                </select>
              </label>
            </>
          ) : (
            <>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">{t('exams.examSubject')}</span>
                <input
                  value={formData.subject}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                  className={inputStyles}
                  required
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">{t('exams.examDate')}</span>
                <input
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className={inputStyles}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">{t('exams.topics')}</span>
                <textarea
                  rows={3}
                  value={formData.topics}
                  onChange={(e) => setFormData((prev) => ({ ...prev, topics: e.target.value }))}
                  className={textareaStyles}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="font-medium text-slate-700 dark:text-slate-200">{t('exams.notes')}</span>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  className={textareaStyles}
                />
              </label>
            </>
          )}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className={`${subtleButtonStyles} flex-1`}
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              className={`${subtleButtonStyles} flex-1 bg-slate-900 text-white hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200`}
            >
              {editingItem.id ? t('common.save') : t('common.add')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

