import type { Contact } from '../../types/contacts';
import { formatContactAssigneeLabel } from '../../types/contacts';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const NONE_VALUE = '__none__';

interface ContactAssignSelectProps {
  contacts: Contact[];
  value: string | null | undefined;
  onValueChange: (contactId: string | null) => void;
  disabled?: boolean;
  label?: string;
  id?: string;
  compact?: boolean;
}

export default function ContactAssignSelect({
  contacts,
  value,
  onValueChange,
  disabled = false,
  label = 'Responsable assigné',
  id = 'ticket-assigned-contact',
  compact = false,
}: ContactAssignSelectProps) {
  return (
    <div className="space-y-1.5">
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <Select
        value={value ?? NONE_VALUE}
        onValueChange={(v) => onValueChange(v === NONE_VALUE ? null : v)}
        disabled={disabled}
      >
        <SelectTrigger id={id} className={compact ? 'h-8 min-w-[180px]' : undefined}>
          <SelectValue placeholder="Non assigné" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE_VALUE}>Non assigné</SelectItem>
          {contacts.map((contact) => (
            <SelectItem key={contact.id} value={contact.id}>
              {formatContactAssigneeLabel(contact)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
