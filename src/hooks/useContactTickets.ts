import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { formatApiError } from '../lib/formatApiError';
import { useAuth } from './useAuth';
import {
  ACTIVE_MAINTENANCE_TICKET_STATUSES,
  mapMaintenanceTicket,
  TICKET_ENRICHED_SELECT,
} from './useTickets';
import type { MaintenanceTicket } from '../types';

async function fetchContactTickets(
  organizationId: string,
  contactId: string,
): Promise<MaintenanceTicket[]> {
  const { data, error } = await supabase
    .from('tickets_maintenance_enriched')
    .select(TICKET_ENRICHED_SELECT)
    .eq('organization_id', organizationId)
    .eq('assigned_contact_id', contactId)
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapMaintenanceTicket);
}

export function useContactTickets(contactId: string | null | undefined) {
  const { organizationId } = useAuth();

  const query = useQuery({
    queryKey: ['tickets-maintenance', 'contact', organizationId, contactId],
    queryFn: () => fetchContactTickets(organizationId!, contactId!),
    enabled: !!organizationId && !!contactId,
  });

  const activeCount = useMemo(
    () =>
      (query.data ?? []).filter((ticket) =>
        ACTIVE_MAINTENANCE_TICKET_STATUSES.includes(
          ticket.status as typeof ACTIVE_MAINTENANCE_TICKET_STATUSES[number],
        ),
      ).length,
    [query.data],
  );

  return {
    tickets: query.data ?? [],
    activeCount,
    loading: query.isLoading,
    error: query.error ? formatApiError(query.error) : null,
    refetch: query.refetch,
  };
}
