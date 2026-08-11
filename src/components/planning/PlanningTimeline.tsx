import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Contact } from '../../types/contacts';
import { getContactFullName } from '../../types/contacts';
import {
  MILESTONES_ROW_ID,
  UNASSIGNED_ROW_ID,
  dateFromTimelinePercent,
  getInterventionBarClass,
  getItemPositionPercent,
  getMilestoneBarClass,
  getMissingHabilitations,
  snapToScale,
  type PlanningInterventionItem,
  type PlanningItem,
  type PlanningMilestoneItem,
  type PlanningScale,
  type TimelineBounds,
} from '../../lib/planningUtils';
import { getTicketPriorityLabel, getTicketStatusLabel } from '../../lib/maintenanceTicketLabels';
import TechnicianAssignSelect from './TechnicianAssignSelect';

type DragMode = 'move' | 'resize-start' | 'resize-end';

interface DragState {
  itemId: string;
  mode: DragMode;
  startX: number;
  originalStart: Date;
  originalEnd: Date;
}

interface PlanningTimelineProps {
  bounds: TimelineBounds;
  scale: PlanningScale;
  interventions: PlanningInterventionItem[];
  milestones: PlanningMilestoneItem[];
  technicians: Contact[];
  canEdit: boolean;
  onScheduleChange: (
    ticketId: string,
    scheduledStart: Date,
    scheduledEnd: Date,
    durationHours: number,
  ) => Promise<void>;
  onAssignTechnician: (ticketId: string, contactId: string | null) => Promise<void>;
}

interface TimelineRow {
  id: string;
  label: string;
  subtitle?: string;
  kind: 'technician' | 'unassigned' | 'milestones';
}

function msToHours(ms: number): number {
  return ms / (60 * 60 * 1000);
}

