'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

import { useLanguage } from '@/contexts/language-context';
import { useSchedule } from '@/hooks/use-schedule';
import { ScheduleEditor } from '@/components/schedule/schedule-editor';
import { PageHeader } from '@/components/ui/page-header';
import { SectionCard } from '@/components/ui/section-card';
import { subtleButtonStyles } from '@/styles/theme';

export default function OnboardingPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const { classes } = useSchedule();
  const [isEditingSchedule, setIsEditingSchedule] = useState(false);
  const [step, setStep] = useState<'schedule' | 'complete'>('schedule');

  const handleComplete = () => {
    router.push('/');
  };

  if (step === 'complete') {
    return (
      <div className="space-y-12">
        <PageHeader
          badge={t('onboarding.welcome')}
          title={t('onboarding.setupComplete')}
          description={t('onboarding.setupCompleteDesc')}
        />

        <div className="flex flex-col items-center justify-center space-y-6 rounded-[32px] border border-slate-200 bg-white/70 p-12 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="text-6xl">✨</div>
          <div className="text-center">
            <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
              {t('onboarding.allSet')}
            </h2>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
              {t('onboarding.readyToStart')}
            </p>
          </div>
          <button
            onClick={handleComplete}
            className={`${subtleButtonStyles} px-8 py-3 text-base`}
          >
            {t('onboarding.goToHome')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <PageHeader
        badge={t('onboarding.welcome')}
        title={t('onboarding.title')}
        description={t('onboarding.description')}
      />

      {isEditingSchedule && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <ScheduleEditor onClose={() => setIsEditingSchedule(false)} />
          </div>
        </div>
      )}

      <SectionCard title={t('onboarding.step1Title')}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {t('onboarding.step1Description')}
          </p>
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
            <div>
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                {classes.length > 0 
                  ? `${classes.length} ${t('onboarding.classesAdded')}`
                  : t('onboarding.noClassesYet')}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('onboarding.clickToEdit')}
              </p>
            </div>
            <button
              onClick={() => setIsEditingSchedule(true)}
              className={subtleButtonStyles}
            >
              {classes.length > 0 ? t('onboarding.editSchedule') : t('onboarding.addSchedule')}
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title={t('onboarding.quickTips')}>
        <ul className="space-y-3 text-sm text-slate-600 dark:text-slate-300">
          <li className="flex items-start gap-3">
            <span className="mt-0.5 text-lg">📅</span>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{t('onboarding.tip1Title')}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('onboarding.tip1Desc')}</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 text-lg">✅</span>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{t('onboarding.tip2Title')}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('onboarding.tip2Desc')}</p>
            </div>
          </li>
          <li className="flex items-start gap-3">
            <span className="mt-0.5 text-lg">🤖</span>
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">{t('onboarding.tip3Title')}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('onboarding.tip3Desc')}</p>
            </div>
          </li>
        </ul>
      </SectionCard>

      <div className="flex justify-end">
        <button
          onClick={() => setStep('complete')}
          className={`${subtleButtonStyles} px-8 py-3 text-base`}
        >
          {t('onboarding.continue')}
        </button>
      </div>
    </div>
  );
}

