import { useMemo, useState } from 'react';
import { LayoutGrid, List, Plus, Search } from 'lucide-react';
import type { Contact } from '../../types/contacts';
import { getContactFullName } from '../../types/contacts';
import {
  useCanManageContacts,
  useCreateContact,
  useDeleteContact,
  useContacts,
  useUpdateContact,
  type CreateContactInput,
} from '../../hooks/useContacts';
import { useContactsWorkload } from '../../hooks/useContactsWorkload';
import { useToast } from '../../hooks/useToast';
import { formatApiError } from '../../lib/formatApiError';
import ContactCard from './ContactCard';
import ContactDetailDialog from './ContactDetailDialog';
import ContactFormModal from './ContactFormModal';
import ContactWorkloadBadge from './ContactWorkloadBadge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';

type ViewMode = 'grid' | 'table';

function filterContacts(contacts: Contact[], search: string): Contact[] {
  const q = search.trim().toLowerCase();
  if (!q) return contacts;

  return contacts.filter((c) => {
    const haystack = [
      c.firstName,
      c.lastName,
      getContactFullName(c),
      c.email,
      c.phone,
      c.role,
      c.department,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(q);
  });
}

export default function ContactsDirectory() {
  const { toast } = useToast();
  const canManage = useCanManageContacts();
  const { contacts, loading, error } = useContacts();
  const { getActiveTicketCount } = useContactsWorkload();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [formOpen, setFormOpen] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [detailContact, setDetailContact] = useState<Contact | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Contact | null>(null);

  const filtered = useMemo(() => filterContacts(contacts, search), [contacts, search]);

  const openCreate = () => {
    setEditingContact(null);
    setFormOpen(true);
  };

  const openEdit = (contact: Contact) => {
    setEditingContact(contact);
    setDetailContact(null);
    setFormOpen(true);
  };

  const handleFormSubmit = async (input: CreateContactInput) => {
    try {
      if (editingContact) {
        await updateContact.mutateAsync({ ...input, id: editingContact.id });
        toast.success('Interlocuteur mis à jour');
      } else {
        await createContact.mutateAsync(input);
        toast.success('Interlocuteur créé');
      }
      setFormOpen(false);
      setEditingContact(null);
    } catch (err) {
      toast.error('Échec de l\'enregistrement', { description: formatApiError(err) });
    }
  };

  const handleConfirmDelete = async () => {
    if (!pendingDelete) return;
    try {
      await deleteContact.mutateAsync(pendingDelete.id);
      toast.success('Interlocuteur supprimé');
      if (detailContact?.id === pendingDelete.id) setDetailContact(null);
      setPendingDelete(null);
    } catch (err) {
      toast.error('Échec de la suppression', { description: formatApiError(err) });
    }
  };

  const saving = createContact.isPending || updateContact.isPending;
  const deleting = deleteContact.isPending;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="relative min-w-[220px] flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher nom, email, rôle, service…"
            className="pl-9"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-slate-200 p-0.5">
            <Button
              type="button"
              variant={viewMode === 'grid' ? 'default' : 'ghost'}
              size="sm"
              className="h-8"
              onClick={() => setViewMode('grid')}
            >
              <LayoutGrid size={14} />
              Cartes
            </Button>
            <Button
              type="button"
              variant={viewMode === 'table' ? 'default' : 'ghost'}
              size="sm"
              className="h-8"
              onClick={() => setViewMode('table')}
            >
              <List size={14} />
              Tableau
            </Button>
          </div>

          {canManage && (
            <Button type="button" size="sm" onClick={openCreate}>
              <Plus size={14} />
              Nouvel interlocuteur
            </Button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center text-sm text-slate-500">
          Chargement de l&apos;annuaire…
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
          Impossible de charger l&apos;annuaire : {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
          Aucun interlocuteur trouvé.
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              activeTicketsCount={getActiveTicketCount(contact.id)}
              canManage={canManage}
              onView={setDetailContact}
              onEdit={openEdit}
              onDelete={setPendingDelete}
            />
          ))}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="w-full min-w-max text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Nom</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Service</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Téléphone</th>
                <th className="px-4 py-3">Charge</th>
                {canManage && <th className="px-4 py-3">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((contact) => (
                <tr
                  key={contact.id}
                  className="cursor-pointer border-t border-slate-100 hover:bg-sky-50/50"
                  onClick={() => setDetailContact(contact)}
                >
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {getContactFullName(contact)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="secondary" className="text-[10px]">{contact.role}</Badge>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{contact.department}</td>
                  <td className="px-4 py-3 text-slate-600">{contact.email}</td>
                  <td className="px-4 py-3 text-slate-600">{contact.phone}</td>
                  <td className="px-4 py-3">
                    <ContactWorkloadBadge activeTicketsCount={getActiveTicketCount(contact.id)} />
                  </td>
                  {canManage && (
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            openEdit(contact);
                          }}
                        >
                          Modifier
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700"
                          onClick={(e) => {
                            e.stopPropagation();
                            setPendingDelete(contact);
                          }}
                        >
                          Supprimer
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <ContactFormModal
        open={formOpen}
        onOpenChange={setFormOpen}
        contacts={contacts}
        contact={editingContact}
        saving={saving}
        onSubmit={handleFormSubmit}
      />

      <ContactDetailDialog
        contact={detailContact}
        open={detailContact !== null}
        onOpenChange={(open) => {
          if (!open) setDetailContact(null);
        }}
        contacts={contacts}
        canManage={canManage}
        onEdit={openEdit}
        onDelete={setPendingDelete}
      />

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer{' '}
              {pendingDelete ? getContactFullName(pendingDelete) : 'cet interlocuteur'} ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={deleting}
              onClick={(e) => {
                e.preventDefault();
                void handleConfirmDelete();
              }}
            >
              {deleting ? 'Suppression…' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
