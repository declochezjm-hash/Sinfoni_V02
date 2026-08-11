export type ContactRole =
  | 'DGS'
  | 'DST'
  | "Chargé d'affaires"
  | 'Technicien'
  | 'Élu';

export interface Contact {
  id: string;
  organizationId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  parentContactId: string | null;
  avatarUrl?: string;
  electricalHabilitations: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ContactTreeNode extends Contact {
  children: ContactTreeNode[];
}

export const CONTACT_ROLE_OPTIONS: { value: ContactRole; label: string }[] = [
  { value: 'DGS', label: 'DGS' },
  { value: 'DST', label: 'DST' },
  { value: "Chargé d'affaires", label: "Chargé d'affaires" },
  { value: 'Technicien', label: 'Technicien' },
  { value: 'Élu', label: 'Élu' },
];

export const ELECTRICAL_HABILITATION_OPTIONS = [
  'B1V',
  'B2V',
  'BR',
  'H1V',
  'H0B0',
] as const;

export const CONTACT_DEPARTMENT_OPTIONS = [
  'Direction Générale',
  'Services Techniques',
  'Voirie',
  'Syndicat',
  'Éclairage public',
  'IRVE',
] as const;

export function getContactFullName(contact: Pick<Contact, 'firstName' | 'lastName'>): string {
  return `${contact.firstName} ${contact.lastName}`.trim();
}

export function getContactInitials(contact: Pick<Contact, 'firstName' | 'lastName'>): string {
  const a = contact.firstName?.charAt(0) ?? '';
  const b = contact.lastName?.charAt(0) ?? '';
  return (a + b).toUpperCase() || '?';
}

export function formatContactAssigneeLabel(
  contact: Pick<Contact, 'firstName' | 'lastName' | 'role' | 'department'>,
): string {
  return `${getContactFullName(contact)} (${contact.role} - ${contact.department})`;
}
