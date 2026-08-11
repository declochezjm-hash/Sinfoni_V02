import { Mail, Phone, Pencil, Trash2 } from 'lucide-react';
import type { Contact } from '../../types/contacts';
import { getContactFullName, getContactInitials } from '../../types/contacts';
import ContactWorkloadBadge from './ContactWorkloadBadge';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface ContactCardProps {
  contact: Contact;
  activeTicketsCount?: number;
  canManage?: boolean;
  onView?: (contact: Contact) => void;
  onEdit?: (contact: Contact) => void;
  onDelete?: (contact: Contact) => void;
}

export default function ContactCard({
  contact,
  activeTicketsCount = 0,
  canManage = false,
  onView,
  onEdit,
  onDelete,
}: ContactCardProps) {
  return (
    <div
      className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
      onClick={() => onView?.(contact)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onView?.(contact);
      }}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-900 text-sm font-bold text-white">
          {contact.avatarUrl ? (
            <img
              src={contact.avatarUrl}
              alt=""
              className="h-full w-full rounded-full object-cover"
            />
          ) : (
            getContactInitials(contact)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold text-slate-900">{getContactFullName(contact)}</p>
          <p className="text-xs text-slate-500">{contact.role}</p>
          <Badge variant="outline" className="mt-1 text-[10px]">{contact.department}</Badge>
        </div>
        <ContactWorkloadBadge
          activeTicketsCount={activeTicketsCount}
          className="shrink-0 self-start"
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      <div className="mt-3 space-y-1 text-xs text-slate-600">
        {contact.email && <p className="truncate">{contact.email}</p>}
        {contact.phone && <p>{contact.phone}</p>}
      </div>

      <div className="mt-3 flex flex-wrap gap-1 border-t border-slate-100 pt-3">
        {contact.phone && (
          <Button asChild variant="outline" size="sm" className="h-8">
            <a href={`tel:${contact.phone.replace(/\s/g, '')}`} onClick={(e) => e.stopPropagation()}>
              <Phone size={13} />
              Appeler
            </a>
          </Button>
        )}
        {contact.email && (
          <Button asChild variant="outline" size="sm" className="h-8">
            <a href={`mailto:${contact.email}`} onClick={(e) => e.stopPropagation()}>
              <Mail size={13} />
              Email
            </a>
          </Button>
        )}
        {canManage && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => {
                e.stopPropagation();
                onEdit?.(contact);
              }}
            >
              <Pencil size={14} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
              onClick={(e) => {
                e.stopPropagation();
                onDelete?.(contact);
              }}
            >
              <Trash2 size={14} />
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
