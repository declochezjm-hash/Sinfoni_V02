import { resolveProjectCoordinates } from './geo';
import type { Project, ProjectStatus, ProjectTimesheet } from '../types';
import type { AlertType } from '../utils/alertEngine';
import { getPrimaryAlertType, groupAlertsByProjectId, type ProjectAlert } from '../utils/alertEngine';

export type MapAlertFilter = 'all' | AlertType;
export type MapAffaireStatusFilter = 'all' | 'en_cours' | 'cloture' | 'en_etude';

export const PROXIMITY_RADIUS_KM = 25;

const EN_COURS_STATUSES: ProjectStatus[] = ['En cours', 'PV/Réception'];
const CLOTURE_STATUSES: ProjectStatus[] = ['Clôturé'];
const EN_ETUDE_STATUSES: ProjectStatus[] = [
  'Brouillon',
  'En Étude',
  'Proposé',
  'APS/APD',
  'BC/OS',
  'À planifier',
];

export interface MapProjectEntry {
  project: Project;
  latitude: number;
  longitude: number;
  primaryAlert: AlertType | null;
}

export function buildMapProjectEntries(
  projects: Project[],
  alerts: ProjectAlert[],
): MapProjectEntry[] {
  const alertsByProject = groupAlertsByProjectId(alerts);

  return projects.map((project) => {
    const coords = resolveProjectCoordinates({
      title: project.title,
      description: project.description,
      latitude: project.latitude,
      longitude: project.longitude,
      id: project.id,
    });
    const projectAlerts = alertsByProject[project.id] ?? [];

    return {
      project,
      latitude: coords.latitude,
      longitude: coords.longitude,
      primaryAlert: getPrimaryAlertType(projectAlerts),
    };
  });
}

export function buildCompaniesFromTimesheets(timesheets: ProjectTimesheet[]): string[] {
  const names = new Set<string>();
  for (const entry of timesheets) {
    const name = entry.companyName.trim();
    if (name) names.add(name);
  }
  return [...names].sort((a, b) => a.localeCompare(b, 'fr'));
}

export function buildProjectIdsByCompany(
  timesheets: ProjectTimesheet[],
): Record<string, Set<string>> {
  const map: Record<string, Set<string>> = {};
  for (const entry of timesheets) {
    const name = entry.companyName.trim();
    if (!name) continue;
    if (!map[name]) map[name] = new Set();
    map[name].add(entry.projectId);
  }
  return map;
}

export function matchesAffaireStatusFilter(
  status: ProjectStatus,
  filter: MapAffaireStatusFilter,
): boolean {
  if (filter === 'all') return true;
  if (filter === 'en_cours') return EN_COURS_STATUSES.includes(status);
  if (filter === 'cloture') return CLOTURE_STATUSES.includes(status);
  return EN_ETUDE_STATUSES.includes(status);
}

export function filterMapProjects(params: {
  entries: MapProjectEntry[];
  alertFilter: MapAlertFilter;
  companyFilter: string;
  statusFilter: MapAffaireStatusFilter;
  projectIdsByCompany: Record<string, Set<string>>;
}): MapProjectEntry[] {
  const { entries, alertFilter, companyFilter, statusFilter, projectIdsByCompany } = params;

  return entries.filter((entry) => {
    if (!matchesAffaireStatusFilter(entry.project.status, statusFilter)) return false;

    if (companyFilter !== 'all') {
      const ids = projectIdsByCompany[companyFilter];
      if (!ids?.has(entry.project.id)) return false;
    }

    if (alertFilter !== 'all' && entry.primaryAlert !== alertFilter) return false;

    return true;
  });
}

export function haversineKm(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Tournée proximité : chantier cible + autres chantiers en alerte dans le rayon. */
export function applyProximityTourFilter(
  entries: MapProjectEntry[],
  focus: { projectId: string; latitude: number; longitude: number },
  radiusKm: number = PROXIMITY_RADIUS_KM,
): MapProjectEntry[] {
  return entries.filter((entry) => {
    if (entry.project.id === focus.projectId) return true;
    if (entry.primaryAlert == null) return false;

    return (
      haversineKm(focus.latitude, focus.longitude, entry.latitude, entry.longitude) <= radiusKm
    );
  });
}
