export type UserRole = 'DGS' | 'DST' | 'Chargé d\'Affaires' | 'Prestataire Extérieur' | 'COMMUNE';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  organizationId: string;
  communeInseeCode?: string;
}

export type CommuneWorkRequestType =
  | 'Éclairage Public'
  | 'Extension Réseau Basse Tension'
  | 'Dissimulation/Effacement'
  | 'Borne de recharge IRVE';

export type SourceDemand = 'commune' | 'interne' | 'prestataire';

export type ProjectStatus =
  | 'Brouillon'
  | 'En Étude'
  | 'Proposé'
  | 'Validé'
  | 'APS/APD'
  | 'BC/OS'
  | 'En cours'
  | 'PV/Réception'
  | 'Clôturé'
  | 'À planifier';

export type ProjectType =
  | 'Électricité'
  | 'Éclairage Public'
  | 'Télécom'
  | 'IRVE';

export type QuoteStatus = 'Brouillon' | 'Envoyé au client' | 'Accepté' | 'Refusé';

export type BillingStatus = 'À émettre' | 'Acompte émis' | 'Facturé total' | 'Payé';

export interface Project {
  id: string;
  reference: string;
  title: string;
  description: string;
  type: ProjectType;
  status: ProjectStatus;
  budgetTotal: number;
  budgetConsumed: number;
  quoteStatus: QuoteStatus;
  quoteAmountHt: number;
  billingStatus: BillingStatus;
  invoiceDeposit: boolean;
  invoiceBalance: boolean;
  startDate: string;
  expectedEndDate: string;
  actualEndDate?: string;
  ownerId: string;
  ownerName: string;
  contractorId?: string;
  contractorName?: string;
  location: string;
  latitude?: number;
  longitude?: number;
  enableTimeTracking: boolean;
  ppiYear?: number | null;
  communeInseeCode?: string;
  sourceDemand?: SourceDemand;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectTimesheet {
  id: string;
  projectId: string;
  companyName: string;
  userName: string;
  hours: number;
  description?: string;
  createdAt: string;
}

export interface BpuCatalogItem {
  id: string;
  designation: string;
  unit: string;
  unitPriceHt: number;
  createdAt: string;
}

export interface ProjectQuoteLine {
  id: string;
  projectId: string;
  bpuId?: string;
  designation: string;
  quantity: number;
  unitPriceHt: number;
  createdAt: string;
}

export type ProjectPhotoTag = 'avant' | 'apres';

export interface ProjectPhoto {
  id: string;
  projectId: string;
  url: string;
  storagePath: string;
  tag: ProjectPhotoTag;
  createdAt: string;
}

export type EnergyAssetType = 'irve' | 'eclairage';

export type EnergyAssetStatus = 'functional' | 'maintenance' | 'broken';

export interface EnergyAsset {
  id: string;
  organizationId: string;
  communeInseeCode: string;
  name: string;
  type: EnergyAssetType;
  status: EnergyAssetStatus;
  latitude: number;
  longitude: number;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export type MaintenanceTicketPriority = 'low' | 'medium' | 'high' | 'critical';

export type MaintenanceTicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed';

export interface MaintenanceTicketAssignee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  department: string;
}

export interface MaintenanceTicket {
  id: string;
  organizationId: string;
  title: string;
  description: string;
  status: MaintenanceTicketStatus;
  priority: MaintenanceTicketPriority;
  assetId: string;
  communeInseeCode: string;
  createdBy: string;
  assignedToProviderId?: string;
  assignedContactId?: string | null;
  assignedContact?: MaintenanceTicketAssignee | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  durationHours?: number;
  requiredHabilitations?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  targetType: 'project' | 'document' | 'workflow' | 'user';
  targetId: string;
  targetLabel: string;
  timestamp: string;
}

export interface Chantier {
  id: string;
  organizationId: string;
  code: string | null;
  name: string;
  /** Localisation textuelle (seul champ géo du schéma app.chantiers actuel). */
  address: string | null;
  status: string;
  createdAt: string;
  /** Réservé si migration lat/lng — absent en base aujourd'hui. */
  latitude?: number | null;
  longitude?: number | null;
  budgetTotal?: number | null;
}

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  roles: UserRole[];
}

export interface MetricCard {
  label: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: string;
}
