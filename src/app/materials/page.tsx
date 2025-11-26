'use client';

import { useEffect, useState } from 'react';

import { SectionCard } from '@/components/ui/section-card';
import { useAuth } from '@/contexts/auth-context';
import { useLanguage } from '@/contexts/language-context';
import { MaterialRecord } from '@/types/materials';
import { subtleButtonStyles } from '@/styles/theme';
import { PlannerShell, PlannerNav } from '@/components/layout/planner-shell';
import { buildPlannerNavItems } from '@/lib/planner-nav';

type SummaryState = {
  loading: boolean;
  text?: string;
  error?: string | null;
};

const MAX_SNIPPET = 300; // Reduced for mobile
const MOBILE_MAX_SNIPPET = 150;

export default function MaterialsPage() {
  const { user, isAdmin, isOperator } = useAuth();
  const { t } = useLanguage();
  const [materials, setMaterials] = useState<MaterialRecord[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [summaries, setSummaries] = useState<Record<string, SummaryState>>({});
  const [isLoadingList, setIsLoadingList] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [expandedMaterials, setExpandedMaterials] = useState<Set<string>>(new Set());

  const fetchMaterials = async () => {
    if (!user) return;
    try {
      setIsLoadingList(true);
      const res = await fetch(`/api/materials?userId=${encodeURIComponent(user.id)}`);
      if (!res.ok) {
        throw new Error('Materialien konnten nicht geladen werden.');
      }
      const data = (await res.json()) as { materials: MaterialRecord[] };
      setMaterials(data.materials ?? []);
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoadingList(false);
    }
  };

  useEffect(() => {
    fetchMaterials();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    setUploadSuccess(false);
    const file = event.target.files?.[0];
    setSelectedFile(file ?? null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    setUploadError(null);
    setUploadSuccess(false);
    const file = e.dataTransfer.files?.[0];
    if (file && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
      setSelectedFile(file);
    } else {
      setUploadError('Bitte wähle eine PDF- oder Bilddatei aus.');
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleUpload = async () => {
    if (isUploading) return; // Prevent multiple simultaneous requests
    
    if (!selectedFile || !user) {
      setUploadError('Bitte wähle eine Datei aus.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadError(null);
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('userId', user.id);
      if (user.email) {
        formData.append('userEmail', user.email);
      }
      if (customTitle.trim()) {
        formData.append('title', customTitle.trim());
      }

      const res = await fetch('/api/materials', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || (data as any).ok === false) {
        const errorData = data as { ok?: boolean; status?: number; raw?: string; error?: string };
        const status = errorData.status || res.status;
        const raw = errorData.raw || '';
        
        let errorMsg = 'Upload fehlgeschlagen.';
        if (status === 429) {
          errorMsg = 'Rate limit exceeded. Bitte warte kurz.';
        } else if (status === 401) {
          errorMsg = 'OpenAI API Key ungültig oder falsch konfiguriert.';
        } else if (status === 500) {
          errorMsg = 'Interner Serverfehler beim Upload/OCR.';
        } else if (errorData.error) {
          errorMsg = errorData.error;
        } else {
          try {
            const rawParsed = JSON.parse(raw);
            errorMsg = `Fehler: ${rawParsed.message || raw}`;
          } catch {
            errorMsg = `Upload fehlgeschlagen: ${raw || status}`;
          }
        }
        
        setUploadError(errorMsg);
        setUploadSuccess(false);
        return;
      }

      setMaterials((prev) => [(data as { material: MaterialRecord }).material, ...prev]);
      setSelectedFile(null);
      setCustomTitle('');
      setUploadError(null);
      setUploadSuccess(true);
      // Clear success message after 3 seconds
      setTimeout(() => setUploadSuccess(false), 3000);
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Upload fehlgeschlagen.');
      setUploadSuccess(false);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateSummary = async (material: MaterialRecord) => {
    if (!material?.text) return;
    
    // Prevent multiple simultaneous requests for same material
    const currentState = summaries[material.id];
    if (currentState?.loading) return;
    
    setSummaries((prev) => ({
      ...prev,
      [material.id]: { loading: true },
    }));

    try {
      // Send more context to AI for better understanding
      const contextInfo = [
        material.title ? `Titel: ${material.title}` : '',
        material.meta?.pageCount ? `Seiten: ${material.meta.pageCount}` : '',
        material.sourceType === 'pdf' ? 'Typ: PDF-Dokument' : 'Typ: Foto/Scan',
      ].filter(Boolean).join(', ');

      const res = await fetch('/api/ai-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: `[Kontext: ${contextInfo}]\n\n${material.text.slice(0, 20000)}`,
          tone: 'concise',
        }),
      });

      const data = await res.json();

      if (!res.ok || (data as any).ok === false) {
        const errorData = data as { ok?: boolean; status?: number; raw?: string };
        const status = errorData.status || res.status;
        const raw = errorData.raw || '';
        
        let errorMsg = 'Unbekannter Fehler';
        if (status === 429) {
          errorMsg = 'Rate limit exceeded. Bitte warte kurz.';
        } else if (status === 401) {
          errorMsg = 'OpenAI API Key ungültig oder falsch konfiguriert.';
        } else if (status === 500) {
          errorMsg = 'Interner Serverfehler beim Zusammenfassen.';
        } else {
          try {
            const rawParsed = JSON.parse(raw);
            errorMsg = `Fehler: ${rawParsed.message || raw}`;
          } catch {
            errorMsg = `Unbekannter Fehler: ${raw || status}`;
          }
        }
        
        setSummaries((prev) => ({
          ...prev,
          [material.id]: { loading: false, error: errorMsg },
        }));
        return;
      }

      setSummaries((prev) => ({
        ...prev,
        [material.id]: { loading: false, text: (data as { summary?: string }).summary ?? 'Keine Zusammenfassung verfügbar.' },
      }));
    } catch (error) {
      setSummaries((prev) => ({
        ...prev,
        [material.id]: { loading: false, error: error instanceof Error ? error.message : 'Fehler' },
      }));
    }
  };

  const toggleExpand = (materialId: string) => {
    setExpandedMaterials((prev) => {
      const next = new Set(prev);
      if (next.has(materialId)) {
        next.delete(materialId);
      } else {
        next.add(materialId);
      }
      return next;
    });
  };

  const snippet = (text: string, materialId: string) => {
    const isExpanded = expandedMaterials.has(materialId);
    const isMobile = typeof window !== 'undefined' && window.innerWidth < 640;
    const maxLength = isMobile ? MOBILE_MAX_SNIPPET : MAX_SNIPPET;
    
    if (isExpanded || text.length <= maxLength) return text;
    
    // Try to find a good breaking point (sentence end, paragraph, etc.)
    const truncated = text.slice(0, maxLength);
    const lastPeriod = truncated.lastIndexOf('.');
    const lastNewline = truncated.lastIndexOf('\n');
    const breakPoint = Math.max(lastPeriod, lastNewline);
    
    if (breakPoint > maxLength * 0.7) {
      return text.slice(0, breakPoint + 1) + '…';
    }
    return truncated + '…';
  };

  const navItems = buildPlannerNavItems(t, { isAdmin, isOperator });

  return (
    <PlannerShell
      sidebar={
        <>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Materials</p>
            <h2 className="text-2xl sm:text-3xl font-semibold text-gray-900 dark:text-white">{t('materials.title')}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">{t('materials.description')}</p>
          </div>
          <PlannerNav items={navItems} label={t('planner.navigation')} />
          <div className="mt-8 space-y-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
            <p className="text-xs uppercase tracking-[0.3em] text-gray-500 dark:text-gray-400">Gespeichert</p>
            <p className="text-3xl font-semibold text-gray-900 dark:text-white">{materials.length}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{t('materials.materialsStored')}</p>
          </div>
        </>
      }
    >
      <div className="space-y-6">
        <SectionCard title={t('materials.uploadTitle')}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-2 text-sm">
            <label className="font-semibold text-slate-700 dark:text-slate-300">{t('materials.customTitle')}</label>
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none transition-colors focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-slate-700 dark:bg-slate-900/40 dark:text-white dark:focus:border-blue-500"
              placeholder={t('materials.titlePlaceholder')}
            />
          </div>

          <div className="flex flex-col gap-2 text-sm">
            <label className="font-semibold text-slate-700 dark:text-slate-300">{t('materials.fileLabel')}</label>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={`rounded-2xl border-2 border-dashed transition-all ${
                isDragging
                  ? 'border-blue-400 bg-blue-50/50 dark:border-blue-500 dark:bg-blue-950/30'
                  : 'border-slate-300 bg-slate-50/70 dark:border-slate-700 dark:bg-slate-900/40'
              }`}
            >
              <input
                type="file"
                accept="application/pdf,image/*"
                capture="environment"
                onChange={handleFileChange}
                className="w-full cursor-pointer px-4 py-6 text-xs text-slate-500 file:mr-4 file:rounded-xl file:border-0 file:bg-indigo-50 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-indigo-700 hover:file:bg-indigo-100 dark:text-slate-300 dark:file:bg-indigo-950/50 dark:file:text-indigo-300"
                id="file-upload"
              />
              {!selectedFile && (
                <p className="px-4 pb-4 text-center text-xs text-slate-400 dark:text-slate-500">
                  Datei hier ablegen oder klicken zum Auswählen
                </p>
              )}
            </div>
            {selectedFile ? (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 dark:border-slate-700 dark:bg-slate-900/40">
                <span className="text-xl">
                  {selectedFile.type === 'application/pdf' ? '📄' : '🖼️'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-slate-900 dark:text-white truncate">{selectedFile.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFile(null);
                    setUploadError(null);
                    setUploadSuccess(false);
                  }}
                  className="flex-shrink-0 rounded-lg px-2.5 py-1.5 text-sm font-semibold text-slate-500 hover:bg-slate-200 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                  aria-label="Datei entfernen"
                >
                  ✕
                </button>
              </div>
            ) : null}
          </div>

          <div className="flex flex-col gap-2">
            <button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || isUploading || !user}
              className={`${subtleButtonStyles} relative w-full px-6 py-3 disabled:cursor-not-allowed disabled:opacity-60 transition-all`}
            >
              {isUploading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                  {t('materials.uploading')}
                </span>
              ) : (
                t('materials.uploadCta')
              )}
            </button>
            {uploadSuccess && (
              <div className="flex items-center gap-2 rounded-xl border border-green-400 bg-green-50/50 px-3 py-2.5 text-xs text-green-900 dark:border-green-900 dark:bg-green-950/50 dark:text-green-100">
                <span className="text-base">✓</span>
                <span>Material erfolgreich hochgeladen und Text extrahiert!</span>
              </div>
            )}
            {uploadError && (
              <div className="flex items-center gap-2 rounded-xl border border-rose-400 bg-rose-50/50 px-3 py-2.5 text-xs text-rose-900 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-100">
                <span className="text-base">✕</span>
                <span className="break-words">{uploadError}</span>
              </div>
            )}
            {!user && (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('materials.loginInfo')}
              </p>
            )}
          </div>
        </div>
      </SectionCard>

      <SectionCard title={t('materials.listTitle')}>
        {isLoadingList ? (
          <p className="text-sm text-slate-500">{t('common.loading')}</p>
        ) : materials.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t('materials.emptyState')}
          </p>
        ) : (
          <ul className="space-y-4">
            {materials.map((material) => {
              const summary = summaries[material.id];
              const isExpanded = expandedMaterials.has(material.id);
              const needsExpansion = material.text.length > (typeof window !== 'undefined' && window.innerWidth < 640 ? MOBILE_MAX_SNIPPET : MAX_SNIPPET);
              return (
                <li
                  key={material.id}
                  className="rounded-2xl border border-slate-200 bg-white/80 p-4 text-sm dark:border-slate-700 dark:bg-slate-900/40"
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <span>{material.sourceType === 'pdf' ? '📄' : '🖼️'}</span>
                        <span>{material.sourceType === 'pdf' ? 'PDF' : 'Foto'}</span>
                      </span>
                      <span>
                        {new Date(material.createdAt).toLocaleDateString('de-DE', {
                          day: '2-digit',
                          month: '2-digit',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white break-words">{material.title}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {material.meta?.charCount
                        ? `${material.meta.charCount.toLocaleString()} Zeichen`
                        : material.text.length.toLocaleString()}
                      {material.meta?.pageCount ? ` • ${material.meta.pageCount} Seiten` : null}
                    </p>
                    <div className="mt-2">
                      <p className="text-sm text-slate-700 dark:text-slate-200 whitespace-pre-line break-words leading-relaxed">
                        {snippet(material.text, material.id)}
                      </p>
                      {needsExpansion && (
                        <button
                          type="button"
                          onClick={() => toggleExpand(material.id)}
                          className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          {isExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        if (typeof navigator !== 'undefined' && navigator.clipboard) {
                          navigator.clipboard.writeText(material.text);
                          // Visual feedback
                          const btn = e.currentTarget;
                          const originalText = btn.textContent;
                          btn.textContent = '✓ Kopiert!';
                          setTimeout(() => {
                            btn.textContent = originalText;
                          }, 2000);
                        }
                      }}
                      className={`${subtleButtonStyles} text-xs flex-1 sm:flex-none`}
                    >
                      {t('materials.copy')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateSummary(material)}
                      disabled={summary?.loading}
                      className={`${subtleButtonStyles} text-xs flex-1 sm:flex-none disabled:cursor-not-allowed disabled:opacity-60`}
                    >
                      {summary?.loading ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent"></span>
                          {t('materials.summarizing')}
                        </span>
                      ) : (
                        t('materials.summarize')
                      )}
                    </button>
                  </div>

                  {summary?.text ? (
                    <div className="mt-4 rounded-2xl border border-blue-200 bg-blue-50/50 p-4 text-sm text-slate-700 dark:border-blue-800 dark:bg-blue-950/30 dark:text-slate-200">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">✨</span>
                        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-blue-600 dark:text-blue-400">
                          {t('materials.summaryLabel')}
                        </p>
                      </div>
                      <p className="mt-2 whitespace-pre-line break-words leading-relaxed">{summary.text}</p>
                    </div>
                  ) : null}
                  {summary?.error ? (
                    <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50/50 px-3 py-2 text-xs text-rose-700 dark:border-rose-800 dark:bg-rose-950/30 dark:text-rose-300">
                      {summary.error}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </SectionCard>
      </div>
    </PlannerShell>
  );
}


