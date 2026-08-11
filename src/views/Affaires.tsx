import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  useProjects,
  useCreateProject,
  useUpdateProject,
  useDeleteProject,
  type ProjectFormInput,
} from '../hooks/useProjects';
import { useRole } from '../hooks/useRole';
import { uploadDocumentToStorage } from '../hooks/useDocuments';
import { ProjectMapEditor } from '../components/ProjectMapEditor';
import { BudgetProgressBar } from '../components/BudgetProgressBar';
import { ProjectDelayBadge } from '../components/TimeProgressBar';
import { FinancialStatusBadges } from '../components/FinancialStatusBadges';
import {
  FORM_STATUS_OPTIONS,
  FILTER_STATUS_OPTIONS,
  PROJECT_TYPE_OPTIONS,
} from '../lib/projectConstants';
import { formatCurrency, formatDate, getStatusColor, getTypeColor } from '../lib/utils';
import {
  Filter,
  ChevronDown,
  Eye,
  ArrowUpDown,
  Plus,
  X,
  Check,
  Pencil,
  Trash2,
  RefreshCw,
  Paperclip,
  XCircle,
  Search,
} from 'lucide-react';
import ApiErrorAlert from '../components/ApiErrorAlert';
import type { Project, ProjectStatus, ProjectType } from '../types';

type AffaireFormState = ProjectFormInput & {
  mapTouched: boolean;
  location: string;
  attachments: File[];
};

const EMPTY_FORM: AffaireFormState = {
  reference: '',
  title: '',
  description: '',
  status: 'En cours',
  type: '' as ProjectType,
  budgetTotal: 0,
  budgetConsumed: 0,
  latitude: null,
  longitude: null,
  mapTouched: false,
  location: '',
  attachments: [],
};

function normalizeFormState(form: Partial<AffaireFormState>): AffaireFormState {
  return {
    ...EMPTY_FORM,
    ...form,
    location: form.location ?? '',
  };
}

