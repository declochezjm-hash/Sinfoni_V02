import { useEffect, useState } from 'react';
import type { Contact } from '../../types/contacts';
import {
  CONTACT_DEPARTMENT_OPTIONS,
  CONTACT_ROLE_OPTIONS,
  ELECTRICAL_HABILITATION_OPTIONS,
  getContactFullName,
} from '../../types/contacts';
import { getDescendantIds } from '../../lib/contactTree';
import type { CreateContactInput } from '../../hooks/useContacts';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

const NO_PARENT_VALUE = '__none__';

interface ContactFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Contact[];
  contact?: Contact | null;
  saving: boolean;
  onSubmit: (input: CreateContactInput) => Promise<void>;
}

export default function ContactFormModal({
  open,
  onOpenChange,
  contacts,
  contact,
  saving,
  onSubmit,
}: ContactFormModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<string>(CONTACT_ROLE_OPTIONS[0].value);
  const [department, setDepartment] = useState<string>(CONTACT_DEPARTMENT_OPTIONS[0]);
  const [parentContactId, setParentContactId] = useState<string | null>(null);
  const [electricalHabilitations, setElectricalHabilitations] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;
    setFirstName(contact?.firstName ?? '');
    setLastName(contact?.lastName ?? '');
    setEmail(contact?.email ?? '');
    setPhone(contact?.phone ?? '');
    setRole(contact?.role ?? CONTACT_ROLE_OPTIONS[0].value);
    setDepartment(contact?.department ?? CONTACT_DEPARTMENT_OPTIONS[0]);
    setParentContactId(contact?.parentContactId ?? null);
    setElectricalHabilitations(contact?.electricalHabilitations ?? []);
  }, [open, contact]);

  const excludedParentIds = contact
    ? new Set([contact.id, ...getDescendantIds(contact.id, contacts)])
    : new Set<string>();

  const parentOptions = contacts.filter((c) => !excludedParentIds.has(c.id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;

    await onSubmit({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim(),
      role,
      department,
      parentContactId,
      electricalHabilitations,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {contact ? 'Modifier l\'interlocuteur' : 'Nouvel interlocuteur'}
          </DialogTitle>
          <DialogDescription>
            Renseignez les informations et le responsable hiérarchique pour l&apos;organigramme.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={(e) => void handleSubmit(e)} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact-first-name">Prénom *</Label>
              <Input
                id="contact-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-last-name">Nom *</Label>
              <Input
                id="contact-last-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="contact-email">Email</Label>
              <Input
                id="contact-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="contact-phone">Téléphone</Label>
              <Input
                id="contact-phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Rôle</Label>
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_ROLE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Service / Département</Label>
              <Select value={department} onValueChange={setDepartment}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTACT_DEPARTMENT_OPTIONS.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>Responsable hiérarchique</Label>
            <Select
              value={parentContactId ?? NO_PARENT_VALUE}
              onValueChange={(v) =>
                setParentContactId(v === NO_PARENT_VALUE ? null : v)
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Aucun (racine de l'organigramme)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_PARENT_VALUE}>Aucun (racine)</SelectItem>
                {parentOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {getContactFullName(c)} — {c.role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {role.toLowerCase().includes('technicien') && (
            <div className="space-y-2">
              <Label>Habilitations électriques</Label>
              <div className="flex flex-wrap gap-2">
                {ELECTRICAL_HABILITATION_OPTIONS.map((hab) => {
                  const checked = electricalHabilitations.includes(hab);
                  return (
                    <label
                      key={hab}
                      className={`cursor-pointer rounded-md border px-2.5 py-1 text-xs font-medium ${
                        checked
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={checked}
                        onChange={() => {
                          setElectricalHabilitations((prev) =>
                            checked ? prev.filter((h) => h !== hab) : [...prev, hab],
                          );
                        }}
                      />
                      {hab}
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={saving || !firstName.trim() || !lastName.trim()}>
              {saving ? 'Enregistrement…' : contact ? 'Mettre à jour' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
