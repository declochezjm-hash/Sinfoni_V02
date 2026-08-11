import { useMemo, useState } from 'react';
import { CalendarRange, Plus } from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { resolveRelatedProjectId } from '../lib/chantierUtils';
import { useChantiers } from '../hooks/useChantiers';
import {
  ppiStatusBadgeClass,
  usePpiPlanification,
  type PpiPlanificationStatus,
} from '../hooks/usePpiPlanification';
import type { Project } from '../types';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';

const PPI_STATUS_OPTIONS: PpiPlanificationStatus[] = ['Validé', 'Programmé', 'Envisagé'];

interface ProjectPpiSectionProps {
  project: Project;
  canEdit: boolean;
}

export function ProjectPpiSection({ project, canEdit }: ProjectPpiSectionProps) {
  const { chantiers } = useChantiers();
  const chantierId = useMemo(() => {
    const match = chantiers.find((c) => resolveRelatedProjectId(c, [project]) === project.id);
    return match?.id ?? null;
  }, [chantiers, project]);

  const { lines, loading, error, createLine, creating } = usePpiPlanification(
    project.id,
    chantierId,
  );

  const [dialogOpen, setDialogOpen] = useState(false);
  const [exerciseYear, setExerciseYear] = useState(String(new Date().getFullYear()));
  const [enveloppeVotee, setEnveloppeVotee] = useState('0');
  const [engage, setEngage] = useState('0');
  const [realise, setRealise] = useState('0');
  const [status, setStatus] = useState<PpiPlanificationStatus>('Envisagé');
  const [financingNote, setFinancingNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  const openCreateDialog = () => {
    const usedYears = new Set(lines.map((l) => l.exerciseYear));
    let year = new Date().getFullYear();
    while (usedYears.has(year)) year += 1;
    setExerciseYear(String(year));
    setEnveloppeVotee('0');
    setEngage('0');
    setRealise('0');
    setStatus('Envisagé');
    setFinancingNote('');
    setFormError(null);
    setDialogOpen(true);
  };

  const handleCreate = async () => {
    const year = Number(exerciseYear);
    if (!Number.isFinite(year) || year < 2000) {
      setFormError('Année d’exercice invalide.');
      return;
    }
    setFormError(null);
    try {
      await createLine({
        projectId: project.id,
        chantierId,
        exerciseYear: year,
        enveloppeVotee: Number(enveloppeVotee) || 0,
        engage: Number(engage) || 0,
        realise: Number(realise) || 0,
        status,
        financingNote: financingNote.trim() || null,
      });
      setDialogOpen(false);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Impossible d’enregistrer la ligne PPI.');
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-sm font-bold text-slate-900">
            <CalendarRange size={16} className="text-slate-500" />
            PPI pluriannuelle
          </h3>
          <p className="mt-1 text-xs text-slate-500">
            Enveloppes votées, engagements et réalisations par exercice.
          </p>
        </div>
        {canEdit && lines.length > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={openCreateDialog}>
            <Plus size={14} />
            Ajouter une année
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex h-24 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
        </div>
      ) : error ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </p>
      ) : lines.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm text-slate-600">Aucune planification pluriannuelle enregistrée</p>
          {canEdit ? (
            <Button type="button" onClick={openCreateDialog}>
              <Plus size={14} />
              Ajouter une ligne PPI
            </Button>
          ) : (
            <p className="text-xs text-slate-400">Contactez un profil DGS / DST pour en ajouter.</p>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-slate-100">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-2.5">Année</th>
                <th className="px-4 py-2.5 text-right">Enveloppe</th>
                <th className="px-4 py-2.5 text-right">Engagé</th>
                <th className="px-4 py-2.5 text-right">Réalisé</th>
                <th className="px-4 py-2.5">Statut</th>
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => (
                <tr key={line.id} className="border-b border-slate-50 last:border-0">
                  <td className="px-4 py-3 font-semibold text-slate-900">{line.exerciseYear}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {formatCurrency(line.enveloppeVotee)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {formatCurrency(line.engage)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-700">
                    {formatCurrency(line.realise)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${ppiStatusBadgeClass(line.status)}`}
                    >
                      {line.status}
                    </span>
                    {line.financingNote && (
                      <p className="mt-1 text-[10px] text-slate-400">{line.financingNote}</p>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajouter une ligne PPI</DialogTitle>
            <DialogDescription>
              Planification pluriannuelle pour {project.reference}.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-3 py-1">
            <div className="space-y-1.5">
              <Label htmlFor="ppi-year">Année d&apos;exercice</Label>
              <Input
                id="ppi-year"
                type="number"
                min={2000}
                max={2100}
                value={exerciseYear}
                onChange={(e) => setExerciseYear(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor="ppi-env">Enveloppe (€)</Label>
                <Input
                  id="ppi-env"
                  type="number"
                  min={0}
                  step="0.01"
                  value={enveloppeVotee}
                  onChange={(e) => setEnveloppeVotee(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ppi-eng">Engagé (€)</Label>
                <Input
                  id="ppi-eng"
                  type="number"
                  min={0}
                  step="0.01"
                  value={engage}
                  onChange={(e) => setEngage(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ppi-rea">Réalisé (€)</Label>
                <Input
                  id="ppi-rea"
                  type="number"
                  min={0}
                  step="0.01"
                  value={realise}
                  onChange={(e) => setRealise(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ppi-status">Statut</Label>
              <select
                id="ppi-status"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              >
                {PPI_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ppi-note">Financement (optionnel)</Label>
              <Input
                id="ppi-note"
                value={financingNote}
                onChange={(e) => setFinancingNote(e.target.value)}
                placeholder="Ex. Financement DETR"
              />
            </div>
            {formError && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {formError}
              </p>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
              Annuler
            </Button>
            <Button type="button" disabled={creating} onClick={() => void handleCreate()}>
              {creating ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ProjectPpiSection;