function AffaireFormModal({
  mode,
  form,
  saving,
  onClose,
  onChange,
  onSubmit,
  onGenerateReference,
}: {
  mode: 'create' | 'edit';
  form: AffaireFormState;
  saving: boolean;
  onClose: () => void;
  onChange: (updates: Partial<AffaireFormState>) => void;
  onSubmit: () => void;
  onGenerateReference: () => void;
}) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    onChange({ attachments: [...form.attachments, ...Array.from(files)] });
    e.target.value = '';
  };

  const removeAttachment = (index: number) => {
    onChange({ attachments: form.attachments.filter((_, i) => i !== index) });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="relative isolate flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-slate-200 bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <h3 className="text-sm font-bold text-slate-900">
            {mode === 'create' ? 'Nouvelle affaire' : 'Modifier l\'affaire'}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
          >
            <X size={16} />
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Titre</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => onChange({ title: e.target.value })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                placeholder="Maintenance photovoltaïque — Hangar Arles"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Référence</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={form.reference}
                  onChange={(e) => onChange({ reference: e.target.value })}
                  className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  placeholder="SINF-2026-0001"
                />
                <button
                  type="button"
                  onClick={onGenerateReference}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50"
                  title="Générer une référence automatique"
                >
                  <RefreshCw size={14} />
                  Générer
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Type de chantier <span className="text-red-500">*</span>
              </label>
              <select
                value={form.type}
                onChange={(e) => onChange({ type: e.target.value as ProjectType })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              >
                <option value="" disabled>
                  Sélectionner un type
                </option>
                {PROJECT_TYPE_OPTIONS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Statut</label>
              <select
                value={form.status}
                onChange={(e) => onChange({ status: e.target.value as ProjectStatus })}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              >
                {FORM_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Budget Total (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.budgetTotal ?? ''}
                onChange={(e) =>
                  onChange({ budgetTotal: e.target.value === '' ? 0 : parseFloat(e.target.value) })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Budget Consommé (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.budgetConsumed ?? ''}
                onChange={(e) =>
                  onChange({ budgetConsumed: e.target.value === '' ? 0 : parseFloat(e.target.value) })
                }
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                placeholder="0.00"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => onChange({ description: e.target.value })}
              rows={3}
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
              placeholder="Décrivez le périmètre, la ville ou le site..."
            />
          </div>

          <ProjectMapEditor
            latitude={form.latitude}
            longitude={form.longitude}
            location={form.location ?? ''}
            onLocationChange={(location) => onChange({ location })}
            onCoordinatesChange={(lat, lng) =>
              onChange({ latitude: lat, longitude: lng, mapTouched: true })
            }
            mapKey={`${mode}-${form.reference}`}
          />

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Pièces jointes</label>
            <div className="rounded-lg border border-dashed border-slate-200 bg-slate-50/50 p-4">
              <label className="flex cursor-pointer flex-col items-center gap-2 text-center">
                <Paperclip size={20} className="text-slate-400" />
                <span className="text-sm text-slate-600">
                  Cliquez pour sélectionner des fichiers
                </span>
                <span className="text-xs text-slate-400">PDF, images, documents Office…</span>
                <input
                  type="file"
                  multiple
                  className="hidden"
                  onChange={handleFileChange}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
                />
              </label>
              {form.attachments.length > 0 && (
                <ul className="mt-3 space-y-1.5 border-t border-slate-200 pt-3">
                  {form.attachments.map((file, index) => (
                    <li
                      key={`${file.name}-${index}`}
                      className="flex items-center justify-between rounded-md bg-white px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-100"
                    >
                      <span className="truncate">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="ml-2 shrink-0 text-slate-400 hover:text-red-500"
                        title="Retirer"
                      >
                        <XCircle size={14} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        <div className="relative z-20 flex shrink-0 gap-3 border-t border-slate-100 bg-white px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={() => void onSubmit()}
            className="relative z-20 flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
          >
            {saving ? 'Enregistrement...' : (
              <>
                <Check size={14} className="mr-1 inline" />
                {mode === 'create' ? 'Créer' : 'Enregistrer'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Affaires() {
  const navigate = useNavigate();
  const { canAccess, user, organizationId } = useRole();
  const { projects, loading, error, refetch } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<ProjectStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<ProjectType | 'all'>('all');
  const [sortKey, setSortKey] = useState<'updatedAt' | 'budgetTotal'>('updatedAt');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AffaireFormState>(EMPTY_FORM);
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  const generateReference = useCallback(() => {
    const year = new Date().getFullYear();
    const prefix = `SINF-${year}-`;
    const existingNumbers = projects
      .filter((p) => p.reference.startsWith(prefix))
      .map((p) => {
        const match = p.reference.match(/SINF-\d{4}-(\d+)/);
        return match ? parseInt(match[1], 10) : 0;
      });
    const maxNum = existingNumbers.length > 0 ? Math.max(...existingNumbers) : 0;
    return `${prefix}${String(maxNum + 1).padStart(4, '0')}`;
  }, [projects]);

  const openCreateModal = () => {
    setEditingId(null);
    setForm(normalizeFormState({ reference: generateReference() }));
    setModalMode('create');
  };

  const openEditModal = (project: Project) => {
    setEditingId(project.id);
    setForm(
      normalizeFormState({
        reference: project.reference,
        title: project.title,
        description: project.description,
        type: PROJECT_TYPE_OPTIONS.includes(project.type) ? project.type : ('' as ProjectType),
        budgetTotal: project.budgetTotal,
        budgetConsumed: project.budgetConsumed,
        status: FORM_STATUS_OPTIONS.includes(project.status as ProjectStatus)
          ? (project.status as ProjectStatus)
          : 'En cours',
        latitude:
          project.latitude != null && project.latitude !== 0 ? project.latitude : null,
        longitude:
          project.longitude != null && project.longitude !== 0 ? project.longitude : null,
        mapTouched: project.latitude != null && project.longitude != null && project.latitude !== 0,
        location: project.location || '',
        attachments: [],
      }),
    );
    setModalMode('edit');
  };

  const closeModal = () => {
    setModalMode(null);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleFormChange = (updates: Partial<AffaireFormState>) => {
    setForm((prev) => normalizeFormState({ ...prev, ...updates }));
  };

  const handleSubmit = async () => {
    try {
      if (!form.title.trim() || !form.reference.trim()) {
        alert('Le titre et la référence sont obligatoires.');
        return;
      }

      const projectType = form.type || 'Électricité';
      const lat = form.latitude ? parseFloat(String(form.latitude)) : 42.6412;
      const lng = form.longitude ? parseFloat(String(form.longitude)) : 2.9103;
      const budgetTotal = form.budgetTotal ? parseInt(String(form.budgetTotal), 10) : 0;
      const budgetConsumed = form.budgetConsumed ? parseInt(String(form.budgetConsumed), 10) : 0;

      if (budgetConsumed > budgetTotal && budgetTotal > 0) {
        alert('Le budget consommé ne peut pas dépasser le budget total.');
        return;
      }

      const payload = {
        reference: form.reference.trim(),
        title: form.title.trim(),
        description: form.description.trim() || '',
        type: projectType,
        status: form.status || 'À planifier',
        budgetTotal: Number.isNaN(budgetTotal) ? 0 : budgetTotal,
        budgetConsumed: Number.isNaN(budgetConsumed) ? 0 : budgetConsumed,
        location: (form.location || '').trim(),
        latitude: Number.isNaN(lat) ? 42.6412 : lat,
        longitude: Number.isNaN(lng) ? 2.9103 : lng,
      };

      const uploadAttachments = async (projectId: string) => {
        if (!form.attachments.length || !organizationId) return;
        for (const file of form.attachments) {
          await uploadDocumentToStorage(organizationId, {
            file,
            projectId,
            category: 'Administratif',
          });
        }
      };

      if (modalMode === 'create') {
        const result = await createProject.mutateAsync({
          ...payload,
          owner_id: user?.id || '1',
          owner_name: user?.name || 'Admin',
        });
        if (result?.id) {
          await uploadAttachments(result.id);
        }
      } else if (modalMode === 'edit' && editingId) {
        await updateProject.mutateAsync({ ...payload, id: editingId });
        await uploadAttachments(editingId);
      }
      closeModal();
    } catch (err: unknown) {
      console.error('CRASH ENREGISTREMENT :', err);
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      alert('Erreur UI : ' + message);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteProject.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erreur inconnue';
      alert(`Erreur lors de la suppression : ${message}`);
    }
  };

  const saving = createProject.isPending || updateProject.isPending;

  if (!canAccess(['DGS', 'DST', "Chargé d'Affaires"])) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm text-slate-500">Accès réservé à certains profils.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-sm font-medium text-red-800">Erreur de chargement : {error}</p>
      </div>
    );
  }

  const filtered = projects
    .filter((p) => {
      const matchesSearch =
        search.trim() === '' ||
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.reference.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchesType = typeFilter === 'all' || p.type === typeFilter;
      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      const dir = sortDir === 'asc' ? 1 : -1;
      if (sortKey === 'budgetTotal') return (a.budgetTotal - b.budgetTotal) * dir;
      return (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime()) * dir;
    });

  const toggleSort = (key: 'updatedAt' | 'budgetTotal') => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('desc');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Annuaire des affaires</h1>
          <p className="text-sm text-slate-500">
            {filtered.length} dossier{filtered.length > 1 ? 's' : ''} trouvé{filtered.length > 1 ? 's' : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800"
        >
          <Plus size={14} /> Nouvelle affaire
        </button>
      </div>

      {!loading && !error && projects.length === 0 && (
        <ApiErrorAlert
          title="Aucune affaire en base"
          message="La table app.projects est vide pour votre organisation. Exécutez supabase/seed.sql (3 affaires démo AF-2026-*) puis rechargez la page."
          onRetry={() => void refetch()}
        />
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative max-w-md flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher par référence ou titre..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-4 text-sm text-slate-700 placeholder:text-slate-400 transition-colors focus:border-slate-400 focus:outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <FilterDropdown
            label="Statut"
            options={FILTER_STATUS_OPTIONS.map((s) => ({ value: s, label: s }))}
            value={statusFilter}
            onChange={(v) => setStatusFilter(v as ProjectStatus | 'all')}
          />
          <FilterDropdown
            label="Type"
            options={PROJECT_TYPE_OPTIONS.map((t) => ({ value: t, label: t }))}
            value={typeFilter}
            onChange={(v) => setTypeFilter(v as ProjectType | 'all')}
          />
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Référence</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Titre</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Statut</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Devis / Facture</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  <button
                    type="button"
                    onClick={() => toggleSort('budgetTotal')}
                    className="flex items-center gap-1 hover:text-slate-900"
                  >
                    Budget <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Planning</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">
                  <button
                    type="button"
                    onClick={() => toggleSort('updatedAt')}
                    className="flex items-center gap-1 hover:text-slate-900"
                  >
                    Mise à jour <ArrowUpDown size={12} />
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-slate-50 transition-colors hover:bg-slate-50/60"
                >
                  <td className="px-4 py-3 font-medium text-slate-900">{p.reference}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-slate-700" title={p.title}>
                    {p.title}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${getTypeColor(
                        p.type
                      )}`}
                    >
                      {p.type}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(
                        p.status
                      )}`}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <FinancialStatusBadges
                      quoteStatus={p.quoteStatus}
                      billingStatus={p.billingStatus}
                    />
                  </td>
                  <td className="px-4 py-3">
                    <div className="min-w-[140px] space-y-1">
                      <span className="text-slate-700">{formatCurrency(p.budgetTotal)}</span>
                      <BudgetProgressBar
                        budgetTotal={p.budgetTotal}
                        budgetConsumed={p.budgetConsumed}
                        compact
                        showLabel
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="min-w-[120px] space-y-1">
                      {p.expectedEndDate ? (
                        <>
                          <span className="text-xs text-slate-600">
                            Fin : {formatDate(p.expectedEndDate)}
                          </span>
                          <ProjectDelayBadge
                            endDate={p.expectedEndDate}
                            status={p.status}
                            compact
                          />
                        </>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(p.updatedAt)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/affaires/${p.id}`)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
                        title="Voir la fiche"
                      >
                        <Eye size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(p)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-sky-600 transition-colors hover:bg-sky-50"
                        title="Modifier"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteTarget(p)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-red-600 transition-colors hover:bg-red-50"
                        title="Supprimer"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-slate-400">
                    Aucune affaire ne correspond aux critères.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalMode && (
        <AffaireFormModal
          mode={modalMode}
          form={form}
          saving={saving}
          onClose={closeModal}
          onChange={handleFormChange}
          onSubmit={handleSubmit}
          onGenerateReference={() => handleFormChange({ reference: generateReference() })}
        />
      )}

      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <h3 className="text-sm font-bold text-slate-900">Confirmer la suppression</h3>
            <p className="mt-2 text-sm text-slate-600">
              Supprimer définitivement l&apos;affaire{' '}
              <span className="font-medium text-slate-900">
                {deleteTarget.reference} — {deleteTarget.title}
              </span>{' '}
              ? Cette action est irréversible.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                disabled={deleteProject.isPending}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50"
              >
                {deleteProject.isPending ? 'Suppression...' : 'Supprimer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function FilterDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 transition-colors hover:bg-slate-50"
      >
        <Filter size={14} />
        {label}
        <ChevronDown size={12} className="text-slate-400" />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-40 mt-1 w-48 rounded-lg border border-slate-200 bg-white p-1 shadow-xl">
          <button
            type="button"
            onClick={() => {
              onChange('all');
              setOpen(false);
            }}
            className={`w-full rounded-md px-3 py-2 text-left text-sm ${
              value === 'all' ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Tous
          </button>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              className={`w-full rounded-md px-3 py-2 text-left text-sm ${
                value === opt.value ? 'bg-slate-100 font-medium text-slate-900' : 'text-slate-600 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
