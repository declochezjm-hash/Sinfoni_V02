import { useMemo } from 'react';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { useProjects } from '../hooks/useProjects';
import { useAllProjectTimesheets } from '../hooks/useProjectTimesheets';
import { useRole } from '../hooks/useRole';
import MetricCard from '../components/MetricCard';
import { formatCurrency } from '../lib/utils';
import { LABOR_HOURLY_RATE, BILLING_STATUS_OPTIONS } from '../lib/projectConstants';
import {
  buildLaborCostsMap,
  computeProjectAlerts,
  getEffectiveBudgetConsumed,
  groupAlertsByProjectId,
} from '../utils/alertEngine';
import type { BillingStatus } from '../types';
import {
  Euro,
  Users,
  TrendingUp,
  HeartPulse,
  ShieldAlert,
} from 'lucide-react';

const ANALYTICS_ROLES = ['DGS', 'DST'] as const;

const BILLING_COLORS: Record<BillingStatus, string> = {
  'À émettre': '#94a3b8',
  'Acompte émis': '#f97316',
  'Facturé total': '#0ea5e9',
  Payé: '#10b981',
};

function formatCompactCurrency(value: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
    notation: value >= 10000 ? 'compact' : 'standard',
  }).format(value);
}

export default function Analytics() {
  const { canAccess } = useRole();
  const { projects, isLoading: projectsLoading } = useProjects();
  const { data: timesheets = [], isLoading: timesheetsLoading } = useAllProjectTimesheets();

  const loading = projectsLoading || timesheetsLoading;

  const analytics = useMemo(() => {
    const laborCosts = buildLaborCostsMap(timesheets);
    const totalLaborCost = Object.values(laborCosts).reduce((sum, c) => sum + c, 0);

    const globalRevenue = projects
      .filter((p) => p.quoteStatus === 'Accepté')
      .reduce((sum, p) => sum + p.quoteAmountHt, 0);

    const theoreticalMargin = globalRevenue - totalLaborCost;

    const alerts = computeProjectAlerts(projects, laborCosts);
    const alertsByProject = groupAlertsByProjectId(alerts);
    const projectsWithAlerts = Object.keys(alertsByProject).length;
    const healthRate =
      projects.length > 0
        ? Math.round(((projects.length - projectsWithAlerts) / projects.length) * 100)
        : 100;

    const topBudgetProjects = [...projects]
      .map((p) => ({
        name: p.reference.length > 12 ? `${p.reference.slice(0, 12)}…` : p.reference,
        fullName: p.title,
        budgetTotal: p.budgetTotal,
        budgetConsumed: getEffectiveBudgetConsumed(p, laborCosts),
      }))
      .sort((a, b) => b.budgetConsumed - a.budgetConsumed)
      .slice(0, 5);

    const billingDistribution = BILLING_STATUS_OPTIONS.map((status) => ({
      name: status,
      value: projects.filter((p) => p.billingStatus === status).length,
      color: BILLING_COLORS[status],
    })).filter((entry) => entry.value > 0);

    return {
      globalRevenue,
      totalLaborCost,
      theoreticalMargin,
      healthRate,
      topBudgetProjects,
      billingDistribution,
      totalProjects: projects.length,
      projectsWithAlerts,
    };
  }, [projects, timesheets]);

  if (!canAccess([...ANALYTICS_ROLES])) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-slate-200 bg-white p-12 shadow-sm">
        <ShieldAlert size={40} className="text-slate-300" />
        <h2 className="text-lg font-bold text-slate-900">Accès restreint</h2>
        <p className="max-w-md text-center text-sm text-slate-500">
          Le tableau de bord Analytics est réservé aux profils directionnels (DGS, DST).
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">📊 Analytics — Pilotage Direction</h1>
        <p className="text-sm text-slate-500">
          Vue consolidée financière et opérationnelle — synchronisée en temps réel avec les saisies
          terrain
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Chiffre d'Affaires Global"
          value={formatCurrency(analytics.globalRevenue)}
          icon={<Euro size={18} />}
        />
        <MetricCard
          label="Coût Main d'Œuvre Cumulé"
          value={formatCurrency(analytics.totalLaborCost)}
          icon={<Users size={18} />}
        />
        <MetricCard
          label="Marge Théorique Évolutive"
          value={formatCurrency(analytics.theoreticalMargin)}
          icon={<TrendingUp size={18} />}
        />
        <MetricCard
          label="Taux de Santé"
          value={`${analytics.healthRate} %`}
          icon={<HeartPulse size={18} />}
        />
      </div>

      <p className="text-xs text-slate-400">
        {analytics.totalProjects} chantier{analytics.totalProjects > 1 ? 's' : ''} analysé
        {analytics.totalProjects > 1 ? 's' : ''} — {analytics.projectsWithAlerts} avec alerte
        {analytics.projectsWithAlerts > 1 ? 's' : ''} active
        {analytics.projectsWithAlerts > 1 ? 's' : ''} — tarif MO : {LABOR_HOURLY_RATE} €/h
      </p>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Top 5 — Budget vs Consommé (incl. MO)
            </h3>
            <p className="text-xs text-slate-500">
              Chantiers les plus consommateurs — budget total vs budget consommé
            </p>
          </div>
          {analytics.topBudgetProjects.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">Aucun chantier disponible.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <BarChart
                data={analytics.topBudgetProjects}
                margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                barGap={4}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: '#64748b' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v: number) => formatCompactCurrency(v)}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(Number(value ?? 0))}
                  labelFormatter={(_, payload) => {
                    const item = payload?.[0]?.payload as { fullName?: string; name?: string };
                    return item?.fullName ?? item?.name ?? '';
                  }}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '12px', paddingTop: '12px' }}
                  formatter={(value) =>
                    value === 'budgetTotal' ? 'Budget total' : 'Budget consommé (incl. MO)'
                  }
                />
                <Bar
                  dataKey="budgetTotal"
                  name="budgetTotal"
                  fill="#cbd5e1"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
                <Bar
                  dataKey="budgetConsumed"
                  name="budgetConsumed"
                  fill="#1e293b"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={36}
                />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4">
            <h3 className="text-sm font-bold text-slate-900">
              Répartition par Statut de Facturation
            </h3>
            <p className="text-xs text-slate-500">
              Où bloque la trésorerie — devis acceptés à encaisser
            </p>
          </div>
          {analytics.billingDistribution.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-400">Aucune donnée de facturation.</p>
          ) : (
            <ResponsiveContainer width="100%" height={320}>
              <PieChart>
                <Pie
                  data={analytics.billingDistribution}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={3}
                  label={({ name, percent }) =>
                    `${name} (${Math.round((percent ?? 0) * 100)} %)`
                  }
                  labelLine={{ stroke: '#94a3b8', strokeWidth: 1 }}
                >
                  {analytics.billingDistribution.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value) => {
                    const count = Number(value ?? 0);
                    return [`${count} chantier${count > 1 ? 's' : ''}`, 'Nombre'];
                  }}
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </div>
  );
}
