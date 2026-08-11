import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { buildTicketDescriptionWithAssetContext } from '../lib/eclairageAssetMetadata';
import { formatApiError } from '../lib/formatApiError';
import { logSupabaseError } from '../lib/supabaseDiagnostics';
import { queryLoadingWhileAuth, useSupabaseQueryEnabled } from '../lib/authQuery';
import { useAuth } from './useAuth';
import { useRole } from './useRole';
import type {
  EnergyAsset,
  MaintenanceTicket,
  MaintenanceTicketAssignee,
  MaintenanceTicketPriority,
  MaintenanceTicketStatus,
  UserRole,
} from '../types';

export const MAINTENANCE_TICKET_CREATOR_ROLES: UserRole[] = [
  'COMMUNE',
  'DGS',
  'DST',
  'Chargé d\'Affaires',
];

export const SYNDICAT_STAFF_ROLES: UserRole[] = ['DGS', 'DST', 'Chargé d\'Affaires'];

export const MAINTENANCE_VIEW_ROLES: UserRole[] = [
  ...SYNDICAT_STAFF_ROLES,
  'Prestataire Extérieur',
  'COMMUNE',
];

const ACTIVE_TICKET_STATUSES = ['open', 'in_progress'] as const;

export const TICKET_ENRICHED_SELECT =
  'id, organization_id, title, description, status, priority, asset_id, commune_insee_code, created_by, assigned_to_provider_id, assigned_contact_id, scheduled_start, scheduled_end, duration_hours, required_habilitations, created_at, updated_at, assigned_contact_first_name, assigned_contact_last_name, assigned_contact_email, assigned_contact_phone, assigned_contact_role, assigned_contact_department, assigned_contact_habilitations';

export const ACTIVE_MAINTENANCE_TICKET_STATUSES = ACTIVE_TICKET_STATUSES;

export interface MaintenanceProvider {
  id: string;
  name: string;
  email: string;
}

function mapAssigneeFromRow(row: Record<string, unknown>): MaintenanceTicketAssignee | null {
  if (!row.assigned_contact_id) return null;
  if (!row.assigned_contact_first_name) return null;

  return {
    id: String(row.assigned_contact_id),
    firstName: String(row.assigned_contact_first_name),
    lastName: String(row.assigned_contact_last_name ?? ''),
    email: String(row.assigned_contact_email ?? ''),
    phone: String(row.assigned_contact_phone ?? ''),
    role: String(row.assigned_contact_role ?? ''),
    department: String(row.assigned_contact_department ?? ''),
  };
}

export function mapMaintenanceTicket(row: Record<string, unknown>): MaintenanceTicket {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    title: String(row.title),
    description: String(row.description),
    status: String(row.status) as MaintenanceTicket['status'],
    priority: String(row.priority) as MaintenanceTicket['priority'],
    assetId: String(row.asset_id),
    communeInseeCode: String(row.commune_insee_code),
    createdBy: String(row.created_by),
    assignedToProviderId: row.assigned_to_provider_id
      ? String(row.assigned_to_provider_id)
      : undefined,
    assignedContactId: row.assigned_contact_id ? String(row.assigned_contact_id) : null,
    assignedContact: mapAssigneeFromRow(row),
    scheduledStart: row.scheduled_start ? String(row.scheduled_start) : null,
    scheduledEnd: row.scheduled_end ? String(row.scheduled_end) : null,
    durationHours: row.duration_hours != null ? Number(row.duration_hours) : 2,
    requiredHabilitations: Array.isArray(row.required_habilitations)
      ? (row.required_habilitations as string[])
      : [],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

function mapProvider(row: Record<string, unknown>): MaintenanceProvider {
  return {
    id: String(row.id),
    name: String(row.name),
    email: String(row.email),
  };
}

async function fetchMaintenanceTickets(organizationId: string): Promise<MaintenanceTicket[]> {
  const { data, error, status } = await supabase
    .from('tickets_maintenance_enriched')
    .select(TICKET_ENRICHED_SELECT)
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    logSupabaseError('tickets_maintenance_enriched.select', error, status);
    throw { ...error, status: status ?? (error as { status?: number }).status };
  }
  return (data ?? []).map(mapMaintenanceTicket);
}

