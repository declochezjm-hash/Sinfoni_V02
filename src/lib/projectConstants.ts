import type { BillingStatus, ProjectStatus, ProjectType, QuoteStatus, CommuneWorkRequestType } from '../types';

export const VAT_RATE = 0.2;

/** Tarif horaire main-d'œuvre (€ HT) pour le suivi des équipes. */
export const LABOR_HOURLY_RATE = 45;

/** Plafond annuel d'investissement PPI (€) — ligne d'alerte du tableau de bord. */
export const PPI_CEILING_EUR = 2_000_000;

export const QUOTE_STATUS_OPTIONS: QuoteStatus[] = [
  'Brouillon',
  'Envoyé au client',
  'Accepté',
  'Refusé',
];

export const BILLING_STATUS_OPTIONS: BillingStatus[] = [
  'À émettre',
  'Acompte émis',
  'Facturé total',
  'Payé',
];

export const PROJECT_TYPE_OPTIONS: ProjectType[] = [
  'Électricité',
  'Éclairage Public',
  'Télécom',
  'IRVE',
];

export const PROJECT_STATUS_OPTIONS: ProjectStatus[] = [
  'Brouillon',
  'En Étude',
  'Proposé',
  'Validé',
  'À planifier',
  'APS/APD',
  'BC/OS',
  'En cours',
  'PV/Réception',
  'Clôturé',
];

/** Statuts proposés dans la modale création/édition rapide (liste Affaires). */
export const FORM_STATUS_OPTIONS: ProjectStatus[] = ['En cours', 'Clôturé', 'À planifier'];

export const FILTER_STATUS_OPTIONS: ProjectStatus[] = [
  'En cours',
  'Clôturé',
  'À planifier',
  'Brouillon',
  'En Étude',
  'Proposé',
  'Validé',
  'APS/APD',
  'BC/OS',
  'PV/Réception',
];

export const MAP_CENTER: [number, number] = [43.7, 4.0];
export const MAP_ZOOM = 8;
export const GEOCODE_ZOOM = 15;

/** Code INSEE de démo pour la commune d'Arles (Portail Communes). */
export const DEMO_COMMUNE_INSEE = '13004';

export const COMMUNE_WORK_REQUEST_OPTIONS = [
  'Éclairage Public',
  'Extension Réseau Basse Tension',
  'Dissimulation/Effacement',
  'Borne de recharge IRVE',
] as const;

export const COMMUNE_WORK_TO_PROJECT_TYPE: Record<CommuneWorkRequestType, ProjectType> = {
  'Éclairage Public': 'Éclairage Public',
  'Extension Réseau Basse Tension': 'Électricité',
  'Dissimulation/Effacement': 'Télécom',
  'Borne de recharge IRVE': 'IRVE',
};
