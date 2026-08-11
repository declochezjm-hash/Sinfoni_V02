import type { EnergyAsset, EnergyAssetStatus } from '../types';

export const ENERGY_ASSET_STATUS_CREATE_OPTIONS: {
  value: EnergyAssetStatus;
  label: string;
}[] = [
  { value: 'functional', label: 'En service' },
  { value: 'maintenance', label: 'En projet' },
  { value: 'broken', label: 'En panne' },
];

export const LIGHTING_TECHNOLOGY_OPTIONS = [
  { value: 'LED', label: 'LED' },
  { value: 'Classique', label: 'Classique' },
];

export const IRVE_CONNECTOR_OPTIONS = [
  'Type 2',
  'Type 2 Combo',
  'CHAdeMO',
  'CCS',
];

export function inferNearestCommuneInsee(
  latitude: number,
  longitude: number,
  assets: EnergyAsset[],
): string | undefined {
  if (assets.length === 0) return undefined;

  let nearest: EnergyAsset | null = null;
  let minDist = Infinity;

  for (const asset of assets) {
    const dLat = asset.latitude - latitude;
    const dLng = asset.longitude - longitude;
    const dist = dLat * dLat + dLng * dLng;
    if (dist < minDist) {
      minDist = dist;
      nearest = asset;
    }
  }

  return nearest?.communeInseeCode;
}
