import { download } from '@mapbox/shp-write';
import type { Feature, FeatureCollection, Point } from 'geojson';
import type { EnergyAsset, EnergyAssetType } from '../types';
import { getEnergyAssetStatusLabel } from './energyAssetMarkers';

export type SigExportFilter = EnergyAssetType | 'all';

function extractPuissance(asset: EnergyAsset): number {
  if (asset.type === 'irve') {
    const kw = asset.metadata.power_kw;
    return typeof kw === 'number' ? kw : Number(kw) || 0;
  }
  const watts = asset.metadata.total_power_w;
  return typeof watts === 'number' ? watts : Number(watts) || 0;
}

function assetToFeature(asset: EnergyAsset): Feature<Point> {
  return {
    type: 'Feature',
    geometry: {
      type: 'Point',
      coordinates: [asset.longitude, asset.latitude],
    },
    properties: {
      id: asset.id,
      nom: asset.name,
      type: asset.type,
      puissance: extractPuissance(asset),
      etat: getEnergyAssetStatusLabel(asset.status),
      insee: asset.communeInseeCode,
    },
  };
}

export function buildEnergyAssetsGeoJson(
  assets: EnergyAsset[],
  filterType: SigExportFilter = 'all',
): FeatureCollection<Point> {
  const filtered =
    filterType === 'all' ? assets : assets.filter((asset) => asset.type === filterType);

  return {
    type: 'FeatureCollection',
    features: filtered.map(assetToFeature),
  };
}

export function exportEnergyAssetsToShapefile(
  assets: EnergyAsset[],
  options?: {
    filterType?: SigExportFilter;
    folderName?: string;
    layerName?: string;
  },
): void {
  const filterType = options?.filterType ?? 'all';
  const filtered =
    filterType === 'all' ? assets : assets.filter((asset) => asset.type === filterType);

  if (filtered.length === 0) {
    throw new Error('Aucun équipement à exporter pour ce filtre.');
  }

  const geojson = buildEnergyAssetsGeoJson(filtered, filterType);
  const typeSuffix = filterType === 'all' ? 'energie' : filterType;
  const date = new Date().toISOString().slice(0, 10);
  const folder = options?.folderName ?? `export_${typeSuffix}_${date}`;
  const layerName = options?.layerName ?? `points_${typeSuffix}`;

  download(geojson, {
    folder,
    types: {
      point: layerName,
    },
  } as Parameters<typeof download>[1]);
}
