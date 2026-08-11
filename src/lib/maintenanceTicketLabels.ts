import type { MaintenanceTicketPriority, MaintenanceTicketStatus } from '../types';

export const TICKET_STATUS_OPTIONS: { value: MaintenanceTicketStatus; label: string }[] = [
  { value: 'open', label: 'Ouvert' },
  { value: 'in_progress', label: 'En cours' },
  { value: 'resolved', label: 'Résolu' },
  { value: 'closed', label: 'Clôturé' },
];

export const TICKET_PRIORITY_OPTIONS: { value: MaintenanceTicketPriority; label: string }[] = [
  { value: 'low', label: 'Faible' },
  { value: 'medium', label: 'Moyenne' },
  { value: 'high', label: 'Haute' },
  { value: 'critical', label: 'Critique' },
];

export function getTicketStatusLabel(status: MaintenanceTicketStatus): string {
  return TICKET_STATUS_OPTIONS.find((o) => o.value === status)?.label ?? status;
}

export function getTicketPriorityLabel(priority: MaintenanceTicketPriority): string {
  return TICKET_PRIORITY_OPTIONS.find((o) => o.value === priority)?.label ?? priority;
}

export function getTicketStatusBadgeClass(status: MaintenanceTicketStatus): string {
  switch (status) {
    case 'open':
      return 'bg-sky-100 text-sky-800 border-sky-200';
    case 'in_progress':
      return 'bg-amber-100 text-amber-800 border-amber-200';
    case 'resolved':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'closed':
      return 'bg-slate-200 text-slate-700 border-slate-300';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}

export function getTicketPriorityBadgeClass(priority: MaintenanceTicketPriority): string {
  switch (priority) {
    case 'low':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'high':
      return 'bg-orange-100 text-orange-800 border-orange-200';
    case 'critical':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
}
