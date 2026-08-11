import { useState } from 'react';
import { Send, CheckCircle, RotateCcw } from 'lucide-react';
import { useRole } from '../hooks/useRole';
import type { Project, ProjectStatus } from '../types';

interface ProjectInstructionActionsProps {
  project: Project;
  onUpdateStatus: (status: ProjectStatus) => Promise<void>;
}

export function ProjectInstructionActions({
  project,
  onUpdateStatus,
}: ProjectInstructionActionsProps) {
  const { isCommune, isRole } = useRole();
  const [loading, setLoading] = useState<'propose' | 'accept' | 'revision' | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isSyndicat = isRole('DGS') || isRole('Chargé d\'Affaires');

  const canProposeOffer =
    isSyndicat &&
    !isCommune &&
    (project.status === 'Brouillon' || project.status === 'En Étude');

  const canCommuneRespond = isCommune && project.status === 'Proposé';

  if (!canProposeOffer && !canCommuneRespond) return null;

  const handleStatusChange = async (status: ProjectStatus, action: typeof loading) => {
    setLoading(action);
    setError(null);
    try {
      await onUpdateStatus(status);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour du statut');
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-slate-900">Instruction financière</p>
          <p className="text-xs text-slate-500">
            {canProposeOffer
              ? 'Le dossier est prêt à être transmis à la commune pour décision.'
              : 'Une offre financière vous a été transmise par le syndicat.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canProposeOffer && (
            <button
              type="button"
              disabled={loading !== null}
              onClick={() => void handleStatusChange('Proposé', 'propose')}
              className="inline-flex items-center gap-2 rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading === 'propose' ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Send size={16} />
              )}
              Envoyer l&apos;offre financière à la commune
            </button>
          )}

          {canCommuneRespond && (
            <>
              <button
                type="button"
                disabled={loading !== null}
                onClick={() => void handleStatusChange('Validé', 'accept')}
                className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading === 'accept' ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <CheckCircle size={16} />
                )}
                Signer la convention de travaux (Accepter l&apos;offre)
              </button>
              <button
                type="button"
                disabled={loading !== null}
                onClick={() => void handleStatusChange('En Étude', 'revision')}
                className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition-colors hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading === 'revision' ? (
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
                ) : (
                  <RotateCcw size={16} />
                )}
                Demander une révision
              </button>
            </>
          )}
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
