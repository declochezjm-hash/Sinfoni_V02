import type { EnergyAsset, EnergyAssetStatus } from '../types';
import { getEnergyAssetStatusLabel } from './energyAssetMarkers';

/** Métadonnées SIG typées pour un point d'éclairage public (JSONB `energy_assets.metadata`). */
export interface EclairageAssetMetadata {
  total_power_w?: number;
  circuit_count?: number;
  nb_foyers?: number;
  /** Type technologique explicite (LED, Classique, Sodium, etc.) */
  type_eclairage?: string;
  technologie?: string;
  source?: string;
  type_lampe?: string;
  lamp_type?: string;
  equipement?: string;
  /** Identifiant SIG / réseau */
  id?: string;
  code?: string;
  reference?: string;
  ref?: string;
}

export type EclairageLightingTechnology = 'LED' | 'Classique' | 'Non renseigné';

export interface EclairageAssetSummary {
  pointName: string;
  pointIdentifier: string;
  totalPowerW: number | null;
  lightingTechnology: EclairageLightingTechnology;
  equipmentStatus: EnergyAssetStatus;
  equipmentStatusLabel: string;
  circuitCount: number | null;
  nbFoyers: number | null;
  communeInseeCode: string;
  coordinates: { latitude: number; longitude: number };
}

function normalizeMetadataKey(key: string): string {
  return key.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function readMetadataString(
  metadata: Record<string, unknown>,
  candidates: string[],
): string | undefined {
  const normalized = Object.fromEntries(
    Object.entries(metadata).map(([k, v]) => [normalizeMetadataKey(k), v]),
  );
  for (const candidate of candidates) {
    const value = normalized[normalizeMetadataKey(candidate)];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return String(value).trim();
    }
  }
  return undefined;
}

function readMetadataNumber(
  metadata: Record<string, unknown>,
  candidates: string[],
): number | null {
  const raw = readMetadataString(metadata, candidates);
  if (raw === undefined) return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

export function parseEclairageMetadata(metadata: Record<string, unknown>): EclairageAssetMetadata {
  return {
    total_power_w: readMetadataNumber(metadata, [
      'total_power_w',
      'puissance',
      'power',
      'puiss_w',
      'puissance_w',
    ]) ?? undefined,
    circuit_count: readMetadataNumber(metadata, ['circuit_count', 'circuits', 'nb_circuits']) ?? undefined,
    nb_foyers: readMetadataNumber(metadata, ['nb_foyers', 'foyers', 'nb_foyer']) ?? undefined,
    type_eclairage: readMetadataString(metadata, ['type_eclairage', 'type_ecl', 'eclairage_type']),
    technologie: readMetadataString(metadata, ['technologie', 'technology', 'tech']),
    source: readMetadataString(metadata, ['source', 'type_source']),
    type_lampe: readMetadataString(metadata, ['type_lampe', 'lampe', 'lamp_type']),
    lamp_type: readMetadataString(metadata, ['lamp_type']),
    equipement: readMetadataString(metadata, ['equipement', 'equipment', 'type_equipement']),
    id: readMetadataString(metadata, ['id', 'id_point', 'identifiant']),
    code: readMetadataString(metadata, ['code', 'code_point']),
    reference: readMetadataString(metadata, ['reference', 'ref', 'ref_point']),
    ref: readMetadataString(metadata, ['ref']),
  };
}

export function inferEclairageLightingTechnology(
  metadata: Record<string, unknown>,
): EclairageLightingTechnology {
  const parsed = parseEclairageMetadata(metadata);
  const candidates = [
    parsed.type_eclairage,
    parsed.technologie,
    parsed.source,
    parsed.type_lampe,
    parsed.lamp_type,
    parsed.equipement,
  ].filter(Boolean) as string[];

  for (const value of candidates) {
    const text = value.toLowerCase();
    if (text.includes('led')) return 'LED';
    if (
      text.includes('classique') ||
      text.includes('sodium') ||
      text.includes('mercure') ||
      text.includes('halogen') ||
      text.includes('halog') ||
      text.includes('incandescent') ||
      text.includes('fluo')
    ) {
      return 'Classique';
    }
  }

  return 'Non renseigné';
}

export function buildEclairageAssetSummary(asset: EnergyAsset): EclairageAssetSummary {
  const meta = parseEclairageMetadata(asset.metadata);
  const pointIdentifier =
    meta.reference ?? meta.ref ?? meta.code ?? meta.id ?? asset.id.slice(0, 8).toUpperCase();

  return {
    pointName: asset.name,
    pointIdentifier,
    totalPowerW: meta.total_power_w ?? null,
    lightingTechnology: inferEclairageLightingTechnology(asset.metadata),
    equipmentStatus: asset.status,
    equipmentStatusLabel: getEnergyAssetStatusLabel(asset.status),
    circuitCount: meta.circuit_count ?? null,
    nbFoyers: meta.nb_foyers ?? null,
    communeInseeCode: asset.communeInseeCode,
    coordinates: { latitude: asset.latitude, longitude: asset.longitude },
  };
}

export function buildEclairageTicketContextBlock(asset: EnergyAsset): string {
  const summary = buildEclairageAssetSummary(asset);
  const lines = [
    `Point : ${summary.pointName}`,
    `Identifiant : ${summary.pointIdentifier}`,
    `Puissance totale : ${summary.totalPowerW != null ? `${summary.totalPowerW} W` : '—'}`,
    `Type d'éclairage : ${summary.lightingTechnology}`,
    `Statut équipement : ${summary.equipmentStatusLabel}`,
  ];

  if (summary.circuitCount != null) lines.push(`Circuits : ${summary.circuitCount}`);
  if (summary.nbFoyers != null) lines.push(`Foyers : ${summary.nbFoyers}`);
  lines.push(`Commune INSEE : ${summary.communeInseeCode}`);
  lines.push(
    `Coordonnées : ${summary.coordinates.latitude.toFixed(5)}, ${summary.coordinates.longitude.toFixed(5)}`,
  );

  return lines.join('\n');
}

export function buildTicketDescriptionWithAssetContext(
  userDescription: string,
  asset: EnergyAsset,
): string {
  const trimmed = userDescription.trim();
  if (asset.type !== 'eclairage') return trimmed;

  return `${trimmed}\n\n--- Contexte actif (éclairage public) ---\n${buildEclairageTicketContextBlock(asset)}`;
}

export function countActiveTicketsLabel(count: number): string {
  if (count <= 0) return '';
  if (count === 1) return '1 ticket en cours';
  return `${count} tickets en cours`;
}
