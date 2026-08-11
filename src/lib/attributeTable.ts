import type {
  Chantier,
  EnergyAsset,
  EnergyAssetStatus,
  MaintenanceTicket,
  MaintenanceTicketPriority,
  MaintenanceTicketStatus,
} from '../types';
import type { MapProjectEntry } from './mapFilters';

export type AttributeTableLayerId = 'chantiers' | 'eclairage' | 'irve' | 'tickets';

export type AttributeColumnType = 'text' | 'number' | 'enum';

export interface AttributeColumnDef {
  key: string;
  label: string;
  type: AttributeColumnType;
  editable: boolean;
  enumOptions?: { value: string; label: string }[];
  source: 'standard' | 'metadata';
}

export interface AttributeTableRow {
  id: string;
  latitude: number;
  longitude: number;
  values: Record<string, string>;
  sourceType: 'energy_asset' | 'ticket' | 'chantier' | 'site_chantier';
  energyAsset?: EnergyAsset;
  ticket?: MaintenanceTicket;
  chantier?: MapProjectEntry;
  siteChantier?: Chantier;
}

const ENERGY_STATUS_OPTIONS: { value: EnergyAssetStatus; label: string }[] = [
  { value: 'functional', label: 'Fonctionnel' },
  { value: 'maintenance', label: 'En maintenance' },
  { value: 'broken', label: 'En panne' },
];

const LIGHTING_TECH_OPTIONS = [
  { value: 'LED', label: 'LED' },
  { value: 'Classique', label: 'Classique' },
  { value: 'Non renseigné', label: 'Non renseigné' },
];

const TICKET_STATUS_OPTIONS: { value: MaintenanceTicketStatus; label: string }[] = [
  { value: 'open', label: 'Ouvert' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'resolved', label: 'Résolu' },
  { value: 'closed', label: 'Clôturé' },
];

const TICKET_PRIORITY_OPTIONS: { value: MaintenanceTicketPriority; label: string }[] = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Haute' },
  { value: 'critical', label: 'Critique' },
];

const STANDARD_ENERGY_COLUMNS: AttributeColumnDef[] = [
  { key: 'id', label: 'ID', type: 'text', editable: false, source: 'standard' },
  { key: 'name', label: 'Nom', type: 'text', editable: true, source: 'standard' },
  { key: 'type', label: 'Type', type: 'text', editable: false, source: 'standard' },
  { key: 'status', label: 'Statut', type: 'enum', editable: true, source: 'standard', enumOptions: ENERGY_STATUS_OPTIONS },
  { key: 'commune_insee_code', label: 'INSEE', type: 'text', editable: true, source: 'standard' },
  { key: 'latitude', label: 'Latitude', type: 'number', editable: false, source: 'standard' },
  { key: 'longitude', label: 'Longitude', type: 'number', editable: false, source: 'standard' },
];

const METADATA_LABEL_OVERRIDES: Record<string, string> = {
  total_power_w: 'Puissance totale (W)',
  nb_foyers: 'Nombre de foyers',
  circuit_count: 'Circuits',
  power_kw: 'Puissance (kW)',
  connector_type: 'Type de prise',
  nb_prises: 'Nombre de prises',
  technologie: 'Technologie',
  type_eclairage: 'Type éclairage',
  hauteur_mat: 'Hauteur mât',
};

function formatLabel(key: string): string {
  return METADATA_LABEL_OVERRIDES[key] ?? key.replace(/_/g, ' ');
}

function isLightingTechKey(key: string): boolean {
  const k = key.toLowerCase();
  return k.includes('technologie') || k.includes('type_eclair') || k.includes('type_lampe') || k === 'lamp_type';
}

function inferMetadataColumnType(key: string, sample: unknown): AttributeColumnType {
  if (isLightingTechKey(key)) return 'enum';
  if (typeof sample === 'number') return 'number';
  if (typeof sample === 'string' && sample !== '' && !Number.isNaN(Number(sample))) return 'number';
  return 'text';
}

