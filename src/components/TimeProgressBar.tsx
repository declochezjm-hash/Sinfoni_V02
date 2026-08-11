import type { ProjectStatus } from '../types';

function parseDateOnly(dateStr: string): Date | null {
  if (!dateStr) return null;
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function startOfToday(): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
}

export function daysBetween(start: Date, end: Date): number {
  const ms = end.getTime() - start.getTime();
  return Math.max(0, Math.round(ms / (24 * 60 * 60 * 1000)));
}

export function getTimeProgressRate(startDate: string, endDate: string): number | null {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);
  if (!start || !end || end <= start) return null;

  const today = startOfToday();
  const totalDays = daysBetween(start, end);
  const elapsedDays = daysBetween(start, today);
  if (totalDays === 0) return 100;

  return Math.min(Math.max(Math.round((elapsedDays / totalDays) * 100), 0), 100);
}

export function getProjectDelayDays(
  endDate: string,
  status: ProjectStatus,
): number | null {
  if (!endDate || status === 'Clôturé') return null;

  const end = parseDateOnly(endDate);
  if (!end) return null;

  const today = startOfToday();
  if (today <= end) return null;

  return daysBetween(end, today);
}

function getBarColor(rate: number, isOverdue: boolean): string {
  if (isOverdue) return 'bg-red-500 animate-pulse';
  if (rate >= 90) return 'bg-orange-500';
  return 'bg-blue-500';
}

interface TimeProgressBarProps {
  startDate: string;
  endDate: string;
  status: ProjectStatus;
  showLabel?: boolean;
  compact?: boolean;
}

export function TimeProgressBar({
  startDate,
  endDate,
  status,
  showLabel = true,
  compact = false,
}: TimeProgressBarProps) {
  const start = parseDateOnly(startDate);
  const end = parseDateOnly(endDate);

  if (!start || !end) return null;

  const today = startOfToday();
  const totalDays = daysBetween(start, end);
  const elapsedDays = daysBetween(start, today);
  const rate = getTimeProgressRate(startDate, endDate) ?? 0;
  const delayDays = getProjectDelayDays(endDate, status);
  const isOverdue = delayDays !== null && delayDays > 0;
  const barWidth = isOverdue ? 100 : rate;

  return (
    <div className={compact ? 'space-y-1' : 'space-y-2'}>
      {showLabel && (
        <div className="flex items-center justify-between gap-2">
          <span className={`text-slate-500 ${compact ? 'text-[10px]' : 'text-xs'}`}>
            Temps écoulé : {rate}% ({elapsedDays}/{totalDays} j)
          </span>
          {isOverdue && (
            <span
              className={`font-semibold text-red-600 ${compact ? 'text-[10px]' : 'text-xs'} animate-pulse`}
            >
              ⚠️ RETARD : {delayDays} j
            </span>
          )}
        </div>
      )}
      <div
        className={`w-full rounded-full bg-slate-100 overflow-hidden ${compact ? 'h-1.5' : 'h-3'}`}
      >
        <div
          className={`h-full rounded-full transition-all duration-300 ${getBarColor(rate, isOverdue)}`}
          style={{ width: `${barWidth}%` }}
        />
      </div>
    </div>
  );
}

export function ProjectDelayBadge({
  endDate,
  status,
  compact = false,
}: {
  endDate: string;
  status: ProjectStatus;
  compact?: boolean;
}) {
  const delayDays = getProjectDelayDays(endDate, status);
  if (delayDays === null) return null;

  return (
    <span
      className={`inline-flex items-center rounded-full border border-red-200 bg-red-50 px-2 py-0.5 font-semibold text-red-700 animate-pulse ${
        compact ? 'text-[10px]' : 'text-xs'
      }`}
    >
      ⚠️ RETARD : {delayDays} j
    </span>
  );
}
