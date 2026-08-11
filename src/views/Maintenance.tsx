import { useMemo, useState } from 'react';
import { Eye, MoreHorizontal, Pencil, Search, Wrench } from 'lucide-react';
import MaintenanceTicketDetailsDrawer from '../components/MaintenanceTicketDetailsDrawer';
import MaintenanceTicketEditDialog from '../components/MaintenanceTicketEditDialog';
import AssignedContactDisplay from '../components/maintenance/AssignedContactDisplay';
import ContactAssignSelect from '../components/maintenance/ContactAssignSelect';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Input } from '../components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../components/ui/table';
import { useContacts } from '../hooks/useContacts';
import {
  useMaintenanceProviders,
  useMaintenanceTicketPermissions,
  useMaintenanceTickets,
  useUpdateMaintenanceTicket,
} from '../hooks/useTickets';
import { useToast } from '../hooks/useToast';
import { formatApiError } from '../lib/formatApiError';
import { getCommuneLabel } from '../lib/departmentCommunes';
import {
  getTicketPriorityBadgeClass,
  getTicketPriorityLabel,
  getTicketStatusBadgeClass,
  getTicketStatusLabel,
  TICKET_PRIORITY_OPTIONS,
  TICKET_STATUS_OPTIONS,
} from '../lib/maintenanceTicketLabels';
import { formatDateTime } from '../lib/utils';
import { formatContactAssigneeLabel } from '../types/contacts';
import type {
  MaintenanceTicket,
  MaintenanceTicketPriority,
  MaintenanceTicketStatus,
} from '../types';

type StatusFilter = MaintenanceTicketStatus | 'all';
type PriorityFilter = MaintenanceTicketPriority | 'all';
type AssigneeFilter = 'all' | 'none' | string;

