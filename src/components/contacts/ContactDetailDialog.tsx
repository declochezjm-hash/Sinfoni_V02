import { Mail, Phone, Pencil, Trash2 } from 'lucide-react';
import type { Contact } from '../../types/contacts';
import { getContactFullName, getContactInitials } from '../../types/contacts';
import { useContactTickets } from '../../hooks/useContactTickets';
import ContactTicketsList from './ContactTicketsList';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';

interface ContactDetailDialogProps {
  contact: Contact | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts?: Contact[];
  canManage?: boolean;
  onEdit?: (contact: Contact) => void;
  onDelete?: (contact: Contact) => void;
}

export default function ContactDetailDialog({
  contact,
  open,
  onOpenChange,
  contacts = [],
  canManage = false,
  onEdit,
  onDelete,
}: ContactDetailDialogProps) {
  const contactId = contact?.id;
  const { activeCount } = useContactTickets(open ? contactId : null);

  if (!contact) return null;

  const parentContact = contact.parentContactId
    ? contacts.find((c) => c.id === contact.parentContactId)
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
              {contact.avatarUrl ? (
                <img
                  src={contact.avatarUrl}
                  alt=""
                  className="h-full w-full rounded-full object-cover"
                />
              ) : (
                getContactInitials(contact)
              )}
            </span>
            {getContactFullName(contact)}
          </DialogTitle>
          <DialogDescription>
            Fiche interlocuteur — {contact.department}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="info" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="info" className="flex-1">Informations</TabsTrigger>
            <TabsTrigger value="maintenance" className="flex-1">
              Maintenance & Tickets
              {activeCount > 0 && (
                <Badge variant="secondary" className="h-5 min-w-5 px-1 text-[10px]">
                  {activeCount}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="info" className="space-y-3 text-sm">
            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">{contact.role}</Badge>
              <Badge variant="outline">{contact.department}</Badge>
            </div>

            <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
              <p className="text-xs font-medium text-slate-500">Responsable hiérarchique</p>
              <p className="mt-0.5 text-slate-800">
                {parentContact ? getContactFullName(parentContact) : '—'}
              </p>
            </div>

            {contact.email && (
              <a
                href={`mailto:${contact.email}`}
                className="flex items-center gap-2 text-sky-600 hover:underline"
              >
                <Mail size={14} />
                {contact.email}
              </a>
            )}

            {contact.phone && (
              <a
                href={`tel:${contact.phone.replace(/\s/g, '')}`}
                className="flex items-center gap-2 text-sky-600 hover:underline"
              >
                <Phone size={14} />
                {contact.phone}
              </a>
            )}

            {canManage && (
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onEdit?.(contact)}
                >
                  <Pencil size={14} />
                  Modifier
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  onClick={() => onDelete?.(contact)}
                >
                  <Trash2 size={14} />
                  Supprimer
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="maintenance">
            <ContactTicketsList contactId={contact.id} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