function collectMetadataColumns(assets: EnergyAsset[], editable: boolean): AttributeColumnDef[] {
  const keys = new Set<string>();
  for (const asset of assets) {
    for (const key of Object.keys(asset.metadata)) keys.add(key);
  }

  return Array.from(keys)
    .sort()
    .map((key) => {
      const sample = assets.find((a) => a.metadata[key] != null)?.metadata[key];
      const type = inferMetadataColumnType(key, sample);
      return {
        key,
        label: formatLabel(key),
        type,
        editable,
        source: 'metadata' as const,
        enumOptions: type === 'enum' ? LIGHTING_TECH_OPTIONS : undefined,
      };
    });
}

function cellString(value: unknown): string {
  if (value == null) return '';
  return String(value);
}

export function buildEnergyAssetAttributeTable(
  assets: EnergyAsset[],
  editable: boolean,
): { columns: AttributeColumnDef[]; rows: AttributeTableRow[] } {
  const columns = [...STANDARD_ENERGY_COLUMNS, ...collectMetadataColumns(assets, editable)];

  const rows: AttributeTableRow[] = assets.map((asset) => {
    const values: Record<string, string> = {
      id: asset.id,
      name: asset.name,
      type: asset.type,
      status: asset.status,
      commune_insee_code: asset.communeInseeCode,
      latitude: cellString(asset.latitude),
      longitude: cellString(asset.longitude),
    };
    for (const col of columns) {
      if (col.source === 'metadata') {
        values[col.key] = cellString(asset.metadata[col.key]);
      }
    }
    return {
      id: asset.id,
      latitude: asset.latitude,
      longitude: asset.longitude,
      values,
      sourceType: 'energy_asset',
      energyAsset: asset,
    };
  });

  return { columns, rows };
}

/** Chantiers métier (table app.chantiers / vue public.chantiers). */
export function buildSiteChantierAttributeTable(
  chantiers: Chantier[],
): { columns: AttributeColumnDef[]; rows: AttributeTableRow[] } {
  const columns: AttributeColumnDef[] = [
    { key: 'id', label: 'ID', type: 'text', editable: false, source: 'standard' },
    { key: 'code', label: 'Code', type: 'text', editable: false, source: 'standard' },
    { key: 'name', label: 'Nom', type: 'text', editable: false, source: 'standard' },
    { key: 'status', label: 'Statut', type: 'text', editable: false, source: 'standard' },
    { key: 'address', label: 'Adresse', type: 'text', editable: false, source: 'standard' },
    { key: 'created_at', label: 'Créé le', type: 'text', editable: false, source: 'standard' },
  ];

  const rows: AttributeTableRow[] = chantiers.map((chantier) => ({
    id: chantier.id,
    latitude: 0,
    longitude: 0,
    values: {
      id: chantier.id,
      code: chantier.code ?? '',
      name: chantier.name,
      status: chantier.status,
      address: chantier.address ?? '',
      created_at: new Date(chantier.createdAt).toLocaleString('fr-FR'),
    },
    sourceType: 'site_chantier',
    siteChantier: chantier,
  }));

  return { columns, rows };
}