async function fetchActiveMaintenanceTickets(
  organizationId: string,
  communeInseeCode?: string,
): Promise<MaintenanceTicket[]> {
  let query = supabase
    .from('tickets_maintenance_enriched')
    .select(TICKET_ENRICHED_SELECT)
    .eq('organization_id', organizationId)
    .in('status', [...ACTIVE_TICKET_STATUSES]);

  if (communeInseeCode) {
    query = query.eq('commune_insee_code', communeInseeCode);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapMaintenanceTicket);
}

export async function fetchMaintenanceTicketById(
  organizationId: string,
  ticketId: string,
): Promise<MaintenanceTicket> {
  const { data, error } = await supabase
    .from('tickets_maintenance_enriched')
    .select(TICKET_ENRICHED_SELECT)
    .eq('organization_id', organizationId)
    .eq('id', ticketId)
    .single();

  if (error) throw error;
  return mapMaintenanceTicket(data);
}

async function fetchMaintenanceProviders(organizationId: string): Promise<MaintenanceProvider[]> {
  const { data, error } = await supabase
    .from('users')
    .select('id, name, email')
    .eq('organization_id', organizationId)
    .eq('role', 'Prestataire Extérieur')
    .eq('active', true)
    .order('name');

  if (error) throw error;
  return (data ?? []).map(mapProvider);
}

export function useMaintenanceTicketPermissions() {
  const { canAccess, isRole, user } = useRole();

  return {
    canView: canAccess(MAINTENANCE_VIEW_ROLES),
    canAssignProvider: canAccess(SYNDICAT_STAFF_ROLES),
    canAssignContact: canAccess(SYNDICAT_STAFF_ROLES),
    canEditPriority: canAccess(SYNDICAT_STAFF_ROLES),
    canCloseTicket: canAccess(SYNDICAT_STAFF_ROLES),
    canEditTitle: canAccess(SYNDICAT_STAFF_ROLES),
    canEditDescription: canAccess([...SYNDICAT_STAFF_ROLES, 'Prestataire Extérieur']),
    canEditStatus: canAccess([...SYNDICAT_STAFF_ROLES, 'Prestataire Extérieur']),
    isCommuneReadOnly: isRole('COMMUNE'),
    isPrestataire: isRole('Prestataire Extérieur'),
    userId: user.id,
  };
}

export function useMaintenanceTickets() {
  const { authInitialized, organizationId, enabled: queryEnabled } = useSupabaseQueryEnabled();

  const query = useQuery({
    queryKey: ['tickets-maintenance', 'list', organizationId],
    queryFn: () => fetchMaintenanceTickets(organizationId!),
    enabled: queryEnabled,
    staleTime: 30_000,
  });

  return {
    tickets: query.data ?? [],
    loading: queryLoadingWhileAuth(authInitialized, queryEnabled, query.isLoading),
    error: query.error ? formatApiError(query.error) : null,
    refetch: query.refetch,
  };
}

export function useActiveMaintenanceTickets() {
  const { authInitialized, organizationId, enabled: queryEnabled } = useSupabaseQueryEnabled();
  const { isCommune, communeInseeCode } = useRole();

  const enabled = queryEnabled && (!isCommune || !!communeInseeCode);

  const query = useQuery({
    queryKey: [
      'tickets-maintenance',
      'active',
      organizationId,
      isCommune ? communeInseeCode : null,
    ],
    queryFn: () =>
      fetchActiveMaintenanceTickets(organizationId!, isCommune ? communeInseeCode : undefined),
    enabled,
    staleTime: 30_000,
  });

  const activeCountByAssetId = useMemo(() => {
    const map = new Map<string, number>();
    for (const ticket of query.data ?? []) {
      map.set(ticket.assetId, (map.get(ticket.assetId) ?? 0) + 1);
    }
    return map;
  }, [query.data]);

  return {
    tickets: query.data ?? [],
    activeCountByAssetId,
    loading: queryLoadingWhileAuth(authInitialized, enabled, query.isLoading),
    error: query.error ? formatApiError(query.error) : null,
    refetch: query.refetch,
  };
}

