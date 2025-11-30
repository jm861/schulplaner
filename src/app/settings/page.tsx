'use client';

import { useEffect, useState } from 'react';

import { SectionCard } from '@/components/ui/section-card';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/contexts/auth-context';
import { useWeeklyPlan } from '@/hooks/use-weekly-plan';
import { useTheme } from '@/components/theme/theme-provider';
import { readJSON, writeJSON } from '@/lib/storage';
import { type Language } from '@/lib/i18n';
import { inputStyles, selectStyles, textareaStyles, subtleButtonStyles } from '@/styles/theme';
import { PlannerShell, PlannerNav } from '@/components/layout/planner-shell';
import { buildPlannerNavItems } from '@/lib/planner-nav';
import { useTeachers } from '@/hooks/use-teachers';
import { useCourses } from '@/hooks/use-courses';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { Teacher } from '@/types/teachers';
import { HolidaysSection } from '@/components/holidays/holidays-section';

type NotificationSetting = {
  label: string;
  description: string;
  enabled: boolean;
};

type SettingsState = {
  profile: {
    name: string;
    grade: string;
    timezone: string;
  };
  notifications: NotificationSetting[];
  ai: {
    tone: string;
    template: string;
  };
};

const DEFAULT_SETTINGS: SettingsState = {
  profile: {
    name: 'Lina Schneider',
    grade: '11',
    timezone: 'Europe/Berlin (CET)',
  },
  notifications: [
    { label: 'Daily schedule digest', description: 'Send every day at 07:00', enabled: true },
    { label: 'Homework reminder', description: '2 hours before due time', enabled: true },
    { label: 'Study plan drift alert', description: 'Trigger when 2 sessions skipped', enabled: false },
  ],
  ai: {
    tone: 'Friendly & encouraging',
    template: 'Summarize the homework requirements and suggest a plan...',
  },
};

const SETTINGS_STORAGE_KEY = 'schulplaner:settings';

