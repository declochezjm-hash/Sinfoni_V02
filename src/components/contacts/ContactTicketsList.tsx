import { useMemo, useState } from 'react';
import { Wrench } from 'lucide-react';
import MaintenanceTicketDetailsDrawer from '../MaintenanceTicketDetailsDrawer';
import { useContactTickets } from '../../hooks/useContactTickets';
import { useContacts } from '../../hooks/useContacts';
import { useEnergyAssets } from '../../hooks/useEnergyAssets';
import {
  useMaintenanceProviders,
  useMaintenanceTicketPermissions,
  useUpdateMaintenanceTicket,
} from '../../hooks/useTickets';
import { useToast } from '../../hooks/useToast';
import { formatApiError } from '../../lib/formatApiError';
import {
  getTicketPriorityBadgeClass,
  getTicketPriorityLabel,
  getTicketStatusBadgeClass,
  getTicketStatusLabel,
} from '../../lib/maintenanceTicketLabels';
import { formatDateTime } from '../../lib/utils';
import type { MaintenanceTicket } from '../../types';
import { Badge } from '../ui/badge';

interface ContactTicketsListProps {
  contactId: string;
}

export default function ContactTicketsList({ contactId }: ContactTicketsListProps) {
  const { toast } = useToast();
  const perms = useMaintenanceTicketPermissions();
  const { tickets, loading, error } = useContactTickets(contactId);
  const { contacts } = useContacts();
  const { providers } = useMaintenanceProviders();
  const { assets } = useEnergyAssets();
  const updateTicket = useUpdateMaintenanceTicket();

  const [selectedTicket, setSelectedTicket] = useState<MaintenanceTicket | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const assetNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const asset of assets) map.set(asset.id, asset.name);
    return map;
  }, [assets]);

  const providerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const provider of providers) map.set(provider.id, provider.name);
    return map;
  }, [providers]);

  const openTicketDetails = (ticket: MaintenanceTicket) => {
    setSelectedTicket(ticket);
    setDetailsOpen(true);
  };

  const handleAssignContact = async (ticketId: string, assignedContactId: string | null) => {
    try {
      const updated = await updateTicket.mutateAsync({ id: ticketId, assignedContactId });
      if (selectedTicket?.id === ticketId) setSelectedTicket(updated);
      toast.success('Ticket mis à jour');
    } catch (err) {
      toast.error('Échec de la mise à jour', { description: formatApiError(err) });
      throw err;
    }
  };

  const detailProviderName = selectedTicket?.assignedToProviderId
    ? providerNameById.get(selectedTicket.assignedToProviderId)
    : undefined;

  if (loading) {
    return (
      <div className="flex h-24 items-center justify-center text-sm text-slate-500">
        Chargement des tickets…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
        {error}
      </div>
    );
  }

  if (tickets.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
        Aucun ticket de maintenance assigné à ce contact
      </p>
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {tickets.map((ticket) => (
          <li key={ticket.id}>
            <button
              type="button"
              onClick={() => openTicketDetails(ticket)}
              className="w-full rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-sky-200 hover:bg-sky-50/40"
            >
              <div className="flex flex-wrap items-center gap-2">
                <Badge className={getTicketStatusBadgeClass(ticket.status)}>
                  {getTicketStatusLabel(ticket.status)}
                </Badge>
                <Badge className={getTicketPriorityBadgeClass(ticket.priority)}>
                  {getTicketPriorityLabel(ticket.priority)}
                </Badge>
              </div>

              <p className="mt-2 flex items-start gap-2 text-sm font-medium text-slate-900">
                <Wrench size={14} className="mt-0.5 shrink-0 text-slate-400" />
                {ticket.title}
              </p>

              <p className="mt-1 text-xs text-slate-600">
                Équipement : {assetNameById.get(ticket.assetId) ?? 'Actif inconnu'}
              </p>

              <p className="mt-2 text-[11px] text-slate-500">
                Créé le {formatDateTime(ticket.createdAt)}
                {' · '}
                Mis à jour le {formatDateTime(ticket.updatedAt)}
              </p>
            </button>
          </li>
        ))}
      </ul>

      <MaintenanceTicketDetailsDrawer
        ticket={selectedTicket}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        contacts={contacts}
        providerName={detailProviderName}
        saving={updateTicket.isPending}
        onAssignContact={perms.canAssignContact ? handleAssignContact : undefined}
      />
    </>
  );
}
