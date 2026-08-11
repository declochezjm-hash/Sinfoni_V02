import { useState } from 'react';
import { useUpdateEnergyAsset } from './useEnergyAssets';
import { useToast } from './useToast';
import { formatApiError } from '../lib/formatApiError';
import type { EnergyAssetRepositionState } from '../lib/energyAssetReposition';
import type { EnergyAsset, EnergyAssetType } from '../types';

interface UseEnergyAssetRepositionOptions {
  onZoomTo?: (latitude: number, longitude: number) => void;
  onEnsureLayerVisible?: (type: EnergyAssetType) => void;
}

export function useEnergyAssetReposition(options?: UseEnergyAssetRepositionOptions) {
  const { toast } = useToast();
  const updateEnergyAsset = useUpdateEnergyAsset();
  const [reposition, setReposition] = useState<EnergyAssetRepositionState | null>(null);

  const startReposition = (asset: EnergyAsset) => {
    setReposition({
      assetId: asset.id,
      assetName: asset.name,
      originalLatitude: asset.latitude,
      originalLongitude: asset.longitude,
      pendingLatitude: asset.latitude,
      pendingLongitude: asset.longitude,
    });
    options?.onZoomTo?.(asset.latitude, asset.longitude);
    options?.onEnsureLayerVisible?.(asset.type);
  };

  const handleDragEnd = (latitude: number, longitude: number) => {
    setReposition((prev) =>
      prev
        ? {
            ...prev,
            pendingLatitude: latitude,
            pendingLongitude: longitude,
          }
        : null,
    );
  };

  const cancelReposition = () => setReposition(null);

  const saveReposition = async () => {
    if (!reposition) return;

    const moved =
      reposition.pendingLatitude !== reposition.originalLatitude ||
      reposition.pendingLongitude !== reposition.originalLongitude;

    if (!moved) {
      setReposition(null);
      return;
    }

    try {
      await updateEnergyAsset.mutateAsync({
        id: reposition.assetId,
        latitude: reposition.pendingLatitude,
        longitude: reposition.pendingLongitude,
      });
      toast.success('Position de l\'équipement mise à jour avec succès', {
        description: `« ${reposition.assetName} » : ${reposition.pendingLatitude.toFixed(5)}, ${reposition.pendingLongitude.toFixed(5)}`,
      });
      setReposition(null);
    } catch (err) {
      toast.error('Échec du repositionnement', { description: formatApiError(err) });
    }
  };

  return {
    reposition,
    startReposition,
    handleDragEnd,
    saveReposition,
    cancelReposition,
    saving: updateEnergyAsset.isPending,
  };
}
