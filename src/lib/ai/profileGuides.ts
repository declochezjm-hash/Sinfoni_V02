import type { UserRole } from '../../types';

export type ProfileDocId = 'dgs' | 'dst' | 'charge-affaires' | 'finances' | 'elu';

export interface ProfileGuideMeta {
  id: ProfileDocId;
  shortLabel: string;
  title: string;
  userRoles: UserRole[];
}

export const PROFILE_GUIDES: readonly ProfileGuideMeta[] = [
  {
    id: 'dgs',
    shortLabel: 'DGS',
    title: 'Directeur Général des Services',
    userRoles: ['DGS'],
  },
  {
    id: 'dst',
    shortLabel: 'DST',
    title: 'Directeur des Services Techniques',
    userRoles: ['DST'],
  },
  {
    id: 'charge-affaires',
    shortLabel: "Chargé d'Affaires",
    title: "Chargé d'Affaires / Ingénieur Travaux",
    userRoles: ["Chargé d'Affaires", 'Prestataire Extérieur'],
  },
  {
    id: 'finances',
    shortLabel: 'Finances',
    title: 'Responsable Finances & Comptabilité',
    userRoles: [],
  },
  {
    id: 'elu',
    shortLabel: 'Élu',
    title: 'Maire / Élu / Délégué communal',
    userRoles: ['COMMUNE'],
  },
];

export const DEFAULT_PROFILE_DOC_ID: ProfileDocId = 'dgs';

const PROFILE_DOC_IDS = new Set<string>(PROFILE_GUIDES.map((profile) => profile.id));

function normalizeProfileToken(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/[\s_-]+/g, ' ');
}

const PROFILE_ALIAS_TO_ID: Record<string, ProfileDocId> = {
  dgs: 'dgs',
  dst: 'dst',
  'charge affaires': 'charge-affaires',
  'charge d affaires': 'charge-affaires',
  'ingenieur travaux': 'charge-affaires',
  'prestataire exterieur': 'charge-affaires',
  finances: 'finances',
  finance: 'finances',
  comptabilite: 'finances',
  elu: 'elu',
  elus: 'elu',
  commune: 'elu',
  maire: 'elu',
};

export function isProfileDocId(value: string): value is ProfileDocId {
  return PROFILE_DOC_IDS.has(value);
}

export function getProfileGuideMeta(id: ProfileDocId): ProfileGuideMeta {
  const found = PROFILE_GUIDES.find((profile) => profile.id === id);
  if (found) return found;
  const fallback = PROFILE_GUIDES.find((profile) => profile.id === DEFAULT_PROFILE_DOC_ID);
  if (!fallback) {
    throw new Error('Aucune fiche métier SINFONI n’est disponible.');
  }
  return fallback;
}

export function resolveProfileDocId(options: {
  profileId?: string;
  role?: string;
  userRole?: string;
}): ProfileDocId {
  const { profileId, role, userRole } = options;

  if (profileId && isProfileDocId(profileId)) {
    return profileId;
  }

  for (const candidate of [role, profileId, userRole]) {
    if (!candidate) continue;
    const normalized = normalizeProfileToken(candidate);
    const aliasMatch = PROFILE_ALIAS_TO_ID[normalized];
    if (aliasMatch) return aliasMatch;
    if (isProfileDocId(normalized.replace(/\s+/g, '-'))) {
      return normalized.replace(/\s+/g, '-') as ProfileDocId;
    }
  }

  if (userRole) {
    const roleMatch = PROFILE_GUIDES.find((profile) =>
      profile.userRoles.some((mappedRole) => mappedRole === userRole),
    );
    if (roleMatch) return roleMatch.id;
  }

  return DEFAULT_PROFILE_DOC_ID;
}

/** Libellé métier inséré dans la requête utilisateur (bouton Guides & Fiches Métier). */
export function getProfileRoleLabelForPrompt(role?: UserRole | string): string | null {
  switch (role) {
    case 'DGS':
      return 'DGS';
    case 'DST':
      return 'DST';
    case "Chargé d'Affaires":
    case 'Prestataire Extérieur':
      return "Chargé d'Affaires";
    case 'COMMUNE':
      return 'Élu';
    default:
      return null;
  }
}

export function buildProfileGuideRequest(role?: UserRole | string): string {
  const roleLabel = getProfileRoleLabelForPrompt(role);
  if (roleLabel) {
    return `Affiche-moi le guide complet et la fiche métier ${roleLabel} dans SINFONI.`;
  }
  return 'Affiche-moi le guide complet et la fiche métier pour mon rôle SINFONI.';
}

export function isProfileGuideRequest(text: string): boolean {
  const normalized = normalizeProfileToken(text);
  return (
    normalized.includes('guide complet') &&
    (normalized.includes('fiche metier') || normalized.includes('fiches metier'))
  );
}
