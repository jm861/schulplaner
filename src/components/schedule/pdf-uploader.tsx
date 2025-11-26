'use client';

import { useState, useRef } from 'react';
import { useSchedule, getSubjectColor } from '@/hooks/use-schedule';
import { subtleButtonStyles } from '@/styles/theme';

type ParsedClass = {
  time: string;
  subject: string;
  room: string;
  day?: string; // Optional: day of week (Montag, Dienstag, etc.)
  durationMinutes?: number; // Optional duration
};

type PDFUploaderProps = {
  onClose?: () => void;
};

export function PDFUploader({ onClose }: PDFUploaderProps) {
  const { addClassToDay, ensureDayForDate } = useSchedule();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedClasses, setParsedClasses] = useState<ParsedClass[] | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [targetDate, setTargetDate] = useState(formatDateInput(new Date()));
  const [urlInput, setUrlInput] = useState('');
  const [useUrl, setUseUrl] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Bitte wähle eine PDF-Datei aus.');
      return;
    }

    await parseSchedule(file, null);
  }

  async function handleUrlSubmit() {
    if (!urlInput.trim()) {
      setError('Bitte gib eine URL ein.');
      return;
    }

    try {
      new URL(urlInput.trim());
    } catch {
      setError('Bitte gib eine gültige URL ein.');
      return;
    }

    // First test the parser to see structure
    try {
      const testResponse = await fetch('/api/test-schedule-parser', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const testData = await testResponse.json();
      console.log('[PDFUploader] Test parser result:', testData);
    } catch (testError) {
      console.error('[PDFUploader] Test parser error:', testError);
    }

    await parseSchedule(null, urlInput.trim());
  }

  async function parseSchedule(file: File | null, url: string | null) {
    setIsUploading(true);
    setError(null);
    setParsedClasses(null);
    setPreviewText(null);

    try {
      let response: Response;

      if (url) {
        // Parse from URL
        response = await fetch('/api/parse-schedule-pdf', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
        });
      } else if (file) {
        // Parse from file
        const formData = new FormData();
        formData.append('file', file);
        response = await fetch('/api/parse-schedule-pdf', {
          method: 'POST',
          body: formData,
        });
      } else {
        throw new Error('Keine Datei oder URL angegeben');
      }

      const data = await response.json();

      if (!response.ok) {
        // Show more detailed error message
        const errorMsg = data.error || 'Fehler beim Parsen';
        const details = data.details ? `\n\nDetails: ${data.details}` : '';
        const hint = data.hint ? `\n\n${data.hint}` : '';
        const debug = data.debug ? `\n\nDebug: ${JSON.stringify(data.debug, null, 2)}` : '';
        throw new Error(errorMsg + details + hint + debug);
      }

      console.log('[PDFUploader] Response data:', data);
      console.log('[PDFUploader] Classes found:', data.classes?.length || 0);
      console.log('[PDFUploader] Source:', data.source);

      setParsedClasses(data.classes || []);
      if (data.rawText) {
        setPreviewText(data.rawText);
      }

      if (!data.classes || data.classes.length === 0) {
        const debugInfo = data.debug ? `\n\nDebug-Info: ${JSON.stringify(data.debug, null, 2)}` : '';
        setError(`Keine Stundenplan-Daten gefunden. Bitte überprüfe das Format.${debugInfo}\n\nGefundene Quelle: ${data.source || 'unbekannt'}`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Verarbeiten');
    } finally {
      setIsUploading(false);
    }
  }

  function handleImport() {
    if (!parsedClasses || parsedClasses.length === 0) return;
    
    // Map German day names to day numbers (Monday = 1, Sunday = 0)
    const dayNameMap: Record<string, number> = {
      'Montag': 1,
      'Dienstag': 2,
      'Mittwoch': 3,
      'Donnerstag': 4,
      'Freitag': 5,
      'Samstag': 6,
      'Sonntag': 0,
    };

    // Get the start of the week for the target date
    const targetDateObj = new Date(targetDate);
    const dayOfWeek = targetDateObj.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Get to Monday
    const weekStart = new Date(targetDateObj);
    weekStart.setDate(targetDateObj.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    parsedClasses.forEach((cls) => {
      let classDate: Date;
      
      if (cls.day && dayNameMap[cls.day] !== undefined) {
        // Use the day from the parsed class
        const dayOffset = dayNameMap[cls.day] - 1; // Convert to 0-based (Monday = 0)
        classDate = new Date(weekStart);
        classDate.setDate(weekStart.getDate() + dayOffset);
      } else {
        // Fallback: use target date
        classDate = new Date(targetDate);
      }

      const dayData = ensureDayForDate(formatDateInput(classDate));
      addClassToDay(dayData.id, {
        time: cls.time,
        title: cls.subject,
        room: cls.room || '',
        subjectColor: getSubjectColor(cls.subject),
        durationMinutes: cls.durationMinutes || 45, // Use parsed duration or default to 45
      });
    });

    // Reset and close
    setParsedClasses(null);
    setPreviewText(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setUrlInput('');
    if (onClose) {
      onClose();
    }
  }

  function handleCancel() {
    setParsedClasses(null);
    setPreviewText(null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    if (onClose) {
      onClose();
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
          Stundenplan importieren
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-2">
          Lade deinen Stundenplan als PDF hoch oder gib einen Link ein. Die App versucht automatisch, Fächer, Zeiten und Räume zu erkennen.
        </p>
        <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-300">
          Datum für importierte Klassen
          <input
            type="date"
            value={targetDate}
            onChange={(e) => setTargetDate(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white dark:focus:border-indigo-300 dark:focus:ring-indigo-900/40"
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setUseUrl(false)}
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              !useUrl
                ? 'bg-indigo-600 text-white'
                : 'border border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300'
            }`}
          >
            PDF hochladen
          </button>
          <button
            type="button"
            onClick={() => setUseUrl(true)}
            className={`flex-1 rounded-xl px-3 py-2 text-xs font-semibold transition ${
              useUrl
                ? 'bg-indigo-600 text-white'
                : 'border border-slate-300 text-slate-600 dark:border-slate-600 dark:text-slate-300'
            }`}
          >
            Link verwenden
          </button>
        </div>

        {useUrl ? (
          <div className="space-y-2">
            <input
              type="url"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com/stundenplan.pdf"
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:border-slate-700 dark:bg-slate-900/60 dark:text-white dark:focus:border-indigo-300 dark:focus:ring-indigo-900/40"
            />
            <button
              type="button"
              onClick={handleUrlSubmit}
              disabled={isUploading || !urlInput.trim()}
              className={`${subtleButtonStyles} w-full ${
                isUploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isUploading ? 'Wird verarbeitet...' : 'Von URL laden'}
            </button>
          </div>
        ) : (
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
              id="pdf-upload"
            />
            <label
              htmlFor="pdf-upload"
              className={`${subtleButtonStyles} block text-center cursor-pointer ${
                isUploading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isUploading ? 'PDF wird verarbeitet...' : 'PDF auswählen'}
            </label>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-400 bg-rose-50/50 p-3 text-sm text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-100">
          {error}
        </div>
      )}

      {previewText && (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300 max-h-32 overflow-y-auto">
          <p className="font-semibold mb-1">PDF-Vorschau (erste 500 Zeichen):</p>
          <pre className="whitespace-pre-wrap font-mono">{previewText}</pre>
        </div>
      )}

      {parsedClasses && parsedClasses.length > 0 && (
        <div className="space-y-3">
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-3 text-sm text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-100">
            <p className="font-semibold">
              {parsedClasses.length} {parsedClasses.length === 1 ? 'Klasse gefunden' : 'Klassen gefunden'}
            </p>
          </div>

          <div className="max-h-64 overflow-y-auto space-y-2">
            {parsedClasses.map((cls, index) => (
              <div
                key={index}
                className="rounded-xl border border-slate-200 bg-white/70 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-900/60"
              >
                <p className="font-semibold text-slate-900 dark:text-white">{cls.subject}</p>
                <p className="text-slate-500 dark:text-slate-400">
                  {cls.time} {cls.room ? `• ${cls.room}` : ''}
                </p>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleImport}
              className={`${subtleButtonStyles} flex-1 bg-emerald-600 text-white hover:bg-emerald-700 dark:bg-emerald-700 dark:hover:bg-emerald-600`}
            >
              Importieren
            </button>
            <button
              onClick={handleCancel}
              className={`${subtleButtonStyles} flex-1`}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDateInput(date: Date) {
  return date.toISOString().split('T')[0];
}

