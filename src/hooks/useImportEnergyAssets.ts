import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import { useRole } from './useRole';
import type { ParsedSigFeature } from '../lib/sigParser';

export interface ImportEnergyAssetsInput {
  features: ParsedSigFeature[];
  /** Code INSEE imposé côté client — jamais lu depuis le fichier SIG. */
  communeInseeCode: string;
}

export function useImportEnergyAssets() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();
  const { communeInseeCode: roleCommuneInseeCode, isCommune } = useRole();

  return useMutation({
    mutationFn: async ({ features, communeInseeCode }: ImportEnergyAssetsInput) => {
      if (!organizationId) throw new Error('Organisation non identifiée.');
      if (isCommune) {
        throw new Error('Les communes ne sont pas autorisées à importer des équipements SIG.');
      }
      if (!communeInseeCode) {
        throw new Error('Code INSEE commune manquant — importation impossible.');
      }

      if (roleCommuneInseeCode && communeInseeCode !== roleCommuneInseeCode) {
        throw new Error(
          'Le code INSEE fourni ne correspond pas à votre commune. Importation refusée.',
        );
      }

      const rows = features.map((f) => ({
        organization_id: organizationId,
        commune_insee_code: communeInseeCode,
        name: f.name,
        type: f.type,
        status: 'functional' as const,
        latitude: f.latitude,
        longitude: f.longitude,
        metadata: f.metadata,
      }));

      const { data, error } = await supabase.from('energy_assets').insert(rows).select('id');

      if (error) throw error;
      return { inserted: data?.length ?? rows.length };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['energy-assets'] });
    },
  });
}
