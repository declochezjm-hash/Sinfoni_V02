import { useState, useRef, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProject, useWorkflowSteps, useProjectDocuments } from '../hooks/useProjects';
import { useProjectQuoteLines } from '../hooks/useProjectQuoteLines';
import { useRole } from '../hooks/useRole';
import { useActivityLogs } from '../hooks/useProjects';
import {
  uploadDocumentToStorage,
  downloadDocument,
  deleteDocumentFromStorage,
  type DocumentCategory,
} from '../hooks/useDocuments';
import { ProjectMapEditor } from '../components/ProjectMapEditor';
import { ProjectTimesheetSection } from '../components/ProjectTimesheetSection';
import { ProjectPhotoGallerySection } from '../components/ProjectPhotoGallerySection';
import { LedRoiSimulator } from '../components/LedRoiSimulator';
import { EnergyCEEDashboard } from '../components/EnergyCEEDashboard';
import { CommuneProjectDetail } from '../components/CommuneProjectDetail';
import { ProjectInstructionActions } from '../components/ProjectInstructionActions';
import { ProjectQuoteLinesSection } from '../components/ProjectQuoteLinesSection';
import { BudgetProgressBar } from '../components/BudgetProgressBar';
import { ProjectPpiSection } from '../components/ProjectPpiSection';
import { TimeProgressBar } from '../components/TimeProgressBar';
import {
  PROJECT_STATUS_OPTIONS,
  PROJECT_TYPE_OPTIONS,
  QUOTE_STATUS_OPTIONS,
  BILLING_STATUS_OPTIONS,
  VAT_RATE,
} from '../lib/projectConstants';
import { formatCurrency, getStatusColor, getTypeColor } from '../lib/utils';
import { isEclairagePublicProject } from '../lib/ledRoiCalculator';
import {
  generateProjectPdf,
  canDownloadQuote,
  canDownloadInvoice,
} from '../utils/pdfGenerator';
import {
  ArrowLeft,
  FileText,
  Euro,
  Wrench,
  GitBranch,
  CheckCircle,
  Clock,
  Calendar,
  AlertCircle,
  Download,
  FileDown,
  Lock,
  Trash2,
  Save,
  Paperclip,
  Leaf,
} from 'lucide-react';
import type { Project, ProjectStatus, ProjectType, QuoteStatus, BillingStatus } from '../types';

type Tab = 'admin' | 'technical' | 'documents' | 'workflow' | 'cee';

interface AdminFormState {
  status: ProjectStatus;
  reference: string;
  startDate: string;
  expectedEndDate: string;
  ppiYear: number | null;
  budgetTotal: number;
  budgetConsumed: number;
  quoteStatus: QuoteStatus;
  quoteAmountHt: number;
  billingStatus: BillingStatus;
  invoiceDeposit: boolean;
  invoiceBalance: boolean;
}

interface TechnicalFormState {
  type: ProjectType;
  description: string;
  location: string;
  latitude: number | null;
  longitude: number | null;
}

function toDateInputValue(dateStr: string): string {
  if (!dateStr) return '';
  return dateStr.split('T')[0];
}

function buildAdminForm(project: Project): AdminFormState {
  return {
    status: project.status,
    reference: project.reference,
    startDate: toDateInputValue(project.startDate),
    expectedEndDate: toDateInputValue(project.expectedEndDate),
    ppiYear: project.ppiYear ?? null,
    budgetTotal: project.budgetTotal,
    budgetConsumed: project.budgetConsumed,
    quoteStatus: project.quoteStatus,
    quoteAmountHt: project.quoteAmountHt,
    billingStatus: project.billingStatus,
    invoiceDeposit: project.invoiceDeposit,
    invoiceBalance: project.invoiceBalance,
  };
}

const CURRENT_YEAR = new Date().getFullYear();
const PPI_YEAR_OPTIONS = Array.from({ length: 8 }, (_, i) => CURRENT_YEAR + i);

