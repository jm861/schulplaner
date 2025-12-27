/**
 * Settings Page - Apple-like Design
 * Manage app settings, profile, notifications, theme, and more
 */

'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { Button } from '@/components/ui/button';
import { SegmentedControl } from '@/components/ui/segmented-control';
import { useLanguage } from '@/contexts/language-context';
import { useAuth } from '@/contexts/auth-context';
import { useWeeklyPlan } from '@/hooks/use-weekly-plan';
import { useTheme } from '@/components/theme/theme-provider';
import { readJSON, writeJSON } from '@/lib/storage';
import { type Language } from '@/lib/i18n';
import { useTeachers } from '@/hooks/use-teachers';
import { useCourses } from '@/hooks/use-courses';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { Teacher } from '@/types/teachers';
import { HolidaysSection } from '@/components/holidays/holidays-section';
import { Settings, User, Bell, Sparkles, Globe, Moon, LogOut, Users, Trash2, Edit2 } from 'lucide-react';

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
      if (!saved.profile) saved.profile = DEFAULT_SETTINGS.profile;
      if (!saved.notifications) saved.notifications = DEFAULT_SETTINGS.notifications;
      if (!saved.ai) saved.ai = DEFAULT_SETTINGS.ai;
      
      const users = readJSON<Array<{ id: string; name?: string; class?: string; yearBorn?: string }>>('schulplaner:users', []);
      const currentUser = users.find(u => u.id === user?.id) || user;
      
      if (currentUser) {
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

  useEffect(() => {
    if (user) {
      const users = readJSON<Array<{ id: string; name?: string; class?: string; yearBorn?: string }>>('schulplaner:users', []);
      const currentUser = users.find(u => u.id === user.id) || user;
      
      if (currentUser) {
        setSettings((prev) => {
          const updated = { ...prev };
          if (currentUser.name && currentUser.name !== prev.profile.name) {
            updated.profile = { ...updated.profile, name: currentUser.name };
          }
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

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Einstellungen</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Verwalte deine App-Einstellungen und Präferenzen
          </p>
        </div>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Profil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Vollständiger Name
            </label>
            <input
              type="text"
              value={settings.profile.name}
              onChange={(e) => updateProfile('name', e.target.value)}
              placeholder="z.B. Lina Schneider"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Klasse / Jahrgang
            </label>
            <input
              type="text"
              value={settings.profile.grade}
              onChange={(e) => updateProfile('grade', e.target.value)}
              placeholder="11"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
            />
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Zeitzone
            </label>
            <select
              value={settings.profile.timezone}
              onChange={(e) => updateProfile('timezone', e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
            >
              <option>Europe/Berlin (CET)</option>
              <option>Europe/Vienna</option>
              <option>Europe/Zurich</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            Benachrichtigungen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isSupported && (
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-900/20">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="font-semibold text-gray-900 dark:text-white">
                    {t('settings.pushNotifications')}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    {permission === 'granted' 
                      ? t('settings.pushEnabled')
                      : permission === 'denied'
                      ? t('settings.pushDenied')
                      : t('settings.pushNotEnabled')}
                  </p>
                </div>
                {permission === 'granted' && subscription ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      try {
                        await unsubscribe();
                        sendLocalNotification(t('settings.pushDisabled'), { body: t('settings.pushDisabledMessage') });
                      } catch (error) {
                        console.error('[push] Unsubscribe failed:', error);
                      }
                    }}
                  >
                    {t('settings.disablePush')}
                  </Button>
                ) : (
                  <Button
                    size="sm"
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
                  >
                    {t('settings.enablePush')}
                  </Button>
                )}
              </div>
              {permission === 'denied' && (
                <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                  {t('settings.pushDeniedHint')}
                </p>
              )}
            </div>
          )}
          <div className="space-y-2">
            {settings.notifications.map((item) => (
              <ListRow
                key={item.label}
                subtitle={item.description}
                trailing={
                  <Button
                    variant={item.enabled ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => toggleNotification(item.label)}
                  >
                    {item.enabled ? 'An' : 'Aus'}
                  </Button>
                }
              >
                {item.label}
              </ListRow>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* AI Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            KI-Einstellungen
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Ton
            </label>
            <select
              value={settings.ai.tone}
              onChange={(e) => updateAI('tone', e.target.value)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
            >
              <option>Friendly & encouraging</option>
              <option>Direct & concise</option>
              <option>Detailed & academic</option>
            </select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
              Standard-Prompt-Vorlage
            </label>
            <textarea
              rows={4}
              value={settings.ai.template}
              onChange={(e) => updateAI('template', e.target.value)}
              placeholder="Summarize the homework requirements and suggest a plan..."
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
            />
          </div>
        </CardContent>
      </Card>

      {/* Language & Theme */}
      <div className="grid gap-6 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Sprache
            </CardTitle>
          </CardHeader>
          <CardContent>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as Language)}
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
            >
              <option value="en">{t('common.english')}</option>
              <option value="de">{t('common.german')}</option>
            </select>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5" />
              Design
            </CardTitle>
          </CardHeader>
          <CardContent>
            <SegmentedControl
              options={[
                { value: 'system' as const, label: t('settings.themeSystem') },
                { value: 'light' as const, label: t('common.light') },
                { value: 'dark' as const, label: t('common.dark') },
              ]}
              value={theme}
              onChange={(value) => setTheme(value)}
            />
          </CardContent>
        </Card>
      </div>

      {/* Teachers */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Lehrer
          </CardTitle>
          <CardDescription>{t('settings.teachersDescription')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {assigningCourses ? (
            <div className="space-y-3 rounded-xl border border-purple-200 bg-purple-50 p-4 dark:border-purple-800 dark:bg-purple-950/30">
              <h4 className="font-semibold text-gray-900 dark:text-white">
                {t('settings.assignCourses')} - {assigningCourses.name}
              </h4>
              {courses.length === 0 ? (
                <p className="text-xs text-gray-500 dark:text-gray-400 py-4 text-center">
                  Keine Kurse verfügbar.
                </p>
              ) : (
                <>
                  <div className="max-h-60 space-y-2 overflow-y-auto">
                    {courses.map((course) => (
                      <label
                        key={course.id}
                        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={selectedCourseIds.includes(course.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCourseIds((prev) => [...prev, course.id]);
                            } else {
                              setSelectedCourseIds((prev) => prev.filter((id) => id !== course.id));
                            }
                          }}
                          className="h-4 w-4 rounded border-gray-300 text-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-gray-600"
                        />
                        <span className="text-sm text-gray-900 dark:text-white flex-1">{course.name}</span>
                      </label>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        if (assigningCourses) {
                          updateTeacherCourses(assigningCourses.id, selectedCourseIds);
                          setAssigningCourses(null);
                          setSelectedCourseIds([]);
                        }
                      }}
                      className="flex-1"
                    >
                      {t('common.save')}
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setAssigningCourses(null);
                        setSelectedCourseIds([]);
                      }}
                      className="flex-1"
                    >
                      {t('common.cancel')}
                    </Button>
                  </div>
                </>
              )}
            </div>
          ) : editingTeacher ? (
            <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
              <h4 className="font-semibold text-gray-900 dark:text-white">{t('settings.editTeacher')}</h4>
              <div className="space-y-2">
                <input
                  type="text"
                  value={teacherForm.name}
                  onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                  placeholder={t('settings.teacherName')}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                />
                <input
                  type="email"
                  value={teacherForm.email}
                  onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                  placeholder={t('settings.teacherEmail')}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    if (teacherForm.name && teacherForm.email) {
                      updateTeacher(editingTeacher.id, teacherForm.name, teacherForm.email, editingTeacher.courses);
                      setEditingTeacher(null);
                      setTeacherForm({ name: '', email: '' });
                    }
                  }}
                  className="flex-1"
                >
                  {t('common.save')}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setEditingTeacher(null);
                    setTeacherForm({ name: '', email: '' });
                  }}
                  className="flex-1"
                >
                  {t('common.cancel')}
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800">
              <h4 className="font-semibold text-gray-900 dark:text-white">{t('settings.addTeacher')}</h4>
              <div className="space-y-2">
                <input
                  type="text"
                  value={teacherForm.name}
                  onChange={(e) => setTeacherForm({ ...teacherForm, name: e.target.value })}
                  placeholder={t('settings.teacherName')}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                />
                <input
                  type="email"
                  value={teacherForm.email}
                  onChange={(e) => setTeacherForm({ ...teacherForm, email: e.target.value })}
                  placeholder={t('settings.teacherEmail')}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                />
              </div>
              <Button
                onClick={() => {
                  if (teacherForm.name && teacherForm.email) {
                    addTeacher(teacherForm.name, teacherForm.email);
                    setTeacherForm({ name: '', email: '' });
                  }
                }}
                className="w-full"
              >
                {t('common.add')}
              </Button>
            </div>
          )}

          {teachers.length === 0 ? (
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.noTeachers')}</p>
          ) : (
            <div className="space-y-2">
              {teachers.map((teacher) => {
                const teacherCourseIds = Array.isArray(teacher.courses) ? teacher.courses : [];
                const teacherCourses = getCoursesByIds(teacherCourseIds);
                return (
                  <ListRow
                    key={teacher.id}
                    subtitle={
                      <div className="mt-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400">{teacher.email}</p>
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
                    }
                    trailing={
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingTeacher(teacher);
                            setTeacherForm({ name: teacher.name, email: teacher.email });
                          }}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (teacher) {
                              setAssigningCourses(teacher);
                              setSelectedCourseIds(Array.isArray(teacher.courses) ? teacher.courses : []);
                            }
                          }}
                        >
                          {t('settings.assignCourses')}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (confirm(`Möchtest du ${teacher.name} wirklich löschen?`)) {
                              deleteTeacher(teacher.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    }
                  >
                    {teacher.name}
                  </ListRow>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Holidays */}
      <HolidaysSection />

      {/* Account */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {user && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800">
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {t('settings.loggedInAs')}
              </p>
              <p className="mt-1 text-base font-semibold text-gray-900 dark:text-white">{user.email}</p>
              {user.name && (
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{user.name}</p>
              )}
            </div>
          )}
          {hasDemoData && (
            <Button
              variant="outline"
              onClick={removeDemoData}
              className="w-full border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300"
            >
              {t('settings.removeDemoData')}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={logout}
            className="w-full border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300"
          >
            <LogOut className="h-4 w-4 mr-2" />
            {t('settings.logout')}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
