'use client';

import { useState, FormEvent } from 'react';

import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { useLanguage } from '@/contexts/language-context';
import { useTasks } from '@/hooks/use-tasks';
import { inputStyles, selectStyles } from '@/styles/theme';

export default function TasksPage() {
  const { t } = useLanguage();
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

  return (
    <div className="space-y-12">
      <PageHeader
        badge="Tasks"
        title={t('tasks.title')}
        description={t('tasks.description')}
      />

      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <SectionCard title={t('tasks.createTask')}>
            <form className="space-y-4 text-sm" onSubmit={handleSubmit}>
              <label className="flex flex-col gap-1">
                <span className="font-medium text-slate-700 dark:text-slate-200">{t('tasks.taskTitle')}</span>
                <input
                  value={formData.title}
                  onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                  className={inputStyles}
                  placeholder="e.g., Finish physics lab"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-medium text-slate-700 dark:text-slate-200">{t('tasks.subject')}</span>
                <input
                  value={formData.subject}
                  onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
                  className={inputStyles}
                  placeholder="Mathematics"
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-medium text-slate-700 dark:text-slate-200">{t('tasks.dueDate')}</span>
                <input
                  type="datetime-local"
                  value={formData.dueDate}
                  onChange={(e) => setFormData((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className={inputStyles}
                />
              </label>

              <label className="flex flex-col gap-1">
                <span className="font-medium text-slate-700 dark:text-slate-200">{t('tasks.priority')}</span>
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
                className="w-full rounded-2xl bg-slate-900 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-slate-800 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200"
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
                  className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/60"
                >
                  <input
                    type="checkbox"
                    checked={task.done}
                    onChange={() => toggleTask(task.id)}
                    className="h-5 w-5 rounded border-slate-300 text-slate-900 focus:ring-slate-500 dark:border-slate-600 dark:bg-slate-900"
                  />
                  <div className="flex-1">
                    <p className={`font-semibold ${task.done ? 'text-slate-400 line-through' : 'text-slate-900 dark:text-white'}`}>
                      {task.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {formatDueDate(task.dueDate)} • {task.subject || t('common.general')}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      task.priority === 'High'
                        ? 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-200'
                        : task.priority === 'Medium'
                          ? 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-200'
                          : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-200'
                    }`}
                  >
                    {task.priority}
                  </span>
                  <button
                    onClick={() => toggleTask(task.id)}
                    className="text-xs font-semibold text-slate-500 underline decoration-dotted hover:text-slate-900 dark:text-slate-300"
                  >
                    {task.done ? t('tasks.undo') : t('tasks.done')}
                  </button>
                  <button
                    onClick={() => deleteTask(task.id)}
                    className="text-xs font-semibold text-rose-500 underline decoration-dotted hover:text-rose-700"
                  >
                    {t('tasks.delete')}
                  </button>
                </li>
              ))}
            </ul>
          </SectionCard>
        </div>

        <SectionCard title={t('tasks.focusTimer')}>
          <div className="space-y-3">
            {['25 min deep focus', '45 min review block', '90 min project'].map((preset) => (
              <button
                key={preset}
                className="flex w-full items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm font-semibold text-slate-900 transition hover:bg-slate-100 dark:border-slate-800 dark:text-white dark:hover:bg-slate-800"
              >
                {preset}
                <span className="text-xs text-slate-500 dark:text-slate-400">Start</span>
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard title={t('tasks.quickActions')}>
          <ul className="space-y-3">
            {quickActions.map((action) => (
              <li
                key={action}
                className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200"
              >
                {action}
              </li>
            ))}
          </ul>
        </SectionCard>
      </div>
    </div>
  );
}

