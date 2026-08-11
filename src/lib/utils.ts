export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

export function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours} h`;
  if (diffDays < 7) return `Il y a ${diffDays} j`;
  return formatDate(dateStr);
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Brouillon':
      return 'bg-slate-100 text-slate-700 border-slate-200';
    case 'En Étude':
      return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    case 'Proposé':
      return 'bg-orange-100 text-orange-700 border-orange-200';
    case 'Validé':
      return 'bg-teal-100 text-teal-700 border-teal-200';
    case 'APS/APD':
      return 'bg-sky-100 text-sky-700 border-sky-200';
    case 'BC/OS':
      return 'bg-blue-100 text-blue-700 border-blue-200';
    case 'En cours':
      return 'bg-emerald-100 text-emerald-700 border-emerald-200';
    case 'PV/Réception':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'Clôturé':
      return 'bg-slate-800 text-white border-slate-800';
    case 'À planifier':
      return 'bg-violet-100 text-violet-700 border-violet-200';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-200';
  }
}

export function getTypeColor(type: string): string {
  switch (type) {
    case 'Électricité':
      return 'bg-blue-50 text-blue-700 ring-blue-600/20';
    case 'Éclairage Public':
      return 'bg-amber-50 text-amber-700 ring-amber-600/20';
    case 'Télécom':
      return 'bg-violet-50 text-violet-700 ring-violet-600/20';
    case 'IRVE':
      return 'bg-emerald-50 text-emerald-700 ring-emerald-600/20';
    default:
      return 'bg-gray-50 text-gray-700 ring-gray-600/20';
  }
}

export function getQuoteStatusColor(status: string): string {
  switch (status) {
    case 'Accepté':
      return 'bg-emerald-100 text-emerald-800 ring-emerald-600/20';
    case 'Envoyé au client':
      return 'bg-orange-100 text-orange-800 ring-orange-600/20';
    case 'Refusé':
      return 'bg-red-100 text-red-800 ring-red-600/20';
    case 'Brouillon':
    default:
      return 'bg-slate-100 text-slate-600 ring-slate-500/20';
  }
}

export function getBillingStatusColor(status: string): string {
  switch (status) {
    case 'Payé':
      return 'bg-emerald-100 text-emerald-800 ring-emerald-600/20';
    case 'Acompte émis':
      return 'bg-orange-100 text-orange-800 ring-orange-600/20';
    case 'Facturé total':
      return 'bg-sky-100 text-sky-800 ring-sky-600/20';
    case 'À émettre':
    default:
      return 'bg-slate-100 text-slate-600 ring-slate-500/20';
  }
}
