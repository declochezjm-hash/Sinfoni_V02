import { useProjects } from '../hooks/useProjects';
import type { ProjectType } from '../types';

const TYPE_COLORS: Record<ProjectType, string> = {
  'Électricité': '#2563eb',
  'Éclairage Public': '#d97706',
  'Télécom': '#7c3aed',
  'IRVE': '#059669',
};

const TYPE_LABELS: Record<ProjectType, string> = {
  'Électricité': 'Électricité',
  'Éclairage Public': 'Éclairage Public',
  'Télécom': 'Télécom',
  'IRVE': 'IRVE',
};

export default function ProjectTypeChart() {
  const { projects, loading } = useProjects();

  const counts: Record<string, number> = {};
  projects.forEach((p) => {
    counts[p.type] = (counts[p.type] || 0) + 1;
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const items = (Object.keys(counts) as ProjectType[]).map((type) => ({
    type,
    count: counts[type],
    pct: total ? Math.round((counts[type] / total) * 100) : 0,
    color: TYPE_COLORS[type],
    label: TYPE_LABELS[type],
  }));

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="h-32 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900">Répartition par type d’affaire</h3>
        <p className="text-xs text-slate-500">Distribution des dossiers actifs</p>
      </div>
      <div className="flex items-center gap-6">
        <div className="relative h-32 w-32 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
            {items.map((item) => {
              const dash = (item.pct / 100) * circumference;
              const seg = (
                <circle
                  key={item.type}
                  cx="60"
                  cy="60"
                  r={radius}
                  fill="none"
                  stroke={item.color}
                  strokeWidth="14"
                  strokeDasharray={`${dash} ${circumference - dash}`}
                  strokeDashoffset={-offset}
                  strokeLinecap="round"
                />
              );
              offset += dash;
              return seg;
            })}
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-slate-900">{total}</span>
          </div>
        </div>
        <div className="flex flex-col gap-2">
          {items.map((item) => (
            <div key={item.type} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-xs text-slate-600">{item.label}</span>
              <span className="ml-auto text-xs font-semibold text-slate-900">
                {item.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
