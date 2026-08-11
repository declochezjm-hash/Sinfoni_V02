import { useMemo, useState } from 'react';
import type { Contact } from '../../types/contacts';
import { getContactFullName } from '../../types/contacts';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  contactHasRequiredHabilitations,
  filterAssignableTechnicians,
  getMissingHabilitations,
} from '../../lib/planningUtils';
import { AlertTriangle } from 'lucide-react';

const UNASSIGNED = '__none__';

interface TechnicianAssignSelectProps {
  technicians: Contact[];
  requiredHabilitations: string[];
  value: string | null;
  disabled?: boolean;
  onAssign: (contactId: string | null) => Promise<void>;
}

export default function TechnicianAssignSelect({
  technicians,
  requiredHabilitations,
  value,
  disabled,
  onAssign,
}: TechnicianAssignSelectProps) {
  const { compatible, incompatible } = useMemo(
    () => filterAssignableTechnicians(technicians, requiredHabilitations),
    [technicians, requiredHabilitations],
  );

  const selected = technicians.find((t) => t.id === value);
  const selectedMissing =
    selected && !contactHasRequiredHabilitations(selected.electricalHabilitations ?? [], requiredHabilitations)
      ? getMissingHabilitations(selected.electricalHabilitations ?? [], requiredHabilitations)
      : [];

  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[10px] font-medium uppercase tracking-wide text-slate-500">
        Technicien assigné
      </label>
      <Select
        value={value ?? UNASSIGNED}
        disabled={disabled}
        onValueChange={async (v) => {
          setError(null);
          const contactId = v === UNASSIGNED ? null : v;
          if (contactId) {
            const contact = technicians.find((t) => t.id === contactId);
            if (
              contact &&
              !contactHasRequiredHabilitations(contact.electricalHabilitations ?? [], requiredHabilitations)
            ) {
              setError(
                `Habilitations manquantes : ${getMissingHabilitations(contact.electricalHabilitations ?? [], requiredHabilitations).join(', ')}`,
              );
              return;
            }
          }
          try {
            await onAssign(contactId);
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Assignation impossible.');
          }
        }}
      >
        <SelectTrigger className="h-9 w-[260px] text-xs">
          <SelectValue placeholder="Choisir un technicien" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={UNASSIGNED}>Non assigné</SelectItem>
          {compatible.map((tech) => (
            <SelectItem key={tech.id} value={tech.id}>
              ✓ {getContactFullName(tech)} ({(tech.electricalHabilitations ?? []).join(', ')})
            </SelectItem>
          ))}
          {incompatible.map((tech) => (
            <SelectItem key={tech.id} value={tech.id} disabled>
              {getContactFullName(tech)} — manque{' '}
              {getMissingHabilitations(tech.electricalHabilitations ?? [], requiredHabilitations).join(', ')}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {(error || selectedMissing.length > 0) && (
        <p className="flex items-center gap-1 text-[10px] text-amber-700">
          <AlertTriangle size={12} />
          {error ?? `Technicien actuel : habilitations manquantes ${selectedMissing.join(', ')}`}
        </p>
      )}
    </div>
  );
}
