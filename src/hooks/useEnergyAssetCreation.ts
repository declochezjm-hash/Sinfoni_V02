import { useState } from 'react';
import {
  useCreateEnergyAsset,
  type CreateEnergyAssetInput,
} from './useEnergyAssets';
import { useToast } from './useToast';
import { formatApiError } from '../lib/formatApiError';
import { inferNearestCommuneInsee } from '../lib/energyAssetCreation';
import { getEnergyAssetTypeLabel } from '../lib/energyAssetMarkers';
import type { EnergyAsset, EnergyAssetType } from '../types';

interface UseEnergyAssetCreationOptions {
  energyAssets: EnergyAsset[];
  onZoomTo?: (latitude: number, longitude: number) => void;
  onEnsureLayerVisible?: (type: EnergyAssetType) => void;
}

export function useEnergyAssetCreation(options: UseEnergyAssetCreationOptions) {
  const { toast } = useToast();
  const createAsset = useCreateEnergyAsset();

  const [creationType, setCreationType] = useState<EnergyAssetType | null>(null);
  const [pendingPlacement, setPendingPlacement] = useState<{
    latitude: number;
    longitude: number;
    inferredCommuneInsee?: string;
  } | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const startCreation = (type: EnergyAssetType) => {
    setCreationType(type);
    setPendingPlacement(null);
    setModalOpen(false);
    options.onEnsureLayerVisible?.(type);
  };

  const cancelCreation = () => {
    setCreationType(null);
    setPendingPlacement(null);
    setModalOpen(false);
  };

  const handleMapClick = (latitude: number, longitude: number) => {
    if (!creationType || modalOpen) return;

    const inferredCommuneInsee = inferNearestCommuneInsee(
      latitude,
      longitude,
      options.energyAssets,
    );

    setPendingPlacement({
      latitude,
      longitude,
      inferredCommuneInsee,
    });
    setModalOpen(true);
  };

  const submitCreate = async (input: CreateEnergyAssetInput) => {
    try {
      const asset = await createAsset.mutateAsync(input);
      toast.success('Nouvel équipement créé avec succès', {
        description: `« ${asset.name} » a été ajouté au patrimoine.`,
      });
      options.onZoomTo?.(asset.latitude, asset.longitude);
      options.onEnsureLayerVisible?.(asset.type);
      cancelCreation();
      return asset;
    } catch (err) {
      toast.error('Échec de la création', { description: formatApiError(err) });
      throw err;
    }
  };

  const creationTypeLabel = creationType ? getEnergyAssetTypeLabel(creationType) : '';

  return {
    creationType,
    creationTypeLabel,
    isCreationActive: creationType !== null && !modalOpen,
    pendingPlacement,
    modalOpen,
    startCreation,
    cancelCreation,
    handleMapClick,
    submitCreate,
    setModalOpen,
    saving: createAsset.isPending,
  };
}
