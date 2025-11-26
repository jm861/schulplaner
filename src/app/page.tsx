'use client';

import { useState } from 'react';
import Link from "next/link";

import { AgendaAssistantCard } from "@/components/ai/agenda-assistant";
import { useLanguage } from "@/contexts/language-context";
import { useAuth } from "@/contexts/auth-context";
import { useSchedule } from "@/hooks/use-schedule";
import { useTasks } from "@/hooks/use-tasks";
import { useExams } from "@/hooks/use-exams";
import { ScheduleEditor } from "@/components/schedule/schedule-editor";
import { SectionCard } from "@/components/ui/section-card";
import { subtleButtonStyles } from "@/styles/theme";
import { PlannerShell, PlannerNav } from '@/components/layout/planner-shell';
import { buildPlannerNavItems } from '@/lib/planner-nav';
import { readJSON } from '@/lib/storage';

const afternoonActivities = [
  { title: "Basketball practice", time: "15:30", duration: "75 min" },
  { title: "Chemistry study group", time: "17:00", duration: "60 min" },
  { title: "Meet Emma for German", time: "19:00", duration: "45 min" },
];

const focusHighlights = [
  "Finish biology worksheet before lunch.",
  "Confirm availability for Saturday study brunch.",
  "Let AI summarize the history essay brief.",
];

function formatTimeRange(startTime: string, durationMinutes?: number) {
  if (!durationMinutes) return startTime;
  const [hours, minutes] = startTime.split(':').map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return startTime;
  }
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  const pad = (val: number) => String(val).padStart(2, '0');
  return `${pad(startDate.getHours())}:${pad(startDate.getMinutes())} – ${pad(endDate.getHours())}:${pad(
    endDate.getMinutes()
  )}`;
}