/** Affaires / projects affichées sur la carte (legacy couche « chantiers »). */
export function buildChantierAttributeTable(
  entries: MapProjectEntry[],
): { columns: AttributeColumnDef[]; rows: AttributeTableRow[] } {
  const columns: AttributeColumnDef[] = [
    { key: 'id', label: 'ID', type: 'text', editable: false, source: 'standard' },
    { key: 'reference', label: 'Référence', type: 'text', editable: false, source: 'standard' },
    { key: 'title', label: 'Titre', type: 'text', editable: false, source: 'standard' },
    { key: 'status', label: 'Statut', type: 'text', editable: false, source: 'standard' },
    { key: 'type', label: 'Type', type: 'text', editable: false, source: 'standard' },
    { key: 'commune_insee_code', label: 'INSEE', type: 'text', editable: false, source: 'standard' },
    { key: 'location', label: 'Localisation', type: 'text', editable: false, source: 'standard' },
    { key: 'latitude', label: 'Latitude', type: 'number', editable: false, source: 'standard' },
    { key: 'longitude', label: 'Longitude', type: 'number', editable: false, source: 'standard' },
    { key: 'alert', label: 'Alerte', type: 'text', editable: false, source: 'standard' },
  ];

  const rows: AttributeTableRow[] = entries.map((entry) => ({
    id: entry.project.id,
    latitude: entry.latitude,
    longitude: entry.longitude,
    values: {
      id: entry.project.id,
      reference: entry.project.reference,
      title: entry.project.title,
      status: entry.project.status,
      type: entry.project.type,
      commune_insee_code: entry.project.communeInseeCode ?? '',
      location: entry.project.location,
      latitude: cellString(entry.latitude),
      longitude: cellString(entry.longitude),
      alert: entry.primaryAlert ?? 'ok',
    },
    sourceType: 'chantier',
    chantier: entry,
  }));

  return { columns, rows };
}

export function buildTicketAttributeTable(
  tickets: MaintenanceTicket[],
  assetsById: Map<string, EnergyAsset>,
  editable: boolean,
): { columns: AttributeColumnDef[]; rows: AttributeTableRow[] } {
  const columns: AttributeColumnDef[] = [
    { key: 'id', label: 'ID', type: 'text', editable: false, source: 'standard' },
    { key: 'title', label: 'Titre', type: 'text', editable: editable, source: 'standard' },
    { key: 'status', label: 'Statut', type: 'enum', editable: editable, source: 'standard', enumOptions: TICKET_STATUS_OPTIONS },
    { key: 'priority', label: 'Priorité', type: 'enum', editable: editable, source: 'standard', enumOptions: TICKET_PRIORITY_OPTIONS },
    { key: 'commune_insee_code', label: 'INSEE', type: 'text', editable: false, source: 'standard' },
    { key: 'asset_id', label: 'Actif', type: 'text', editable: false, source: 'standard' },
    { key: 'asset_name', label: 'Nom actif', type: 'text', editable: false, source: 'standard' },
    { key: 'created_at', label: 'Créé le', type: 'text', editable: false, source: 'standard' },
    { key: 'description', label: 'Description', type: 'text', editable: editable, source: 'standard' },
  ];

  const rows: AttributeTableRow[] = [];

  for (const ticket of tickets) {
    const asset = assetsById.get(ticket.assetId);
    if (!asset) continue;

    rows.push({
      id: ticket.id,
      latitude: asset.latitude,
      longitude: asset.longitude,
      values: {
        id: ticket.id,
        title: ticket.title,
        status: ticket.status,
        priority: ticket.priority,
        commune_insee_code: ticket.communeInseeCode,
        asset_id: ticket.assetId,
        asset_name: asset.name,
        created_at: new Date(ticket.createdAt).toLocaleString('fr-FR'),
        description: ticket.description,
      },
      sourceType: 'ticket',
      ticket,
    });
  }

  return { columns, rows };
}

export function getAttributeTableLayerLabel(layerId: AttributeTableLayerId): string {
  switch (layerId) {
    case 'chantiers':
      return 'Chantiers';
    case 'eclairage':
      return 'Éclairage public';
    case 'irve':
      return 'Bornes IRVE';
    case 'tickets':
      return 'Tickets & incidents';
  }
}

export function parseAttributeCellValue(
  column: AttributeColumnDef,
  raw: string,
): string | number | null {
  if (raw === '') return null;
  if (column.type === 'number') {
    const num = Number(raw);
    return Number.isFinite(num) ? num : raw;
  }
  return raw;
}
