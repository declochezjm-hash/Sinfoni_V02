import { useMemo, useState, type DragEvent } from 'react';
import type { Contact } from '../../types/contacts';
import { getContactFullName } from '../../types/contacts';
import { buildContactTree, getDescendantIds } from '../../lib/contactTree';
import { formatApiError } from '../../lib/formatApiError';
import { cn } from '../../lib/cn';
import { useContacts, useReparentContact } from '../../hooks/useContacts';
import { useContactsWorkload } from '../../hooks/useContactsWorkload';
import { useToast } from '../../hooks/useToast';
import ContactDetailDialog from './ContactDetailDialog';
import OrgChartNode, { DRAG_MIME } from './OrgChartNode';

interface OrgChartProps {
  canManage?: boolean;
  onEdit?: (contact: Contact) => void;
  onDelete?: (contact: Contact) => void;
}

export default function OrgChart({ canManage = false, onEdit, onDelete }: OrgChartProps) {
  const { toast } = useToast();
  const { contacts, loading, error } = useContacts();
  const { getActiveTicketCount } = useContactsWorkload();
  const reparentContact = useReparentContact();

  const [detailContact, setDetailContact] = useState<Contact | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [rootDragOver, setRootDragOver] = useState(false);

  const tree = useMemo(() => buildContactTree(contacts), [contacts]);

  const invalidDropIds = useMemo(() => {
    if (!draggingId) return new Set<string>();
    const blocked = getDescendantIds(draggingId, contacts);
    blocked.add(draggingId);
    return blocked;
  }, [draggingId, contacts]);

  const handleReparent = async (contactId: string, parentContactId: string | null) => {
    const contact = contacts.find((c) => c.id === contactId);
    if (!contact) return;
    if (contact.parentContactId === parentContactId) {
      setDraggingId(null);
      setDragOverId(null);
      setRootDragOver(false);
      return;
    }

    if (parentContactId && invalidDropIds.has(parentContactId)) {
      toast.error('Déplacement impossible', {
        description: 'Un contact ne peut pas être placé sous l’un de ses subordonnés.',
      });
      setDraggingId(null);
      setDragOverId(null);
      setRootDragOver(false);
      return;
    }

    try {
      await reparentContact.mutateAsync({ contactId, parentContactId });
      const parent = parentContactId
        ? contacts.find((c) => c.id === parentContactId)
        : null;
      toast.success('Hiérarchie mise à jour', {
        description: parent
          ? `${getContactFullName(contact)} rapporte désormais à ${getContactFullName(parent)}.`
          : `${getContactFullName(contact)} est placé au sommet de l’organigramme.`,
      });
    } catch (err) {
      toast.error('Échec du déplacement', { description: formatApiError(err) });
    } finally {
      setDraggingId(null);
      setDragOverId(null);
      setRootDragOver(false);
    }
  };

  const handleRootDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!canManage || !draggingId) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setRootDragOver(true);
    setDragOverId(null);
  };

  const handleRootDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!canManage || !draggingId) return;
    const id = e.dataTransfer.getData(DRAG_MIME) || draggingId;
    void handleReparent(id, null);
  };

  if (loading) {
    return (
      <div className="flex h-48 items-center justify-center text-sm text-slate-500">
        Chargement de l&apos;organigramme…
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-6 text-center text-sm text-red-700">
        Impossible de charger l&apos;organigramme : {error}
      </div>
    );
  }

  if (tree.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
        Aucun interlocuteur — ajoutez des contacts pour construire l&apos;organigramme.
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-slate-50/50 p-6">
        {canManage && (
          <p className="mb-4 text-center text-xs text-slate-500">
            Glissez une carte sur un responsable pour changer la hiérarchie, ou sur la zone
            « Sommet » pour en faire une racine.
          </p>
        )}

        {canManage && draggingId && (
          <div
            onDragOver={handleRootDragOver}
            onDragLeave={() => setRootDragOver(false)}
            onDrop={handleRootDrop}
            className={cn(
              'mb-6 rounded-xl border-2 border-dashed px-4 py-6 text-center text-sm transition',
              rootDragOver
                ? 'drag-over border-sky-400 bg-sky-50 text-sky-800'
                : 'border-slate-300 bg-white text-slate-600',
            )}
          >
            Déposer ici pour placer au sommet (sans responsable)
          </div>
        )}

        <ul className="flex flex-wrap justify-center gap-8">
          {tree.map((root) => (
            <OrgChartNode
              key={root.id}
              node={root}
              canDrag={canManage}
              draggingId={draggingId}
              dragOverId={dragOverId}
              invalidDropIds={invalidDropIds}
              getActiveTicketCount={getActiveTicketCount}
              onSelect={setDetailContact}
              onDragStartContact={setDraggingId}
              onDragEndContact={() => {
                setDraggingId(null);
                setDragOverId(null);
                setRootDragOver(false);
              }}
              onDragOverContact={setDragOverId}
              onDropOnContact={(targetManagerId) => {
                if (!draggingId) return;
                void handleReparent(draggingId, targetManagerId);
              }}
            />
          ))}
        </ul>
      </div>

      <ContactDetailDialog
        contact={detailContact}
        open={detailContact !== null}
        onOpenChange={(open) => {
          if (!open) setDetailContact(null);
        }}
        contacts={contacts}
        canManage={canManage}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </>
  );
}
