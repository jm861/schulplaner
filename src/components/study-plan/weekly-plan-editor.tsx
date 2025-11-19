'use client';

import { FormEvent, useState } from 'react';

import { useLanguage } from '@/contexts/language-context';
import { useWeeklyPlan, type WeeklyPlanSlot } from '@/hooks/use-weekly-plan';
import { inputStyles, subtleButtonStyles } from '@/styles/theme';

type WeeklyPlanEditorProps = {
  onClose: () => void;
};

export function WeeklyPlanEditor({ onClose }: WeeklyPlanEditorProps) {
  const { t } = useLanguage();
  const { slots, updateSlot, addSlot, deleteSlot } = useWeeklyPlan();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    day: '',
    focus: '',
    duration: '',
    aiNote: '',
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formData.day || !formData.focus) return;

    if (editingId) {
      updateSlot(editingId, formData);
      setEditingId(null);
    } else {
      addSlot(formData);
    }

    setFormData({ day: '', focus: '', duration: '', aiNote: '' });
  }

  function startEdit(slot: WeeklyPlanSlot) {
    setEditingId(slot.id);
    setFormData({
      day: slot.day,
      focus: slot.focus,
      duration: slot.duration,
      aiNote: slot.aiNote,
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setFormData({ day: '', focus: '', duration: '', aiNote: '' });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
          {t('weeklyPlan.editPlan')}
        </h3>
        <button
          type="button"
          onClick={onClose}
          className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{t('weeklyPlan.day')}</span>
            <select
              value={formData.day}
              onChange={(e) => setFormData((prev) => ({ ...prev, day: e.target.value }))}
              className={inputStyles}
              required
            >
              <option value="">{t('weeklyPlan.selectDay')}</option>
              {days.map((day) => (
                <option key={day} value={day}>{day}</option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="font-medium text-slate-700 dark:text-slate-200">{t('weeklyPlan.duration')}</span>
            <input
              value={formData.duration}
              onChange={(e) => setFormData((prev) => ({ ...prev, duration: e.target.value }))}
              className={inputStyles}
              placeholder="90 min"
            />
          </label>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">{t('weeklyPlan.focus')}</span>
          <input
            value={formData.focus}
            onChange={(e) => setFormData((prev) => ({ ...prev, focus: e.target.value }))}
            className={inputStyles}
            placeholder={t('weeklyPlan.focusPlaceholder')}
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-200">{t('weeklyPlan.aiNote')}</span>
          <input
            value={formData.aiNote}
            onChange={(e) => setFormData((prev) => ({ ...prev, aiNote: e.target.value }))}
            className={inputStyles}
            placeholder={t('weeklyPlan.aiNotePlaceholder')}
          />
        </label>
        <div className="flex gap-2">
          <button type="submit" className={`${subtleButtonStyles} flex-1`}>
            {editingId ? t('weeklyPlan.update') : t('weeklyPlan.add')}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className={`${subtleButtonStyles} flex-1`}
            >
              {t('weeklyPlan.cancel')}
            </button>
          )}
        </div>
      </form>

      <div className="space-y-2">
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white">{t('weeklyPlan.slots')}</h4>
        <ul className="space-y-2">
          {slots.map((slot) => (
            <li
              key={slot.id}
              className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white/70 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/60"
            >
              <div className="flex-1">
                <p className="font-semibold text-slate-900 dark:text-white">{slot.day}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {slot.focus} • {slot.duration}
                </p>
                {slot.aiNote && (
                  <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">{slot.aiNote}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => startEdit(slot)}
                  className="text-xs font-semibold text-indigo-600 underline decoration-dotted hover:text-indigo-700 dark:text-indigo-400"
                >
                  {t('weeklyPlan.edit')}
                </button>
                <button
                  type="button"
                  onClick={() => deleteSlot(slot.id)}
                  className="text-xs font-semibold text-rose-500 underline decoration-dotted hover:text-rose-700"
                >
                  {t('weeklyPlan.delete')}
                </button>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

