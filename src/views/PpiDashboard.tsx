import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from 'recharts';
import { useProjects } from '../hooks/useProjects';
import { useRole } from '../hooks/useRole';
import MetricCard from '../components/MetricCard';
import { formatCurrency, getStatusColor, getTypeColor } from '../lib/utils';
import { PPI_CEILING_EUR } from '../lib/projectConstants';
import type { Project } from '../types';
import {
  CalendarDays,
  Euro,
  FolderKanban,
  AlertTriangle,
  ShieldAlert,
  ChevronRight,
} from 'lucide-react';

const PPI_ROLES = ['DGS', 'DST'] as const;

function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
    notation: value >= 10000 ? 'compact' : 'standard',
  }).format(value);
}

interface YearAggregate {
  year: number;
  budget: number;
  count: number;
  overCeiling: boolean;
}

function aggregateByYear(projects: Project[]): YearAggregate[] {
  const byYear = new Map<number, YearAggregate>();
  for (const p of projects) {
    if (p.ppiYear == null) continue;
    const existing = byYear.get(p.ppiYear) ?? {
      year: p.ppiYear,
      budget: 0,
      count: 0,
      overCeiling: false,
    };
    existing.budget += p.budgetTotal;
    existing.count += 1;
    byYear.set(p.ppiYear, existing);
  }
  return [...byYear.values()]
    .map((entry) => ({
      ...entry,
      overCeiling: entry.budget > PPI_CEILING_EUR,
    }))
    .sort((a, b) => a.year - b.year);
}

