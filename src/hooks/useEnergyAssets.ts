import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useSupabaseQueryEnabled, queryLoadingWhileAuth } from '../lib/authQuery';
import { useAuth } from './useAuth';
import { useRole } from './useRole';
import { SYNDICAT_STAFF_ROLES } from './useTickets';
import type { EnergyAsset, EnergyAssetStatus } from '../types';

export function useCanRepositionEnergyAssets(): boolean {
  const { canAccess } = useRole();
  return canAccess(SYNDICAT_STAFF_ROLES);
}

export function useCanCreateEnergyAssets(): boolean {
  return useCanRepositionEnergyAssets();
}

function mapEnergyAsset(row: Record<string, unknown>): EnergyAsset {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    communeInseeCode: String(row.commune_insee_code),
    name: String(row.name),
    type: String(row.type) as EnergyAsset['type'],
    status: String(row.status) as EnergyAsset['status'],
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    metadata: (row.metadata as Record<string, unknown>) ?? {},
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function fetchEnergyAssets(
  organizationId: string,
  communeInseeCode?: string,
): Promise<EnergyAsset[]> {
  let query = supabase
    .from('energy_assets')
    .select('*')
    .eq('organization_id', organizationId)
    .order('name');

  if (communeInseeCode) {
    query = query.eq('commune_insee_code', communeInseeCode);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map(mapEnergyAsset);
}

export function useEnergyAssets() {
  const { authInitialized, organizationId, enabled: queryEnabled } = useSupabaseQueryEnabled();
  const { isCommune, communeInseeCode } = useRole();

  const enabled = queryEnabled && (!isCommune || !!communeInseeCode);

  const {
    data: assets = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['energy-assets', organizationId, isCommune ? communeInseeCode : null],
    queryFn: () =>
      fetchEnergyAssets(organizationId!, isCommune ? communeInseeCode : undefined),
    enabled,
    staleTime: 30_000,
  });

  return {
    assets,
    loading: queryLoadingWhileAuth(authInitialized, enabled, isLoading),
    error: error instanceof Error ? error.message : error ? String(error) : null,
    refetch,
  };
}

export interface UpdateEnergyAssetInput {
  id: string;
  name?: string;
  status?: EnergyAssetStatus;
  communeInseeCode?: string;
  latitude?: number;
  longitude?: number;
  metadata?: Record<string, unknown>;
}

export function useUpdateEnergyAsset() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  return useMutation({
    mutationFn: async (input: UpdateEnergyAssetInput) => {
      const payload: Record<string, unknown> = {};
      if (input.name !== undefined) payload.name = input.name.trim();
      if (input.status !== undefined) payload.status = input.status;
      if (input.communeInseeCode !== undefined) payload.commune_insee_code = input.communeInseeCode.trim();
      if (input.latitude !== undefined) payload.latitude = input.latitude;
      if (input.longitude !== undefined) payload.longitude = input.longitude;
      if (input.metadata !== undefined) payload.metadata = input.metadata;

      const { data, error } = await supabase
        .from('energy_assets')
        .update(payload)
        .eq('organization_id', organizationId)
        .eq('id', input.id)
        .select('*')
        .single();

      if (error) throw error;
      return mapEnergyAsset(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['energy-assets'] });
    },
  });
}

export interface CreateEnergyAssetInput {
  name: string;
  type: EnergyAsset['type'];
  status: EnergyAssetStatus;
  communeInseeCode: string;
  latitude: number;
  longitude: number;
  metadata: Record<string, unknown>;
}

export function useCreateEnergyAsset() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateEnergyAssetInput) => {
      const { data, error } = await supabase
        .from('energy_assets')
        .insert({
          organization_id: organizationId,
          name: input.name.trim(),
          type: input.type,
          status: input.status,
          commune_insee_code: input.communeInseeCode.trim(),
          latitude: input.latitude,
          longitude: input.longitude,
          metadata: input.metadata,
        })
        .select('*')
        .single();

      if (error) throw error;
      return mapEnergyAsset(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['energy-assets'] });
    },
  });
}

export function useDeleteEnergyAsset() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('energy_assets')
        .delete()
        .eq('organization_id', organizationId)
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['energy-assets'] });
    },
  });
}

export function useBulkDeleteEnergyAssets() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  return useMutation({
    mutationFn: async (ids: string[]) => {
      if (ids.length === 0) return 0;

      const CHUNK_SIZE = 50;
      const chunks: string[][] = [];

      for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
        chunks.push(ids.slice(i, i + CHUNK_SIZE));
      }

      for (const chunk of chunks) {
        const { error } = await supabase
          .from('energy_assets')
          .delete()
          .eq('organization_id', organizationId)
          .in('id', chunk);

        if (error) throw error;
      }

      return ids.length;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['energy-assets'] });
    },
  });
}
