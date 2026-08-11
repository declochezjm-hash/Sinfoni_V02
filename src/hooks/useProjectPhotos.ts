import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { ProjectPhoto, ProjectPhotoTag } from '../types';

export const PROJECT_PHOTOS_BUCKET = 'project-photos';

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_');
}

function mapPhoto(row: Record<string, unknown>): ProjectPhoto {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    url: String(row.url),
    storagePath: String(row.storage_path),
    tag: String(row.tag) as ProjectPhotoTag,
    createdAt: String(row.created_at),
  };
}

async function fetchProjectPhotos(
  projectId: string,
  organizationId: string,
): Promise<ProjectPhoto[]> {
  const { data, error } = await supabase
    .from('project_photos')
    .select('*')
    .eq('organization_id', organizationId)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data || []).map(mapPhoto);
}

async function uploadProjectPhoto(
  organizationId: string,
  projectId: string,
  file: File,
  tag: ProjectPhotoTag,
  onProgress?: (percent: number) => void,
): Promise<ProjectPhoto> {
  const storagePath = `${organizationId}/${projectId}/${tag}/${Date.now()}_${sanitizeFileName(file.name)}`;

  onProgress?.(10);

  const { error: uploadErr } = await supabase.storage
    .from(PROJECT_PHOTOS_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'image/jpeg',
    });

  if (uploadErr) throw uploadErr;
  onProgress?.(60);

  const { data: urlData } = supabase.storage
    .from(PROJECT_PHOTOS_BUCKET)
    .getPublicUrl(storagePath);

  onProgress?.(80);

  const { data, error: insertErr } = await supabase
    .from('project_photos')
    .insert({
      organization_id: organizationId,
      project_id: projectId,
      url: urlData.publicUrl,
      storage_path: storagePath,
      tag,
    })
    .select('*')
    .single();

  if (insertErr) {
    await supabase.storage.from(PROJECT_PHOTOS_BUCKET).remove([storagePath]);
    throw insertErr;
  }

  onProgress?.(100);
  return mapPhoto(data as Record<string, unknown>);
}

async function deleteProjectPhoto(
  organizationId: string,
  photo: Pick<ProjectPhoto, 'id' | 'storagePath'>,
): Promise<void> {
  const { error: storageErr } = await supabase.storage
    .from(PROJECT_PHOTOS_BUCKET)
    .remove([photo.storagePath]);

  if (storageErr) {
    console.warn('[deleteProjectPhoto] storage remove:', storageErr.message);
  }

  const { error: deleteErr } = await supabase
    .from('project_photos')
    .delete()
    .eq('organization_id', organizationId)
    .eq('id', photo.id);

  if (deleteErr) throw deleteErr;
}

export function useProjectPhotos(projectId: string | null) {
  const { organizationId } = useAuth();
  const queryClient = useQueryClient();

  const queryKey = ['project-photos', organizationId, projectId] as const;

  const {
    data: photos = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey,
    queryFn: () => fetchProjectPhotos(projectId!, organizationId!),
    enabled: !!projectId && !!organizationId,
  });

  const uploadMutation = useMutation({
    mutationFn: ({
      file,
      tag,
      onProgress,
    }: {
      file: File;
      tag: ProjectPhotoTag;
      onProgress?: (percent: number) => void;
    }) => uploadProjectPhoto(organizationId!, projectId!, file, tag, onProgress),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project-photos'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (photo: ProjectPhoto) => deleteProjectPhoto(organizationId!, photo),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['project-photos'] });
    },
  });

  return {
    photos,
    loading: isLoading,
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refetch,
    uploadPhoto: uploadMutation.mutateAsync,
    uploading: uploadMutation.isPending,
    deletePhoto: deleteMutation.mutateAsync,
    deleting: deleteMutation.isPending,
  };
}