function applyQuoteAcceptedBudget(
  quoteStatus: QuoteStatus,
  quoteAmountHt: number,
  currentBudgetTotal: number,
): number {
  if (quoteStatus === 'Accepté' && quoteAmountHt > 0) {
    return quoteAmountHt;
  }
  return currentBudgetTotal;
}

function buildTechnicalForm(project: Project): TechnicalFormState {
  return {
    type: project.type,
    description: project.description,
    location: project.location,
    latitude: project.latitude ?? null,
    longitude: project.longitude ?? null,
  };
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isRole, organizationId, isCommune } = useRole();
  const { project, loading, error, updateProject, refetch: refetchProject } = useProject(id || null);
  const { steps, loading: stepsLoading, advanceStep, activateNext } = useWorkflowSteps(id || null);
  const { docs, loading: docsLoading, refetch: refetchDocs } = useProjectDocuments(id || null);
  const { addLog } = useActivityLogs();
  const [activeTab, setActiveTab] = useState<Tab>('admin');
  const [actionLoading, setActionLoading] = useState(false);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
        <p className="text-sm font-medium text-red-800">Affaire introuvable ou erreur de chargement.</p>
        <button
          onClick={() => navigate(isCommune ? '/commune/dossiers' : '/affaires')}
          className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-red-700 hover:underline"
        >
          <ArrowLeft size={14} /> {isCommune ? 'Retour aux dossiers' : 'Retour aux affaires'}
        </button>
      </div>
    );
  }

  const canEdit = isRole('DGS') || isRole('DST') || isRole('Chargé d\'Affaires');
  const canValidate = isRole('DGS') || isRole('DST');

  const handleAdvanceWorkflow = async () => {
    const activeStep = steps.find((s) => s.status === 'active');
    if (!activeStep) return;
    setActionLoading(true);
    try {
      await advanceStep(activeStep.id, user.name);
      await addLog({
        userId: user.id,
        userName: user.name,
        userRole: user.role,
        action: `a validé l'étape "${activeStep.stepLabel}"`,
        targetType: 'workflow',
        targetId: project.id,
        targetLabel: `${project.reference} — ${project.title}`,
        timestamp: new Date().toISOString(),
      });
      const next = steps.find((s) => s.stepOrder === activeStep.stepOrder + 1);
      if (next) {
        await activateNext(next.stepOrder);
      }
      const statusMap: Record<string, string> = {
        ouverture: 'Brouillon',
        aps_apd: 'APS/APD',
        bc_os: 'BC/OS',
        execution: 'En cours',
        pv_reception: 'PV/Réception',
        cloture: 'Clôturé',
      };
      const nextStatus = statusMap[next?.stepKey || ''];
      if (nextStatus) {
        await updateProject({ status: nextStatus as Project['status'] });
      }
    } catch (e) {
      console.error(e);
    } finally {
      setActionLoading(false);
    }
  };

  if (isCommune && id) {
    return (
      <CommuneProjectDetail
        project={project}
        steps={steps}
        stepsLoading={stepsLoading}
        projectId={id}
        onUpdateStatus={async (status) => {
          await updateProject({ status });
        }}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/affaires')}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{project.title}</h1>
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${getStatusColor(project.status)}`}>
                {project.status}
              </span>
            </div>
            <p className="text-sm text-slate-500">
              {project.reference} · {project.location}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${getTypeColor(project.type)}`}>
            {project.type}
          </span>
        </div>
      </div>

      <ProjectInstructionActions
        project={project}
        onUpdateStatus={async (status) => {
          await updateProject({ status });
        }}
      />

      <div className="flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm w-fit">
        {([
          { key: 'admin', label: 'Administratif & Financier', icon: <Euro size={14} /> },
          { key: 'technical', label: 'Technique', icon: <Wrench size={14} /> },
          { key: 'documents', label: 'Documents', icon: <FileText size={14} /> },
          { key: 'workflow', label: 'Workflow', icon: <GitBranch size={14} /> },
          { key: 'cee', label: 'CEE & Efficacité', icon: <Leaf size={14} /> },
        ] as { key: Tab; label: string; icon: React.ReactNode }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              activeTab === t.key
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {t.icon} {t.label}
          </button>
        ))}
      </div>

      {activeTab === 'admin' && (
        <AdminTab
          project={project}
          canEdit={canEdit}
          onSave={updateProject}
          onRefetchProject={refetchProject}
        />
      )}
      {activeTab === 'technical' && (
        <TechnicalTab
          project={project}
          canEdit={canEdit}
          onSave={updateProject}
        />
      )}
      {activeTab === 'documents' && id && (
        <DocumentsTab
          docs={docs}
          loading={docsLoading}
          projectId={id}
          organizationId={organizationId}
          canEdit={canEdit}
          onUploaded={refetchDocs}
        />
      )}
      {activeTab === 'workflow' && (
        <WorkflowTab
          steps={steps}
          loading={stepsLoading}
          canValidate={canValidate}
          actionLoading={actionLoading}
          onAdvance={handleAdvanceWorkflow}
        />
      )}
      {activeTab === 'cee' && <EnergyCEEDashboard project={project} />}
    </div>
  );
}

