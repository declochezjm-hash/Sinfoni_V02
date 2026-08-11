export type ContactWorkloadLevel = 'none' | 'normal' | 'high';

export function getContactWorkloadLevel(activeTicketsCount: number): ContactWorkloadLevel {
  if (activeTicketsCount === 0) return 'none';
  if (activeTicketsCount <= 3) return 'normal';
  return 'high';
}

export function formatContactWorkloadLabel(activeTicketsCount: number): string {
  return `${activeTicketsCount} ticket${activeTicketsCount > 1 ? 's' : ''} en cours`;
}

export function formatContactWorkloadTooltip(activeTicketsCount: number): string {
  if (activeTicketsCount === 0) {
    return 'Aucun ticket de maintenance en cours d\'attribution ou de traitement';
  }

  return `${activeTicketsCount} ticket${activeTicketsCount > 1 ? 's' : ''} de maintenance en cours d'attribution ou de traitement`;
}

export function getContactWorkloadBadgeClass(activeTicketsCount: number): string {
  const level = getContactWorkloadLevel(activeTicketsCount);

  switch (level) {
    case 'none':
      return 'border-slate-200 bg-slate-50 text-slate-500';
    case 'normal':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'high':
      return 'border-red-200 bg-red-50 text-red-800';
    default:
      return 'border-slate-200 bg-slate-50 text-slate-500';
  }
}

export function getContactWorkloadDotClass(activeTicketsCount: number): string {
  const level = getContactWorkloadLevel(activeTicketsCount);

  switch (level) {
    case 'none':
      return 'border-slate-300 bg-slate-100 text-slate-500';
    case 'normal':
      return 'border-emerald-300 bg-emerald-100 text-emerald-800';
    case 'high':
      return 'border-red-300 bg-red-100 text-red-800';
    default:
      return 'border-slate-300 bg-slate-100 text-slate-500';
  }
}
