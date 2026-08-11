import { type DragEvent } from 'react';
import { Mail, Phone } from 'lucide-react';
import type { Contact, ContactTreeNode } from '../../types/contacts';
import { getContactFullName, getContactInitials } from '../../types/contacts';
import { cn } from '../../lib/cn';
import ContactWorkloadBadge from './ContactWorkloadBadge';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';

const DRAG_MIME = 'application/x-sinfoni-contact-id';

interface OrgChartNodeProps {
  node: ContactTreeNode;
  depth?: number;
  canDrag?: boolean;
  draggingId: string | null;
  dragOverId: string | null;
  invalidDropIds: Set<string>;
  getActiveTicketCount: (contactId: string) => number;
  onSelect: (contact: Contact) => void;
  onDragStartContact: (contactId: string) => void;
  onDragEndContact: () => void;
  onDragOverContact: (contactId: string | null) => void;
  onDropOnContact: (targetManagerId: string) => void;
}

export default function OrgChartNode({
  node,
  depth = 0,
  canDrag = false,
  draggingId,
  dragOverId,
  invalidDropIds,
  getActiveTicketCount,
  onSelect,
  onDragStartContact,
  onDragEndContact,
  onDragOverContact,
  onDropOnContact,
}: OrgChartNodeProps) {
  const activeTicketCount = getActiveTicketCount(node.id);
  const isDragging = draggingId === node.id;
  const canAcceptDrop =
    canDrag &&
    !!draggingId &&
    draggingId !== node.id &&
    !invalidDropIds.has(node.id);
  const isDragOver = dragOverId === node.id && canAcceptDrop;

  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    if (!canDrag) return;
    e.dataTransfer.setData(DRAG_MIME, node.id);
    e.dataTransfer.setData('text/plain', node.id);
    e.dataTransfer.effectAllowed = 'move';
    onDragStartContact(node.id);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    if (!canAcceptDrop) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    onDragOverContact(node.id);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    if (!canDrag) return;
    const related = e.relatedTarget as Node | null;
    if (related && e.currentTarget.contains(related)) return;
    onDragOverContact(null);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!canAcceptDrop) return;
    onDropOnContact(node.id);
  };

  return (
    <li className="flex flex-col items-center">
      <div className="relative flex flex-col items-center">
        {depth > 0 && (
          <div className="h-6 w-px bg-slate-300" aria-hidden="true" />
        )}
        <div
          role="button"
          tabIndex={0}
          draggable={canDrag}
          onDragStart={handleDragStart}
          onDragEnd={onDragEndContact}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => onSelect(node)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') onSelect(node);
          }}
          className={cn(
            'group relative w-[min(100%,220px)] rounded-xl border border-slate-200 bg-white p-3 text-left shadow-sm transition hover:border-sky-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-sky-500',
            canDrag && 'cursor-grab active:cursor-grabbing',
            isDragging && 'opacity-40',
            isDragOver && 'drag-over border-sky-400 bg-sky-50 ring-2 ring-sky-300',
          )}
        >
          <div className="absolute right-2 top-2">
            <ContactWorkloadBadge activeTicketsCount={activeTicketCount} compact />
          </div>

          <div className="flex items-center gap-2 pr-6">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
              {getContactInitials(node)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900 group-hover:text-sky-700">
                {getContactFullName(node)}
              </p>
              <p className="truncate text-[11px] text-slate-500">{node.role}</p>
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            <Badge variant="outline" className="text-[10px]">{node.department}</Badge>
          </div>
          <div className="mt-2 flex gap-1">
            {node.phone && (
              <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                <a
                  href={`tel:${node.phone.replace(/\s/g, '')}`}
                  onClick={(e) => e.stopPropagation()}
                  title="Appeler"
                >
                  <Phone size={12} />
                </a>
              </Button>
            )}
            {node.email && (
              <Button asChild variant="ghost" size="icon" className="h-7 w-7">
                <a
                  href={`mailto:${node.email}`}
                  onClick={(e) => e.stopPropagation()}
                  title="Email"
                >
                  <Mail size={12} />
                </a>
              </Button>
            )}
          </div>
        </div>
      </div>

      {node.children.length > 0 && (
        <div className="flex flex-col items-center">
          <div className="h-4 w-px bg-slate-300" aria-hidden="true" />
          <ul className="flex flex-wrap justify-center gap-6 pt-2">
            {node.children.map((child) => (
              <OrgChartNode
                key={child.id}
                node={child}
                depth={depth + 1}
                canDrag={canDrag}
                draggingId={draggingId}
                dragOverId={dragOverId}
                invalidDropIds={invalidDropIds}
                getActiveTicketCount={getActiveTicketCount}
                onSelect={onSelect}
                onDragStartContact={onDragStartContact}
                onDragEndContact={onDragEndContact}
                onDragOverContact={onDragOverContact}
                onDropOnContact={onDropOnContact}
              />
            ))}
          </ul>
        </div>
      )}
    </li>
  );
}

export { DRAG_MIME };
