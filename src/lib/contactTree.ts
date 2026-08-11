import type { Contact, ContactTreeNode } from '../types/contacts';

export function buildContactTree(contacts: Contact[]): ContactTreeNode[] {
  const nodes = new Map<string, ContactTreeNode>();

  for (const contact of contacts) {
    nodes.set(contact.id, { ...contact, children: [] });
  }

  const roots: ContactTreeNode[] = [];

  for (const contact of contacts) {
    const node = nodes.get(contact.id)!;
    const parentId = contact.parentContactId;

    if (parentId && nodes.has(parentId) && parentId !== contact.id) {
      nodes.get(parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortNodes = (list: ContactTreeNode[]) => {
    list.sort((a, b) =>
      `${a.lastName} ${a.firstName}`.localeCompare(`${b.lastName} ${b.firstName}`, 'fr'),
    );
    for (const node of list) sortNodes(node.children);
  };

  sortNodes(roots);
  return roots;
}

export function getDescendantIds(contactId: string, contacts: Contact[]): Set<string> {
  const childrenByParent = new Map<string, string[]>();

  for (const contact of contacts) {
    if (!contact.parentContactId) continue;
    const siblings = childrenByParent.get(contact.parentContactId) ?? [];
    siblings.push(contact.id);
    childrenByParent.set(contact.parentContactId, siblings);
  }

  const descendants = new Set<string>();
  const stack = [...(childrenByParent.get(contactId) ?? [])];

  while (stack.length > 0) {
    const id = stack.pop()!;
    if (descendants.has(id)) continue;
    descendants.add(id);
    stack.push(...(childrenByParent.get(id) ?? []));
  }

  return descendants;
}
