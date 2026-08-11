import type { Contact } from '../../types/contacts';
import { getContactFullName } from '../../types/contacts';
import {
  DEFAULT_DAILY_CAPACITY_HOURS,
  formatDayKey,
  getWorkloadBarClass,
  getWorkloadLevel,
  type TimelineBounds,
} from '../../lib/planningUtils';
import type { PlanningInterventionItem } from '../../lib/planningUtils';
import { usePlanningWorkload } from '../../hooks/usePlanning';

interface TeamWorkloadPanelProps {
  technicians: Contact[];
  interventions: PlanningInterventionItem[];
  bounds: TimelineBounds;
}

export default function TeamWorkloadPanel({
  technicians,
  interventions,
  bounds,
}: TeamWorkloadPanelProps) {
  const workload = usePlanningWorkload(interventions, bounds);

  const visibleDays = bounds.columns.filter((_, i) => {
    if (bounds.columns.length <= 7) return true;
    return i % Math.ceil(bounds.columns.length / 7) === 0;
  });

  if (technicians.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-500">
        Aucun technicien dans l&apos;annuaire. Ajoutez des contacts avec le rôle « Technicien ».
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-slate-900">Charge d&apos;équipe</h3>
        <span className="text-[10px] text-slate-500">
          Capacité journalière : {DEFAULT_DAILY_CAPACITY_HOURS} h
        </span>
      </div>

      <div className="space-y-3">
        {technicians.map((tech) => (
          <div key={tech.id} className="space-y-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-xs font-medium text-slate-800">
                {getContactFullName(tech)}
              </span>
              <span className="shrink-0 text-[10px] text-slate-500">
                {(tech.electricalHabilitations ?? []).join(', ') || 'Sans habilitation'}
              </span>
            </div>
            <div className="flex gap-0.5">
              {visibleDays.map((col) => {
                const dayData = workload.get(formatDayKey(col.start))?.get(tech.id);
                const hours = dayData?.hours ?? 0;
                const tickets = dayData?.ticketCount ?? 0;
                const level = getWorkloadLevel(hours);
                const pct = Math.min(100, (hours / DEFAULT_DAILY_CAPACITY_HOURS) * 100);

                return (
                  <div
                    key={col.key}
                    className="group relative flex-1"
                    title={`${col.label} — ${hours.toFixed(1)} h, ${tickets} ticket(s)`}
                  >
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className={`h-full transition-all ${getWorkloadBarClass(level)}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="mt-0.5 block text-center text-[9px] text-slate-400">
                      {hours > 0 ? `${hours.toFixed(0)}h` : '·'}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-3 flex flex-wrap gap-3 text-[10px] text-slate-500">
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" /> Faible
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-sky-500" /> Normal
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-amber-500" /> Élevée
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-2 w-2 rounded-full bg-red-500" /> Surcharge
        </span>
      </div>
    </div>
  );
}