function SaveButton({
  saving,
  disabled,
  onClick,
}: {
  saving: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || saving}
      className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
    >
      {saving ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
      ) : (
        <Save size={14} />
      )}
      {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
    </button>
  );
}

function AdminTab({
  project,
  canEdit,
  onSave,
  onRefetchProject,
}: {
  project: Project;
  canEdit: boolean;
  onSave: (updates: Partial<Project>) => Promise<void>;
  onRefetchProject: () => Promise<void>;
}) {
  const [form, setForm] = useState<AdminFormState>(() => buildAdminForm(project));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showBpuChiffrage, setShowBpuChiffrage] = useState(false);

  const handleQuoteTotalChange = useCallback((totalHt: number) => {
    setForm((f) => ({
      ...f,
      quoteAmountHt: totalHt,
      budgetTotal: applyQuoteAcceptedBudget(f.quoteStatus, totalHt, f.budgetTotal),
    }));
  }, []);

  const {
    lines: quoteLines,
    loading: quoteLinesLoading,
    error: quoteLinesError,
    addLine,
    deleteLine,
  } = useProjectQuoteLines(project.id, handleQuoteTotalChange);

  const hasQuoteLines = quoteLines.length > 0;

  useEffect(() => {
    if (hasQuoteLines) {
      setShowBpuChiffrage(true);
    }
  }, [hasQuoteLines]);

  useEffect(() => {
    setForm(buildAdminForm(project));
  }, [project.updatedAt, project.id]);

  const isDirty =
    form.status !== project.status ||
    form.reference !== project.reference ||
    form.startDate !== toDateInputValue(project.startDate) ||
    form.expectedEndDate !== toDateInputValue(project.expectedEndDate) ||
    form.ppiYear !== (project.ppiYear ?? null) ||
    form.budgetTotal !== project.budgetTotal ||
    form.budgetConsumed !== project.budgetConsumed ||
    form.quoteStatus !== project.quoteStatus ||
    form.quoteAmountHt !== project.quoteAmountHt ||
    form.billingStatus !== project.billingStatus ||
    form.invoiceDeposit !== project.invoiceDeposit ||
    form.invoiceBalance !== project.invoiceBalance;

  const datesValid =
    !form.startDate ||
    !form.expectedEndDate ||
    form.startDate <= form.expectedEndDate;

  const isValid =
    form.budgetConsumed <= form.budgetTotal &&
    form.reference.trim().length > 0 &&
    datesValid;

  const handleSave = async () => {
    if (!canEdit || !isDirty || !isValid) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await onSave({
        status: form.status,
        reference: form.reference.trim(),
        startDate: form.startDate || '',
        expectedEndDate: form.expectedEndDate || '',
        ppiYear: form.ppiYear,
        budgetTotal: form.budgetTotal,
        budgetConsumed: form.budgetConsumed,
        quoteStatus: form.quoteStatus,
        quoteAmountHt: form.quoteAmountHt,
        billingStatus: form.billingStatus,
        invoiceDeposit: form.invoiceDeposit,
        invoiceBalance: form.invoiceBalance,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  const quoteAmountTtc = Math.round(form.quoteAmountHt * (1 + VAT_RATE));

  const pdfProject: Project = {
    ...project,
    reference: form.reference,
    quoteAmountHt: form.quoteAmountHt,
    quoteStatus: form.quoteStatus,
    billingStatus: form.billingStatus,
    invoiceDeposit: form.invoiceDeposit,
    invoiceBalance: form.invoiceBalance,
  };

  const quotePdfAvailable = canDownloadQuote(pdfProject);
  const invoicePdfAvailable = canDownloadInvoice(pdfProject);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-900">Informations administratives</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Statut de l&apos;affaire</label>
              <select
                value={form.status}
                onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProjectStatus }))}
                disabled={!canEdit}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              >
                {PROJECT_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Référence</label>
              <input
                type="text"
                value={form.reference}
                onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))}
                disabled={!canEdit}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Année PPI (programmation)
              </label>
              <select
                value={form.ppiYear ?? ''}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    ppiYear: e.target.value === '' ? null : Number(e.target.value),
                  }))
                }
                disabled={!canEdit}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              >
                <option value="">Non programmé</option>
                {PPI_YEAR_OPTIONS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-[10px] text-slate-400">
                Année de réalisation prévue pour le PPI syndical
              </p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 text-sm font-bold text-slate-900">Suivi financier</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Budget total (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.budgetTotal}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    budgetTotal: e.target.value === '' ? 0 : parseFloat(e.target.value),
                  }))
                }
                disabled={!canEdit}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Budget consommé (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.budgetConsumed}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    budgetConsumed: e.target.value === '' ? 0 : parseFloat(e.target.value),
                  }))
                }
                disabled={!canEdit}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            {!isValid && (
              <p className="text-xs text-red-600">
                Le budget consommé ne peut pas dépasser le budget total.
              </p>
            )}
            <div className="border-t border-slate-100 pt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-600">Reste à dépenser</span>
                <span className="text-sm font-bold text-emerald-700">
                  {formatCurrency(form.budgetTotal - form.budgetConsumed)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
            <Calendar size={16} className="text-slate-500" />
            Suivi planning
          </h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Date de début</label>
              <input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                disabled={!canEdit}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Date de fin</label>
              <input
                type="date"
                value={form.expectedEndDate}
                onChange={(e) => setForm((f) => ({ ...f, expectedEndDate: e.target.value }))}
                disabled={!canEdit}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>
            {!datesValid && (
              <p className="text-xs text-red-600">
                La date de début doit être antérieure ou égale à la date de fin.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-900">Pilotage budget &amp; délais</h3>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Budget</p>
            <BudgetProgressBar
              budgetTotal={form.budgetTotal}
              budgetConsumed={form.budgetConsumed}
            />
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Temps</p>
            {form.startDate && form.expectedEndDate ? (
              <TimeProgressBar
                startDate={form.startDate}
                endDate={form.expectedEndDate}
                status={form.status}
              />
            ) : (
              <p className="text-xs text-slate-400">
                Renseignez les dates de début et de fin pour activer le suivi temporel.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
            <Euro size={16} className="text-slate-500" />
            Chiffrage (Devis)
          </h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Statut du devis</label>
              <select
                value={form.quoteStatus}
                onChange={(e) => {
                  const quoteStatus = e.target.value as QuoteStatus;
                  setForm((f) => ({
                    ...f,
                    quoteStatus,
                    budgetTotal: applyQuoteAcceptedBudget(quoteStatus, f.quoteAmountHt, f.budgetTotal),
                  }));
                }}
                disabled={!canEdit}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              >
                {QUOTE_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">Montant Devis HT (€)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.quoteAmountHt}
                onChange={(e) => {
                  const quoteAmountHt = e.target.value === '' ? 0 : parseFloat(e.target.value);
                  setForm((f) => ({
                    ...f,
                    quoteAmountHt,
                    budgetTotal: applyQuoteAcceptedBudget(f.quoteStatus, quoteAmountHt, f.budgetTotal),
                  }));
                }}
                disabled={!canEdit || hasQuoteLines}
                readOnly={hasQuoteLines}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              />
              {hasQuoteLines && (
                <p className="mt-1 text-xs text-slate-500">
                  Montant calculé automatiquement à partir des lignes du bordereau.
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setShowBpuChiffrage((v) => !v)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-slate-400 hover:bg-slate-100"
            >
              ➕ Chiffrer au bordereau
            </button>
            {showBpuChiffrage && (
              <ProjectQuoteLinesSection
                canEdit={canEdit}
                lines={quoteLines}
                linesLoading={quoteLinesLoading}
                linesError={quoteLinesError}
                addLine={addLine}
                deleteLine={deleteLine}
                onProjectSync={() => void onRefetchProject()}
              />
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Montant TTC (TVA {Math.round(VAT_RATE * 100)} %)
              </label>
              <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
                {formatCurrency(quoteAmountTtc)}
              </div>
            </div>
            {form.quoteStatus === 'Accepté' && form.quoteAmountHt > 0 && (
              <p className="text-xs text-emerald-700">
                Le budget total a été aligné sur le montant HT du devis accepté.
              </p>
            )}
            <button
              type="button"
              onClick={() => generateProjectPdf(pdfProject, 'devis', quoteLines)}
              disabled={!quotePdfAvailable}
              title={
                quotePdfAvailable
                  ? 'Générer et télécharger le devis PDF'
                  : 'Saisissez un montant HT pour générer le devis'
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileDown size={16} className="text-slate-500" />
              Télécharger le Devis
            </button>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-900">
            <FileText size={16} className="text-slate-500" />
            Suivi de la Facturation
          </h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-600">
                Statut de facturation
              </label>
              <select
                value={form.billingStatus}
                onChange={(e) =>
                  setForm((f) => ({ ...f, billingStatus: e.target.value as BillingStatus }))
                }
                disabled={!canEdit}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              >
                {BILLING_STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <p className="text-xs font-medium text-slate-600">Actions rapides</p>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 transition-colors hover:bg-slate-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
                <input
                  type="checkbox"
                  checked={form.invoiceDeposit}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      invoiceDeposit: e.target.checked,
                      billingStatus: e.target.checked ? 'Acompte émis' : f.billingStatus,
                    }))
                  }
                  disabled={!canEdit}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                />
                <span className="text-sm text-slate-700">
                  Facture d&apos;acompte (30 %)
                  {form.quoteAmountHt > 0 && (
                    <span className="ml-1 text-xs text-slate-500">
                      — {formatCurrency(Math.round(form.quoteAmountHt * 0.3))} HT
                    </span>
                  )}
                </span>
              </label>
              <label className="flex cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 transition-colors hover:bg-slate-50 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60">
                <input
                  type="checkbox"
                  checked={form.invoiceBalance}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      invoiceBalance: e.target.checked,
                      billingStatus: e.target.checked ? 'Facturé total' : f.billingStatus,
                    }))
                  }
                  disabled={!canEdit}
                  className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-400"
                />
                <span className="text-sm text-slate-700">
                  Facture de Solde
                  {form.quoteAmountHt > 0 && (
                    <span className="ml-1 text-xs text-slate-500">
                      — {formatCurrency(Math.round(form.quoteAmountHt * 0.7))} HT restant
                    </span>
                  )}
                </span>
              </label>
            </div>
            <button
              type="button"
              onClick={() => generateProjectPdf(pdfProject, 'facture', quoteLines)}
              disabled={!invoicePdfAvailable}
              title={
                invoicePdfAvailable
                  ? 'Générer et télécharger la facture PDF'
                  : 'Le statut de facturation doit évoluer (acompte ou solde) pour générer la facture'
              }
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <FileDown size={16} className="text-slate-500" />
              Télécharger la Facture
            </button>
          </div>
        </div>
      </div>

      <ProjectPpiSection project={project} canEdit={canEdit} />

      {!canEdit && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            Mode lecture seule — Les modifications sont réservées au chargé d&apos;affaires, DST et DGS.
          </p>
        </div>
      )}

      {canEdit && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {saveError && <p className="text-xs text-red-600">{saveError}</p>}
            {saveSuccess && (
              <p className="text-xs text-emerald-600">Modifications enregistrées avec succès.</p>
            )}
          </div>
          <SaveButton
            saving={saving}
            disabled={!isDirty || !isValid}
            onClick={() => void handleSave()}
          />
        </div>
      )}
    </div>
  );
}

