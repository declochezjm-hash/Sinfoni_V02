import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  TICKET_PRIORITY_OPTIONS,
  TICKET_STATUS_OPTIONS,
} from '../../lib/maintenanceTicketLabels';
import type { MaintenanceTicketPriority, MaintenanceTicketStatus } from '../../types';
import type { PlanningScale } from '../../lib/planningUtils';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/button';

export interface PlanningFilterState {
  status: MaintenanceTicketStatus | 'all';
  priority: MaintenanceTicketPriority | 'all';
  scale: PlanningScale;
  anchorDate: Date;
}

interface PlanningFiltersProps {
  filters: PlanningFilterState;
  onChange: (next: Partial<PlanningFilterState>) => void;
}

const SCALE_OPTIONS: { value: PlanningScale; label: string }[] = [
  { value: 'day', label: 'Jour' },
  { value: 'week', label: 'Semaine' },
  { value: 'month', label: 'Mois' },
];

function shiftAnchor(date: Date, scale: PlanningScale, direction: -1 | 1): Date {
  const next = new Date(date);
  if (scale === 'day') next.setDate(next.getDate() + direction);
  else if (scale === 'week') next.setDate(next.getDate() + direction * 7);
  else next.setMonth(next.getMonth() + direction);
  return next;
}

function formatAnchorLabel(date: Date, scale: PlanningScale): string {
  if (scale === 'day') {
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  }
  if (scale === 'week') {
    const start = new Date(date);
    const day = start.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    start.setDate(start.getDate() + diff);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${start.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })} — ${end.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  }
  return date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export default function PlanningFilters({ filters, onChange }: PlanningFiltersProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-3">
      <div className="flex gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1">
        {SCALE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange({ scale: opt.value })}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              filters.scale === opt.value
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:bg-white'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() =>
            onChange({ anchorDate: shiftAnchor(filters.anchorDate, filters.scale, -1) })
          }
        >
          <ChevronLeft size={16} />
        </Button>
        <span className="min-w-[180px] text-center text-sm font-medium text-slate-800">
          {formatAnchorLabel(filters.anchorDate, filters.scale)}
        </span>
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="h-8 w-8"
          onClick={() =>
            onChange({ anchorDate: shiftAnchor(filters.anchorDate, filters.scale, 1) })
          }
        >
          <ChevronRight size={16} />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => onChange({ anchorDate: new Date() })}
        >
          Aujourd&apos;hui
        </Button>
      </div>

      <Select
        value={filters.status}
        onValueChange={(v) =>
          onChange({ status: v as MaintenanceTicketStatus | 'all' })
        }
      >
        <SelectTrigger className="h-9 w-[150px] text-xs">
          <SelectValue placeholder="Statut" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tous statuts</SelectItem>
          {TICKET_STATUS_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.priority}
        onValueChange={(v) =>
          onChange({ priority: v as MaintenanceTicketPriority | 'all' })
        }
      >
        <SelectTrigger className="h-9 w-[150px] text-xs">
          <SelectValue placeholder="Priorité" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Toutes priorités</SelectItem>
          {TICKET_PRIORITY_OPTIONS.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
