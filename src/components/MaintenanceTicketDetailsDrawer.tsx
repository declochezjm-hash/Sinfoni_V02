import { useEffect, useMemo, useState } from 'react';
import { FileDown, Pencil, Wrench } from 'lucide-react';
import type { Contact } from '../types/contacts';
import type { MaintenanceTicket } from '../types';
import { useMaintenanceTicketPermissions } from '../hooks/useTickets';
import { useEnergyAssets } from '../hooks/useEnergyAssets';
import { getCommuneLabel } from '../lib/departmentCommunes';
import {
  getTicketPriorityBadgeClass,
  getTicketPriorityLabel,
  getTicketStatusBadgeClass,
  getTicketStatusLabel,
} from '../lib/maintenanceTicketLabels';
import { formatDateTime } from '../lib/utils';
import {
  buildTicketReference,
  generateInterventionSheetPdf,
} from '../utils/interventionSheetPdf';
import AssignedContactDisplay from './maintenance/AssignedContactDisplay';
import ContactAssignSelect from './maintenance/ContactAssignSelect';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';

interface MaintenanceTicketDetailsDrawerProps {
  ticket: MaintenanceTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  providerName?: string;
  saving?: boolean;
  onAssignContact?: (ticketId: string, contactId: string | null) => Promise<void>;
  onEdit?: (ticket: MaintenanceTicket) => void;
}

export default function MaintenanceTicketDetailsDrawer({
  ticket,
  open,
  onOpenChange,
  contacts,
  providerName,
  saving = false,
  onAssignContact,
  onEdit,
}: MaintenanceTicketDetailsDrawerProps) {
  const perms = useMaintenanceTicketPermissions();
  const { assets } = useEnergyAssets();
  const [quickAssignOpen, setQuickAssignOpen] = useState(false);
  const [pendingContactId, setPendingContactId] = useState<string | null>(null);
  const [exportingPdf, setExportingPdf] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const asset = useMemo(() => {
    if (!ticket) return null;
    return assets.find((a) => a.id === ticket.assetId) ?? null;
  }, [assets, ticket]);

  useEffect(() => {
    if (!ticket) return;
    setPendingContactId(ticket.assignedContactId ?? null);
    setQuickAssignOpen(false);
    setExportError(null);
  }, [ticket]);

  if (!ticket) return null;

  const ticketRef = buildTicketReference(ticket);

  const handleQuickAssign = async () => {
    if (!onAssignContact) return;
    await onAssignContact(ticket.id, pendingContactId);
    setQuickAssignOpen(false);
  };

  const handleExportPdf = async () => {
    setExportingPdf(true);
    setExportError(null);
    try {
      await generateInterventionSheetPdf({
        ticket,
        asset,
        providerName,
      });
    } catch (err) {
      setExportError(
        err instanceof Error ? err.message : 'Échec de la génération du PDF',
      );
    } finally {
      setExportingPdf(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench size={18} className="text-slate-600" />
            {ticket.title}
          </DialogTitle>
          <DialogDescription>
            #{ticketRef} · Créé le {formatDateTime(ticket.createdAt)} —{' '}
            {getCommuneLabel(ticket.communeInseeCode)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge className={getTicketStatusBadgeClass(ticket.status)}>
              {getTicketStatusLabel(ticket.status)}
            </Badge>
            <Badge className={getTicketPriorityBadgeClass(ticket.priority)}>
              {getTicketPriorityLabel(ticket.priority)}
            </Badge>
          </div>

          <div>
            <p className="text-xs font-medium text-slate-500">Description</p>
            <p className="mt-1 text-sm text-slate-800 whitespace-pre-wrap">{ticket.description}</p>
          </div>

          {asset && (
            <div>
              <p className="text-xs font-medium text-slate-500">Équipement</p>
              <p className="mt-1 text-sm text-slate-800">{asset.name}</p>
              <p className="text-[11px] text-slate-500">
                GPS {asset.latitude.toFixed(5)}, {asset.longitude.toFixed(5)}
              </p>
            </div>
          )}

          {providerName && (
            <div>
              <p className="text-xs font-medium text-slate-500">Prestataire assigné</p>
              <p className="mt-1 text-sm text-slate-800">{providerName}</p>
            </div>
          )}

          <div>
            <p className="mb-2 text-xs font-medium text-slate-500">Responsable assigné</p>
            {quickAssignOpen && perms.canAssignContact ? (
              <div className="space-y-3">
                <ContactAssignSelect
                  contacts={contacts}
                  value={pendingContactId}
                  onValueChange={setPendingContactId}
                  disabled={saving}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => void handleQuickAssign()}
                    disabled={saving}
                  >
                    {saving ? 'Enregistrement…' : 'Confirmer'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setQuickAssignOpen(false)}
                    disabled={saving}
                  >
                    Annuler
                  </Button>
                </div>
              </div>
            ) : (
              <AssignedContactDisplay
                assignee={ticket.assignedContact}
                canAssign={perms.canAssignContact}
                onAssign={() => {
                  setPendingContactId(ticket.assignedContactId ?? null);
                  setQuickAssignOpen(true);
                }}
              />
            )}
          </div>

          {exportError && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {exportError}
            </p>
          )}
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-between">
          <div className="flex flex-wrap gap-2">
            {onEdit && !perms.isCommuneReadOnly && (
              <Button type="button" variant="outline" onClick={() => onEdit(ticket)}>
                <Pencil size={14} className="mr-2" />
                Modifier
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleExportPdf()}
              disabled={exportingPdf}
            >
              <FileDown size={14} className="mr-2" />
              {exportingPdf ? 'Génération…' : "Exporter Fiche d'Intervention (PDF)"}
            </Button>
          </div>
          <Button type="button" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
