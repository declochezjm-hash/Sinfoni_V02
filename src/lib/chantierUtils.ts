import type { Chantier, Project } from '../types';

/** Localisation via address et/ou latitude/longitude (colonnes app.chantiers). */
export function hasChantierCoordinates(chantier: Chantier): boolean {
  const lat = chantier.latitude;
  const lng = chantier.longitude;
  if (lat == null || lng == null) return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (lat === 0 && lng === 0) return false;
  return true;
}

export function partitionChantiersByGeolocation(chantiers: Chantier[]): {
  geolocated: Chantier[];
  withoutCoordinates: Chantier[];
} {
  const geolocated: Chantier[] = [];
  const withoutCoordinates: Chantier[] = [];
  for (const chantier of chantiers) {
    if (hasChantierCoordinates(chantier)) geolocated.push(chantier);
    else withoutCoordinates.push(chantier);
  }
  return { geolocated, withoutCoordinates };
}

const STATUS_LABELS: Record<string, string> = {
  en_cours: 'En cours',
  planifie: 'Planifié',
  planifié: 'Planifié',
  termine: 'Terminé',
  terminé: 'Terminé',
  suspendu: 'Suspendu',
};

export function formatChantierStatus(status: string): string {
  return STATUS_LABELS[status.toLowerCase()] ?? status.replace(/_/g, ' ');
}

export function chantierStatusBadgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case 'en_cours':
      return 'bg-sky-100 text-sky-800';
    case 'planifie':
    case 'planifié':
      return 'bg-amber-100 text-amber-800';
    case 'termine':
    case 'terminé':
      return 'bg-emerald-100 text-emerald-800';
    default:
      return 'bg-slate-100 text-slate-700';
  }
}

/**
 * Relie un chantier site à l'affaire (`projects`) pour la navigation fiche.
 * Priorité : titre exact → code dans description/référence → préfixe de titre.
 */
export function resolveRelatedProjectId(
  chantier: Chantier,
  projects: Pick<Project, 'id' | 'title' | 'description' | 'reference'>[],
): string | null {
  const name = chantier.name.trim().toLowerCase();
  if (!name) return null;

  const byTitle = projects.find((p) => p.title.trim().toLowerCase() === name);
  if (byTitle) return byTitle.id;

  if (chantier.code) {
    const code = chantier.code.toLowerCase();
    const byCode = projects.find(
      (p) =>
        p.description?.toLowerCase().includes(code) ||
        p.reference?.toLowerCase().includes(code),
    );
    if (byCode) return byCode.id;
  }

  const byPrefix = projects.find((p) => {
    const title = p.title.trim().toLowerCase();
    return title.startsWith(name) || name.startsWith(title);
  });
  return byPrefix?.id ?? null;
}
