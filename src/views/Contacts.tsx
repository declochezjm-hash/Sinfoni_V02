import { useState } from 'react';
import { Network, Users } from 'lucide-react';
import ContactsDirectory from '../components/contacts/ContactsDirectory';
import OrgChart from '../components/contacts/OrgChart';
import ContactFormModal from '../components/contacts/ContactFormModal';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../components/ui/alert-dialog';
import {
  useCanManageContacts,
  useContacts,
  useCreateContact,
  useDeleteContact,
  useUpdateContact,
  type CreateContactInput,
} from '../hooks/useContacts';
import { useToast } from '../hooks/useToast';
import { formatApiError } from '../lib/formatApiError';
import type { Contact } from '../types/contacts';
import { getContactFullName } from '../types/contacts';

type ContactsTab = 'directory' | 'orgchart';

export default function Contacts() {
  const { toast } = useToast();
  const canManage = useCanManageContacts();
  const { contacts, loading, error } = useContacts();
  const createContact = useCreateContact();
  const updateContact = useUpdateContact();
  const deleteContact = useDeleteContact();

  const [activeTab, setActiveTab] = useState<ContactsTab>('directory');
  const [orgFormOpen, setOrgFormOpen] = useState(false);
  const [orgEditingContact, setOrgEditingContact] = useState<Contact | null>(null);
  const [orgPendingDelete, setOrgPendingDelete] = useState<Contact | null>(null);

  const handleOrgFormSubmit = async (input: CreateContactInput) => {
    try {
      if (orgEditingContact) {
        await updateContact.mutateAsync({ ...input, id: orgEditingContact.id });
        toast.success('Interlocuteur mis à jour');
      } else {
        await createContact.mutateAsync(input);
        toast.success('Interlocuteur créé');
      }
      setOrgFormOpen(false);
      setOrgEditingContact(null);
    } catch (err) {
      toast.error('Échec de l\'enregistrement', { description: formatApiError(err) });
    }
  };

  const handleOrgConfirmDelete = async () => {
    if (!orgPendingDelete) return;
    try {
      await deleteContact.mutateAsync(orgPendingDelete.id);
      toast.success('Interlocuteur supprimé');
      setOrgPendingDelete(null);
    } catch (err) {
      toast.error('Échec de la suppression', { description: formatApiError(err) });
    }
  };

  const orgSaving = createContact.isPending || updateContact.isPending;
  const orgDeleting = deleteContact.isPending;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Annuaire des interlocuteurs</h1>
        <p className="text-sm text-slate-500">
          Gérez les contacts du syndicat et visualisez l&apos;organigramme hiérarchique.
          {!loading && !error && (
            <span className="ml-1 font-medium text-slate-700">
              ({contacts.length} interlocuteur{contacts.length > 1 ? 's' : ''})
            </span>
          )}
        </p>
      </div>

      <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1">
        <button
          type="button"
          onClick={() => setActiveTab('directory')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
            activeTab === 'directory'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users size={16} />
          Annuaire
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('orgchart')}
          className={`flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition ${
            activeTab === 'orgchart'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Network size={16} />
          Organigramme
        </button>
      </div>

      {activeTab === 'directory' ? (
        <ContactsDirectory />
      ) : (
        <OrgChart
          canManage={canManage}
          onEdit={(contact) => {
            setOrgEditingContact(contact);
            setOrgFormOpen(true);
          }}
          onDelete={setOrgPendingDelete}
        />
      )}

      <ContactFormModal
        open={orgFormOpen}
        onOpenChange={setOrgFormOpen}
        contacts={contacts}
        contact={orgEditingContact}
        saving={orgSaving}
        onSubmit={handleOrgFormSubmit}
      />

      <AlertDialog
        open={orgPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) setOrgPendingDelete(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la suppression</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir supprimer{' '}
              {orgPendingDelete ? getContactFullName(orgPendingDelete) : 'cet interlocuteur'} ?
              Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={orgDeleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700 focus:ring-red-600"
              disabled={orgDeleting}
              onClick={(e) => {
                e.preventDefault();
                void handleOrgConfirmDelete();
              }}
            >
              {orgDeleting ? 'Suppression…' : 'Supprimer'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