export default function Maintenance() {
  const perms = useMaintenanceTicketPermissions();
  const { toast } = useToast();
  const { tickets, loading, error } = useMaintenanceTickets();
  const { providers } = useMaintenanceProviders();
  const { contacts } = useContacts();
  const updateTicket = useUpdateMaintenanceTicket();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
  const [assigneeFilter, setAssigneeFilter] = useState<AssigneeFilter>('all');
  const [editingTicket, setEditingTicket] = useState<MaintenanceTicket | null>(null);
  const [detailTicket, setDetailTicket] = useState<MaintenanceTicket | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const providerNameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of providers) map.set(p.id, p.name);
    return map;
  }, [providers]);

  const filteredTickets = useMemo(() => {
    const q = search.trim().toLowerCase();
    return tickets.filter((ticket) => {
      if (statusFilter !== 'all' && ticket.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && ticket.priority !== priorityFilter) return false;
      if (assigneeFilter === 'none' && ticket.assignedContactId) return false;
      if (assigneeFilter !== 'all' && assigneeFilter !== 'none') {
        if (ticket.assignedContactId !== assigneeFilter) return false;
      }
      if (!q) return true;
      return (
        ticket.title.toLowerCase().includes(q) ||
        ticket.description.toLowerCase().includes(q) ||
        (ticket.assignedContact &&
          formatContactAssigneeLabel(ticket.assignedContact).toLowerCase().includes(q))
      );
    });
  }, [tickets, search, statusFilter, priorityFilter, assigneeFilter]);

  const statusOptionsForRow = TICKET_STATUS_OPTIONS.filter(
    (opt) => perms.canCloseTicket || opt.value !== 'closed',
  );

  const handleUpdate = async (
    id: string,
    payload: Partial<{
      status: MaintenanceTicketStatus;
      priority: MaintenanceTicketPriority;
      assignedToProviderId: string | null;
      assignedContactId: string | null;
      title: string;
      description: string;
    }>,
  ) => {
    try {
      const updated = await updateTicket.mutateAsync({ id, ...payload });
      if (detailTicket?.id === id) {
        setDetailTicket(updated);
      }
      toast.success('Ticket mis à jour', {
        description: 'Les modifications ont été enregistrées.',
      });
      return updated;
    } catch (err) {
      toast.error('Échec de la mise à jour', { description: formatApiError(err) });
      throw err;
    }
  };

  const openEditDialog = (ticket: MaintenanceTicket) => {
    setEditingTicket(ticket);
    setDialogOpen(true);
  };

  const openDetailsDrawer = (ticket: MaintenanceTicket) => {
    setDetailTicket(ticket);
    setDetailsOpen(true);
  };

  const handleDialogSave = async (payload: {
    id: string;
    title: string;
    description: string;
    status: MaintenanceTicketStatus;
    priority: MaintenanceTicketPriority;
    assignedToProviderId: string | null;
    assignedContactId: string | null;
  }) => {
    await handleUpdate(payload.id, payload);
    setDialogOpen(false);
    setEditingTicket(null);
  };

  const detailProviderName = detailTicket?.assignedToProviderId
    ? providerNameById.get(detailTicket.assignedToProviderId)
    : undefined;

  if (!perms.canView) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-800">
        Vous n&apos;avez pas accès à la gestion des tickets de maintenance.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-slate-900">
          <Wrench size={22} className="text-slate-600" />
          Maintenance & signalements
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {perms.isCommuneReadOnly
            ? 'Consultation des tickets de votre commune.'
            : perms.isPrestataire
              ? 'Suivi des tickets qui vous sont assignés.'
              : 'Gestion des anomalies signalées sur le patrimoine énergétique.'}
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end">
          <label className="flex min-w-[220px] flex-1 flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Recherche</span>
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Titre, description ou responsable…"
                className="pl-9"
              />
            </div>
          </label>

          <label className="flex min-w-[160px] flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Statut</span>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                {TICKET_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="flex min-w-[160px] flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Priorité</span>
            <Select
              value={priorityFilter}
              onValueChange={(v) => setPriorityFilter(v as PriorityFilter)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes priorités</SelectItem>
                {TICKET_PRIORITY_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="flex min-w-[220px] flex-col gap-1">
            <span className="text-xs font-medium text-slate-600">Responsable assigné</span>
            <Select
              value={assigneeFilter}
              onValueChange={(v) => setAssigneeFilter(v as AssigneeFilter)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les responsables</SelectItem>
                <SelectItem value="none">Non assigné</SelectItem>
                {contacts.map((contact) => (
                  <SelectItem key={contact.id} value={contact.id}>
                    {formatContactAssigneeLabel(contact)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Chargement des tickets…</div>
        ) : error ? (
          <div className="p-8 text-center text-sm text-red-600">{error}</div>
        ) : filteredTickets.length === 0 ? (
          <div className="p-8 text-center text-sm text-slate-500">
            Aucun ticket ne correspond aux critères.
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Titre / Problème</TableHead>
                <TableHead>Commune</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Priorité</TableHead>
                <TableHead>Responsable</TableHead>
                <TableHead>Prestataire</TableHead>
                <TableHead className="w-[72px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredTickets.map((ticket) => (
                <TableRow key={ticket.id}>
                  <TableCell>
                    <button
                      type="button"
                      className="text-left hover:text-sky-700"
                      onClick={() => openDetailsDrawer(ticket)}
                    >
                      <p className="font-medium text-slate-900">{ticket.title}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {formatDateTime(ticket.createdAt)}
                      </p>
                    </button>
                  </TableCell>

                  <TableCell className="text-sm text-slate-700">
                    {getCommuneLabel(ticket.communeInseeCode)}
                  </TableCell>

                  <TableCell>
                    {perms.canEditStatus ? (
                      <Select
                        value={ticket.status}
                        onValueChange={(v) =>
                          void handleUpdate(ticket.id, { status: v as MaintenanceTicketStatus })
                        }
                        disabled={updateTicket.isPending}
                      >
                        <SelectTrigger className="h-8 w-[140px] border-0 bg-transparent p-0 shadow-none focus:ring-0">
                          <Badge className={getTicketStatusBadgeClass(ticket.status)}>
                            {getTicketStatusLabel(ticket.status)}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptionsForRow.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={getTicketStatusBadgeClass(ticket.status)}>
                        {getTicketStatusLabel(ticket.status)}
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    {perms.canEditPriority ? (
                      <Select
                        value={ticket.priority}
                        onValueChange={(v) =>
                          void handleUpdate(ticket.id, { priority: v as MaintenanceTicketPriority })
                        }
                        disabled={updateTicket.isPending}
                      >
                        <SelectTrigger className="h-8 w-[120px] border-0 bg-transparent p-0 shadow-none focus:ring-0">
                          <Badge className={getTicketPriorityBadgeClass(ticket.priority)}>
                            {getTicketPriorityLabel(ticket.priority)}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {TICKET_PRIORITY_OPTIONS.map((opt) => (
                            <SelectItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge className={getTicketPriorityBadgeClass(ticket.priority)}>
                        {getTicketPriorityLabel(ticket.priority)}
                      </Badge>
                    )}
                  </TableCell>

                  <TableCell>
                    {perms.canAssignContact ? (
                      <ContactAssignSelect
                        contacts={contacts}
                        value={ticket.assignedContactId}
                        onValueChange={(contactId) =>
                          void handleUpdate(ticket.id, { assignedContactId: contactId })
                        }
                        disabled={updateTicket.isPending}
                        label=""
                        compact
                      />
                    ) : (
                      <AssignedContactDisplay assignee={ticket.assignedContact} compact />
                    )}
                  </TableCell>

                  <TableCell>
                    {perms.canAssignProvider ? (
                      <Select
                        value={ticket.assignedToProviderId ?? 'none'}
                        onValueChange={(v) =>
                          void handleUpdate(ticket.id, {
                            assignedToProviderId: v === 'none' ? null : v,
                          })
                        }
                        disabled={updateTicket.isPending}
                      >
                        <SelectTrigger className="h-8 min-w-[160px]">
                          <SelectValue placeholder="Non assigné" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">Non assigné</SelectItem>
                          {providers.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <span className="text-sm text-slate-700">
                        {ticket.assignedToProviderId
                          ? providerNameById.get(ticket.assignedToProviderId) ?? 'Prestataire'
                          : '—'}
                      </span>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal size={16} />
                          <span className="sr-only">Actions</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openDetailsDrawer(ticket)}>
                          <Eye size={14} className="mr-2" />
                          Voir le détail
                        </DropdownMenuItem>
                        {!perms.isCommuneReadOnly && (
                          <DropdownMenuItem onClick={() => openEditDialog(ticket)}>
                            <Pencil size={14} className="mr-2" />
                            Modifier le ticket
                          </DropdownMenuItem>
                        )}
                        {perms.canCloseTicket && ticket.status !== 'closed' && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() =>
                                void handleUpdate(ticket.id, { status: 'closed' })
                              }
                            >
                              Clôturer le ticket
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <MaintenanceTicketEditDialog
        ticket={editingTicket}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        saving={updateTicket.isPending}
        onSave={handleDialogSave}
        providerOptions={providers}
        contactOptions={contacts}
      />

      <MaintenanceTicketDetailsDrawer
        ticket={detailTicket}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        contacts={contacts}
        providerName={detailProviderName}
        saving={updateTicket.isPending}
        onAssignContact={async (ticketId, contactId) => {
          await handleUpdate(ticketId, { assignedContactId: contactId });
        }}
        onEdit={(ticket) => {
          setDetailsOpen(false);
          openEditDialog(ticket);
        }}
      />
    </div>
  );
}
