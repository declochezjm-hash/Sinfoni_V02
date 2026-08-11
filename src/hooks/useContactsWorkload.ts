import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { formatApiError } from '../lib/formatApiError';
import { useAuth } from './useAuth';
import { ACTIVE_MAINTENANCE_TICKET_STATUSES } from './useTickets';

async function fetchActiveTicketCountsByContact(
  organizationId: string,
): Promise<Map<string, number>> {
  const { data, error } = await supabase
    .from('tickets_maintenance_enriched')
    .select('assigned_contact_id')
    .eq('organization_id', organizationId)
    .in('status', [...ACTIVE_MAINTENANCE_TICKET_STATUSES])
    .not('assigned_contact_id', 'is', null);

  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const contactId = String(row.assigned_contact_id);
    counts.set(contactId, (counts.get(contactId) ?? 0) + 1);
  }

  return counts;
}

export function useContactsWorkload() {
  const { organizationId } = useAuth();

  const query = useQuery({
    queryKey: ['tickets-maintenance', 'workload-by-contact', organizationId],
    queryFn: () => fetchActiveTicketCountsByContact(organizationId!),
    enabled: !!organizationId,
  });

  const countByContactId = query.data ?? new Map<string, number>();

  const getActiveTicketCount = (contactId: string): number =>
    countByContactId.get(contactId) ?? 0;

  return {
    countByContactId,
    getActiveTicketCount,
    loading: query.isLoading,
    error: query.error ? formatApiError(query.error) : null,
    refetch: query.refetch,
  };
}
