import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { resolveProjectCoordinates } from '../lib/geo';
import { formatApiError } from '../lib/formatApiError';
import { logSupabaseError } from '../lib/supabaseDiagnostics';
import { useAuth } from './useAuth';
import { queryLoadingWhileAuth, useSupabaseQueryEnabled } from '../lib/authQuery';
import { useRole } from './useRole';
import { COMMUNE_WORK_TO_PROJECT_TYPE } from '../lib/projectConstants';
import type {
  Project,
  ActivityLog,
  ProjectStatus,
  ProjectType,
  QuoteStatus,
  BillingStatus,
  CommuneWorkRequestType,
} from '../types';

async function fetchProjects(
  organizationId: string | null | undefined,
  communeInseeCode?: string,
): Promise<Project[]> {
  let query = supabase.from('projects').select('*');
  if (organizationId) query = query.eq('organization_id', organizationId);
  if (communeInseeCode) query = query.eq('commune_insee_code', communeInseeCode);

  const result = await Promise.race([
    query.order('updated_at', { ascending: false }),
    new Promise<never>((_, reject) => {
      window.setTimeout(() => reject(new Error('Timeout : chargement des affaires (API projects).')), 15_000);
    }),
  ]);

  const { data, error, status } = result;
  if (error) {
    logSupabaseError('projects.select', error, status);
    throw { ...error, status: status ?? (error as { status?: number }).status };
  }

  if (import.meta.env.DEV) {
    console.log('[useProjects] requête Supabase', {
      table: 'projects',
      organizationId,
      httpStatus: status ?? null,
      rawCount: data?.length ?? 0,
    });
  }

  return (data || []).map(mapProject);
}

export function useProjects() {
  const { authInitialized, organizationId, enabled: queryEnabled } = useSupabaseQueryEnabled();
  const { isCommune, communeInseeCode } = useRole();
  const { data: projects = [], isPending, isFetching, isError, error, refetch } = useQuery({
    queryKey: ['projects', organizationId ?? 'all', isCommune ? communeInseeCode : 'all'],
    queryFn: () => fetchProjects(organizationId, isCommune ? communeInseeCode : undefined),
    enabled: queryEnabled && (!isCommune || !!communeInseeCode),
    staleTime: 30_000,
    retry: 1,
  });

  // Spinner seulement tant qu'il n'y a pas encore de résultat (succès ou erreur).
  const loading = queryLoadingWhileAuth(
    authInitialized,
    queryEnabled,
    isPending && isFetching && !isError,
  );

  return {
    projects,
    data: projects,
    loading,
    isLoading: loading,
    error: error ? formatApiError(error) : null,
    refetch,
  };
}

export interface ProjectFormInput {
  reference: string;
  title: string;
  description: string;
  status: ProjectStatus;
  type: ProjectType;
  budgetTotal?: number;
  budgetConsumed?: number;
  quoteStatus?: QuoteStatus;
  quoteAmountHt?: number;
  billingStatus?: BillingStatus;
  invoiceDeposit?: boolean;
  invoiceBalance?: boolean;
  latitude?: number | null;
  longitude?: number | null;
  location: string;
}

/** Champs alignés sur projects (snake_case côté PostgreSQL). */
export type ProjectCreateInput = ProjectFormInput & {
  owner_id: string;
  owner_name: string;
};

/** Étapes standard du cycle de vie (alignées sur les statuts projet). */
export const WORKFLOW_STEPS = [
  { step_key: 'etude', step_label: 'Étude', step_order: 0 },
  { step_key: 'preparation', step_label: 'Préparation', step_order: 1 },
  { step_key: 'realisation', step_label: 'Réalisation', step_order: 2 },
  { step_key: 'reception', step_label: 'Réception', step_order: 3 },
  { step_key: 'cloture', step_label: 'Clôture', step_order: 4 },
] as const;

