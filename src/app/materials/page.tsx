/**
 * Materials Page - Apple-like Design
 * Upload and manage materials (PDFs, images) with OCR and AI summaries
 */

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAppStore } from '@/store/app-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ListRow } from '@/components/ui/list-row';
import { EmptyState } from '@/components/ui/empty-state';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { ContextBadge } from '@/components/ui/smart-link';
import { useToastActions } from '@/components/ui/toast';
import { FileText, Plus, Upload, Sparkles, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { generateDeepLink } from '@/types/entities';
import { useAuth } from '@/contexts/auth-context';
import { MaterialRecord } from '@/types/materials';

const MAX_SNIPPET = 300;

export default function MaterialsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { materials, subjects, addMaterial } = useAppStore();
  const toast = useToastActions();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [customTitle, setCustomTitle] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<Record<string, { loading: boolean; text?: string; error?: string }>>({});
  const [expandedMaterials, setExpandedMaterials] = useState<Set<string>>(new Set());
  const [serverMaterials, setServerMaterials] = useState<MaterialRecord[]>([]);

  // Fetch materials from server
  useEffect(() => {
    if (!user) return;
    fetchMaterials();
  }, [user?.id]);

  const fetchMaterials = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/materials?userId=${encodeURIComponent(user.id)}`);
      if (res.ok) {
        const data = (await res.json()) as { materials: MaterialRecord[] };
        setServerMaterials(data.materials ?? []);
      }
    } catch (error) {
      console.error('Failed to fetch materials:', error);
    }
  };

  // Combine store materials with server materials
  const allMaterials = useMemo(() => {
    const combined = [...materials];
    serverMaterials.forEach((sm) => {
      if (!combined.find((m) => m.id === sm.id)) {
        combined.push({
          id: sm.id,
          title: sm.title,
          type: sm.sourceType === 'pdf' ? 'pdf' : 'image',
          content: sm.text,
          subjectId: undefined,
          subjectName: undefined,
          createdAt: sm.createdAt,
          updatedAt: sm.createdAt,
        });
      }
    });
    return combined.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [materials, serverMaterials]);

  const handleFileSelect = (file: File | null) => {
    setSelectedFile(file);
    setUploadError(null);
    if (file && !customTitle.trim()) {
      setCustomTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleUpload = async () => {
    if (isUploading || !selectedFile || !user) return;

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
        const errorData = data as { ok?: boolean; status?: number; error?: string };
        const status = errorData.status || res.status;

        let errorMsg = 'Upload fehlgeschlagen.';
        if (status === 429) {
          errorMsg = 'Rate limit exceeded. Bitte warte kurz.';
        } else if (status === 401) {
          errorMsg = 'OpenAI API Key ungültig oder falsch konfiguriert.';
        } else if (status === 500) {
          errorMsg = 'Interner Serverfehler beim Upload/OCR.';
        } else if (errorData.error) {
          errorMsg = errorData.error;
        }

        setUploadError(errorMsg);
        toast.error('Upload fehlgeschlagen', errorMsg);
        return;
      }

      const material = (data as { material: MaterialRecord }).material;
      
      // Add to store
      addMaterial({
        title: material.title,
        type: material.sourceType === 'pdf' ? 'pdf' : 'image',
        content: material.text,
      });

      toast.success('Material hochgeladen', material.title);
      setSelectedFile(null);
      setCustomTitle('');
      setIsUploadOpen(false);
      fetchMaterials();
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Upload fehlgeschlagen.';
      setUploadError(errorMsg);
      toast.error('Upload fehlgeschlagen', errorMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleGenerateSummary = async (materialId: string) => {
    const material = allMaterials.find((m) => m.id === materialId);
    if (!material?.content) return;

    const currentState = summaries[materialId];
    if (currentState?.loading) return;

    setSummaries((prev) => ({
      ...prev,
      [materialId]: { loading: true },
    }));

    try {
      const res = await fetch('/api/ai-summarize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: material.content.slice(0, 20000),
          tone: 'concise',
        }),
      });

      const data = await res.json();

      if (!res.ok || (data as any).ok === false) {
        const errorData = data as { ok?: boolean; status?: number; error?: string };
        let errorMsg = 'Unbekannter Fehler';
        if (errorData.status === 429) {
          errorMsg = 'Rate limit exceeded. Bitte warte kurz.';
        } else if (errorData.status === 401) {
          errorMsg = 'OpenAI API Key ungültig oder falsch konfiguriert.';
        } else if (errorData.error) {
          errorMsg = errorData.error;
        }

        setSummaries((prev) => ({
          ...prev,
          [materialId]: { loading: false, error: errorMsg },
        }));
        return;
      }

      setSummaries((prev) => ({
        ...prev,
        [materialId]: { loading: false, text: (data as { summary?: string }).summary ?? 'Keine Zusammenfassung verfügbar.' },
      }));
      toast.success('Zusammenfassung generiert', 'KI-Zusammenfassung wurde erstellt.');
    } catch (error) {
      setSummaries((prev) => ({
        ...prev,
        [materialId]: { loading: false, error: error instanceof Error ? error.message : 'Fehler' },
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

  const getSnippet = (text: string, materialId: string) => {
    const isExpanded = expandedMaterials.has(materialId);
    if (isExpanded || text.length <= MAX_SNIPPET) return text;
    return text.slice(0, MAX_SNIPPET) + '…';
  };

  return (
    <div className="space-y-6 pb-20 lg:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900 dark:text-white">Materialien</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Lade PDFs und Bilder hoch, OCR extrahiert automatisch den Text
          </p>
        </div>
        <Button onClick={() => setIsUploadOpen(true)}>
          <Plus className="h-4 w-4" />
          Material hochladen
        </Button>
      </div>

      {/* Materials List */}
      <Card>
        <CardHeader>
          <CardTitle>Meine Materialien</CardTitle>
          <CardDescription>
            {allMaterials.length} {allMaterials.length === 1 ? 'Material' : 'Materialien'}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {allMaterials.length > 0 ? (
            <div className="divide-y divide-gray-200 dark:divide-gray-800">
              {allMaterials.map((material) => {
                const summary = summaries[material.id];
                const isExpanded = expandedMaterials.has(material.id);
                const snippet = getSnippet(material.content || '', material.id);

                return (
                  <div key={material.id} className="p-4">
                    <ListRow
                      leading={<FileText className="h-4 w-4 text-gray-400" />}
                      subtitle={
                        <div className="flex items-center gap-2 mt-1">
                          {material.subjectName && (
                            <ContextBadge type="material" label={material.subjectName} />
                          )}
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {material.type === 'pdf' ? 'PDF' : 'Bild'} •{' '}
                            {new Date(material.updatedAt).toLocaleDateString('de-DE', {
                              day: '2-digit',
                              month: '2-digit',
                              year: 'numeric',
                            })}
                          </span>
                        </div>
                      }
                      trailing={
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleGenerateSummary(material.id)}
                            disabled={summary?.loading}
                          >
                            {summary?.loading ? (
                              <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                              </svg>
                            ) : (
                              <Sparkles className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      }
                      interactive
                      onClick={() => {
                        router.push(generateDeepLink({ type: 'material', id: material.id }));
                      }}
                    >
                      {material.title}
                    </ListRow>

                    {/* Content Preview */}
                    {material.content && (
                      <div className="mt-3 ml-7">
                        <p className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                          {snippet}
                        </p>
                        {material.content.length > MAX_SNIPPET && (
                          <button
                            onClick={() => toggleExpand(material.id)}
                            className="mt-2 text-xs font-semibold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                          >
                            {isExpanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Summary */}
                    {summary?.text && (
                      <div className="mt-3 ml-7 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                        <div className="flex items-center gap-2 mb-2">
                          <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                          <p className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                            KI-Zusammenfassung
                          </p>
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {summary.text}
                        </p>
                      </div>
                    )}

                    {/* Summary Error */}
                    {summary?.error && (
                      <div className="mt-3 ml-7 rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/30">
                        <p className="text-xs text-red-700 dark:text-red-300">{summary.error}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon={<FileText className="h-8 w-8" />}
              title="Noch keine Materialien"
              description="Lade PDFs oder Bilder hoch, um zu beginnen"
              action={
                <Button onClick={() => setIsUploadOpen(true)}>
                  <Plus className="h-4 w-4" />
                  Material hochladen
                </Button>
              }
            />
          )}
        </CardContent>
      </Card>

      {/* Upload Sheet */}
      <Sheet open={isUploadOpen} onOpenChange={setIsUploadOpen} side="bottom" size="lg">
        <SheetHeader>
          <SheetTitle>Material hochladen</SheetTitle>
          <SheetDescription>
            Lade eine PDF-Datei oder ein Bild hoch. Der Text wird automatisch extrahiert.
          </SheetDescription>
        </SheetHeader>
        <SheetContent>
          <div className="space-y-4">
            {/* File Input */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Datei *
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept=".pdf,image/*"
                  onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
                />
              </div>
              {selectedFile && (
                <div className="mt-2 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800">
                  <FileText className="h-4 w-4 text-gray-400" />
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                    {selectedFile.name}
                  </span>
                  <button
                    onClick={() => handleFileSelect(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>

            {/* Custom Title */}
            <div>
              <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-200">
                Titel (optional)
              </label>
              <input
                type="text"
                value={customTitle}
                onChange={(e) => setCustomTitle(e.target.value)}
                placeholder="Material-Titel..."
                className="w-full rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-gray-800 dark:bg-gray-800 dark:text-white"
              />
            </div>

            {/* Error Message */}
            {uploadError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 dark:border-red-800 dark:bg-red-900/30">
                <p className="text-sm text-red-700 dark:text-red-300">{uploadError}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsUploadOpen(false);
                  setSelectedFile(null);
                  setCustomTitle('');
                  setUploadError(null);
                }}
                className="flex-1"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleUpload}
                disabled={!selectedFile || isUploading}
                className="flex-1"
                loading={isUploading}
              >
                <Upload className="h-4 w-4" />
                {isUploading ? 'Lädt hoch...' : 'Hochladen'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