export default function Home() {
  const { t } = useLanguage();
  const { user, isAdmin, isOperator } = useAuth();
  const { getClassesForDate } = useSchedule();
  const { tasks, sortedTasks } = useTasks();
  const { sortedExams } = useExams();
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const todaysClasses = getClassesForDate(new Date());
  const navItems = buildPlannerNavItems(t, { isAdmin, isOperator });
  
  // Get greeting based on time of day
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Guten Morgen';
    if (hour < 18) return 'Guten Tag';
    return 'Guten Abend';
  };
  
  // Get user's name - same logic as AppShell
  const getUserName = () => {
    if (!user) return null;
    
    // First, use the name from the logged-in user object (most reliable)
    if (user.name) {
      return user.name;
    }
    
    try {
      // Then try to get from users array by matching ID or email
      const users = readJSON<Array<{ id: string; name?: string; email?: string }>>('schulplaner:users', []);
      const currentUser = users.find(
        (u) =>
          u.id === user.id ||
          u.email?.toLowerCase().trim() === user.email?.toLowerCase().trim()
      );
      if (currentUser?.name) {
        return currentUser.name;
      }
      
      // Last resort: check settings, but ensure it matches the current user
      const settings = readJSON<{ profile?: { name?: string; email?: string } }>('schulplaner:settings', {});
      if (
        settings.profile?.name &&
        (!settings.profile?.email ||
          settings.profile.email.toLowerCase().trim() === user.email?.toLowerCase().trim())
      ) {
        return settings.profile.name;
      }
      
      return null;
    } catch {
      return null;
    }
  };
  
  const greeting = getGreeting();
  const userName = getUserName();
  
  // Get today's tasks
  const today = new Date();
  const todayTasks = sortedTasks.filter((task) => {
    if (!task.dueDate || task.done) return false;
    const taskDate = new Date(task.dueDate).toISOString().split('T')[0];
    return taskDate === today.toISOString().split('T')[0];
  });
  
  // Get upcoming exams (next 7 days)
  const upcomingExams = sortedExams.filter((exam) => {
    if (!exam.date) return false;
    const examDate = new Date(exam.date);
    const daysDiff = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysDiff >= 0 && daysDiff <= 7;
  }).slice(0, 3);
  
  // Get open tasks count
  const openTasks = tasks.filter((t) => !t.done).length;
  
  return (
    <PlannerShell
      sidebar={
        <>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Dashboard</p>
            <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">
              {userName ? `${greeting}, ${userName}` : t('home.title')}
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('home.description')}</p>
          </div>
          <PlannerNav items={navItems} label={t('planner.navigation')} />
          <div className="mt-8 space-y-4">
            <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Heute</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-white">{todaysClasses.length}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{t('home.classesToday')}</p>
            </div>
            <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Offene Aufgaben</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-white">{openTasks}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{t('home.openTasks')}</p>
            </div>
            <div className="space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
              <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Nächste Prüfungen</p>
              <p className="text-3xl font-semibold text-gray-900 dark:text-white">{upcomingExams.length}</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">{t('home.upcomingExams')}</p>
            </div>
          </div>
        </>
      }
    >
      {isEditingSchedule && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900 my-8">
            <ScheduleEditor onClose={() => setIsEditingSchedule(false)} />
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Today's Schedule */}
        <SectionCard
          title={t('home.morningClasses')}
          action={
            <button
              onClick={() => setIsEditingSchedule(true)}
              className={`${subtleButtonStyles} text-sm`}
            >
              {t('schedule.editButton')}
            </button>
          }
        >
          <ul className="space-y-3">
            {todaysClasses.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {t('schedule.noClasses')}
              </li>
            ) : (
              todaysClasses.map((cls) => (
                <li key={cls.id} className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                  <div>
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">{cls.title}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{cls.room || t('schedule.noRoom')}</p>
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    {formatTimeRange(cls.time, cls.durationMinutes)}
                  </span>
                </li>
              ))
            )}
          </ul>
        </SectionCard>

        <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 min-w-0">
          {/* Today's Tasks */}
          <SectionCard
            title={t('home.todaysTasks')}
            action={
              <Link href="/tasks" className={`${subtleButtonStyles} text-sm`}>
                {t('home.viewAll')}
              </Link>
            }
          >
            {todayTasks.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-3 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                {t('home.noTasksToday')}
              </p>
            ) : (
              <ul className="space-y-3">
                {todayTasks.slice(0, 5).map((task) => (
                  <li key={task.id} className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{task.title}</p>
                      <p className="text-xs text-gray-600 dark:text-gray-400">{task.subject}</p>
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ml-2 flex-shrink-0 ${
                      task.priority === 'High'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
                        : task.priority === 'Medium'
                          ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300'
                          : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
                    }`}>
                      {task.priority}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          {/* Upcoming Exams */}
          <SectionCard
            title={t('home.upcomingExams')}
            action={
              <Link href="/exams" className={`${subtleButtonStyles} text-sm`}>
                {t('home.viewAll')}
              </Link>
            }
          >
            {upcomingExams.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-gray-200 px-4 py-3 text-center text-sm text-gray-500 dark:border-gray-700 dark:text-gray-400">
                {t('home.noUpcomingExams')}
              </p>
            ) : (
              <ul className="space-y-3">
                {upcomingExams.map((exam) => {
                  const examDate = exam.date ? new Date(exam.date) : null;
                  const daysUntil = examDate ? Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
                  
                  return (
                    <li key={exam.id} className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{exam.subject}</p>
                          {examDate && (
                            <p className="text-xs text-gray-600 dark:text-gray-400">
                              {new Intl.DateTimeFormat('de-DE', {
                                weekday: 'short',
                                day: '2-digit',
                                month: 'short',
                              }).format(examDate)}
                              {daysUntil !== null && daysUntil >= 0 && (
                                <span className="ml-2">({daysUntil === 0 ? t('home.today') : `${daysUntil} ${t('home.days')}`})</span>
                              )}
                            </p>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </SectionCard>
        </div>

        {/* Quick Actions */}
        <SectionCard title={t('home.quickActions')}>
          <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4 min-w-0">
            <Link
              href="/calendar"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-center transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600 dark:hover:bg-blue-950/30"
            >
              <p className="text-2xl mb-2">📅</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('nav.calendar')}</p>
            </Link>
            <Link
              href="/tasks"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-center transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600 dark:hover:bg-blue-950/30"
            >
              <p className="text-2xl mb-2">✓</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('nav.tasks')}</p>
            </Link>
            <Link
              href="/exams"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-center transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600 dark:hover:bg-blue-950/30"
            >
              <p className="text-2xl mb-2">📝</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('nav.exams')}</p>
            </Link>
            <Link
              href="/study-plan"
              className="rounded-2xl border border-gray-200 bg-white px-4 py-4 text-center transition-all hover:border-blue-300 hover:bg-blue-50 hover:shadow-sm dark:border-gray-700 dark:bg-gray-800 dark:hover:border-blue-600 dark:hover:bg-blue-950/30"
            >
              <p className="text-2xl mb-2">🎯</p>
              <p className="text-sm font-semibold text-gray-900 dark:text-white">{t('nav.studyPlan')}</p>
            </Link>
          </div>
        </SectionCard>

        <AgendaAssistantCard />
      </div>
    </PlannerShell>
  );
}
