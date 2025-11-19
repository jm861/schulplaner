'use client';

import { useState, useRef } from 'react';
import { useLanguage } from '@/contexts/language-context';
import { useSchedule } from '@/hooks/use-schedule';
import { subtleButtonStyles } from '@/styles/theme';

type ParsedClass = {
  time: string;
  subject: string;
  room: string;
};

type PDFUploaderProps = {
  onClose?: () => void;
};

export function PDFUploader({ onClose }: PDFUploaderProps) {
  const { t } = useLanguage();
  const { addClass } = useSchedule();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedClasses, setParsedClasses] = useState<ParsedClass[] | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      setError('Bitte wähle eine PDF-Datei aus.');
      return;
    }

    setIsUploading(true);
    setError(null);
    setParsedClasses(null);
    setPreviewText(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/parse-schedule-pdf', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Fehler beim Parsen der PDF');
      }

      setParsedClasses(data.classes || []);
      if (data.rawText) {
        setPreviewText(data.rawText);
      }

      if (data.classes.length === 0) {
        setError('Keine Stundenplan-Daten in der PDF gefunden. Bitte überprüfe das Format.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Hochladen der PDF');
    } finally {
      setIsUploading(false);
    }
  }

  function handleImport() {
    if (!parsedClasses || parsedClasses.length === 0) return;

    // Add all parsed classes to schedule
    parsedClasses.forEach((cls) => {
      addClass({
        time: cls.time,
        subject: cls.subject,
        room: cls.room || '',
      });
    });

    // Reset and close
    setParsedClasses(null);
    setPreviewText(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
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
          Stundenplan aus PDF importieren
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Lade deinen Stundenplan als PDF hoch. Die App versucht automatisch, Fächer, Zeiten und Räume zu erkennen.
        </p>
      </div>

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