export default function PpiDashboard() {
  const navigate = useNavigate();
  const { canAccess } = useRole();
  const { projects, isLoading } = useProjects();
  const [selectedYear, setSelectedYear] = useState<number | 'all'>('all');

  const programmedProjects = useMemo(
    () => projects.filter((p) => p.ppiYear != null),
    [projects],
  );

  const chartData = useMemo(() => aggregateByYear(projects), [projects]);

  const availableYears = useMemo(
    () => chartData.map((d) => d.year),
    [chartData],
  );

  const metrics = useMemo(() => {
    const totalBudget = programmedProjects.reduce((sum, p) => sum + p.budgetTotal, 0);
    const yearsOverCeiling = chartData.filter((d) => d.overCeiling).length;
    const maxYearBudget = chartData.reduce((max, d) => Math.max(max, d.budget), 0);
    return {
      totalBudget,
      projectCount: programmedProjects.length,
      yearCount: chartData.length,
      yearsOverCeiling,
      maxYearBudget,
      unassignedCount: projects.length - programmedProjects.length,
    };
  }, [programmedProjects, chartData, projects.length]);

  const filteredProjects = useMemo(() => {
    const list =
      selectedYear === 'all'
        ? programmedProjects
        : programmedProjects.filter((p) => p.ppiYear === selectedYear);
    return [...list].sort((a, b) => b.budgetTotal - a.budgetTotal);
  }, [programmedProjects, selectedYear]);

  const yAxisMax = useMemo(() => {
    const maxBudget = chartData.reduce((max, d) => Math.max(max, d.budget), 0);
    return Math.max(maxBudget, PPI_CEILING_EUR) * 1.15;
  }, [chartData]);

  if (!canAccess([...PPI_ROLES])) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-12 shadow-sm">
        <ShieldAlert size={40} className="text-slate-300" />
        <h2 className="text-lg font-bold text-slate-900">Accès restreint</h2>
        <p className="max-w-md text-center text-sm text-slate-500">
          La planification PPI est réservée aux profils directionnels (DGS, DST).
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">📅 Planification PPI — Tableau de Bord</h1>
        <p className="text-sm text-slate-500">
          Programmation pluriannuelle des investissements — plafond annuel de{' '}
          {formatCurrency(PPI_CEILING_EUR)}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Budget programmé total"
          value={formatCurrency(metrics.totalBudget)}
          icon={<Euro size={18} />}
        />
        <MetricCard
          label="Affaires programmées"
          value={String(metrics.projectCount)}
          icon={<FolderKanban size={18} />}
        />
        <MetricCard
          label="Années couvertes"
          value={String(metrics.yearCount)}
          icon={<CalendarDays size={18} />}
        />
        <MetricCard
          label="Années au-dessus du plafond"
          value={String(metrics.yearsOverCeiling)}
          icon={<AlertTriangle size={18} />}
        />
      </div>

      {metrics.unassignedCount > 0 && (
        <p className="text-xs text-amber-600">
          {metrics.unassignedCount} affaire{metrics.unassignedCount > 1 ? 's' : ''} sans année PPI
          — renseignez l&apos;année dans l&apos;onglet Administratif de chaque projet.
        </p>
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Enveloppe budgétaire par année PPI
            </h3>
            <p className="text-xs text-slate-500">
              Somme des budgets totaux des affaires programmées — ligne rouge = plafond réglementaire
            </p>
          </div>
          {metrics.yearsOverCeiling > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-red-50 px-3 py-1 text-xs font-medium text-red-700">
              <AlertTriangle size={12} />
              {metrics.yearsOverCeiling} année{metrics.yearsOverCeiling > 1 ? 's' : ''} en dépassement
            </span>
          )}
        </div>

        {chartData.length === 0 ? (
          <p className="py-16 text-center text-sm text-slate-400">
            Aucune affaire programmée. Attribuez une année PPI depuis l&apos;onglet Administratif
            d&apos;un projet.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={360}>
            <BarChart
              data={chartData}
              margin={{ top: 24, right: 16, left: 0, bottom: 0 }}
              barCategoryGap="20%"
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis
                dataKey="year"
                tick={{ fontSize: 12, fill: '#64748b' }}
                axisLine={{ stroke: '#e2e8f0' }}
                tickLine={false}
              />
              <YAxis
                domain={[0, yAxisMax]}
                tick={{ fontSize: 11, fill: '#64748b' }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => formatCompactCurrency(v)}
              />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value ?? 0))}
                labelFormatter={(label) => `Année PPI ${label}`}
                contentStyle={{
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  fontSize: '12px',
                }}
              />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
                formatter={(value) =>
                  value === 'budget' ? 'Budget programmé' : String(value)
                }
              />
              <ReferenceLine
                y={PPI_CEILING_EUR}
                stroke="#ef4444"
                strokeDasharray="8 4"
                strokeWidth={2}
                ifOverflow="extendDomain"
                label={{
                  value: `Plafond ${formatCompactCurrency(PPI_CEILING_EUR)}`,
                  position: 'insideTopRight',
                  fill: '#ef4444',
                  fontSize: 11,
                  fontWeight: 600,
                }}
              />
              <Bar
                dataKey="budget"
                name="budget"
                radius={[4, 4, 0, 0]}
                maxBarSize={56}
                onClick={(data) => {
                  const payload = data?.payload as YearAggregate | undefined;
                  if (payload?.year) setSelectedYear(payload.year);
                }}
                className="cursor-pointer"
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.year}
                    fill={entry.overCeiling ? '#ef4444' : '#1e293b'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Détail des affaires programmées</h3>
            <p className="text-xs text-slate-500">
              {filteredProjects.length} affaire{filteredProjects.length > 1 ? 's' : ''}
              {selectedYear !== 'all' ? ` — année ${selectedYear}` : ' — toutes années'}
            </p>
          </div>
          <select
            value={selectedYear === 'all' ? 'all' : String(selectedYear)}
            onChange={(e) => {
              const val = e.target.value;
              setSelectedYear(val === 'all' ? 'all' : Number(val));
            }}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          >
            <option value="all">Toutes les années</option>
            {availableYears.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>

        {filteredProjects.length === 0 ? (
          <p className="px-5 py-12 text-center text-sm text-slate-400">
            Aucune affaire pour cette sélection.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-medium uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Référence</th>
                  <th className="px-5 py-3">Titre</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Statut</th>
                  <th className="px-5 py-3">Année PPI</th>
                  <th className="px-5 py-3 text-right">Budget total</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProjects.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/affaires/${p.id}`)}
                  >
                    <td className="px-5 py-3 font-medium text-slate-900">{p.reference}</td>
                    <td className="px-5 py-3 text-slate-600 max-w-[200px] truncate">{p.title}</td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${getTypeColor(p.type)}`}
                      >
                        {p.type}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${getStatusColor(p.status)}`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-semibold text-slate-800">{p.ppiYear}</td>
                    <td className="px-5 py-3 text-right font-medium text-slate-900">
                      {formatCurrency(p.budgetTotal)}
                    </td>
                    <td className="px-5 py-3 text-slate-400">
                      <ChevronRight size={16} />
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-900">
                  <td className="px-5 py-3" colSpan={5}>
                    Sous-total
                  </td>
                  <td className="px-5 py-3 text-right">
                    {formatCurrency(filteredProjects.reduce((s, p) => s + p.budgetTotal, 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