function TechnicalTab({
  project,
  canEdit,
  onSave,
}: {
  project: Project;
  canEdit: boolean;
  onSave: (updates: Partial<Project>) => Promise<void>;
}) {
  const [form, setForm] = useState<TechnicalFormState>(() => buildTechnicalForm(project));
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    setForm(buildTechnicalForm(project));
  }, [project.updatedAt, project.id]);

  const isDirty =
    form.type !== project.type ||
    form.description !== project.description ||
    form.location !== project.location ||
    form.latitude !== (project.latitude ?? null) ||
    form.longitude !== (project.longitude ?? null);

  const handleCoordinatesChange = useCallback((lat: number, lng: number) => {
    setForm((f) => ({ ...f, latitude: lat, longitude: lng }));
  }, []);

  const handleSave = async () => {
    if (!canEdit || !isDirty) return;
    setSaving(true);
    setSaveError(null);
    setSaveSuccess(false);
    try {
      await onSave({
        type: form.type,
        description: form.description,
        location: form.location.trim(),
        latitude: form.latitude ?? undefined,
        longitude: form.longitude ?? undefined,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Erreur lors de la sauvegarde');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-900">Données techniques</h3>
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Type de chantier</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as ProjectType }))}
              disabled={!canEdit}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
            >
              {PROJECT_TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-slate-600">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              rows={4}
              disabled={!canEdit}
              className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500"
              placeholder="Décrivez le périmètre, la ville ou le site..."
            />
          </div>
        </div>
      </div>

      {isEclairagePublicProject(project) && <LedRoiSimulator project={project} />}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-bold text-slate-900">Position géographique</h3>
        <ProjectMapEditor
          latitude={form.latitude}
          longitude={form.longitude}
          location={form.location}
          onLocationChange={(location) => setForm((f) => ({ ...f, location }))}
          onCoordinatesChange={handleCoordinatesChange}
          readOnly={!canEdit}
          mapKey={`detail-${project.id}`}
        />
      </div>

      <ProjectTimesheetSection
        projectId={project.id}
        enabled={project.enableTimeTracking}
        canEdit={canEdit}
        onToggle={async (enabled) => {
          await onSave({ enableTimeTracking: enabled });
        }}
      />

      <ProjectPhotoGallerySection projectId={project.id} canEdit={canEdit} />

      {!canEdit && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            Mode lecture seule — Les modifications sont réservées au chargé d&apos;affaires, DST et DGS.
          </p>
        </div>
      )}

      {canEdit && (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {saveError && <p className="text-xs text-red-600">{saveError}</p>}
            {saveSuccess && (
              <p className="text-xs text-emerald-600">Modifications enregistrées avec succès.</p>
            )}
          </div>
          <SaveButton saving={saving} disabled={!isDirty} onClick={() => void handleSave()} />
        </div>
      )}
    </div>
  );
}

