'use client';

import { FormEvent, useState } from 'react';

import { useLanguage } from '@/contexts/language-context';
import { useSchedule, getSubjectColor, type ClassEntry, type DayData } from '@/hooks/use-schedule';
import { inputStyles, subtleButtonStyles } from '@/styles/theme';
import { PDFUploader } from './pdf-uploader';

type ScheduleEditorProps = {
  onClose: () => void;
};

export function ScheduleEditor({ onClose }: ScheduleEditorProps) {
  const { t } = useLanguage();
  const {
    days,
    addClassToDay,
    updateClassForDay,
    removeClassFromDay,
    ensureDayForDate,
  } = useSchedule();
  const [editingContext, setEditingContext] = useState<{
    dayId: string | null;
    classId: string | null;
  }>({ dayId: null, classId: null });
  const [showPDFUploader, setShowPDFUploader] = useState(false);
  const [formData, setFormData] = useState({
    date: formatDateInput(new Date()),
    time: '',
    title: '',
    room: '',
    durationMinutes: 45,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formData.time || !formData.title || !formData.date) return;

    const targetDay = ensureDayForDate(formData.date);
    const payload = {
      id: editingContext.classId ?? undefined,
      title: formData.title,
      time: formData.time,
      room: formData.room,
      subjectColor: getSubjectColor(formData.title),
      durationMinutes: formData.durationMinutes,
    };

    if (editingContext.classId && editingContext.dayId) {
      if (editingContext.dayId === targetDay.id) {
        updateClassForDay(targetDay.id, editingContext.classId, payload);
      } else {
        removeClassFromDay(editingContext.dayId, editingContext.classId);
        addClassToDay(targetDay.id, payload);
      }
      setEditingContext({ dayId: null, classId: null });
    } else {
      addClassToDay(targetDay.id, payload);
    }

    setFormData({
      date: formatDateInput(new Date()),
      time: '',
      title: '',
      room: '',
      durationMinutes: 45,
    });
  }

  function startEdit(day: DayData, cls: ClassEntry) {
    setEditingContext({ dayId: day.id, classId: cls.id });
    setFormData({
      time: cls.time,
      title: cls.title,
      room: cls.room,
      date: day.date,
      durationMinutes: cls.durationMinutes ?? 45,
    });
  }

  function cancelEdit() {
    setEditingContext({ dayId: null, classId: null });
    setFormData({
      date: formatDateInput(new Date()),
      time: '',
      title: '',
      room: '',
      durationMinutes: 45,
    });
  }

  if (showPDFUploader) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
            PDF importieren
          </h3>
          <button
            type="button"
            onClick={() => setShowPDFUploader(false)}
            className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
          >
            ✕
          </button>
        </div>
        <PDFUploader onClose={() => setShowPDFUploader(false)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {t('schedule.editSchedule')}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          ✕
        </button>
      </div>

      <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-800 dark:bg-indigo-950/50">
        <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100 mb-2">
          Stundenplan aus PDF importieren
        </p>
        <p className="text-xs text-indigo-700 dark:text-indigo-300 mb-3">
          Lade deinen offiziellen Stundenplan als PDF hoch und die App fügt automatisch alle Klassen hinzu.
        </p>
        <button
          type="button"
          onClick={() => setShowPDFUploader(true)}
          className={`${subtleButtonStyles} w-full border-indigo-300 bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:border-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-200 dark:hover:bg-indigo-800/50`}
        >
          PDF hochladen
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:grid-cols-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{t('calendar.days')}</span>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData((prev) => ({ ...prev, date: e.target.value }))}
              className={inputStyles}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{t('schedule.time')}</span>
            <input
              type="time"
              value={formData.time}
              onChange={(e) => setFormData((prev) => ({ ...prev, time: e.target.value }))}
              className={inputStyles}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{t('schedule.subject')}</span>
            <input
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              className={inputStyles}
              placeholder={t('schedule.subjectPlaceholder')}
              required
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{t('schedule.room')}</span>
            <input
              value={formData.room}
              onChange={(e) => setFormData((prev) => ({ ...prev, room: e.target.value }))}
              className={inputStyles}
              placeholder={t('schedule.roomPlaceholder')}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{t('schedule.durationLabel')}</span>
            <input
              type="number"
              min={10}
              step={5}
              value={formData.durationMinutes}
              onChange={(e) => setFormData((prev) => ({ ...prev, durationMinutes: Number(e.target.value) || 45 }))}
              className={inputStyles}
            />
          </label>
        </div>
        <div className="flex gap-2">
          <button type="submit" className={`${subtleButtonStyles} flex-1`}>
            {editingContext.classId ? t('schedule.update') : t('schedule.add')}
          </button>
          {editingContext.classId && (
            <button
              type="button"
              onClick={cancelEdit}
              className={`${subtleButtonStyles} flex-1`}
            >
              {t('schedule.cancel')}
            </button>
          )}
        </div>
      </form>

      <div className="space-y-4">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{t('schedule.classes')}</h4>
        <div className="space-y-4">
          {days
            .sort((a, b) => a.date.localeCompare(b.date))
            .map((day) => (
              <div key={day.id} className="rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                <div className="mb-3 flex items-center justify-between text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  <span>{new Date(day.date).toLocaleDateString('de-DE', { weekday: 'short', day: 'numeric', month: 'short' })}</span>
                  <span>{day.classes.length} {t('onboarding.classesAdded')}</span>
                </div>
                {day.classes.length === 0 ? (
                  <p className="text-xs text-slate-400 dark:text-slate-500">{t('schedule.noClasses')}</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {day.classes.map((cls) => (
                      <li key={cls.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
                        <div className="flex-1 pr-4">
                          <p className="font-semibold text-slate-900 dark:text-white">{cls.title}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">
                            {formatTimeRange(cls.time, cls.durationMinutes)} • {cls.room || t('schedule.noRoom')}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => startEdit(day, cls)}
                            className="text-xs font-semibold text-indigo-600 underline decoration-dotted hover:text-indigo-700 dark:text-indigo-400"
                          >
                            {t('schedule.edit')}
                          </button>
                          <button
                            type="button"
                            onClick={() => removeClassFromDay(day.id, cls.id)}
                            className="text-xs font-semibold text-rose-500 underline decoration-dotted hover:text-rose-700"
                          >
                            {t('schedule.delete')}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}

function formatDateInput(date: Date) {
  return date.toISOString().split('T')[0];
}

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

