import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Camera, Loader2, Trash2, Upload, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { useProjectPhotos } from '../hooks/useProjectPhotos';
import type { ProjectPhoto, ProjectPhotoTag } from '../types';

interface ProjectPhotoGallerySectionProps {
  projectId: string;
  canEdit: boolean;
}

const TAG_OPTIONS: { value: ProjectPhotoTag; label: string }[] = [
  { value: 'avant', label: 'Avant travaux' },
  { value: 'apres', label: 'Après travaux' },
];

function formatPhotoDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function PhotoGrid({
  title,
  photos,
  canEdit,
  deletingId,
  onOpen,
  onDelete,
}: {
  title: string;
  photos: ProjectPhoto[];
  canEdit: boolean;
  deletingId: string | null;
  onOpen: (photo: ProjectPhoto) => void;
  onDelete: (photo: ProjectPhoto) => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{title}</h4>
      {photos.length === 0 ? (
        <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-xs text-slate-400">
          Aucune photo
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="group relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100"
            >
              <button
                type="button"
                onClick={() => onOpen(photo)}
                className="absolute inset-0 h-full w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-2"
                aria-label="Agrandir la photo"
              >
                <img
                  src={photo.url}
                  alt={`Photo ${photo.tag}`}
                  className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
                  loading="lazy"
                />
              </button>
              {canEdit && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    void onDelete(photo);
                  }}
                  disabled={deletingId === photo.id}
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-red-600 text-white opacity-0 shadow-md transition-opacity hover:bg-red-700 group-hover:opacity-100 focus:opacity-100 disabled:opacity-60 sm:opacity-0"
                  title="Supprimer la photo"
                >
                  {deletingId === photo.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Trash2 size={14} />
                  )}
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function PhotoLightbox({
  photo,
  photos,
  onClose,
  onNavigate,
}: {
  photo: ProjectPhoto;
  photos: ProjectPhoto[];
  onClose: () => void;
  onNavigate: (photo: ProjectPhoto) => void;
}) {
  const currentIndex = photos.findIndex((p) => p.id === photo.id);
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < photos.length - 1;

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && hasPrev) onNavigate(photos[currentIndex - 1]);
      if (e.key === 'ArrowRight' && hasNext) onNavigate(photos[currentIndex + 1]);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, onNavigate, photos, currentIndex, hasPrev, hasNext]);

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  const tagLabel = photo.tag === 'avant' ? 'Avant travaux' : 'Après travaux';

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-black/95"
      role="dialog"
      aria-modal="true"
      aria-label="Visualisation photo plein écran"
    >
      <div className="flex items-center justify-between px-4 py-3 text-white">
        <div>
          <p className="text-sm font-semibold">{tagLabel}</p>
          <p className="text-xs text-white/60">{formatPhotoDate(photo.createdAt)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10 transition-colors hover:bg-white/20"
          aria-label="Fermer"
        >
          <X size={20} />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center px-4 pb-6">
        {hasPrev && (
          <button
            type="button"
            onClick={() => onNavigate(photos[currentIndex - 1])}
            className="absolute left-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:left-4"
            aria-label="Photo précédente"
          >
            <ChevronLeft size={24} />
          </button>
        )}

        <img
          src={photo.url}
          alt={tagLabel}
          className="max-h-[calc(100vh-8rem)] max-w-full object-contain"
        />

        {hasNext && (
          <button
            type="button"
            onClick={() => onNavigate(photos[currentIndex + 1])}
            className="absolute right-2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 sm:right-4"
            aria-label="Photo suivante"
          >
            <ChevronRight size={24} />
          </button>
        )}
      </div>

      {photos.length > 1 && (
        <p className="pb-4 text-center text-xs text-white/50">
          {currentIndex + 1} / {photos.length}
        </p>
      )}
    </div>
  );
}

export function ProjectPhotoGallerySection({
  projectId,
  canEdit,
}: ProjectPhotoGallerySectionProps) {
  const { photos, loading, error, uploadPhoto, uploading, deletePhoto } =
    useProjectPhotos(projectId);

  const [uploadTag, setUploadTag] = useState<ProjectPhotoTag>('avant');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [actionError, setActionError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<ProjectPhoto | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const avantPhotos = useMemo(
    () => photos.filter((p) => p.tag === 'avant'),
    [photos],
  );
  const apresPhotos = useMemo(
    () => photos.filter((p) => p.tag === 'apres'),
    [photos],
  );

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !canEdit || uploading) return;

      if (!file.type.startsWith('image/')) {
        setActionError('Seules les images sont acceptées.');
        return;
      }

      setActionError(null);
      setUploadProgress(0);

      try {
        await uploadPhoto({
          file,
          tag: uploadTag,
          onProgress: setUploadProgress,
        });
        setUploadProgress(100);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : "Erreur lors de l'envoi");
      } finally {
        setTimeout(() => setUploadProgress(0), 400);
      }
    },
    [canEdit, uploadPhoto, uploadTag, uploading],
  );

  const handleDelete = useCallback(
    async (photo: ProjectPhoto) => {
      if (!canEdit || deletingId) return;
      setDeletingId(photo.id);
      setActionError(null);
      if (lightboxPhoto?.id === photo.id) setLightboxPhoto(null);
      try {
        await deletePhoto(photo);
      } catch (err) {
        setActionError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
      } finally {
        setDeletingId(null);
      }
    },
    [canEdit, deletePhoto, deletingId, lightboxPhoto],
  );

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900">📸 Galerie Photos Terrain</h3>
        </div>

        {canEdit && (
          <div className="mb-5 space-y-3 border-b border-slate-100 pb-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-slate-600">Catégorie :</span>
              <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
                {TAG_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setUploadTag(opt.value)}
                    className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      uploadTag === opt.value
                        ? 'bg-slate-900 text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => void handleFileChange(e)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Camera size={16} />
                )}
                {uploading ? 'Envoi en cours…' : 'Ajouter une photo'}
              </button>
              {!uploading && (
                <span className="text-xs text-slate-400">
                  Compatible appareil photo mobile
                </span>
              )}
            </div>

            {uploading && (
              <div className="max-w-xs space-y-1">
                <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${Math.max(uploadProgress, 8)}%` }}
                  />
                </div>
                <p className="text-xs text-slate-500">
                  <Upload size={12} className="mr-1 inline" />
                  Upload vers Supabase Storage… {uploadProgress > 0 ? `${uploadProgress}%` : ''}
                </p>
              </div>
            )}
          </div>
        )}

        {actionError && <p className="mb-3 text-xs text-red-600">{actionError}</p>}

        {loading ? (
          <div className="flex items-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" />
            Chargement de la galerie…
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            <PhotoGrid
              title="🖼️ Photos Avant"
              photos={avantPhotos}
              canEdit={canEdit}
              deletingId={deletingId}
              onOpen={setLightboxPhoto}
              onDelete={handleDelete}
            />
            <PhotoGrid
              title="🖼️ Photos Après"
              photos={apresPhotos}
              canEdit={canEdit}
              deletingId={deletingId}
              onOpen={setLightboxPhoto}
              onDelete={handleDelete}
            />
          </div>
        )}
      </div>

      {lightboxPhoto && (
        <PhotoLightbox
          photo={lightboxPhoto}
          photos={photos}
          onClose={() => setLightboxPhoto(null)}
          onNavigate={setLightboxPhoto}
        />
      )}
    </>
  );
}
