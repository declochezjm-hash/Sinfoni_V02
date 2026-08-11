import { useMemo, useState } from 'react';
import { ToggleLeft, ToggleRight, Plus, Trash2, Users } from 'lucide-react';
import { useProjectTimesheets } from '../hooks/useProjectTimesheets';
import { LABOR_HOURLY_RATE } from '../lib/projectConstants';
import { formatCurrency } from '../lib/utils';
import type { ProjectTimesheet } from '../types';

interface ProjectTimesheetSectionProps {
  projectId: string;
  enabled: boolean;
  canEdit: boolean;
  onToggle: (enabled: boolean) => Promise<void>;
}

interface TimesheetFormState {
  companyName: string;
  userName: string;
  hours: string;
  description: string;
}

const EMPTY_FORM: TimesheetFormState = {
  companyName: '',
  userName: '',
  hours: '',
  description: '',
};

interface CompanyGroup {
  companyName: string;
  entries: ProjectTimesheet[];
  totalHours: number;
  totalCost: number;
}

function groupByCompany(timesheets: ProjectTimesheet[]): CompanyGroup[] {
  const map = new Map<string, ProjectTimesheet[]>();
  for (const entry of timesheets) {
    const key = entry.companyName || '—';
    const list = map.get(key) ?? [];
    list.push(entry);
    map.set(key, list);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a.localeCompare(b, 'fr'))
    .map(([companyName, entries]) => {
      const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
      return {
        companyName,
        entries,
        totalHours,
        totalCost: totalHours * LABOR_HOURLY_RATE,
      };
    });
}