/** Index de l’étape active (ou >= length = tout complété) selon le statut projet. */
export function workflowActiveOrderForStatus(status: string | undefined | null): number {
  switch (status) {
    case 'APS/APD':
    case 'BC/OS':
      return 1; // Préparation
    case 'En cours':
      return 2; // Réalisation
    case 'PV/Réception':
      return 3; // Réception
    case 'Clôturé':
      return WORKFLOW_STEPS.length; // toutes complétées
    default:
      // Brouillon | En Étude | Proposé | Validé | À planifier
      return 0; // Étude
  }
}

function buildWorkflowStepRows(
  projectId: string,
  organizationId: string,
  projectStatus?: string | null,
) {
  const activeOrder = workflowActiveOrderForStatus(projectStatus);
  const now = new Date().toISOString();
  return WORKFLOW_STEPS.map((s) => {
    const completed = s.step_order < activeOrder;
    const active = s.step_order === activeOrder && activeOrder < WORKFLOW_STEPS.length;
    return {
      organization_id: organizationId,
      project_id: projectId,
      step_key: s.step_key,
      step_label: s.step_label,
      step_order: s.step_order,
      status: completed ? 'completed' : active ? 'active' : 'pending',
      completed_at: completed ? now : null,
      completed_by: completed ? 'Système' : null,
    };
  });
}

