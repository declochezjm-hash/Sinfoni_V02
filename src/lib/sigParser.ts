import shp from 'shpjs';
import type { EnergyAssetType } from '../types';

export interface ParsedSigFeature {
  name: string;
  type: EnergyAssetType;
  latitude: number;
  longitude: number;
  metadata: Record<string, unknown>;
}

type GeoJsonGeometry =
  | { type: 'Point'; coordinates: number[] }
  | { type: 'MultiPoint'; coordinates: number[][] };

interface GeoJsonFeature {
  type: 'Feature';
  geometry: GeoJsonGeometry | null;
  properties: Record<string, unknown> | null;
}

interface GeoJsonFeatureCollection {
  type: 'FeatureCollection';
  features: GeoJsonFeature[];
}

function normalizeKey(key: string): string {
  return key.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
}

function findProperty(props: Record<string, unknown>, candidates: string[]): unknown {
  const normalized = Object.fromEntries(
    Object.entries(props).map(([k, v]) => [normalizeKey(k), v]),
  );
  for (const candidate of candidates) {
    const value = normalized[normalizeKey(candidate)];
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      return value;
    }
  }
  return undefined;
}

function inferAssetType(props: Record<string, unknown>): EnergyAssetType {
  const raw = findProperty(props, [
    'type',
    'TYPE',
    'categorie',
    'category',
    'famille',
    'equipement',
    'layer',
  ]);
  const text = String(raw ?? '').toLowerCase();

  if (
    text.includes('irve') ||
    text.includes('borne') ||
    text.includes('recharge') ||
    text.includes('ev') ||
    text.includes('charging')
  ) {
    return 'irve';
  }

  if (
    text.includes('eclair') ||
    text.includes('lamp') ||
    text.includes('luminaire') ||
    text.includes('light')
  ) {
    return 'eclairage';
  }

  const power = findProperty(props, ['puissance', 'power', 'power_kw', 'puiss_kw', 'PUISSANCE']);
  if (power !== undefined) {
    const num = Number(power);
    if (!Number.isNaN(num) && num >= 3) return 'irve';
  }

  return 'eclairage';
}

function buildMetadata(props: Record<string, unknown>, type: EnergyAssetType): Record<string, unknown> {
  const power = findProperty(props, ['puissance', 'power', 'power_kw', 'puiss_kw', 'PUISSANCE', 'Puissance']);
  const metadata: Record<string, unknown> = { ...props };

  if (power !== undefined) {
    const num = Number(power);
    if (!Number.isNaN(num)) {
      if (type === 'irve') metadata.power_kw = num;
      else metadata.total_power_w = num;
    }
  }

  const connector = findProperty(props, ['connector_type', 'connecteur', 'prise', 'type_prise']);
  if (connector !== undefined && type === 'irve') {
    metadata.connector_type = String(connector);
  }

  return metadata;
}

function extractName(props: Record<string, unknown>, index: number): string {
  const raw = findProperty(props, [
    'nom',
    'name',
    'libelle',
    'label',
    'designation',
    'id',
    'code',
    'ref',
    'reference',
  ]);
  if (raw !== undefined) return String(raw);
  return `Équipement ${index + 1}`;
}

function pointToLatLng(coords: number[]): { latitude: number; longitude: number } | null {
  if (coords.length < 2) return null;
  const [a, b] = coords;
  if (Math.abs(a) <= 90 && Math.abs(b) <= 180) {
    return { latitude: a, longitude: b };
  }
  return { latitude: b, longitude: a };
}

function featureToParsed(feature: GeoJsonFeature, index: number): ParsedSigFeature | null {
  if (!feature.geometry) return null;

  let coords: number[] | null = null;
  if (feature.geometry.type === 'Point') {
    coords = feature.geometry.coordinates;
  } else if (feature.geometry.type === 'MultiPoint' && feature.geometry.coordinates.length > 0) {
    coords = feature.geometry.coordinates[0];
  }

  if (!coords) return null;

  const latLng = pointToLatLng(coords);
  if (!latLng) return null;

  const props = feature.properties ?? {};
  const type = inferAssetType(props);

  return {
    name: extractName(props, index),
    type,
    latitude: latLng.latitude,
    longitude: latLng.longitude,
    metadata: buildMetadata(props, type),
  };
}

function normalizeToFeatureCollection(data: unknown): GeoJsonFeatureCollection {
  if (!data || typeof data !== 'object') {
    throw new Error('Fichier SIG invalide : structure GeoJSON attendue.');
  }

  const obj = data as Record<string, unknown>;

  if (obj.type === 'FeatureCollection' && Array.isArray(obj.features)) {
    return obj as unknown as GeoJsonFeatureCollection;
  }

  if (obj.type === 'Feature') {
    return { type: 'FeatureCollection', features: [obj as unknown as GeoJsonFeature] };
  }

  if (Array.isArray(data)) {
    const collections = data as GeoJsonFeatureCollection[];
    const features = collections.flatMap((c) => c.features ?? []);
    return { type: 'FeatureCollection', features };
  }

  throw new Error('Fichier SIG invalide : aucune feature Point détectée.');
}

function extractPointFeatures(collection: GeoJsonFeatureCollection): ParsedSigFeature[] {
  const results: ParsedSigFeature[] = [];

  collection.features.forEach((feature, index) => {
    const parsed = featureToParsed(feature, index);
    if (parsed) results.push(parsed);
  });

  if (results.length === 0) {
    throw new Error(
      'Aucun point géographique trouvé. Seuls les équipements de type Point ou MultiPoint sont pris en charge.',
    );
  }

  return results;
}

async function parseGeoJsonFile(file: File): Promise<ParsedSigFeature[]> {
  const text = await file.text();
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('Fichier GeoJSON invalide : JSON mal formé.');
  }
  const collection = normalizeToFeatureCollection(data);
  return extractPointFeatures(collection);
}

async function parseShapefileZip(file: File): Promise<ParsedSigFeature[]> {
  const buffer = await file.arrayBuffer();
  const data = await shp(buffer);
  const collection = normalizeToFeatureCollection(data);
  return extractPointFeatures(collection);
}

const ACCEPTED_EXTENSIONS = ['.zip', '.geojson', '.json'];

export function isAcceptedSigFile(file: File): boolean {
  const name = file.name.toLowerCase();
  return ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext));
}

export async function parseSigFile(file: File): Promise<ParsedSigFeature[]> {
  const name = file.name.toLowerCase();

  if (name.endsWith('.geojson') || name.endsWith('.json')) {
    return parseGeoJsonFile(file);
  }

  if (name.endsWith('.zip')) {
    return parseShapefileZip(file);
  }

  throw new Error('Format non supporté. Utilisez un fichier .zip (Shapefile) ou .geojson.');
}
