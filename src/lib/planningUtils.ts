import type { EnergyAsset, MaintenanceTicket, Project } from '../types';
import type { Contact } from '../types/contacts';
import { defaultHabilitationsForAsset } from '../utils/interventionSheetPdf';

export const ELECTRICAL_HABILITATION_OPTIONS = [
  'B1V',
  'B2V',
  'BR',
  'H1V',
  'H0B0',
] as const;

export type ElectricalHabilitation = (typeof ELECTRICAL_HABILITATION_OPTIONS)[number];

export type PlanningScale = 'day' | 'week' | 'month';

export type PlanningItemKind = 'intervention' | 'milestone';

export interface PlanningInterventionItem {
  kind: 'intervention';
  id: string;
  ticketId: string;
  title: string;
  status: MaintenanceTicket['status'];
  priority: MaintenanceTicket['priority'];
  start: Date;
  end: Date;
  durationHours: number;
  assignedContactId: string | null;
  assetId: string;
  requiredHabilitations: string[];
  isScheduled: boolean;
}

export interface PlanningMilestoneItem {
  kind: 'milestone';
  id: string;
  projectId: string;
  title: string;
  reference: string;
  start: Date;
  end: Date;
  status: Project['status'];
  ownerId: string;
  ownerName: string;
}

export type PlanningItem = PlanningInterventionItem | PlanningMilestoneItem;

export interface TimelineColumn {
  key: string;
  label: string;
  start: Date;
  end: Date;
}

export interface TimelineBounds {
  start: Date;
  end: Date;
  columns: TimelineColumn[];
}

export const DEFAULT_DAILY_CAPACITY_HOURS = 8;
export const UNASSIGNED_ROW_ID = '__unassigned__';
export const MILESTONES_ROW_ID = '__milestones__';

const MS_PER_HOUR = 60 * 60 * 1000;

export function normalizeHabilitations(values: string[]): string[] {
  return [...new Set(values.map((v) => v.trim().toUpperCase()).filter(Boolean))];
}

export function contactHasRequiredHabilitations(
  contactHabilitations: string[],
  required: string[],
): boolean {
  const normalizedRequired = normalizeHabilitations(required);
  if (normalizedRequired.length === 0) return true;
  const owned = new Set(normalizeHabilitations(contactHabilitations));
  return normalizedRequired.every((hab) => owned.has(hab));
}

export function getMissingHabilitations(
  contactHabilitations: string[],
  required: string[],
): string[] {
  const owned = new Set(normalizeHabilitations(contactHabilitations));
  return normalizeHabilitations(required).filter((hab) => !owned.has(hab));
}

export function getRequiredHabilitationsForTicket(
  ticket: MaintenanceTicket,
  asset?: EnergyAsset | null,
): string[] {
  if (ticket.requiredHabilitations?.length) {
    return normalizeHabilitations(ticket.requiredHabilitations);
  }
  return normalizeHabilitations(defaultHabilitationsForAsset(asset));
}

export function resolveTicketSchedule(ticket: MaintenanceTicket): {
  start: Date;
  end: Date;
  isScheduled: boolean;
} {
  if (ticket.scheduledStart && ticket.scheduledEnd) {
    return {
      start: new Date(ticket.scheduledStart),
      end: new Date(ticket.scheduledEnd),
      isScheduled: true,
    };
  }

  const start = new Date(ticket.createdAt);
  if (Number.isNaN(start.getTime())) {
    const fallback = new Date();
    fallback.setHours(9, 0, 0, 0);
    const end = new Date(fallback.getTime() + (ticket.durationHours ?? 2) * MS_PER_HOUR);
    return { start: fallback, end, isScheduled: false };
  }

  start.setHours(9, 0, 0, 0);
  const durationMs = (ticket.durationHours ?? 2) * MS_PER_HOUR;
  const end = new Date(start.getTime() + durationMs);
  return { start, end, isScheduled: false };
}

