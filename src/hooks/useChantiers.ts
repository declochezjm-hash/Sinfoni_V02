import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { formatApiError } from '../lib/formatApiError';
import { logSupabaseError } from '../lib/supabaseDiagnostics';
import { queryLoadingWhileAuth, useSupabaseQueryEnabled } from '../lib/authQuery';
import type { Chantier } from '../types';

function mapChantier(row: Record<string, unknown>): Chantier {
  const lat = row.latitude ?? row.lat;
  const lng = row.longitude ?? row.lng ?? row.lon;
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    code: row.code != null ? String(row.code) : null,
    name: String(row.name),
    address: row.address != null ? String(row.address) : null,
    status: String(row.status ?? 'en_cours'),
    createdAt: String(row.created_at),
    latitude: lat != null ? Number(lat) : null,
    longitude: lng != null ? Number(lng) : null,
    budgetTotal: row.budget_total != null ? Number(row.budget_total) : null,
  };
}

async function fetchChantiers(organizationId: string): Promise<Chantier[]> {
  const { data, error, status } = await supabase
    .from('chantiers')
    .select('id, organization_id, code, name, address, status, created_at, latitude, longitude, budget_total')
    .eq('organization_id', organizationId)
    .order('code', { ascending: true });

  if (error) {
    logSupabaseError('chantiers.select', error, status);
    throw { ...error, status: status ?? (error as { status?: number }).status };
  }

  if (import.meta.env.DEV) {
    console.log('[useChantiers] requête Supabase', {
      table: 'chantiers',
      organizationId,
      httpStatus: status ?? null,
      rawCount: data?.length ?? 0,
      withGps: (data ?? []).filter((r) => r.latitude != null && r.longitude != null).length,
    });
  }

  return (data ?? []).map(mapChantier);
}

export function useChantiers() {
  const { authInitialized, organizationId, enabled: queryEnabled } = useSupabaseQueryEnabled();

  const query = useQuery({
    queryKey: ['chantiers', organizationId],
    queryFn: () => fetchChantiers(organizationId!),
    enabled: queryEnabled,
    staleTime: 30_000,
  });

  const loading = queryLoadingWhileAuth(authInitialized, queryEnabled, query.isLoading);

  return {
    chantiers: query.data ?? [],
    loading,
    error: query.error ? formatApiError(query.error) : null,
    refetch: query.refetch,
  };
}
