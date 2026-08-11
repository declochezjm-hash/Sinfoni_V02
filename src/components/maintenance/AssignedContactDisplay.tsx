import { Mail, Phone, UserPlus } from 'lucide-react';
import type { MaintenanceTicketAssignee } from '../../types';
import { getContactFullName } from '../../types/contacts';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

interface AssignedContactDisplayProps {
  assignee?: MaintenanceTicketAssignee | null;
  canAssign?: boolean;
  onAssign?: () => void;
  compact?: boolean;
}

export default function AssignedContactDisplay({
  assignee,
  canAssign = false,
  onAssign,
  compact = false,
}: AssignedContactDisplayProps) {
  if (!assignee) {
    if (!canAssign) {
      return <span className="text-sm text-slate-400">Non assigné</span>;
    }

    return (
      <Button type="button" variant="outline" size="sm" className="h-8 gap-1" onClick={onAssign}>
        <UserPlus size={14} />
        Assigner un responsable
      </Button>
    );
  }

  const fullName = getContactFullName(assignee);

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-slate-900">{fullName}</span>
        <Badge variant="outline" className="text-[10px]">{assignee.role}</Badge>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-slate-900">{fullName}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-[10px]">{assignee.role}</Badge>
            <Badge variant="outline" className="text-[10px]">{assignee.department}</Badge>
          </div>
        </div>
        <div className="flex gap-1">
          {assignee.phone && (
            <Button asChild variant="outline" size="icon" className="h-8 w-8">
              <a href={`tel:${assignee.phone.replace(/\s/g, '')}`} title="Appeler">
                <Phone size={14} />
              </a>
            </Button>
          )}
          {assignee.email && (
            <Button asChild variant="outline" size="icon" className="h-8 w-8">
              <a href={`mailto:${assignee.email}`} title="Envoyer un email">
                <Mail size={14} />
              </a>
            </Button>
          )}
        </div>
      </div>
      {(assignee.email || assignee.phone) && (
        <div className="mt-2 space-y-0.5 text-xs text-slate-600">
          {assignee.email && <p>{assignee.email}</p>}
          {assignee.phone && <p>{assignee.phone}</p>}
        </div>
      )}
    </div>
  );
}
