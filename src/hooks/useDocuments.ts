import { useState, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { formatApiError } from '../lib/formatApiError';

export type DocumentCategory = 'Administratif' | 'Technique' | 'Financier';

export interface GedDocument {
  id: string;
  name: string;
  category: DocumentCategory;
  projectId: string;
  projectRef: string;
  size: string;
  version: number;
  fileUrl: string | null;
  mimeType: string | null;
  createdAt: string;
  updatedAt: string;
}

const STORAGE_BUCKET = 'documents';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function mapDocumentRow(
  row: Record<string, unknown>,
  projectRefMap: Map<string, string>,
): GedDocument {
  const projectId = String(row.project_id);
  return {
    id: String(row.id),
    name: String(row.name),
    category: String(row.category) as DocumentCategory,
    projectId,
    projectRef: projectRefMap.get(projectId) || '',
    size: String(row.size || ''),
    version: Number(row.version || 1),
    fileUrl: row.file_url ? String(row.file_url) : null,
    mimeType: row.mime_type ? String(row.mime_type) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at || row.created_at),
  };
}

export interface UploadDocumentParams {
  file: File;
  projectId: string;
  category: DocumentCategory;
}

export async function uploadDocumentToStorage(
  organizationId: string,
  { file, projectId, category }: UploadDocumentParams,
  onProgress?: (percent: number) => void,
): Promise<void> {
  const storagePath = `${organizationId}/${projectId}/${Date.now()}_${sanitizeFileName(file.name)}`;

  onProgress?.(10);

  const { error: uploadErr } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || undefined,
    });

  if (uploadErr) throw uploadErr;
  onProgress?.(60);

  const { data: urlData } = supabase.storage.from(STORAGE_BUCKET).getPublicUrl(storagePath);
  onProgress?.(80);

  const { error: insertErr } = await supabase.from('documents').insert({
    organization_id: organizationId,
    project_id: projectId,
    name: file.name,
    category,
    size: formatFileSize(file.size),
    file_url: urlData.publicUrl,
    mime_type: file.type || null,
    version: 1,
  });

  if (insertErr) {
    await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
    throw insertErr;
  }

  onProgress?.(100);
}

export function useDocuments(
  organizationId: string,
  projects: { id: string; reference: string }[],
) {
  const [docs, setDocs] = useState<GedDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Clé stable : évite la boucle infinie quand `projects = []` est recréé à chaque render
  const projectIdsKey = useMemo(
    () => projects.map((p) => `${p.id}:${p.reference}`).sort().join('|'),
    [projects],
  );

  const projectRefMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of projects) map.set(p.id, p.reference);
    return map;
  }, [projectIdsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchDocs = useCallback(async () => {
    if (!organizationId) {
      setDocs([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchErr } = await supabase
        .from('documents')
        .select('*')
        .eq('organization_id', organizationId)
        .order('updated_at', { ascending: false });

      if (fetchErr) throw fetchErr;

      setDocs((data || []).map((row) => mapDocumentRow(row as Record<string, unknown>, projectRefMap)));
    } catch (err) {
      console.error('[useDocuments] fetch error:', err);
      setDocs([]);
      setError(formatApiError(err));
    } finally {
      setLoading(false);
    }
  }, [organizationId, projectIdsKey, projectRefMap]);

  useEffect(() => {
    void fetchDocs();
  }, [fetchDocs]);

  const uploadDocument = useCallback(
    async (params: UploadDocumentParams) => {
      setUploading(true);
      setUploadProgress(10);
      setUploadError(null);

      try {
        await uploadDocumentToStorage(organizationId, params, setUploadProgress);
        await fetchDocs();
      } catch (err) {
        const message = formatApiError(err);
        setUploadError(message);
        throw err;
      } finally {
        setUploading(false);
      }
    },
    [organizationId, fetchDocs],
  );

  return {
    docs,
    loading,
    error,
    uploading,
    uploadProgress,
    uploadError,
    refetch: fetchDocs,
    uploadDocument,
  };
}

export function downloadDocument(doc: Pick<GedDocument, 'name' | 'fileUrl'>) {
  if (!doc.fileUrl) return false;
  const anchor = document.createElement('a');
  anchor.href = doc.fileUrl;
  anchor.download = doc.name;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  anchor.click();
  return true;
}

const STORAGE_PUBLIC_SEGMENT = `/storage/v1/object/public/${STORAGE_BUCKET}/`;

export function extractStoragePathFromPublicUrl(fileUrl: string): string | null {
  const idx = fileUrl.indexOf(STORAGE_PUBLIC_SEGMENT);
  if (idx === -1) return null;
  return decodeURIComponent(fileUrl.slice(idx + STORAGE_PUBLIC_SEGMENT.length));
}

export async function deleteDocumentFromStorage(
  organizationId: string,
  doc: { id: string; fileUrl: string | null },
): Promise<void> {
  if (doc.fileUrl) {
    const storagePath = extractStoragePathFromPublicUrl(doc.fileUrl);
    if (storagePath) {
      const { error: storageErr } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove([storagePath]);
      if (storageErr) {
        console.warn('[deleteDocumentFromStorage] storage remove:', storageErr.message);
      }
    }
  }

  const { error: deleteErr } = await supabase
    .from('documents')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', doc.id);

  if (deleteErr) throw deleteErr;
}
