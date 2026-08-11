import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { formatApiError } from '../lib/formatApiError';
import { logSupabaseError } from '../lib/supabaseDiagnostics';
import { queryLoadingWhileAuth, useSupabaseQueryEnabled } from '../lib/authQuery';

export type PpiPlanificationStatus = 'Validé' | 'Programmé' | 'Envisagé' | string;

export interface PpiPlanificationLine {
  id: string;
  organizationId: string;
  chantierId: string | null;
  projectId: string | null;
  exerciseYear: number;
  enveloppeVotee: number;
  engage: number;
  realise: number;
  status: PpiPlanificationStatus;
  financingNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePpiPlanificationInput {
  projectId: string;
  chantierId?: string | null;
  exerciseYear: number;
  enveloppeVotee: number;
  engage?: number;
  realise?: number;
  status: PpiPlanificationStatus;
  financingNote?: string | null;
}

function mapPpiRow(row: Record<string, unknown>): PpiPlanificationLine {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    chantierId: row.chantier_id != null ? String(row.chantier_id) : null,
    projectId: row.project_id != null ? String(row.project_id) : null,
    exerciseYear: Number(row.exercise_year),
    enveloppeVotee: Number(row.enveloppe_votee ?? 0),
    engage: Number(row.engage ?? 0),
    realise: Number(row.realise ?? 0),
    status: String(row.status ?? 'Envisagé'),
    financingNote: row.financing_note != null ? String(row.financing_note) : null,
    createdAt: String(row.created_at ?? ''),
    updatedAt: String(row.updated_at ?? ''),
  };
}

async function fetchPpiPlanification(
  organizationId: string,
  projectId: string,
  chantierId?: string | null,
): Promise<PpiPlanificationLine[]> {
  let query = supabase
    .from('ppi_planification')
    .select('*')
    .eq('organization_id', organizationId)
    .order('exercise_year', { ascending: true });

  if (chantierId) {
    query = query.or(`project_id.eq.${projectId},chantier_id.eq.${chantierId}`);
  } else {
    query = query.eq('project_id', projectId);
  }

  const { data, error, status } = await query;

  if (error) {
    logSupabaseError('ppi_planification.select', error, status);
    throw { ...error, status: status ?? (error as { status?: number }).status };
  }

  return (data ?? []).map((row) => mapPpiRow(row as Record<string, unknown>));
}

export function usePpiPlanification(projectId: string | undefined, chantierId?: string | null) {
  const { authInitialized, organizationId, enabled } = useSupabaseQueryEnabled();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['ppi_planification', organizationId, projectId ?? '', chantierId ?? ''],
    queryFn: () => fetchPpiPlanification(organizationId, projectId!, chantierId),
    enabled: enabled && !!projectId,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async (input: CreatePpiPlanificationInput) => {
      const { data, error, status } = await supabase
        .from('ppi_planification')
        .insert({
          organization_id: organizationId,
          project_id: input.projectId,
          chantier_id: input.chantierId ?? null,
          exercise_year: input.exerciseYear,
          enveloppe_votee: input.enveloppeVotee,
          engage: input.engage ?? 0,
          realise: input.realise ?? 0,
          status: input.status,
          financing_note: input.financingNote ?? null,
        })
        .select('*')
        .single();

      if (error) {
        logSupabaseError('ppi_planification.insert', error, status);
        throw { ...error, status: status ?? (error as { status?: number }).status };
      }
      return mapPpiRow(data as Record<string, unknown>);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ppi_planification'] });
    },
  });

  const loading = queryLoadingWhileAuth(authInitialized, enabled && !!projectId, query.isPending);

  return {
    lines: query.data ?? [],
    loading,
    error: query.error ? formatApiError(query.error) : null,
    refetch: query.refetch,
    createLine: createMutation.mutateAsync,
    creating: createMutation.isPending,
    createError: createMutation.error ? formatApiError(createMutation.error) : null,
  };
}

export function ppiStatusBadgeClass(status: string): string {
  switch (status.trim().toLowerCase()) {
    case 'validé':
    case 'valide':
      return 'bg-emerald-100 text-emerald-800 ring-emerald-600/20';
    case 'programmé':
    case 'programme':
      return 'bg-sky-100 text-sky-800 ring-sky-600/20';
    case 'envisagé':
    case 'envisage':
      return 'bg-amber-100 text-amber-800 ring-amber-600/20';
    default:
      return 'bg-slate-100 text-slate-700 ring-slate-600/20';
  }
}
