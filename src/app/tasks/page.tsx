'use client';

import { useState, FormEvent } from 'react';

import { SectionCard } from '@/components/ui/section-card';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/contexts/auth-context';
import { useTasks } from '@/hooks/use-tasks';
import { inputStyles, selectStyles } from '@/styles/theme';
import { PlannerShell, PlannerNav } from '@/components/layout/planner-shell';
import { buildPlannerNavItems } from '@/lib/planner-nav';

export default function TasksPage() {
  const { t } = useLanguage();
  const { isAdmin, isOperator } = useAuth();
  const { sortedTasks, addTask, deleteTask, toggleTask } = useTasks();
  
  const quickActions = [
    t('tasks.captureHomework'),
    t('tasks.aiSummarize'),
    t('tasks.blockTime'),
  ];
  const [formData, setFormData] = useState({
    title: '',
    subject: '',
    dueDate: '',
    priority: 'Medium',
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formData.title.trim()) return;

    addTask({
      title: formData.title,
      subject: formData.subject,
      dueDate: formData.dueDate,
      priority: formData.priority as 'Low' | 'Medium' | 'High',
    });

    setFormData({
      title: '',
      subject: '',
      dueDate: '',
      priority: 'Medium',
    });
  }

  const tasksSorted = sortedTasks;

  const formatDueDate = (value: string) => {
    if (!value) return t('tasks.noDueDate');
    return new Intl.DateTimeFormat('de-DE', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  };

  const openTasks = tasksSorted.filter((task) => !task.done).length;
  const completedTasks = tasksSorted.length - openTasks;
  const navItems = buildPlannerNavItems(t, { isAdmin, isOperator });
  const quickStatsText = t('tasks.quickStats').replace('{count}', String(tasksSorted.length));

  return (
    <PlannerShell
      sidebar={
        <>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Q1 1. Term</p>
            <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">{t('tasks.title')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('tasks.description')}</p>
          </div>
          <PlannerNav items={navItems} label={t('planner.navigation')} />
          <div className="mt-8 space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Open</p>
                <p className="text-3xl font-semibold text-gray-900 dark:text-white">{openTasks}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Done</p>
                <p className="text-3xl font-semibold text-gray-900 dark:text-white">{completedTasks}</p>
              </div>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400">{quickStatsText}</p>
          </div>
        </>
      }
    >
      <div className="space-y-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <SectionCard title={t('tasks.createTask')}>
            <form className="space-y-4 text-sm" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-1">
                <span className="font-medium text-gray-700 dark:text-gray-200">{t('tasks.taskTitle')}</span>
                <input
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className={inputStyles}
                  placeholder="e.g., Finish physics lab"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-medium text-gray-700 dark:text-gray-200">{t('tasks.subject')}</span>
                <input
                  value={formData.subject}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                  className={inputStyles}
                  placeholder="Mathematics"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-medium text-gray-700 dark:text-gray-200">{t('tasks.dueDate')}</span>
                <input
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className={inputStyles}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-medium text-gray-700 dark:text-gray-200">{t('tasks.priority')}</span>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
                  className={selectStyles}
                >
                  <option>{t('common.low')}</option>
                  <option>{t('common.medium')}</option>
                  <option>{t('common.high')}</option>
                </select>
              </label>

              <button
                type="submit"
                className="w-full rounded-2xl bg-blue-500 py-3 text-sm font-semibold text-white shadow-sm transition-all hover:bg-blue-600 hover:shadow-md active:scale-[0.98] dark:bg-blue-600 dark:hover:bg-blue-700"
              >
                {t('tasks.addTask')}
              </button>
            </form>
          </SectionCard>

          <SectionCard title={t('tasks.taskList')}>
            <ul className="space-y-3">
              {tasksSorted.map((task) => (
                <li
                  key={task.id}
                  className="space-y-3 rounded-2xl border border-gray-200 bg-white px-4 py-4 text-sm shadow-sm dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={task.done}
                      onChange={() => toggleTask(task.id)}
                      className="mt-1 h-5 w-5 rounded border-gray-300 text-blue-500 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700"
                    />
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold ${task.done ? 'text-gray-400 line-through' : 'text-gray-900 dark:text-white'}`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">
                        {formatDueDate(task.dueDate)} • {task.subject || t('common.general')}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span
                      className={`inline-flex min-w-[90px] justify-center rounded-full px-3 py-1 text-xs font-semibold ${
                        task.priority === 'High'
                          ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                          : task.priority === 'Medium'
                            ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                            : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                      }`}
                    >
                      {task.priority}
                    </span>
                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
                      <button
                        onClick={() => toggleTask(task.id)}
                        className="w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs font-semibold text-gray-700 transition-all hover:bg-gray-50 active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700 sm:w-auto"
                      >
                        {task.done ? t('tasks.undo') : t('tasks.done')}
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition-all hover:bg-red-100 active:scale-[0.98] dark:border-red-900 dark:bg-red-950/50 dark:text-red-300 dark:hover:bg-red-900/50 sm:w-auto"
                      >
                        {t('tasks.delete')}
                      </button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <div className="space-y-6">
          <SectionCard title={t('tasks.focusTimer')}>
            <div className="space-y-3">
              {['25 min deep focus', '45 min review block', '90 min project'].map((preset) => (
                <button
                  key={preset}
                  className="flex w-full items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3 text-left text-sm font-semibold text-gray-900 transition-all hover:bg-gray-50 hover:shadow-sm active:scale-[0.98] dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:hover:bg-gray-700"
                >
                  {preset}
                  <span className="text-xs text-gray-500 dark:text-gray-400">Start</span>
                </button>
              ))}
            </div>
          </SectionCard>

          <SectionCard title={t('tasks.quickActions')}>
            <ul className="space-y-3">
              {quickActions.map((action) => (
                <li
                  key={action}
                  className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-200"
                >
                  {action}
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>
      </div>
    </PlannerShell>
  );
}

