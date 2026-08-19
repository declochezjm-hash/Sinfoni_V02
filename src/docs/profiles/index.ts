import type { UserRole } from '../../types';
import chargeAffairesMarkdown from './charge-affaires.md?raw';
import dgsMarkdown from './dgs.md?raw';
import dstMarkdown from './dst.md?raw';
import eluMarkdown from './elu.md?raw';
import financesMarkdown from './finances.md?raw';

export type ProfileDocId = 'dgs' | 'dst' | 'charge-affaires' | 'finances' | 'elu';

export interface ProfileDocMeta {
  id: ProfileDocId;
  shortLabel: string;
  title: string;
  subtitle: string;
  markdown: string;
  /** Rôles applicatifs pour lesquels cette fiche est la plus pertinente. */
  userRoles: UserRole[];
}

export const PROFILE_DOCS: readonly ProfileDocMeta[] = [
  {
    id: 'dgs',
    shortLabel: 'DGS',
    title: 'Directeur Général des Services',
    subtitle: 'Pilotage, AP/CP, instances syndicales',
    markdown: dgsMarkdown,
    userRoles: ['DGS'],
  },
  {
    id: 'dst',
    shortLabel: 'DST',
    title: 'Directeur des Services Techniques',
    subtitle: 'Exploitation, patrimoine, réceptions',
    markdown: dstMarkdown,
    userRoles: ['DST'],
  },
  {
    id: 'charge-affaires',
    shortLabel: "Chargé d'Affaires",
    title: "Chargé d'Affaires / Ingénieur Travaux",
    subtitle: 'Cycle affaire, BPU, GED, OS',
    markdown: chargeAffairesMarkdown,
    userRoles: ["Chargé d'Affaires", 'Prestataire Extérieur'],
  },
  {
    id: 'finances',
    shortLabel: 'Finances',
    title: 'Responsable Finances & Comptabilité',
    subtitle: 'Rapprochement, RAC, bilans filière',
    markdown: financesMarkdown,
    userRoles: [],
  },
  {
    id: 'elu',
    shortLabel: 'Élu',
    title: 'Maire / Élu / Délégué communal',
    subtitle: 'Portail commune, RAC, transparence',
    markdown: eluMarkdown,
    userRoles: ['COMMUNE'],
  },
];

export const DEFAULT_PROFILE_DOC_ID: ProfileDocId = 'dgs';

export function getProfileDoc(id: ProfileDocId): ProfileDocMeta {
  const found = PROFILE_DOCS.find((profile) => profile.id === id);
  if (found) return found;
  const fallback = PROFILE_DOCS.find((profile) => profile.id === DEFAULT_PROFILE_DOC_ID);
  if (!fallback) {
    throw new Error('Aucune fiche métier SINFONI n’est disponible.');
  }
  return fallback;
}

export function getDefaultProfileDocId(role?: UserRole | string): ProfileDocId {
  if (!role) return DEFAULT_PROFILE_DOC_ID;
  const match = PROFILE_DOCS.find((profile) =>
    profile.userRoles.some((userRole) => userRole === role),
  );
  return match?.id ?? DEFAULT_PROFILE_DOC_ID;
}

export function isProfileDocId(value: string): value is ProfileDocId {
  return PROFILE_DOCS.some((profile) => profile.id === value);
}
