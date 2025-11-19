'use client';

import { FormEvent, useState } from 'react';

import { useLanguage } from '@/contexts/language-context';
import { useSchedule, type ClassSession } from '@/hooks/use-schedule';
import { inputStyles, subtleButtonStyles } from '@/styles/theme';
import { PDFUploader } from './pdf-uploader';

type ScheduleEditorProps = {
  onClose: () => void;
};

export function ScheduleEditor({ onClose }: ScheduleEditorProps) {
  const { t } = useLanguage();
  const { classes, addClass, updateClass, deleteClass } = useSchedule();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showPDFUploader, setShowPDFUploader] = useState(false);
  const [formData, setFormData] = useState({
    time: '',
    subject: '',
    room: '',
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formData.time || !formData.subject) return;

    if (editingId) {
      updateClass(editingId, formData);
      setEditingId(null);
    } else {
      addClass(formData);
    }

    setFormData({ time: '', subject: '', room: '' });
  }

  function startEdit(cls: ClassSession) {
    setEditingId(cls.id);
    setFormData({
      time: cls.time,
      subject: cls.subject,
      room: cls.room,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setFormData({ time: '', subject: '', room: '' });
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
        <div className="grid grid-cols-3 gap-3">
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
              value={formData.subject}
              onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
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
        </div>
        <div className="flex gap-2">
          <button type="submit" className={`${subtleButtonStyles} flex-1`}>
            {editingId ? t('schedule.update') : t('schedule.add')}
          </button>
          {editingId && (
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

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{t('schedule.classes')}</h4>
        <ul className="space-y-2">
          {classes.map((cls) => (
            <li
              key={cls.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="flex-1">
                <p className="font-semibold text-slate-900 dark:text-white">{cls.subject}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {cls.time} • {cls.room || t('schedule.noRoom')}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(cls)}
                  className="text-xs font-semibold text-indigo-600 underline decoration-dotted hover:text-indigo-700 dark:text-indigo-400"
                >
                  {t('schedule.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => deleteClass(cls.id)}
                  className="text-xs font-semibold text-rose-500 underline decoration-dotted hover:text-rose-700"
                >
                  {t('schedule.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