export default function PlanningTimeline({
  bounds,
  scale,
  interventions,
  milestones,
  technicians,
  canEdit,
  onScheduleChange,
  onAssignTechnician,
}: PlanningTimelineProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  const [preview, setPreview] = useState<{ id: string; start: Date; end: Date } | null>(null);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const rows: TimelineRow[] = useMemo(() => {
    const techRows: TimelineRow[] = technicians.map((t) => ({
      id: t.id,
      label: getContactFullName(t),
      subtitle: (t.electricalHabilitations ?? []).join(', ') || undefined,
      kind: 'technician' as const,
    }));

    return [
      ...techRows,
      {
        id: UNASSIGNED_ROW_ID,
        label: 'Non assigné',
        subtitle: 'Interventions sans technicien',
        kind: 'unassigned' as const,
      },
      {
        id: MILESTONES_ROW_ID,
        label: 'Jalons affaires',
        subtitle: 'Dates début / fin prévues',
        kind: 'milestones' as const,
      },
    ];
  }, [technicians]);

  const itemsByRow = useMemo(() => {
    const map = new Map<string, PlanningItem[]>();

    for (const row of rows) {
      map.set(row.id, []);
    }

    for (const item of interventions) {
      const rowId = item.assignedContactId ?? UNASSIGNED_ROW_ID;
      if (!map.has(rowId)) map.set(rowId, []);
      map.get(rowId)!.push(item);
    }

    for (const item of milestones) {
      map.get(MILESTONES_ROW_ID)!.push(item);
    }

    return map;
  }, [rows, interventions, milestones]);

  const resolveItemDates = useCallback(
    (item: PlanningInterventionItem) => {
      if (preview?.id === item.id) {
        return { start: preview.start, end: preview.end };
      }
      return { start: item.start, end: item.end };
    },
    [preview],
  );

  const applyDrag = useCallback(
    (state: DragState, clientX: number) => {
      const track = trackRef.current;
      if (!track) return;

      const rect = track.getBoundingClientRect();
      const deltaPct = ((clientX - state.startX) / rect.width) * 100;
      const totalMs = bounds.end.getTime() - bounds.start.getTime();

      if (state.mode === 'move') {
        const deltaMs = (deltaPct / 100) * totalMs;
        const durationMs = state.originalEnd.getTime() - state.originalStart.getTime();
        let newStart = new Date(state.originalStart.getTime() + deltaMs);
        let newEnd = new Date(newStart.getTime() + durationMs);
        newStart = snapToScale(newStart, scale);
        newEnd = new Date(newStart.getTime() + durationMs);
        setPreview({ id: state.itemId, start: newStart, end: newEnd });
        return;
      }

      const originalLeftPct =
        ((state.originalStart.getTime() - bounds.start.getTime()) / totalMs) * 100;
      const originalRightPct =
        ((state.originalEnd.getTime() - bounds.start.getTime()) / totalMs) * 100;
      const newPct = originalLeftPct + deltaPct;
      const newRightPct = originalRightPct + deltaPct;

      if (state.mode === 'resize-start') {
        const start = snapToScale(dateFromTimelinePercent(Math.min(newPct, originalRightPct - 0.5), bounds), scale);
        setPreview({ id: state.itemId, start, end: state.originalEnd });
      } else {
        const end = snapToScale(dateFromTimelinePercent(Math.max(newRightPct, originalLeftPct + 0.5), bounds), scale);
        setPreview({ id: state.itemId, start: state.originalStart, end });
      }
    },
    [bounds, scale],
  );

  const finishDrag = useCallback(async () => {
    if (!drag || !preview) {
      setDrag(null);
      setPreview(null);
      return;
    }

    const item = interventions.find((i) => i.id === drag.itemId);
    if (!item || !canEdit) {
      setDrag(null);
      setPreview(null);
      return;
    }

    const durationHours = Math.max(0.5, msToHours(preview.end.getTime() - preview.start.getTime()));

    setSaving(true);
    try {
      await onScheduleChange(item.ticketId, preview.start, preview.end, durationHours);
    } finally {
      setSaving(false);
      setDrag(null);
      setPreview(null);
    }
  }, [drag, preview, interventions, canEdit, onScheduleChange]);

  useEffect(() => {
    if (!drag) return;

    const onMove = (e: MouseEvent) => applyDrag(drag, e.clientX);
    const onUp = () => {
      void finishDrag();
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [drag, applyDrag, finishDrag]);

  const startDrag = (
    e: React.MouseEvent,
    item: PlanningInterventionItem,
    mode: DragMode,
  ) => {
    if (!canEdit) return;
    e.stopPropagation();
    e.preventDefault();

    const track = (e.currentTarget as HTMLElement).closest('.timeline-track') as HTMLDivElement | null;
    trackRef.current = track;

    const dates = resolveItemDates(item);
    setDrag({
      itemId: item.id,
      mode,
      startX: e.clientX,
      originalStart: dates.start,
      originalEnd: dates.end,
    });
    setPreview({ id: item.id, start: dates.start, end: dates.end });
  };

  const selectedIntervention = interventions.find((i) => i.ticketId === selectedTicketId);

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="flex border-b border-slate-100 bg-slate-50">
        <div className="w-48 shrink-0 border-r border-slate-100 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          Ressource
        </div>
        <div className="flex flex-1 min-w-0">
          {bounds.columns.map((col) => (
            <div
              key={col.key}
              className="flex-1 border-r border-slate-100 px-1 py-2 text-center text-[10px] font-medium text-slate-600 last:border-r-0"
            >
              {col.label}
            </div>
          ))}
        </div>
      </div>

      <div className="max-h-[480px] overflow-y-auto">
        {rows.map((row) => {
          const rowItems = itemsByRow.get(row.id) ?? [];

          return (
            <div key={row.id} className="flex border-b border-slate-50 last:border-b-0">
              <div className="w-48 shrink-0 border-r border-slate-100 px-3 py-3">
                <p className="truncate text-xs font-medium text-slate-800">{row.label}</p>
                {row.subtitle && (
                  <p className="truncate text-[10px] text-slate-500">{row.subtitle}</p>
                )}
              </div>

              <div
                className="timeline-track relative h-14 flex-1 bg-[linear-gradient(to_right,#f1f5f9_1px,transparent_1px)] bg-[length:var(--col-width)_100%]"
                style={{
                  ['--col-width' as string]: `${100 / Math.max(bounds.columns.length, 1)}%`,
                }}
              >
                {rowItems.map((item) => {
                  if (item.kind === 'milestone') {
                    const pos = getItemPositionPercent(item, bounds);
                    return (
                      <div
                        key={item.id}
                        className={`absolute top-2 flex h-9 cursor-default items-center overflow-hidden rounded border px-2 text-[10px] font-medium shadow-sm ${getMilestoneBarClass()}`}
                        style={{ left: `${pos.left}%`, width: `${pos.width}%`, minWidth: 48 }}
                        title={`${item.reference} — ${item.title}`}
                      >
                        <span className="truncate">{item.reference}</span>
                      </div>
                    );
                  }

                  const dates = resolveItemDates(item);
                  const pos = getItemPositionPercent(
                    { ...item, start: dates.start, end: dates.end },
                    bounds,
                  );
                  const missing =
                    row.kind === 'technician'
                      ? getMissingHabilitations(
                          technicians.find((t) => t.id === row.id)?.electricalHabilitations ?? [],
                          item.requiredHabilitations,
                        )
                      : [];

                  return (
                    <div
                      key={item.id}
                      className={`group absolute top-2 flex h-9 items-center overflow-hidden rounded border text-[10px] font-medium shadow-sm ${
                        item.isScheduled ? getInterventionBarClass(item.priority) : 'border-dashed bg-slate-200 text-slate-700'
                      } ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
                      style={{ left: `${pos.left}%`, width: `${pos.width}%`, minWidth: 56 }}
                      title={`${item.title} — ${getTicketStatusLabel(item.status)} / ${getTicketPriorityLabel(item.priority)}`}
                      onMouseDown={(e) => startDrag(e, item, 'move')}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTicketId(item.ticketId);
                      }}
                    >
                      {canEdit && (
                        <>
                          <div
                            className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize bg-black/10 opacity-0 group-hover:opacity-100"
                            onMouseDown={(e) => startDrag(e, item, 'resize-start')}
                          />
                          <div
                            className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize bg-black/10 opacity-0 group-hover:opacity-100"
                            onMouseDown={(e) => startDrag(e, item, 'resize-end')}
                          />
                        </>
                      )}
                      <span className="truncate px-2">{item.title}</span>
                      {missing.length > 0 && row.kind === 'technician' && (
                        <span className="mr-1 shrink-0 rounded bg-red-600/90 px-1 text-[8px] text-white">
                          Hab.
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {selectedIntervention && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">{selectedIntervention.title}</p>
              <p className="text-xs text-slate-500">
                {getTicketStatusLabel(selectedIntervention.status)} ·{' '}
                {getTicketPriorityLabel(selectedIntervention.priority)} ·{' '}
                Hab. requises : {selectedIntervention.requiredHabilitations.join(', ') || '—'}
              </p>
            </div>
            {canEdit && (
              <TechnicianAssignSelect
                technicians={technicians}
                requiredHabilitations={selectedIntervention.requiredHabilitations}
                value={selectedIntervention.assignedContactId}
                disabled={saving}
                onAssign={async (contactId) => {
                  setSaving(true);
                  try {
                    await onAssignTechnician(selectedIntervention.ticketId, contactId);
                  } finally {
                    setSaving(false);
                  }
                }}
              />
            )}
          </div>
        </div>
      )}

      {canEdit && (
        <p className="border-t border-slate-100 px-4 py-2 text-[10px] text-slate-400">
          Glissez un bloc pour déplacer l&apos;intervention · Poignées latérales pour ajuster la durée
        </p>
      )}
    </div>
  );
}