export function ProjectTimesheetSection({
  projectId,
  enabled,
  canEdit,
  onToggle,
}: ProjectTimesheetSectionProps) {
  const { timesheets, loading, error, addTimesheet, deleteTimesheet } =
    useProjectTimesheets(projectId);
  const [form, setForm] = useState<TimesheetFormState>(EMPTY_FORM);
  const [toggleLoading, setToggleLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const groups = useMemo(() => groupByCompany(timesheets), [timesheets]);
  const globalHours = useMemo(
    () => timesheets.reduce((sum, e) => sum + e.hours, 0),
    [timesheets],
  );
  const globalCost = globalHours * LABOR_HOURLY_RATE;

  const handleToggle = async () => {
    if (!canEdit || toggleLoading) return;
    setToggleLoading(true);
    setActionError(null);
    try {
      await onToggle(!enabled);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de la mise à jour');
    } finally {
      setToggleLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!canEdit || adding) return;
    const hours = parseFloat(form.hours.replace(',', '.'));
    if (!form.companyName.trim()) {
      setFormError('Renseignez l\'entreprise.');
      return;
    }
    if (!form.userName.trim()) {
      setFormError('Renseignez l\'intervenant.');
      return;
    }
    if (!Number.isFinite(hours) || hours <= 0) {
      setFormError('Les heures doivent être un nombre strictement positif.');
      return;
    }
    setAdding(true);
    setFormError(null);
    setActionError(null);
    try {
      await addTimesheet({
        companyName: form.companyName,
        userName: form.userName,
        hours,
        description: form.description || undefined,
      });
      setForm(EMPTY_FORM);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Erreur lors de l\'ajout');
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!canEdit || deletingId) return;
    setDeletingId(id);
    setActionError(null);
    try {
      await deleteTimesheet(id);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Users size={16} className="text-slate-500" />
          <h3 className="text-sm font-bold text-slate-900">Suivi de la main-d&apos;œuvre</h3>
        </div>
        <button
          type="button"
          onClick={() => void handleToggle()}
          disabled={!canEdit || toggleLoading}
          className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          aria-pressed={enabled}
        >
          {enabled ? (
            <ToggleRight size={22} className="text-emerald-600" />
          ) : (
            <ToggleLeft size={22} className="text-slate-400" />
          )}
          <span className="text-slate-700">
            Activer le suivi de la main-d&apos;œuvre pour ce chantier ?
            <span className="ml-1.5 font-medium text-slate-900">{enabled ? 'Oui' : 'Non'}</span>
          </span>
        </button>
      </div>

      {actionError && <p className="mb-3 text-xs text-red-600">{actionError}</p>}

      {enabled && (
        <div className="space-y-5 border-t border-slate-100 pt-4">
          {canEdit && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Entreprise</label>
                  <input
                    type="text"
                    value={form.companyName}
                    onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
                    placeholder="Ex. Sinfoni"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Intervenant</label>
                  <input
                    type="text"
                    value={form.userName}
                    onChange={(e) => setForm((f) => ({ ...f, userName: e.target.value }))}
                    placeholder="Nom du technicien"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Heures</label>
                  <input
                    type="number"
                    min="0"
                    step="0.5"
                    value={form.hours}
                    onChange={(e) => setForm((f) => ({ ...f, hours: e.target.value }))}
                    placeholder="0"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-slate-600">Tâche</label>
                  <input
                    type="text"
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Description (optionnel)"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  />
                </div>
              </div>
              {formError && <p className="text-xs text-red-600">{formError}</p>}
              <button
                type="button"
                onClick={() => void handleAdd()}
                disabled={adding}
                className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-60"
              >
                <Plus size={16} />
                {adding ? 'Ajout…' : 'Ajouter'}
              </button>
            </div>
          )}

          {loading ? (
            <p className="text-sm text-slate-500">Chargement des heures…</p>
          ) : error ? (
            <p className="text-sm text-red-600">{error}</p>
          ) : timesheets.length === 0 ? (
            <p className="text-sm text-slate-500">Aucune saisie d&apos;heures pour le moment.</p>
          ) : (
            <div className="space-y-4">
              {groups.map((group) => (
                <div key={group.companyName} className="overflow-hidden rounded-lg border border-slate-200">
                  <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 px-4 py-2.5">
                    <span className="text-sm font-semibold text-slate-900">{group.companyName}</span>
                    <span className="text-xs text-slate-600">
                      {group.totalHours.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} h
                      {' · '}
                      {formatCurrency(Math.round(group.totalCost))}
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-left text-xs text-slate-500">
                          <th className="px-4 py-2 font-medium">Intervenant</th>
                          <th className="px-4 py-2 font-medium">Heures</th>
                          <th className="px-4 py-2 font-medium">Tâche</th>
                          <th className="px-4 py-2 font-medium">Coût</th>
                          {canEdit && <th className="px-4 py-2 font-medium w-10" />}
                        </tr>
                      </thead>
                      <tbody>
                        {group.entries.map((entry) => (
                          <tr key={entry.id} className="border-b border-slate-50 last:border-0">
                            <td className="px-4 py-2.5 text-slate-800">{entry.userName}</td>
                            <td className="px-4 py-2.5 text-slate-700">
                              {entry.hours.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} h
                            </td>
                            <td className="px-4 py-2.5 text-slate-600">
                              {entry.description || '—'}
                            </td>
                            <td className="px-4 py-2.5 text-slate-700">
                              {formatCurrency(Math.round(entry.hours * LABOR_HOURLY_RATE))}
                            </td>
                            {canEdit && (
                              <td className="px-4 py-2.5">
                                <button
                                  type="button"
                                  onClick={() => void handleDelete(entry.id)}
                                  disabled={deletingId === entry.id}
                                  className="rounded p-1 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                                  title="Supprimer cette ligne"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-900 bg-slate-900 px-4 py-3 text-white">
                <span className="text-sm font-semibold">Coût global main-d&apos;œuvre</span>
                <div className="text-right text-sm">
                  <span className="font-bold">{formatCurrency(Math.round(globalCost))}</span>
                  <span className="ml-2 text-slate-300">
                    ({globalHours.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} h ×{' '}
                    {LABOR_HOURLY_RATE} €/h)
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