function DocumentsTab({
  docs,
  loading,
  projectId,
  organizationId,
  canEdit,
  onUploaded,
}: {
  docs: import('../hooks/useProjects').ProjectDocument[];
  loading: boolean;
  projectId: string;
  organizationId: string;
  canEdit: boolean;
  onUploaded: () => Promise<void>;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [category, setCategory] = useState<DocumentCategory>('Administratif');
  const [dragOver, setDragOver] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const uploadFiles = async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    if (!fileArray.length || !canEdit) return;

    setUploading(true);
    setUploadProgress(0);
    setUploadError(null);

    try {
      for (let i = 0; i < fileArray.length; i++) {
        const file = fileArray[i];
        await uploadDocumentToStorage(
          organizationId,
          { file, projectId, category },
          (percent) => {
            const overall = Math.round(((i + percent / 100) / fileArray.length) * 100);
            setUploadProgress(overall);
          },
        );
      }
      await onUploaded();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erreur lors de l'upload");
    } finally {
      setUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files?.length) return;
    void uploadFiles(files);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (!canEdit || uploading) return;
    const files = e.dataTransfer.files;
    if (files.length) void uploadFiles(files);
  };

  const handleDelete = async (doc: import('../hooks/useProjects').ProjectDocument) => {
    if (!canEdit) return;
    if (!window.confirm(`Supprimer le document « ${doc.name} » ?`)) return;

    setDeletingId(doc.id);
    try {
      await deleteDocumentFromStorage(organizationId, doc);
      await onUploaded();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Erreur lors de la suppression');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
      </div>
    );
  }

  const CATEGORY_COLORS: Record<string, string> = {
    Administratif: 'bg-sky-50 text-sky-700 ring-sky-600/20',
    Technique: 'bg-amber-50 text-amber-700 ring-amber-600/20',
    Financier: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-sm font-bold text-slate-900">Documents liés à l&apos;affaire</h3>
        {canEdit && (
          <div className="flex items-center gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as DocumentCategory)}
              disabled={uploading}
              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs text-slate-600 focus:border-slate-400 focus:outline-none disabled:opacity-50"
            >
              <option value="Administratif">Administratif</option>
              <option value="Technique">Technique</option>
              <option value="Financier">Financier</option>
            </select>
          </div>
        )}
      </div>

      {canEdit && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`rounded-lg border border-dashed p-6 transition-colors ${
            dragOver
              ? 'border-slate-900 bg-slate-100'
              : 'border-slate-200 bg-slate-50/50'
          } ${uploading ? 'pointer-events-none opacity-50' : ''}`}
        >
          <label className="flex cursor-pointer flex-col items-center gap-2 text-center">
            <Paperclip size={20} className="text-slate-400" />
            <span className="text-sm text-slate-600">
              Glissez-déposez vos fichiers ici ou cliquez pour sélectionner
            </span>
            <span className="text-xs text-slate-400">PDF, images, documents Office…</span>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.webp"
            />
          </label>
          {uploading && (
            <div className="mt-3">
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-slate-900 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="mt-1 text-center text-xs text-slate-500">Import {uploadProgress}%</p>
            </div>
          )}
        </div>
      )}

      {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}

      {!canEdit && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            Mode lecture seule — L&apos;ajout et la suppression de documents sont réservés au chargé d&apos;affaires, DST et DGS.
          </p>
        </div>
      )}

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/50">
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Document</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Catégorie</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Taille</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Version</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600">Actions</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((doc) => (
                <tr key={doc.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <FileText size={16} className="text-slate-400 shrink-0" />
                      <span className="font-medium text-slate-900">{doc.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${CATEGORY_COLORS[doc.category] || 'bg-gray-50 text-gray-700 ring-gray-600/20'}`}>
                      {doc.category}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">{doc.size}</td>
                  <td className="px-4 py-3 text-slate-500">v{doc.version}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => downloadDocument(doc)}
                        className="inline-flex items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        <Download size={12} /> Télécharger
                      </button>
                      {canEdit && (
                        <button
                          onClick={() => void handleDelete(doc)}
                          disabled={deletingId === doc.id}
                          className="inline-flex items-center gap-1 rounded-md border border-red-200 px-2 py-1 text-xs font-medium text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                        >
                          {deletingId === doc.id ? (
                            <div className="h-3 w-3 animate-spin rounded-full border-2 border-red-300 border-t-red-600" />
                          ) : (
                            <Trash2 size={12} />
                          )}
                          Supprimer
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {docs.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-400">
                    Aucun document pour cette affaire.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function WorkflowTab({
  steps,
  loading,
  canValidate,
  actionLoading,
  onAdvance,
}: {
  steps: import('../hooks/useProjects').WorkflowStep[];
  loading: boolean;
  canValidate: boolean;
  actionLoading: boolean;
  onAdvance: () => void;
}) {
  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
      </div>
    );
  }

  const activeIndex = steps.findIndex((s) => s.status === 'active');
  const progress = steps.length
    ? Math.round(
        ((steps.filter((s) => s.status === 'completed').length) / steps.length) * 100
      )
    : 0;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Cycle de vie du dossier</h3>
            <p className="text-xs text-slate-500">Avancement : {progress}%</p>
          </div>
          {canValidate && activeIndex !== -1 && (
            <button
              onClick={onAdvance}
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50 transition-colors"
            >
              {actionLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <CheckCircle size={14} />
              )}
              Valider l&apos;étape active
            </button>
          )}
          {!canValidate && activeIndex !== -1 && (
            <span className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-medium text-slate-500">
              <Lock size={12} /> Réservé DST/DGS
            </span>
          )}
        </div>

        <div className="relative">
          <div className="absolute left-0 right-0 top-[19px] h-1 bg-slate-100 rounded-full" />
          <div
            className="absolute left-0 top-[19px] h-1 rounded-full bg-slate-900 transition-all"
            style={{ width: `${progress}%` }}
          />
          {steps.length === 0 ? (
            <p className="relative z-10 py-6 text-center text-sm text-slate-500">
              Aucune étape de workflow pour ce dossier.
            </p>
          ) : (
          <div className="relative flex justify-between">
            {steps.map((step, idx) => {
              const isActive = step.status === 'active';
              const isCompleted = step.status === 'completed';
              return (
                <div key={step.id} className="flex flex-col items-center gap-2 z-10">
                  <div
                    className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-colors ${
                      isCompleted
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : isActive
                        ? 'border-blue-600 bg-white text-blue-600 ring-4 ring-blue-100'
                        : 'border-slate-200 bg-white text-slate-400'
                    }`}
                  >
                    {isCompleted ? <CheckCircle size={16} /> : idx + 1}
                  </div>
                  <span
                    className={`max-w-[100px] text-center text-[11px] font-medium leading-tight ${
                      isActive ? 'text-blue-700 font-semibold' : isCompleted ? 'text-slate-700' : 'text-slate-400'
                    }`}
                  >
                    {step.stepLabel}
                  </span>
                  {step.completedBy && (
                    <span className="text-[10px] text-slate-400">
                      {step.completedBy}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <Clock size={12} /> Durée estimée
          </div>
          <p className="mt-1 text-sm font-medium text-slate-900">En cours</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <CheckCircle size={12} /> Étapes validées
          </div>
          <p className="mt-1 text-sm font-medium text-slate-900">
            {steps.filter((s) => s.status === 'completed').length} / {steps.length}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            <AlertCircle size={12} /> Prochaine échéance
          </div>
          <p className="mt-1 text-sm font-medium text-slate-900">Validation APS/APD</p>
        </div>
      </div>
    </div>
  );
}
