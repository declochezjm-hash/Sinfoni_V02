import { useProjects } from '../hooks/useProjects';
import { formatCurrency } from '../lib/utils';

export default function BudgetChart() {
  const { projects, loading } = useProjects();

  const filtered = [...projects]
    .filter((p) => p.status !== 'Clôturé' && p.status !== 'Brouillon')
    .sort((a, b) => b.budgetTotal - a.budgetTotal)
    .slice(0, 6);

  const maxTotal = Math.max(...filtered.map((p) => p.budgetTotal), 1);

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="h-40 animate-pulse rounded-lg bg-slate-100" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="mb-4">
        <h3 className="text-sm font-bold text-slate-900">Consommation budgétaire</h3>
        <p className="text-xs text-slate-500">Affaires actives — Budget total vs consommé</p>
      </div>
      <div className="space-y-4">
        {filtered.map((p) => {
          const totalPct = (p.budgetTotal / maxTotal) * 100;
          const consumedPct = (p.budgetConsumed / maxTotal) * 100;
          return (
            <div key={p.id}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-slate-700 truncate max-w-[60%]">
                  {p.reference}
                </span>
                <span className="text-[11px] text-slate-400">
                  {formatCurrency(p.budgetConsumed)} / {formatCurrency(p.budgetTotal)}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-full rounded-full bg-slate-300"
                  style={{ width: `${totalPct}%` }}
                />
              </div>
              <div className="relative -mt-2 h-2 w-full rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-blue-600"
                  style={{ width: `${consumedPct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-4 flex items-center gap-4 text-xs text-slate-500">
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-slate-300" />
          Budget total
        </div>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-blue-600" />
          Consommé
        </div>
      </div>
    </div>
  );
}
