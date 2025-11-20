'use client';

import { useState } from 'react';
import Link from "next/link";

import { AgendaAssistantCard } from "@/components/ai/agenda-assistant";
import { useLanguage } from "@/contexts/language-context";
import { useSchedule } from "@/hooks/use-schedule";
import { ScheduleEditor } from "@/components/schedule/schedule-editor";
import { PageHeader } from "@/components/ui/page-header";
import { SectionCard } from "@/components/ui/section-card";
import { subtleButtonStyles } from "@/styles/theme";

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

export default function Home() {
  const { t } = useLanguage();
  const { getClassesForDate } = useSchedule();
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const todaysClasses = getClassesForDate(new Date());
  
  return (
    <div className="space-y-12">
      <PageHeader
        badge="Overview"
        title={t('home.title')}
        description={t('home.description')}
      />

      {isEditingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <ScheduleEditor onClose={() => setIsEditingSchedule(false)} />
          </div>
        </div>
      )}

      <div className="grid gap-8 lg:grid-cols-3">
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
          <ul className="space-y-4">
            {todaysClasses.length === 0 ? (
              <li className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {t('schedule.noClasses')}
              </li>
            ) : (
              todaysClasses.map((cls) => (
                <li key={cls.id} className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 dark:border-slate-800/50 dark:bg-slate-900/40">
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-white">{cls.title}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{cls.room || t('schedule.noRoom')}</p>
        </div>
                  <span className="text-xs font-medium text-slate-600 dark:text-slate-300">{cls.time}</span>
                </li>
              ))
            )}
          </ul>
        </SectionCard>

        <SectionCard
          title={t('home.afternoon')}
          action={
            <Link href="/tasks" className={`${subtleButtonStyles} text-sm`}>
              {t('home.planActivity')}
            </Link>
          }
        >
          <ul className="space-y-4">
            {afternoonActivities.map((activity) => (
              <li key={activity.title} className="rounded-2xl border border-slate-100 px-4 py-3 dark:border-slate-800/50">
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{activity.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {activity.time} • {activity.duration}
                </p>
              </li>
            ))}
          </ul>
        </SectionCard>

        <SectionCard
          title={t('home.aiHighlights')}
          action={
            <Link href="/study-plan" className={`${subtleButtonStyles} text-sm`}>
              {t('home.openAssistant')}
            </Link>
          }
        >
          <ul className="space-y-4">
            {focusHighlights.map((item) => (
              <li key={item} className="rounded-2xl border border-dashed border-slate-200 px-4 py-3 text-sm font-medium text-slate-700 dark:border-slate-700 dark:text-slate-200">
                {item}
              </li>
            ))}
          </ul>
        </SectionCard>
        </div>

      <AgendaAssistantCard />
    </div>
  );
}
