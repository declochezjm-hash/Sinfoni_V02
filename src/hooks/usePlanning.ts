import { useMemo } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import {
  contactHasRequiredHabilitations,
  getRequiredHabilitationsForTicket,
  projectToMilestoneItem,
  ticketToInterventionItem,
  type PlanningInterventionItem,
  type PlanningItem,
  type PlanningMilestoneItem,
  type PlanningScale,
  computeDailyWorkload,
  getTimelineBounds,
  itemOverlapsRange,
} from '../lib/planningUtils';
import { useAuth } from './useAuth';
import { useRole } from './useRole';
import { useProjects } from './useProjects';
import { useContacts } from './useContacts';
import { useEnergyAssets } from './useEnergyAssets';
import {
  fetchMaintenanceTicketById,
  useMaintenanceTickets,
  type UpdateMaintenanceTicketInput,
} from './useTickets';
import type {
  MaintenanceTicketPriority,
  MaintenanceTicketStatus,
  UserRole,
} from '../types';

export const PLANNING_ROLES: UserRole[] = ['DGS', 'DST', 'Chargé d\'Affaires'];

export interface PlanningFilters {
  status: MaintenanceTicketStatus | 'all';
  priority: MaintenanceTicketPriority | 'all';
  scale: PlanningScale;
  anchorDate: Date;
}

export function usePlanningPermissions() {
  const { canAccess } = useRole();
  return {
    canView: canAccess(PLANNING_ROLES),
    canEdit: canAccess(PLANNING_ROLES),
  };
}

export function usePlanningData(filters: PlanningFilters) {
  const { tickets, loading: ticketsLoading, error: ticketsError } = useMaintenanceTickets();
  const { projects, loading: projectsLoading, error: projectsError } = useProjects();
  const { contacts, loading: contactsLoading } = useContacts();
  const { assets, loading: assetsLoading } = useEnergyAssets();

  const assetById = useMemo(() => new Map(assets.map((a) => [a.id, a])), [assets]);

  const bounds = useMemo(
    () => getTimelineBounds(filters.scale, filters.anchorDate),
    [filters.scale, filters.anchorDate],
  );

  const interventions = useMemo(() => {
    return tickets
      .filter((ticket) => {
        if (ticket.status === 'closed') return false;
        if (filters.status !== 'all' && ticket.status !== filters.status) return false;
        if (filters.priority !== 'all' && ticket.priority !== filters.priority) return false;
        return true;
      })
      .map((ticket) => ticketToInterventionItem(ticket, assetById.get(ticket.assetId)))
      .filter((item) => itemOverlapsRange(item, bounds.start, bounds.end));
  }, [tickets, filters.status, filters.priority, assetById, bounds]);

  const milestones = useMemo(() => {
    return projects
      .map(projectToMilestoneItem)
      .filter((item): item is PlanningMilestoneItem => item !== null)
      .filter((item) => itemOverlapsRange(item, bounds.start, bounds.end));
  }, [projects, bounds]);

  const items: PlanningItem[] = useMemo(
    () => [...interventions, ...milestones],
    [interventions, milestones],
  );

  const technicians = useMemo(
    () => contacts.filter((c) => c.role.toLowerCase().includes('technicien')),
    [contacts],
  );

  return {
    items,
    interventions,
    milestones,
    contacts,
    technicians,
    assets,
    assetById,
    bounds,
    loading: ticketsLoading || projectsLoading || contactsLoading || assetsLoading,
    error: ticketsError ?? projectsError,
  };
}

export interface UpdateInterventionScheduleInput {
  ticketId: string;
  scheduledStart: string;
  scheduledEnd: string;
  durationHours: number;
}

export function useUpdateInterventionSchedule() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  return useMutation({
    mutationFn: async (input: UpdateInterventionScheduleInput) => {
      const { error } = await supabase
        .from('tickets_maintenance')
        .update({
          scheduled_start: input.scheduledStart,
          scheduled_end: input.scheduledEnd,
          duration_hours: input.durationHours,
        })
        .eq('organization_id', organizationId)
        .eq('id', input.ticketId);

      if (error) throw error;
      return fetchMaintenanceTicketById(organizationId!, input.ticketId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tickets-maintenance'] });
      void queryClient.invalidateQueries({ queryKey: ['planning'] });
    },
  });
}

export interface AssignTechnicianInput {
  ticketId: string;
  contactId: string | null;
}

export function useAssignTechnicianToIntervention() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();
  const { contacts } = useContacts();
  const { assets } = useEnergyAssets();

  return useMutation({
    mutationFn: async (input: AssignTechnicianInput) => {
      const ticket = await fetchMaintenanceTicketById(organizationId!, input.ticketId);
      const asset = assets.find((a) => a.id === ticket.assetId);
      const required = getRequiredHabilitationsForTicket(ticket, asset);

      if (input.contactId) {
        const contact = contacts.find((c) => c.id === input.contactId);
        if (!contact) throw new Error('Technicien introuvable.');
        if (!contactHasRequiredHabilitations(contact.electricalHabilitations ?? [], required)) {
          throw new Error(
            `Habilitations insuffisantes : requis ${required.join(', ')}.`,
          );
        }
      }

      const payload: UpdateMaintenanceTicketInput = {
        id: input.ticketId,
        assignedContactId: input.contactId,
      };

      const { error } = await supabase
        .from('tickets_maintenance')
        .update({ assigned_contact_id: payload.assignedContactId ?? null })
        .eq('organization_id', organizationId)
        .eq('id', input.ticketId);

      if (error) throw error;
      return fetchMaintenanceTicketById(organizationId!, input.ticketId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tickets-maintenance'] });
      void queryClient.invalidateQueries({ queryKey: ['planning'] });
    },
  });
}

export function usePlanningWorkload(
  interventions: PlanningInterventionItem[],
  bounds: ReturnType<typeof getTimelineBounds>,
) {
  return useMemo(() => computeDailyWorkload(interventions, bounds), [interventions, bounds]);
}
