import { useEffect, useState } from 'react';
import { Wrench } from 'lucide-react';
import {
  TICKET_PRIORITY_OPTIONS,
  TICKET_STATUS_OPTIONS,
} from '../lib/maintenanceTicketLabels';
import ContactAssignSelect from './maintenance/ContactAssignSelect';
import type { Contact } from '../types/contacts';
import type { MaintenanceTicket, MaintenanceTicketPriority, MaintenanceTicketStatus } from '../types';
import { useMaintenanceTicketPermissions } from '../hooks/useTickets';
import { Button } from './ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { Textarea } from './ui/textarea';

interface MaintenanceTicketEditDialogProps {
  ticket: MaintenanceTicket | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saving: boolean;
  onSave: (payload: {
    id: string;
    title: string;
    description: string;
    status: MaintenanceTicketStatus;
    priority: MaintenanceTicketPriority;
    assignedToProviderId: string | null;
    assignedContactId: string | null;
  }) => Promise<void>;
  providerOptions: { id: string; name: string }[];
  contactOptions: Contact[];
}

export default function MaintenanceTicketEditDialog({
  ticket,
  open,
  onOpenChange,
  saving,
  onSave,
  providerOptions,
  contactOptions,
}: MaintenanceTicketEditDialogProps) {
  const perms = useMaintenanceTicketPermissions();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<MaintenanceTicketStatus>('open');
  const [priority, setPriority] = useState<MaintenanceTicketPriority>('medium');
  const [assignedToProviderId, setAssignedToProviderId] = useState<string>('none');
  const [assignedContactId, setAssignedContactId] = useState<string | null>(null);

  useEffect(() => {
    if (!ticket) return;
    setTitle(ticket.title);
    setDescription(ticket.description);
    setStatus(ticket.status);
    setPriority(ticket.priority);
    setAssignedToProviderId(ticket.assignedToProviderId ?? 'none');
    setAssignedContactId(ticket.assignedContactId ?? null);
  }, [ticket]);

  const statusOptions = TICKET_STATUS_OPTIONS.filter(
    (opt) => perms.canCloseTicket || opt.value !== 'closed',
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticket) return;

    await onSave({
      id: ticket.id,
      title: title.trim(),
      description: description.trim(),
      status,
      priority,
      assignedToProviderId: assignedToProviderId === 'none' ? null : assignedToProviderId,
      assignedContactId,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wrench size={18} className="text-slate-600" />
            Modifier le ticket
          </DialogTitle>
          {ticket && (
            <DialogDescription>
              Créé le {new Date(ticket.createdAt).toLocaleString('fr-FR')} — Commune INSEE{' '}
              {ticket.communeInseeCode}
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-ticket-title">Titre</Label>
            <Input
              id="edit-ticket-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={!perms.canEditTitle}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-ticket-description">Description / Remarques</Label>
            <Textarea
              id="edit-ticket-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={6}
              disabled={!perms.canEditDescription}
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="edit-ticket-status">Statut</Label>
              <Select
                value={status}
                onValueChange={(v) => setStatus(v as MaintenanceTicketStatus)}
                disabled={!perms.canEditStatus}
              >
                <SelectTrigger id="edit-ticket-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-ticket-priority">Priorité</Label>
              <Select
                value={priority}
                onValueChange={(v) => setPriority(v as MaintenanceTicketPriority)}
                disabled={!perms.canEditPriority}
              >
                <SelectTrigger id="edit-ticket-priority">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TICKET_PRIORITY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {perms.canAssignProvider && (
            <div className="space-y-1.5">
              <Label htmlFor="edit-ticket-provider">Prestataire assigné</Label>
              <Select value={assignedToProviderId} onValueChange={setAssignedToProviderId}>
                <SelectTrigger id="edit-ticket-provider">
                  <SelectValue placeholder="Non assigné" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Non assigné</SelectItem>
                  {providerOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {perms.canAssignContact && (
            <ContactAssignSelect
              contacts={contactOptions}
              value={assignedContactId}
              onValueChange={setAssignedContactId}
              disabled={saving}
              id="edit-ticket-contact"
            />
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving || !title.trim() || !description.trim()}>
              {saving ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