export function ticketToInterventionItem(
  ticket: MaintenanceTicket,
  asset?: EnergyAsset | null,
): PlanningInterventionItem {
  const schedule = resolveTicketSchedule(ticket);
  return {
    kind: 'intervention',
    id: `intervention-${ticket.id}`,
    ticketId: ticket.id,
    title: ticket.title,
    status: ticket.status,
    priority: ticket.priority,
    start: schedule.start,
    end: schedule.end,
    durationHours: ticket.durationHours ?? 2,
    assignedContactId: ticket.assignedContactId ?? null,
    assetId: ticket.assetId,
    requiredHabilitations: getRequiredHabilitationsForTicket(ticket, asset),
    isScheduled: schedule.isScheduled,
  };
}

export function projectToMilestoneItem(project: Project): PlanningMilestoneItem | null {
  if (!project.startDate || !project.expectedEndDate) return null;

  const start = parseDateOnly(project.startDate);
  const end = parseDateOnly(project.expectedEndDate);
  if (!start || !end || end < start) return null;

  end.setHours(23, 59, 59, 999);

  return {
    kind: 'milestone',
    id: `milestone-${project.id}`,
    projectId: project.id,
    title: project.title,
    reference: project.reference,
    start,
    end,
    status: project.status,
    ownerId: project.ownerId,
    ownerName: project.ownerName,
  };
}