export default function SettingsPage() {
  const { language, setLanguage, t } = useLanguage();
  const { user, logout } = useAuth();
  const { hasDemoData, removeDemoData } = useWeeklyPlan();
  const { theme, setTheme } = useTheme();
  const { teachers, addTeacher, updateTeacher, updateTeacherCourses, deleteTeacher } = useTeachers();
  const { courses, getCoursesByIds } = useCourses();
  const { isSupported, permission, subscribe, unsubscribe, subscription, sendLocalNotification } = usePushNotifications();
  
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  const [assigningCourses, setAssigningCourses] = useState<Teacher | null>(null);
  const [teacherForm, setTeacherForm] = useState({ name: '', email: '' });
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([]);
  const [settings, setSettings] = useState<SettingsState>(() => {
    try {
      const saved = readJSON(SETTINGS_STORAGE_KEY, DEFAULT_SETTINGS);
      // Ensure all required fields exist
      if (!saved.profile) saved.profile = DEFAULT_SETTINGS.profile;
      if (!saved.notifications) saved.notifications = DEFAULT_SETTINGS.notifications;
      if (!saved.ai) saved.ai = DEFAULT_SETTINGS.ai;
      
      // Sync with user data from registration/welcome page if available
      const users = readJSON<Array<{ id: string; name?: string; class?: string; yearBorn?: string }>>('schulplaner:users', []);
      const currentUser = users.find(u => u.id === user?.id) || user;
      
      if (currentUser) {
        // Update profile with user data if it exists and settings haven't been customized
        if (currentUser.name && (!saved.profile.name || saved.profile.name === DEFAULT_SETTINGS.profile.name)) {
          saved.profile.name = currentUser.name;
        }
        if (currentUser.class && (!saved.profile.grade || saved.profile.grade === DEFAULT_SETTINGS.profile.grade)) {
          saved.profile.grade = currentUser.class;
        }
      }
      
      return saved;
    } catch (error) {
      console.error('Error loading settings:', error);
      return DEFAULT_SETTINGS;
    }
  });

  // Sync settings with user data when user changes
  useEffect(() => {
    if (user) {
      const users = readJSON<Array<{ id: string; name?: string; class?: string; yearBorn?: string }>>('schulplaner:users', []);
      const currentUser = users.find(u => u.id === user.id) || user;
      
      if (currentUser) {
        setSettings((prev) => {
          const updated = { ...prev };
          // Update name if user has a name and it's different
          if (currentUser.name && currentUser.name !== prev.profile.name) {
            updated.profile = { ...updated.profile, name: currentUser.name };
          }
          // Update grade/class if user has a class and it's different
          if (currentUser.class && currentUser.class !== prev.profile.grade) {
            updated.profile = { ...updated.profile, grade: currentUser.class };
          }
          return updated;
        });
      }
    }
  }, [user]);

  useEffect(() => {
    writeJSON(SETTINGS_STORAGE_KEY, settings);
  }, [settings]);

  const updateProfile = (key: keyof SettingsState['profile'], value: string) => {
    setSettings((prev) => ({
      ...prev,
      profile: {
        ...prev.profile,
        [key]: value,
      },
    }));
  };

  const updateAI = (key: keyof SettingsState['ai'], value: string) => {
    setSettings((prev) => ({
      ...prev,
      ai: {
        ...prev.ai,
        [key]: value,
      },
    }));
  };

  const toggleNotification = (label: string) => {
    setSettings((prev) => ({
      ...prev,
      notifications: prev.notifications.map((item) =>
        item.label === label ? { ...item, enabled: !item.enabled } : item,
      ),
    }));
  };


  const { isAdmin, isOperator } = useAuth();
  const navItems = buildPlannerNavItems(t, { isAdmin, isOperator });

  return (
    <PlannerShell
      sidebar={
        <>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.4em] text-slate-400">Settings</p>
            <h2 className="text-2xl font-semibold text-white">{t('settings.title')}</h2>
            <p className="text-sm text-slate-400">{t('settings.description')}</p>
          </div>
          <PlannerNav items={navItems} label={t('planner.navigation')} />
          {user && (
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{t('settings.loggedInAs')}</p>
              <p className="mt-2 text-sm font-semibold text-white">{user.email}</p>
              {user.name && (
                <p className="mt-1 text-xs text-slate-400">{user.name}</p>
              )}
            </div>
          )}
        </>
      }
    >
      <div className="space-y-6 w-full">
        <div className="grid gap-6 sm:gap-8 lg:grid-cols-2 w-full">
        <SectionCard title={t('settings.profile')}>
          <form className="space-y-4 text-sm">
            <label className="flex flex-col gap-1.5 sm:gap-2">
              <span className="font-medium text-slate-700 dark:text-slate-200 text-sm sm:text-base">Full name</span>
              <input
                className={`${inputStyles} text-sm sm:text-base`}
                value={settings.profile.name}
                onChange={(event) => updateProfile('name', event.target.value)}
                placeholder="e.g., Lina Schneider"
              />
            </label>
            <label className="flex flex-col gap-1.5 sm:gap-2">
              <span className="font-medium text-slate-700 dark:text-slate-200 text-sm sm:text-base">Grade / Year</span>
              <input
                className={`${inputStyles} text-sm sm:text-base`}
                value={settings.profile.grade}
                onChange={(event) => updateProfile('grade', event.target.value)}
                placeholder="11"
              />
            </label>
            <label className="flex flex-col gap-1.5 sm:gap-2">
              <span className="font-medium text-slate-700 dark:text-slate-200 text-sm sm:text-base">Home timezone</span>
              <select
                className={`${selectStyles} text-sm sm:text-base`}
                value={settings.profile.timezone}
                onChange={(event) => updateProfile('timezone', event.target.value)}
              >
                <option>Europe/Berlin (CET)</option>
                <option>Europe/Vienna</option>
                <option>Europe/Zurich</option>
              </select>
            </label>
          </form>
        </SectionCard>

        <SectionCard title={t('settings.notifications')}>
          {isSupported ? (
            <div className="space-y-4 text-sm">
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/20">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white">{t('settings.pushNotifications')}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {permission === 'granted' 
                        ? t('settings.pushEnabled')
                        : permission === 'denied'
                        ? t('settings.pushDenied')
                        : t('settings.pushNotEnabled')}
                    </p>
                  </div>
                  {permission === 'granted' && subscription ? (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await unsubscribe();
                          sendLocalNotification(t('settings.pushDisabled'), { body: t('settings.pushDisabledMessage') });
                        } catch (error) {
                          console.error('[push] Unsubscribe failed:', error);
                        }
                      }}
                      className="rounded-full bg-rose-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-rose-600"
                    >
                      {t('settings.disablePush')}
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          await subscribe();
                          sendLocalNotification(t('settings.pushEnabled'), { body: t('settings.pushEnabledMessage') });
                        } catch (error) {
                          console.error('[push] Subscribe failed:', error);
                          alert(t('settings.pushSubscribeFailed'));
                        }
                      }}
                      disabled={permission === 'denied'}
                      className="rounded-full bg-emerald-500 px-4 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t('settings.enablePush')}
                    </button>
                  )}
                </div>
                {permission === 'denied' && (
                  <p className="text-xs text-rose-600 dark:text-rose-400 mt-2">
                    {t('settings.pushDeniedHint')}
                  </p>
                )}
              </div>
              <ul className="space-y-4">
                {settings.notifications.map((item) => (
                  <li key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 dark:border-slate-800">
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">{item.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{item.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleNotification(item.label)}
                      className={`rounded-full px-4 py-1 text-xs font-semibold ${
                        item.enabled
                          ? 'bg-emerald-500 text-white'
                          : 'border border-slate-300 text-slate-500 dark:border-slate-600 dark:text-slate-300'
                      }`}
                    >
                      {item.enabled ? 'On' : 'Off'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('settings.pushNotSupported')}</p>
          )}
        </SectionCard>

        <SectionCard title={t('settings.ai')}>
          <div className="space-y-4 text-sm">
            <label className="flex flex-col gap-1">
              <span className="font-medium text-slate-700 dark:text-slate-200">Tone</span>
              <select
                className={selectStyles}
                value={settings.ai.tone}
                onChange={(event) => updateAI('tone', event.target.value)}
              >
                <option>Friendly & encouraging</option>
                <option>Direct & concise</option>
                <option>Detailed & academic</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="font-medium text-slate-700 dark:text-slate-200">Default prompt template</span>
              <textarea
                rows={4}
                className={textareaStyles}
                value={settings.ai.template}
                onChange={(event) => updateAI('template', event.target.value)}
                placeholder="Summarize the homework requirements and suggest a plan..."
              />
            </label>
          </div>
        </SectionCard>

        <SectionCard title={t('settings.language')}>
          <div className="space-y-4 text-sm">
            <label className="flex flex-col gap-1">
              <span className="font-medium text-slate-700 dark:text-slate-200">{t('settings.language')}</span>
              <select
                className={selectStyles}
                value={language}
                onChange={(event) => setLanguage(event.target.value as Language)}
              >
                <option value="en">{t('common.english')}</option>
                <option value="de">{t('common.german')}</option>
              </select>
            </label>
          </div>
        </SectionCard>

        <SectionCard title={t('settings.theme')}>
          <div className="space-y-4 text-sm">
            <label className="flex flex-col gap-1">
              <span className="font-medium text-slate-700 dark:text-slate-200">{t('settings.theme')}</span>
              <select
                className={selectStyles}
                value={theme}
                onChange={(event) => setTheme(event.target.value as 'light' | 'dark' | 'system')}
              >
                <option value="system">{t('settings.themeSystem')}</option>
                <option value="light">{t('common.light')}</option>
                <option value="dark">{t('common.dark')}</option>
              </select>
            </label>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('settings.themeDescription')}
            </p>
          </div>
        </SectionCard>

        {hasDemoData && (
          <SectionCard title={t('settings.demoData')}>
            <div className="space-y-4 text-sm">
              <p className="text-slate-600 dark:text-slate-300">
                {t('settings.demoDataDescription')}
              </p>
              <button
                onClick={removeDemoData}
                className={`${subtleButtonStyles} w-full border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-300 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300 dark:hover:bg-amber-900/50`}
              >
                {t('settings.removeDemoData')}
              </button>
            </div>
          </SectionCard>
        )}

        <SectionCard title={t('settings.account')}>
          <div className="space-y-4 text-sm">
            {user && (
              <div className="rounded-2xl border border-slate-200 bg-slate-50/50 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/40">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  {t('settings.loggedInAs')}
                </p>
                <p className="mt-1 text-base font-semibold text-slate-900 dark:text-white">{user.email}</p>
                {user.name && (
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{user.name}</p>
                )}
              </div>
            )}
            <button
              onClick={logout}
              className={`${subtleButtonStyles} w-full border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100 hover:border-rose-300 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300 dark:hover:bg-rose-900/50`}
            >
              {t('settings.logout')}
            </button>
          </div>
        </SectionCard>

        <SectionCard title={t('settings.teachers')}>
          <div className="space-y-4 text-sm">
            <p className="text-xs text-slate-500 dark:text-slate-400">{t('settings.teachersDescription')}</p>
            
            {assigningCourses ? (
              <div className="space-y-3 rounded-2xl border border-purple-200 bg-purple-50/50 p-4 dark:border-purple-800 dark:bg-purple-950/30">
                <h4 className="font-semibold text-slate-900 dark:text-white">
                  {t('settings.assignCourses')} - {assigningCourses.name}
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400">{t('settings.selectCoursesForTeacher')}</p>
                {courses.length === 0 ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400 py-4 text-center">
                    Keine Kurse verfügbar. Bitte füge zuerst Kurse hinzu.
                  </p>
                ) : (
                  <>
                    <div className="max-h-60 space-y-2 overflow-y-auto">
                      {courses.map((course) => (
                        <label
                          key={course.id}
                          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40 dark:hover:bg-slate-800/50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedCourseIds.includes(course.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCourseIds((prev) => {
                                  if (!prev.includes(course.id)) {
                                    return [...prev, course.id];
                                  }
                                  return prev;
                                });
                              } else {
                                setSelectedCourseIds((prev) => prev.filter((id) => id !== course.id));
                              }
                            }}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-2 focus:ring-blue-500 dark:border-slate-600"
                          />
                          <span className="text-sm text-slate-900 dark:text-white flex-1">{course.name}</span>
                        </label>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          if (assigningCourses) {
                            updateTeacherCourses(assigningCourses.id, selectedCourseIds);
                            setAssigningCourses(null);
                            setSelectedCourseIds([]);
                          }
                        }}
                        className={`${subtleButtonStyles} flex-1`}
                      >
                        {t('common.save')}
                      </button>
                      <button
                        onClick={() => {
                          setAssigningCourses(null);
                          setSelectedCourseIds([]);
                        }}
                        className={`${subtleButtonStyles} flex-1 border-slate-300 dark:border-slate-600`}
                      >
                        {t('common.cancel')}
                      </button>
                    </div>
                  </>
                )}
              </div>
            ) : editingTeacher ? (
              <div className="space-y-3 rounded-2xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
                <h4 className="font-semibold text-slate-900 dark:text-white">{t('settings.editTeacher')}</h4>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={teacherForm.name}
                    onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                    placeholder={t('settings.teacherName')}
                    className={`${inputStyles} w-full`}
                  />
                  <input
                    type="email"
                    value={teacherForm.email}
                    onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                    placeholder={t('settings.teacherEmail')}
                    className={`${inputStyles} w-full`}
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (teacherForm.name && teacherForm.email) {
                        updateTeacher(editingTeacher.id, teacherForm.name, teacherForm.email, editingTeacher.courses);
                        setEditingTeacher(null);
                        setTeacherForm({ name: '', email: '' });
                      }
                    }}
                    className={`${subtleButtonStyles} flex-1`}
                  >
                    {t('common.save')}
                  </button>
                  <button
                    onClick={() => {
                      setEditingTeacher(null);
                      setTeacherForm({ name: '', email: '' });
                    }}
                    className={`${subtleButtonStyles} flex-1 border-slate-300 dark:border-slate-600`}
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                <h4 className="font-semibold text-slate-900 dark:text-white">{t('settings.addTeacher')}</h4>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={teacherForm.name}
                    onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                    placeholder={t('settings.teacherName')}
                    className={`${inputStyles} w-full`}
                  />
                  <input
                    type="email"
                    value={teacherForm.email}
                    onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                    placeholder={t('settings.teacherEmail')}
                    className={`${inputStyles} w-full`}
                  />
                </div>
                <button
                  onClick={() => {
                    if (teacherForm.name && teacherForm.email) {
                      addTeacher(teacherForm.name, teacherForm.email);
                      setTeacherForm({ name: '', email: '' });
                    }
                  }}
                  className={`${subtleButtonStyles} w-full`}
                >
                  {t('common.add')}
                </button>
              </div>
            )}

            {teachers.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400">{t('settings.noTeachers')}</p>
            ) : (
              <ul className="space-y-2">
                {teachers.map((teacher) => {
                  const teacherCourseIds = Array.isArray(teacher.courses) ? teacher.courses : [];
                  const teacherCourses = getCoursesByIds(teacherCourseIds);
                  return (
                    <li
                      key={teacher.id}
                      className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-semibold text-slate-900 dark:text-white">{teacher.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{teacher.email}</p>
                          {teacherCourses.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {teacherCourses.map((course) => (
                                <span
                                  key={course.id}
                                  className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-300"
                                >
                                  {course.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => {
                              setEditingTeacher(teacher);
                              setTeacherForm({ name: teacher.name, email: teacher.email });
                            }}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50"
                          >
                            {t('common.edit')}
                          </button>
                          <button
                            onClick={() => {
                              if (teacher) {
                                setAssigningCourses(teacher);
                                setSelectedCourseIds(Array.isArray(teacher.courses) ? teacher.courses : []);
                              }
                            }}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-950/50"
                          >
                            {t('settings.assignCourses')}
                          </button>
                          <button
                            onClick={() => {
                              if (confirm(`Möchtest du ${teacher.name} wirklich löschen?`)) {
                                deleteTeacher(teacher.id);
                              }
                            }}
                            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/50"
                          >
                            {t('common.delete')}
                          </button>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </SectionCard>

        <HolidaysSection />
        </div>
      </div>
    </PlannerShell>
  );
}

