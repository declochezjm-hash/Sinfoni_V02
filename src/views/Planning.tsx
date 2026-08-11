import { useMemo, useState } from 'react';
import { CalendarRange, Loader2, ShieldAlert } from 'lucide-react';
import PlanningFilters, { type PlanningFilterState } from '../components/planning/PlanningFilters';
import PlanningTimeline from '../components/planning/PlanningTimeline';
import TeamWorkloadPanel from '../components/planning/TeamWorkloadPanel';
import {
  useAssignTechnicianToIntervention,
  usePlanningData,
  usePlanningPermissions,
  useUpdateInterventionSchedule,
} from '../hooks/usePlanning';
import { useToast } from '../hooks/useToast';

export default function Planning() {
  const { canView, canEdit } = usePlanningPermissions();
  const { toast } = useToast();

  const [filters, setFilters] = useState<PlanningFilterState>({
    status: 'all',
    priority: 'all',
    scale: 'week',
    anchorDate: new Date(),
  });

  const planningFilters = useMemo(
    () => ({
      status: filters.status,
      priority: filters.priority,
      scale: filters.scale,
      anchorDate: filters.anchorDate,
    }),
    [filters],
  );

  const {
    interventions,
    milestones,
    technicians,
    bounds,
    loading,
    error,
  } = usePlanningData(planningFilters);

  const updateSchedule = useUpdateInterventionSchedule();
  const assignTechnician = useAssignTechnicianToIntervention();

  if (!canView) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-24 text-slate-500">
        <ShieldAlert size={40} className="text-amber-500" />
        <p className="text-sm">Accès réservé au syndicat (DGS, DST, Chargé d&apos;Affaires).</p>
      </div>
    );
  }

  const handleScheduleChange = async (
    ticketId: string,
    scheduledStart: Date,
    scheduledEnd: Date,
    durationHours: number,
  ) => {
    try {
      await updateSchedule.mutateAsync({
        ticketId,
        scheduledStart: scheduledStart.toISOString(),
        scheduledEnd: scheduledEnd.toISOString(),
        durationHours,
      });
      toast.success('Créneau mis à jour.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erreur lors de la planification.');
      throw err;
    }
  };

  const handleAssignTechnician = async (ticketId: string, contactId: string | null) => {
    try {
      await assignTechnician.mutateAsync({ ticketId, contactId });
      toast.success(contactId ? 'Technicien assigné.' : 'Assignation retirée.');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Assignation impossible.');
      throw err;
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <CalendarRange size={22} className="text-slate-700" />
            <h1 className="text-2xl font-bold text-slate-900">Planning interactif</h1>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Interventions maintenance et jalons d&apos;affaires — charge d&apos;équipe et habilitations
          </p>
        </div>
        {loading && (
          <span className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 size={14} className="animate-spin" /> Chargement…
          </span>
        )}
      </div>

      <PlanningFilters
        filters={filters}
        onChange={(next) => setFilters((prev) => ({ ...prev, ...next }))}
      />

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-6 xl:grid-cols-[1fr_320px]">
        <PlanningTimeline
          bounds={bounds}
          scale={filters.scale}
          interventions={interventions}
          milestones={milestones}
          technicians={technicians}
          canEdit={canEdit}
          onScheduleChange={handleScheduleChange}
          onAssignTechnician={handleAssignTechnician}
        />

        <TeamWorkloadPanel
          technicians={technicians}
          interventions={interventions}
          bounds={bounds}
        />
      </div>
    </div>
  );
}