export function useMaintenanceProviders() {
  const { organizationId } = useAuth();
  const { canAssignProvider } = useMaintenanceTicketPermissions();

  const query = useQuery({
    queryKey: ['maintenance-providers', organizationId],
    queryFn: () => fetchMaintenanceProviders(organizationId!),
    enabled: !!organizationId && canAssignProvider,
  });

  return {
    providers: query.data ?? [],
    loading: query.isLoading,
  };
}

export interface CreateMaintenanceTicketInput {
  title: string;
  description: string;
  priority: MaintenanceTicketPriority;
  assetId: string;
  communeInseeCode: string;
  createdBy: string;
  asset?: EnergyAsset;
}

export interface UpdateMaintenanceTicketInput {
  id: string;
  title?: string;
  description?: string;
  status?: MaintenanceTicketStatus;
  priority?: MaintenanceTicketPriority;
  assignedToProviderId?: string | null;
  assignedContactId?: string | null;
  scheduledStart?: string | null;
  scheduledEnd?: string | null;
  durationHours?: number;
  requiredHabilitations?: string[];
}

export function useCreateMaintenanceTicket() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateMaintenanceTicketInput) => {
      const description = input.asset
        ? buildTicketDescriptionWithAssetContext(input.description, input.asset)
        : input.description.trim();

      const { data, error } = await supabase
        .from('tickets_maintenance')
        .insert({
          organization_id: organizationId,
          title: input.title.trim(),
          description,
          priority: input.priority,
          asset_id: input.assetId,
          commune_insee_code: input.communeInseeCode,
          created_by: input.createdBy,
        })
        .select('id')
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tickets-maintenance'] });
    },
  });
}

export function useUpdateMaintenanceTicket() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  return useMutation({
    mutationFn: async (input: UpdateMaintenanceTicketInput) => {
      const payload: Record<string, unknown> = {};

      if (input.title !== undefined) payload.title = input.title.trim();
      if (input.description !== undefined) payload.description = input.description.trim();
      if (input.status !== undefined) payload.status = input.status;
      if (input.priority !== undefined) payload.priority = input.priority;
      if (input.assignedToProviderId !== undefined) {
        payload.assigned_to_provider_id = input.assignedToProviderId;
      }
      if (input.assignedContactId !== undefined) {
        payload.assigned_contact_id = input.assignedContactId;
      }
      if (input.scheduledStart !== undefined) payload.scheduled_start = input.scheduledStart;
      if (input.scheduledEnd !== undefined) payload.scheduled_end = input.scheduledEnd;
      if (input.durationHours !== undefined) payload.duration_hours = input.durationHours;
      if (input.requiredHabilitations !== undefined) {
        payload.required_habilitations = input.requiredHabilitations;
      }

      const { error } = await supabase
        .from('tickets_maintenance')
        .update(payload)
        .eq('organization_id', organizationId)
        .eq('id', input.id);

      if (error) throw error;
      return fetchMaintenanceTicketById(organizationId!, input.id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['tickets-maintenance'] });
    },
  });
}

export function useUpdateMaintenanceTicketStatus() {
  const update = useUpdateMaintenanceTicket();
  return {
    ...update,
    mutateAsync: (id: string, status: MaintenanceTicketStatus) =>
      update.mutateAsync({ id, status }),
  };
}

export function useUpdateMaintenanceTicketPriority() {
  const update = useUpdateMaintenanceTicket();
  return {
    ...update,
    mutateAsync: (id: string, priority: MaintenanceTicketPriority) =>
      update.mutateAsync({ id, priority }),
  };
}

export function useAssignMaintenanceTicketProvider() {
  const update = useUpdateMaintenanceTicket();
  return {
    ...update,
    mutateAsync: (id: string, assignedToProviderId: string | null) =>
      update.mutateAsync({ id, assignedToProviderId }),
  };
}

export function useAssignMaintenanceTicketContact() {
  const update = useUpdateMaintenanceTicket();
  return {
    ...update,
    mutateAsync: (id: string, assignedContactId: string | null) =>
      update.mutateAsync({ id, assignedContactId }),
  };
}
