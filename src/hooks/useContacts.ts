import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { formatApiError } from '../lib/formatApiError';
import { logSupabaseError } from '../lib/supabaseDiagnostics';
import { queryLoadingWhileAuth, useSupabaseQueryEnabled } from '../lib/authQuery';
import { useAuth } from './useAuth';
import { useRole } from './useRole';
import { SYNDICAT_STAFF_ROLES } from './useTickets';
import type { Contact } from '../types/contacts';

const CONTACTS_QUERY_KEY = 'contacts';

function mapContact(row: Record<string, unknown>): Contact {
  return {
    id: String(row.id),
    organizationId: String(row.organization_id),
    firstName: String(row.first_name),
    lastName: String(row.last_name),
    email: String(row.email ?? ''),
    phone: String(row.phone ?? ''),
    role: String(row.role ?? ''),
    department: String(row.department ?? ''),
    parentContactId: row.parent_contact_id ? String(row.parent_contact_id) : null,
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    electricalHabilitations: Array.isArray(row.electrical_habilitations)
      ? (row.electrical_habilitations as string[])
      : [],
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

async function fetchContacts(organizationId: string): Promise<Contact[]> {
  const { data, error, status } = await supabase
    .from('contacts')
    .select('*')
    .eq('organization_id', organizationId)
    .order('last_name')
    .order('first_name');

  if (error) {
    logSupabaseError('contacts.select', error, status);
    throw { ...error, status: status ?? (error as { status?: number }).status };
  }

  if (import.meta.env.DEV) {
    console.log('[useContacts] requête Supabase', {
      organizationId,
      httpStatus: status ?? null,
      rawCount: data?.length ?? 0,
    });
  }

  return (data ?? []).map(mapContact);
}

export function useCanManageContacts(): boolean {
  const { canAccess } = useRole();
  return canAccess(SYNDICAT_STAFF_ROLES);
}

export function useContacts() {
  const { authInitialized, organizationId, enabled: queryEnabled } = useSupabaseQueryEnabled();

  const query = useQuery({
    queryKey: [CONTACTS_QUERY_KEY, organizationId],
    queryFn: () => fetchContacts(organizationId!),
    enabled: queryEnabled,
    staleTime: 30_000,
  });

  return {
    contacts: query.data ?? [],
    loading: queryLoadingWhileAuth(authInitialized, queryEnabled, query.isLoading),
    error: query.error ? formatApiError(query.error) : null,
    refetch: query.refetch,
  };
}

export interface CreateContactInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  department: string;
  parentContactId?: string | null;
  avatarUrl?: string;
  electricalHabilitations?: string[];
}

export interface UpdateContactInput extends CreateContactInput {
  id: string;
}

export function useCreateContact() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateContactInput) => {
      const { data, error } = await supabase
        .from('contacts')
        .insert({
          organization_id: organizationId,
          first_name: input.firstName.trim(),
          last_name: input.lastName.trim(),
          email: input.email.trim(),
          phone: input.phone.trim(),
          role: input.role.trim(),
          department: input.department.trim(),
          parent_contact_id: input.parentContactId ?? null,
          avatar_url: input.avatarUrl ?? null,
          electrical_habilitations: input.electricalHabilitations ?? [],
        })
        .select('*')
        .single();

      if (error) throw error;
      return mapContact(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  return useMutation({
    mutationFn: async (input: UpdateContactInput) => {
      const { data, error } = await supabase
        .from('contacts')
        .update({
          first_name: input.firstName.trim(),
          last_name: input.lastName.trim(),
          email: input.email.trim(),
          phone: input.phone.trim(),
          role: input.role.trim(),
          department: input.department.trim(),
          parent_contact_id: input.parentContactId ?? null,
          avatar_url: input.avatarUrl ?? null,
          electrical_habilitations: input.electricalHabilitations ?? [],
        })
        .eq('organization_id', organizationId)
        .eq('id', input.id)
        .select('*')
        .single();

      if (error) throw error;
      return mapContact(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('contacts')
        .delete()
        .eq('organization_id', organizationId)
        .eq('id', id);

      if (error) throw error;
      return id;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] });
    },
  });
}

/** Déplace un contact sous un nouveau responsable (ou racine si parentContactId = null). */
export function useReparentContact() {
  const queryClient = useQueryClient();
  const { organizationId } = useAuth();

  return useMutation({
    mutationFn: async (input: { contactId: string; parentContactId: string | null }) => {
      const { data, error } = await supabase
        .from('contacts')
        .update({ parent_contact_id: input.parentContactId })
        .eq('organization_id', organizationId)
        .eq('id', input.contactId)
        .select('*')
        .single();

      if (error) throw error;
      return mapContact(data);
    },
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: [CONTACTS_QUERY_KEY, organizationId] });
      const previous = queryClient.getQueryData<Contact[]>([CONTACTS_QUERY_KEY, organizationId]);

      queryClient.setQueryData<Contact[]>([CONTACTS_QUERY_KEY, organizationId], (current) =>
        (current ?? []).map((contact) =>
          contact.id === input.contactId
            ? { ...contact, parentContactId: input.parentContactId }
            : contact,
        ),
      );

      return { previous };
    },
    onError: (_err, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData([CONTACTS_QUERY_KEY, organizationId], context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: [CONTACTS_QUERY_KEY] });
    },
  });
}