function parseDateOnly(value: string): Date | null {
  const d = new Date(`${value}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export function formatDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function getTimelineBounds(scale: PlanningScale, anchor: Date): TimelineBounds {
  if (scale === 'day') {
    const start = startOfDay(anchor);
    start.setHours(7, 0, 0, 0);
    const end = new Date(start);
    end.setHours(19, 0, 0, 0);

    const columns: TimelineColumn[] = [];
    for (let hour = 7; hour < 19; hour += 1) {
      const colStart = new Date(start);
      colStart.setHours(hour, 0, 0, 0);
      const colEnd = new Date(colStart);
      colEnd.setHours(hour + 1, 0, 0, 0);
      columns.push({
        key: `${formatDayKey(colStart)}-${hour}`,
        label: `${String(hour).padStart(2, '0')}h`,
        start: colStart,
        end: colEnd,
      });
    }

    return { start, end, columns };
  }

  if (scale === 'week') {
    const start = startOfWeek(anchor);
    const end = addDays(start, 7);
    const columns: TimelineColumn[] = [];

    for (let i = 0; i < 7; i += 1) {
      const colStart = addDays(start, i);
      const colEnd = addDays(colStart, 1);
      columns.push({
        key: formatDayKey(colStart),
        label: colStart.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
        start: colStart,
        end: colEnd,
      });
    }

    return { start, end, columns };
  }

  const monthStart = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
  const monthEnd = new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0);
  const start = startOfWeek(monthStart);
  const end = addDays(startOfWeek(addDays(monthEnd, 1)), 7);
  const columns: TimelineColumn[] = [];

  for (let cursor = new Date(start); cursor < end; cursor = addDays(cursor, 1)) {
    const colStart = new Date(cursor);
    const colEnd = addDays(colStart, 1);
    columns.push({
      key: formatDayKey(colStart),
      label: String(colStart.getDate()),
      start: colStart,
      end: colEnd,
    });
  }

  return { start, end, columns };
}

export function itemOverlapsRange(item: PlanningItem, rangeStart: Date, rangeEnd: Date): boolean {
  return item.end > rangeStart && item.start < rangeEnd;
}

export function getItemPositionPercent(
  item: PlanningItem,
  bounds: TimelineBounds,
): { left: number; width: number } {
  const totalMs = bounds.end.getTime() - bounds.start.getTime();
  if (totalMs <= 0) return { left: 0, width: 0 };

  const startMs = Math.max(item.start.getTime(), bounds.start.getTime());
  const endMs = Math.min(item.end.getTime(), bounds.end.getTime());
  if (endMs <= startMs) return { left: 0, width: 0 };

  const left = ((startMs - bounds.start.getTime()) / totalMs) * 100;
  const width = ((endMs - startMs) / totalMs) * 100;
  return { left, width: Math.max(width, 0.5) };
}

export function dateFromTimelinePercent(
  percent: number,
  bounds: TimelineBounds,
): Date {
  const totalMs = bounds.end.getTime() - bounds.start.getTime();
  return new Date(bounds.start.getTime() + (percent / 100) * totalMs);
}

export function snapToScale(date: Date, scale: PlanningScale): Date {
  const d = new Date(date);
  if (scale === 'day') {
    d.setMinutes(Math.round(d.getMinutes() / 30) * 30, 0, 0);
    return d;
  }
  d.setHours(9, 0, 0, 0);
  return d;
}

export function computeDailyWorkload(
  interventions: PlanningInterventionItem[],
  bounds: TimelineBounds,
): Map<string, Map<string, { hours: number; ticketCount: number }>> {
  const result = new Map<string, Map<string, { hours: number; ticketCount: number }>>();

  for (const item of interventions) {
    if (!item.assignedContactId) continue;

    let cursor = startOfDay(item.start);
    const lastDay = startOfDay(item.end);

    while (cursor <= lastDay) {
      if (cursor >= bounds.start && cursor < bounds.end) {
        const dayKey = formatDayKey(cursor);
        const dayMap = result.get(dayKey) ?? new Map();
        const contactId = item.assignedContactId;
        const current = dayMap.get(contactId) ?? { hours: 0, ticketCount: 0 };
        current.hours += item.durationHours;
        current.ticketCount += 1;
        dayMap.set(contactId, current);
        result.set(dayKey, dayMap);
      }
      cursor = addDays(cursor, 1);
    }
  }

  return result;
}

export function getWorkloadLevel(hours: number, capacity = DEFAULT_DAILY_CAPACITY_HOURS): 'low' | 'normal' | 'high' | 'overload' {
  if (hours <= 0) return 'low';
  if (hours <= capacity * 0.6) return 'normal';
  if (hours <= capacity) return 'high';
  return 'overload';
}

export function getWorkloadBarClass(level: ReturnType<typeof getWorkloadLevel>): string {
  switch (level) {
    case 'low':
      return 'bg-emerald-400';
    case 'normal':
      return 'bg-sky-500';
    case 'high':
      return 'bg-amber-500';
    case 'overload':
      return 'bg-red-500';
    default:
      return 'bg-slate-300';
  }
}

export function isTechnicianContact(contact: Contact): boolean {
  return contact.role.toLowerCase().includes('technicien');
}

export function filterAssignableTechnicians(
  contacts: Contact[],
  requiredHabilitations: string[],
): { compatible: Contact[]; incompatible: Contact[] } {
  const technicians = contacts.filter(isTechnicianContact);
  const compatible: Contact[] = [];
  const incompatible: Contact[] = [];

  for (const contact of technicians) {
    if (contactHasRequiredHabilitations(contact.electricalHabilitations ?? [], requiredHabilitations)) {
      compatible.push(contact);
    } else {
      incompatible.push(contact);
    }
  }

  return { compatible, incompatible };
}

export function getInterventionBarClass(priority: MaintenanceTicket['priority']): string {
  switch (priority) {
    case 'critical':
      return 'bg-red-500 border-red-600 text-white';
    case 'high':
      return 'bg-orange-500 border-orange-600 text-white';
    case 'medium':
      return 'bg-amber-400 border-amber-500 text-amber-950';
    default:
      return 'bg-sky-400 border-sky-500 text-sky-950';
  }
}

export function getMilestoneBarClass(): string {
  return 'bg-violet-500/80 border-violet-600 text-white';
}
