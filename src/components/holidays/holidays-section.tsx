'use client';

import { FormEvent, useState } from 'react';
import { useHolidays } from '@/hooks/use-holidays';
import { useLanguage } from '@/contexts/language-context';
import { inputStyles, selectStyles, primaryButtonStyles, subtleButtonStyles } from '@/styles/theme';
import { SectionCard } from '@/components/ui/section-card';
import { Holiday } from '@/types/holidays';

export function HolidaysSection() {
  const { t } = useLanguage();
  const { holidays, addHoliday, updateHoliday, deleteHoliday, states } = useHolidays();
  const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    startDate: '',
    endDate: '',
    state: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [fetchState, setFetchState] = useState({
    selectedState: '',
    selectedYear: new Date().getFullYear(),
    isFetching: false,
    error: null as string | null,
    success: false,
  });

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formData.name.trim() || !formData.startDate || !formData.endDate || !formData.state) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingHoliday) {
        updateHoliday(editingHoliday.id, formData.name, formData.startDate, formData.endDate, formData.state);
        setEditingHoliday(null);
      } else {
        addHoliday(formData.name, formData.startDate, formData.endDate, formData.state);
      }
      setFormData({
        name: '',
        startDate: '',
        endDate: '',
        state: '',
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleEdit(holiday: Holiday) {
    setEditingHoliday(holiday);
    setFormData({
      name: holiday.name,
      startDate: holiday.startDate,
      endDate: holiday.endDate,
      state: holiday.state,
    });
  }

  function handleCancel() {
    setEditingHoliday(null);
    setFormData({
      name: '',
      startDate: '',
      endDate: '',
      state: '',
    });
  }

  async function handleFetchHolidays() {
    if (!fetchState.selectedState) {
      setFetchState((prev) => ({ ...prev, error: 'Bitte wähle ein Bundesland aus' }));
      return;
    }

    setFetchState((prev) => ({ ...prev, isFetching: true, error: null, success: false }));

    try {
      const response = await fetch('/api/fetch-holidays', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          state: fetchState.selectedState,
          year: fetchState.selectedYear,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || data.details || 'Fehler beim Abrufen der Ferien');
      }

      const data = await response.json();
      
      if (data.holidays && Array.isArray(data.holidays)) {
        // Füge alle Ferien hinzu (Duplikate werden durch den Hook verhindert, falls nötig)
        let addedCount = 0;
        for (const holiday of data.holidays) {
          // Prüfe, ob diese Ferien bereits existieren (gleicher Name, Start- und Enddatum)
          const exists = holidays.some(
            (h) =>
              h.name === holiday.name &&
              h.startDate === holiday.startDate &&
              h.endDate === holiday.endDate &&
              h.state === holiday.state
          );
          
          if (!exists) {
            addHoliday(holiday.name, holiday.startDate, holiday.endDate, holiday.state);
            addedCount++;
          }
        }

        setFetchState((prev) => ({
          ...prev,
          isFetching: false,
          success: true,
          error: addedCount === 0 ? 'Alle Ferien sind bereits vorhanden' : null,
        }));

        // Erfolgsmeldung nach 3 Sekunden ausblenden
        setTimeout(() => {
          setFetchState((prev) => ({ ...prev, success: false }));
        }, 3000);
      } else {
        throw new Error('Ungültiges Datenformat erhalten');
      }
    } catch (error) {
      console.error('Error fetching holidays:', error);
      setFetchState((prev) => ({
        ...prev,
        isFetching: false,
        error: error instanceof Error ? error.message : 'Unbekannter Fehler',
      }));
    }
  }

  return (
    <SectionCard title={t('settings.holidays')}>
      <div className="space-y-4 text-sm">
        <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.holidaysDescription')}</p>

        {/* Automatisches Laden der Ferien */}
        <div className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
          <h4 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
            {t('settings.fetchHolidays')}
          </h4>
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row">
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                  {t('settings.holidayState')}
                </span>
                <select
                  value={fetchState.selectedState}
                  onChange={(e) =>
                    setFetchState((prev) => ({ ...prev, selectedState: e.target.value, error: null }))
                  }
                  className={selectStyles}
                >
                  <option value="">{t('settings.selectState')}</option>
                  {states.map((state) => (
                    <option key={state.code} value={state.code}>
                      {state.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-1 flex-col gap-1.5">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-200">
                  {t('settings.holidayYear')}
                </span>
                <select
                  value={fetchState.selectedYear}
                  onChange={(e) =>
                    setFetchState((prev) => ({
                      ...prev,
                      selectedYear: parseInt(e.target.value, 10),
                      error: null,
                    }))
                  }
                  className={selectStyles}
                >
                  {Array.from({ length: 5 }, (_, i) => {
                    const year = new Date().getFullYear() - 1 + i;
                    return (
                      <option key={year} value={year}>
                        {year}
                      </option>
                    );
                  })}
                </select>
              </label>
            </div>
            <button
              onClick={handleFetchHolidays}
              disabled={fetchState.isFetching || !fetchState.selectedState}
              className={`${primaryButtonStyles} w-full disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {fetchState.isFetching ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  {t('settings.fetchingHolidays')}
                </span>
              ) : (
                t('settings.fetchHolidaysButton')
              )}
            </button>
            {fetchState.error && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300">
                {fetchState.error}
              </div>
            )}
            {fetchState.success && !fetchState.error && (
              <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-xs text-green-700 dark:border-green-800 dark:bg-green-950/40 dark:text-green-300">
                {t('settings.holidaysFetchedSuccess')}
              </div>
            )}
          </div>
        </div>

        {/* Formular zum Hinzufügen/Bearbeiten */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {editingHoliday && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-800 dark:bg-blue-950/30">
              <h4 className="mb-3 font-semibold text-gray-900 dark:text-white">{t('settings.editHoliday')}</h4>
            </div>
          )}

          {/* Ferienname */}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('settings.holidayName')}</span>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder={t('settings.holidayName')}
              className={inputStyles}
              required
            />
          </label>

          {/* Start- und Enddatum – auf Handy untereinander, auf größeren Screens nebeneinander */}
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('settings.holidayStartDate')}</span>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, startDate: e.target.value }))}
                className={inputStyles}
                required
              />
            </label>
            <label className="flex flex-1 flex-col gap-1.5">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('settings.holidayEndDate')}</span>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData((prev) => ({ ...prev, endDate: e.target.value }))}
                className={inputStyles}
                required
              />
            </label>
          </div>

          {/* Bundesland-Select */}
          <label className="flex flex-col gap-1.5">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">{t('settings.holidayState')}</span>
            <select
              value={formData.state}
              onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
              className={selectStyles}
              required
            >
              <option value="">{t('settings.selectState')}</option>
              {states.map((state) => (
                <option key={state.code} value={state.code}>
                  {state.name}
                </option>
              ))}
            </select>
          </label>

          {/* Submit/Cancel Buttons */}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {editingHoliday && (
              <button
                type="button"
                onClick={handleCancel}
                className={`${subtleButtonStyles} w-full sm:w-auto`}
              >
                {t('common.cancel')}
              </button>
            )}
            <button
              type="submit"
              disabled={isSubmitting || !formData.name.trim() || !formData.startDate || !formData.endDate || !formData.state}
              className={`${primaryButtonStyles} w-full sm:w-auto disabled:cursor-not-allowed disabled:opacity-50`}
            >
              {editingHoliday ? t('common.save') : t('common.add')}
            </button>
          </div>
        </form>

        {/* Liste der vorhandenen Ferien */}
        {holidays.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">{t('settings.noHolidays')}</p>
        ) : (
          <ul className="space-y-2">
            {holidays.map((holiday) => {
              const stateName = states.find((s) => s.code === holiday.state)?.name || holiday.state;
              return (
                <li
                  key={holiday.id}
                  className="flex items-center justify-between rounded-xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 dark:text-white truncate">{holiday.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {new Date(holiday.startDate).toLocaleDateString('de-DE')} –{' '}
                      {new Date(holiday.endDate).toLocaleDateString('de-DE')} • {stateName}
                    </p>
                  </div>
                  <div className="flex gap-2 flex-shrink-0">
                    <button
                      onClick={() => handleEdit(holiday)}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/50 transition-colors"
                    >
                      {t('common.edit')}
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Möchtest du ${holiday.name} wirklich löschen?`)) {
                          deleteHoliday(holiday.id);
                          if (editingHoliday?.id === holiday.id) {
                            handleCancel();
                          }
                        }
                      }}
                      className="rounded-lg px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50 transition-colors"
                    >
                      {t('common.delete')}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </SectionCard>
  );
}