/** Crée les étapes standard si le projet n’en a aucune (seed / anciens dossiers). */
export async function ensureProjectWorkflowSteps(
  projectId: string,
  organizationId: string,
  projectStatus?: string | null,
): Promise<boolean> {
  const { count, error: countErr } = await supabase
    .from('workflow_steps')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', organizationId)
    .eq('project_id', projectId);

  if (countErr) throw countErr;
  if ((count ?? 0) > 0) return false;

  const { error } = await supabase
    .from('workflow_steps')
    .insert(buildWorkflowStepRows(projectId, organizationId, projectStatus));

  if (error) throw error;
  return true;
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  return useMutation({
    mutationFn: async (input: ProjectCreateInput) => {
      if (!organizationId) throw new Error('Organisation non définie');

      const { latitude, longitude } = resolveProjectCoordinates({
        title: input.title,
        description: input.description,
        latitude: input.latitude,
        longitude: input.longitude,
      });

      const { data, error } = await supabase
        .from('projects')
        .insert({
          organization_id: organizationId,
          reference: input.reference,
          title: input.title,
          description: input.description,
          type: input.type,
          status: input.status,
          budget_total: input.budgetTotal ?? 0,
          budget_consumed: input.budgetConsumed ?? 0,
          quote_status: input.quoteStatus ?? 'Brouillon',
          quote_amount_ht: input.quoteAmountHt ?? 0,
          billing_status: input.billingStatus ?? 'À émettre',
          invoice_deposit: input.invoiceDeposit ?? false,
          invoice_balance: input.invoiceBalance ?? false,
          location: input.location?.trim() || '',
          latitude,
          longitude,
          owner_id: input.owner_id,
          owner_name: input.owner_name,
        })
        .select('id')
        .single();

      if (error) throw error;

      if (data?.id) {
        await ensureProjectWorkflowSteps(data.id, organizationId, input.status);
      }

      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export interface CommuneDemandInput {
  workType: CommuneWorkRequestType;
  description: string;
  latitude: number;
  longitude: number;
  communeInseeCode: string;
  ownerId: string;
  ownerName: string;
}

export function useCreateCommuneDemand() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  return useMutation({
    mutationFn: async (input: CommuneDemandInput) => {
      if (!organizationId) throw new Error('Organisation non définie');

      const projectType = COMMUNE_WORK_TO_PROJECT_TYPE[input.workType];
      const reference = `DEM-${input.communeInseeCode}-${Date.now().toString(36).toUpperCase()}`;
      const title = `${input.workType} — Demande commune`;

      const { data, error } = await supabase
        .from('projects')
        .insert({
          organization_id: organizationId,
          reference,
          title,
          description: input.description,
          type: projectType,
          status: 'Brouillon',
          budget_total: 0,
          budget_consumed: 0,
          quote_status: 'Brouillon',
          quote_amount_ht: 0,
          billing_status: 'À émettre',
          invoice_deposit: false,
          invoice_balance: false,
          location: `Commune INSEE ${input.communeInseeCode}`,
          latitude: input.latitude,
          longitude: input.longitude,
          commune_insee_code: input.communeInseeCode,
          source_demand: 'commune',
          owner_id: input.ownerId,
          owner_name: input.ownerName,
        })
        .select('id')
        .single();

      if (error) throw error;

      if (data?.id) {
        await ensureProjectWorkflowSteps(data.id, organizationId, 'Brouillon');
      }

      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  return useMutation({
    mutationFn: async (input: ProjectFormInput & { id: string }) => {
      const { latitude, longitude } = resolveProjectCoordinates({
        id: input.id,
        title: input.title,
        description: input.description,
        latitude: input.latitude,
        longitude: input.longitude,
      });

      const { error } = await supabase
        .from('projects')
        .update({
          reference: input.reference,
          title: input.title,
          description: input.description,
          type: input.type,
          status: input.status,
          budget_total: input.budgetTotal ?? 0,
          budget_consumed: input.budgetConsumed ?? 0,
          quote_status: input.quoteStatus ?? 'Brouillon',
          quote_amount_ht: input.quoteAmountHt ?? 0,
          billing_status: input.billingStatus ?? 'À émettre',
          invoice_deposit: input.invoiceDeposit ?? false,
          invoice_balance: input.invoiceBalance ?? false,
          location: input.location?.trim() || '',
          latitude,
          longitude,
          updated_at: new Date().toISOString(),
        })
        .eq('organization_id', organizationId)
        .eq('id', input.id);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('organization_id', organizationId)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useProject(id: string | null) {
  const { organizationId } = useAuth();
  const { isCommune, communeInseeCode } = useRole();
  const queryClient = useQueryClient();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!id) { setLoading(false); return; }
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('projects')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('id', id)
      .maybeSingle();
    if (err) {
      setError(err.message);
    } else if (data) {
      const mapped = mapProject(data);
      if (isCommune && communeInseeCode && mapped.communeInseeCode !== communeInseeCode) {
        setProject(null);
        setError('Accès refusé à ce dossier.');
      } else {
        setProject(mapped);
      }
    }
    setLoading(false);
  }, [id, organizationId, isCommune, communeInseeCode]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  const updateProject = useCallback(async (updates: Partial<Project>) => {
    if (!id) return;
    const payload: Record<string, unknown> = {};
    if (updates.reference !== undefined) payload.reference = updates.reference;
    if (updates.title !== undefined) payload.title = updates.title;
    if (updates.description !== undefined) payload.description = updates.description;
    if (updates.type !== undefined) payload.type = updates.type;
    if (updates.status !== undefined) payload.status = updates.status;
    if (updates.budgetTotal !== undefined) payload.budget_total = updates.budgetTotal;
    if (updates.budgetConsumed !== undefined) payload.budget_consumed = updates.budgetConsumed;
    if (updates.quoteStatus !== undefined) payload.quote_status = updates.quoteStatus;
    if (updates.quoteAmountHt !== undefined) payload.quote_amount_ht = updates.quoteAmountHt;
    if (updates.billingStatus !== undefined) payload.billing_status = updates.billingStatus;
    if (updates.invoiceDeposit !== undefined) payload.invoice_deposit = updates.invoiceDeposit;
    if (updates.invoiceBalance !== undefined) payload.invoice_balance = updates.invoiceBalance;
    if (updates.startDate !== undefined) payload.start_date = updates.startDate || null;
    if (updates.expectedEndDate !== undefined) payload.expected_end_date = updates.expectedEndDate || null;
    if (updates.actualEndDate !== undefined) payload.actual_end_date = updates.actualEndDate || null;
    if (updates.ownerId !== undefined) payload.owner_id = updates.ownerId;
    if (updates.ownerName !== undefined) payload.owner_name = updates.ownerName;
    if (updates.contractorId !== undefined) payload.contractor_id = updates.contractorId;
    if (updates.contractorName !== undefined) payload.contractor_name = updates.contractorName;
    if (updates.location !== undefined) payload.location = updates.location;
    if (updates.latitude !== undefined) payload.latitude = updates.latitude;
    if (updates.longitude !== undefined) payload.longitude = updates.longitude;
    if (updates.enableTimeTracking !== undefined) payload.enable_time_tracking = updates.enableTimeTracking;
    if (updates.ppiYear !== undefined) payload.ppi_year = updates.ppiYear;
    payload.updated_at = new Date().toISOString();

    const { error: err } = await supabase
      .from('projects')
      .update(payload)
      .eq('organization_id', organizationId)
      .eq('id', id);
    if (err) throw err;
    await fetchProject();
    void queryClient.invalidateQueries({ queryKey: ['projects'] });
  }, [id, organizationId, fetchProject, queryClient]);

  return { project, loading, error, refetch: fetchProject, updateProject };
}

export function useWorkflowSteps(projectId: string | null) {
  const { organizationId } = useAuth();
  const [steps, setSteps] = useState<WorkflowStep[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSteps = useCallback(async () => {
    if (!projectId || !organizationId) {
      setSteps([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('workflow_steps')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('project_id', projectId)
        .order('step_order', { ascending: true });

      if (error) throw error;

      if (!data?.length) {
        const { data: project } = await supabase
          .from('projects')
          .select('status')
          .eq('id', projectId)
          .eq('organization_id', organizationId)
          .maybeSingle();

        await ensureProjectWorkflowSteps(
          projectId,
          organizationId,
          project?.status ? String(project.status) : null,
        );

        const { data: seeded, error: seededErr } = await supabase
          .from('workflow_steps')
          .select('*')
          .eq('organization_id', organizationId)
          .eq('project_id', projectId)
          .order('step_order', { ascending: true });

        if (seededErr) throw seededErr;
        setSteps((seeded || []).map(mapWorkflowStep));
      } else {
        setSteps(data.map(mapWorkflowStep));
      }
    } catch {
      setSteps([]);
    } finally {
      setLoading(false);
    }
  }, [projectId, organizationId]);

  useEffect(() => {
    fetchSteps();
  }, [fetchSteps]);

  const advanceStep = useCallback(async (stepId: string, userName: string) => {
    const { error: err } = await supabase
      .from('workflow_steps')
      .update({ status: 'completed', completed_at: new Date().toISOString(), completed_by: userName })
      .eq('organization_id', organizationId)
      .eq('id', stepId);
    if (err) throw err;
    await fetchSteps();
  }, [organizationId, fetchSteps]);

  const activateNext = useCallback(async (nextOrder: number) => {
    if (!projectId) return;
    const { error: err } = await supabase
      .from('workflow_steps')
      .update({ status: 'active' })
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .eq('step_order', nextOrder);
    if (err) throw err;
    await fetchSteps();
  }, [projectId, organizationId, fetchSteps]);

  return { steps, loading, refetch: fetchSteps, advanceStep, activateNext };
}

export function useProjectDocuments(projectId: string | null) {
  const { organizationId } = useAuth();
  const [docs, setDocs] = useState<ProjectDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocs = useCallback(async () => {
    if (!projectId) { setLoading(false); return; }
    setLoading(true);
    const { data } = await supabase
      .from('documents')
      .select('*')
      .eq('organization_id', organizationId)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false });
    setDocs((data || []).map(mapDocument));
    setLoading(false);
  }, [projectId, organizationId]);

  useEffect(() => {
    fetchDocs();
  }, [fetchDocs]);

  return { docs, loading, refetch: fetchDocs };
}

export function useActivityLogs() {
  const { organizationId } = useAuth();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('activity_logs')
      .select('*')
      .eq('organization_id', organizationId)
      .order('timestamp', { ascending: false })
      .limit(50);
    setLogs((data || []).map(mapActivityLog));
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const addLog = useCallback(async (log: Omit<ActivityLog, 'id'>) => {
    const { error: err } = await supabase.from('activity_logs').insert({
      organization_id: organizationId,
      user_id: log.userId,
      user_name: log.userName,
      user_role: log.userRole,
      action: log.action,
      target_type: log.targetType,
      target_id: log.targetId,
      target_label: log.targetLabel,
      timestamp: log.timestamp,
    });
    if (err) throw err;
    await fetchLogs();
  }, [organizationId, fetchLogs]);

  return { logs, loading, refetch: fetchLogs, addLog };
}

// Mappers
function mapProject(row: Record<string, unknown>): Project {
  return {
    id: String(row.id),
    reference: String(row.reference),
    title: String(row.title),
    description: String(row.description || ''),
    type: String(row.type) as Project['type'],
    status: String(row.status) as Project['status'],
    budgetTotal: Number(row.budget_total || 0),
    budgetConsumed: Number(row.budget_consumed || 0),
    quoteStatus: (row.quote_status as QuoteStatus) || 'Brouillon',
    quoteAmountHt: Number(row.quote_amount_ht || 0),
    billingStatus: (row.billing_status as BillingStatus) || 'À émettre',
    invoiceDeposit: Boolean(row.invoice_deposit),
    invoiceBalance: Boolean(row.invoice_balance),
    startDate: String(row.start_date || ''),
    expectedEndDate: String(row.expected_end_date || ''),
    actualEndDate: row.actual_end_date ? String(row.actual_end_date) : undefined,
    ownerId: String(row.owner_id),
    ownerName: String(row.owner_name),
    contractorId: row.contractor_id ? String(row.contractor_id) : undefined,
    contractorName: row.contractor_name ? String(row.contractor_name) : undefined,
    location: String(row.location || ''),
    latitude: row.latitude != null ? Number(row.latitude) : row.lat != null ? Number(row.lat) : undefined,
    longitude: row.longitude != null ? Number(row.longitude) : row.lng != null ? Number(row.lng) : undefined,
    enableTimeTracking: Boolean(row.enable_time_tracking),
    ppiYear: row.ppi_year != null ? Number(row.ppi_year) : null,
    communeInseeCode: row.commune_insee_code ? String(row.commune_insee_code) : undefined,
    sourceDemand: row.source_demand ? (String(row.source_demand) as Project['sourceDemand']) : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapWorkflowStep(row: Record<string, unknown>): WorkflowStep {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    stepKey: String(row.step_key),
    stepLabel: String(row.step_label),
    stepOrder: Number(row.step_order || 0),
    status: String(row.status) as WorkflowStep['status'],
    completedAt: row.completed_at ? String(row.completed_at) : undefined,
    completedBy: row.completed_by ? String(row.completed_by) : undefined,
    createdAt: String(row.created_at),
  };
}

function mapDocument(row: Record<string, unknown>): ProjectDocument {
  return {
    id: String(row.id),
    projectId: String(row.project_id),
    name: String(row.name),
    category: String(row.category) as ProjectDocument['category'],
    size: String(row.size || ''),
    fileUrl: row.file_url ? String(row.file_url) : null,
    version: Number(row.version || 1),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapActivityLog(row: Record<string, unknown>): ActivityLog {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    userName: String(row.user_name),
    userRole: String(row.user_role) as ActivityLog['userRole'],
    action: String(row.action),
    targetType: String(row.target_type) as ActivityLog['targetType'],
    targetId: String(row.target_id),
    targetLabel: String(row.target_label),
    timestamp: String(row.timestamp),
  };
}

// Types local to this hook
export interface WorkflowStep {
  id: string;
  projectId: string;
  stepKey: string;
  stepLabel: string;
  stepOrder: number;
  status: 'pending' | 'active' | 'completed' | 'skipped';
  completedAt?: string;
  completedBy?: string;
  createdAt: string;
}

export interface ProjectDocument {
  id: string;
  projectId: string;
  name: string;
  category: 'Administratif' | 'Technique' | 'Financier';
  size: string;
  fileUrl: string | null;
  version: number;
  createdAt: string;
  updatedAt: string;
}
