import { useMemo, useState, useEffect, useCallback } from 'react';
import { useProjects } from '../hooks/useProjects';
import { useRole } from '../hooks/useRole';
import { useNotifications } from '../hooks/useNotifications';
import { supabase } from '../lib/supabase';
import { formatCurrency, formatRelativeTime } from '../lib/utils';
import MetricCard from '../components/MetricCard';
import ActivityFeed from '../components/ActivityFeed';
import BudgetChart from '../components/BudgetChart';
import ProjectTypeChart from '../components/ProjectTypeChart';
import {
  FolderKanban,
  Euro,
  Clock,
  FileCheck,
  AlertTriangle,
  TrendingUp,
  Settings,
  GripVertical,
  Eye,
  EyeOff,
  X,
  Check,
  Bell,
} from 'lucide-react';

interface WidgetConfig {
  key: string;
  label: string;
  visible: boolean;
  position: number;
}

const DEFAULT_WIDGETS: WidgetConfig[] = [
  { key: 'metrics', label: 'Métriques', visible: true, position: 0 },
  { key: 'budget_chart', label: 'Graphique budget', visible: true, position: 1 },
  { key: 'status_chart', label: 'Répartition statuts', visible: true, position: 2 },
  { key: 'project_type_chart', label: 'Répartition types', visible: true, position: 3 },
  { key: 'activity_feed', label: 'Activité récente', visible: true, position: 4 },
  { key: 'notifications', label: 'Notifications', visible: true, position: 5 },
];

const WIDGET_LABELS: Record<string, string> = {
  metrics: 'Métriques',
  budget_chart: 'Graphique budget',
  status_chart: 'Répartition statuts',
  project_type_chart: 'Répartition types',
  activity_feed: 'Activité récente',
  notifications: 'Notifications',
};

export default function Dashboard() {
  const { user, organizationId } = useRole();
  const { projects, loading } = useProjects();
  const { notifications, unreadCount } = useNotifications();
  const [widgets, setWidgets] = useState<WidgetConfig[]>(DEFAULT_WIDGETS);
  const [showConfig, setShowConfig] = useState(false);

  const fetchWidgets = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('dashboard_widgets')
        .select('*')
        .eq('organization_id', organizationId)
        .or(`user_id.eq.all,user_id.eq.${user.id}`)
        .order('position', { ascending: true });

      if (error) {
        console.warn('[Dashboard] widgets fetch:', error.message);
        return;
      }

      if (data && data.length > 0) {
        const mapped: WidgetConfig[] = data.map((row) => ({
          key: String(row.widget_key),
          label: WIDGET_LABELS[String(row.widget_key)] || String(row.widget_key),
          visible: Boolean(row.visible),
          position: Number(row.position),
        }));
        setWidgets(mapped);
      }
    } catch (err) {
      console.warn('[Dashboard] widgets fetch failed:', err);
    }
  }, [user.id, organizationId]);

  useEffect(() => {
    fetchWidgets();
  }, [fetchWidgets]);

  const saveWidgets = async (updated: WidgetConfig[]) => {
    for (const w of updated) {
      await supabase
        .from('dashboard_widgets')
        .upsert(
          {
            organization_id: organizationId,
            user_id: user.id,
            widget_key: w.key,
            position: w.position,
            visible: w.visible,
          },
          { onConflict: 'organization_id,user_id,widget_key' }
        );
    }
  };

  const metrics = useMemo(() => {
    const active = projects.filter(
      (p) => p.status === 'En cours' || p.status === 'BC/OS' || p.status === 'APS/APD'
    );
    const totalBudget = projects.reduce((sum, p) => sum + p.budgetTotal, 0);
    const pendingValidation = projects.filter((p) => p.status === 'APS/APD').length;
    const activeContracts = projects.filter(
      (p) => p.status === 'En cours' || p.status === 'BC/OS'
    ).length;
    const alerts = projects.filter(
      (p) =>
        p.status === 'En cours' &&
        p.budgetTotal > 0 &&
        p.budgetConsumed / p.budgetTotal > 0.85
    ).length;

    return {
      activeProjects: active.length,
      totalBudget,
      pendingValidation,
      activeContracts,
      alerts,
    };
  }, [projects]);

  const visibleWidgets = useMemo(
    () => widgets.filter((w) => w.visible).sort((a, b) => a.position - b.position),
    [widgets]
  );

  const toggleWidget = async (key: string) => {
    const updated = widgets.map((w) =>
      w.key === key ? { ...w, visible: !w.visible } : w
    );
    setWidgets(updated);
    await saveWidgets(updated);
  };

  const moveWidget = async (key: string, direction: 'up' | 'down') => {
    const sorted = [...widgets].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((w) => w.key === key);
    if (idx < 0) return;
    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx < 0 || newIdx >= sorted.length) return;
    const temp = sorted[idx].position;
    sorted[idx].position = sorted[newIdx].position;
    sorted[newIdx].position = temp;
    setWidgets([...sorted]);
    await saveWidgets(sorted);
  };

  const renderWidget = (key: string) => {
    switch (key) {
      case 'metrics':
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
            <MetricCard
              label="Affaires actives"
              value={String(metrics.activeProjects)}
              change={12}
              changeLabel="vs mois dernier"
              icon={<FolderKanban size={18} />}
            />
            <MetricCard
              label="Budget total engagé"
              value={formatCurrency(metrics.totalBudget)}
              icon={<Euro size={18} />}
            />
            <MetricCard
              label="Validations en attente"
              value={String(metrics.pendingValidation)}
              icon={<Clock size={18} />}
            />
            <MetricCard
              label="Contrats actifs"
              value={String(metrics.activeContracts)}
              change={8}
              changeLabel="vs mois dernier"
              icon={<FileCheck size={18} />}
            />
            <MetricCard
              label="Alertes budget"
              value={String(metrics.alerts)}
              icon={<AlertTriangle size={18} />}
            />
          </div>
        );
      case 'budget_chart':
        return <BudgetChart />;
      case 'status_chart':
        return (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Évolution des affaires</h3>
                <p className="text-xs text-slate-500">Nombre de dossiers par statut</p>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-1 text-xs font-medium text-emerald-700">
                <TrendingUp size={12} />
                +5% ce trimestre
              </div>
            </div>
            <StatusBarChart />
          </div>
        );
      case 'project_type_chart':
        return <ProjectTypeChart />;
      case 'activity_feed':
        return <ActivityFeed />;
      case 'notifications':
        return (
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-slate-500" />
                <h3 className="text-sm font-bold text-slate-900">Notifications récentes</h3>
                {unreadCount > 0 && (
                  <span className="rounded-full bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {unreadCount}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-2 max-h-[240px] overflow-y-auto">
              {notifications.slice(0, 5).map((n) => (
                <div
                  key={n.id}
                  className={`flex items-start gap-2 rounded-lg border-l-4 px-3 py-2 ${
                    n.type === 'budget_alert'
                      ? 'border-l-amber-400 bg-amber-50/30'
                      : n.type === 'delay_alert'
                      ? 'border-l-red-400 bg-red-50/30'
                      : n.type === 'validation_alert'
                      ? 'border-l-blue-400 bg-blue-50/30'
                      : 'border-l-slate-300 bg-slate-50/30'
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs ${!n.read ? 'font-semibold text-slate-900' : 'text-slate-600'}`}>
                      {n.title}
                    </p>
                    <p className="text-[10px] text-slate-400">{formatRelativeTime(n.createdAt)}</p>
                  </div>
                </div>
              ))}
              {notifications.length === 0 && (
                <p className="text-xs text-slate-400">Aucune notification.</p>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-300 border-t-slate-800" />
        <p className="text-xs text-slate-500">Chargement des affaires…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Tableau de bord 360°</h1>
          <p className="text-sm text-slate-500">
            Bienvenue, {user.name} — Vue consolidée du pilotage des affaires
          </p>
        </div>
        <button
          onClick={() => setShowConfig(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
        >
          <Settings size={14} /> Personnaliser
        </button>
      </div>

      <div className="space-y-6">
        {visibleWidgets.map((w) => (
          <div key={w.key}>{renderWidget(w.key)}</div>
        ))}
      </div>

      {showConfig && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">Personnaliser le tableau de bord</h3>
              <button
                onClick={() => setShowConfig(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-2">
              {widgets
                .sort((a, b) => a.position - b.position)
                .map((w) => (
                  <div
                    key={w.key}
                    className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 px-3 py-2"
                  >
                    <div className="flex items-center gap-3">
                      <GripVertical size={14} className="text-slate-300" />
                      <button onClick={() => toggleWidget(w.key)}>
                        {w.visible ? (
                          <Eye size={14} className="text-emerald-500" />
                        ) : (
                          <EyeOff size={14} className="text-slate-400" />
                        )}
                      </button>
                      <span className={`text-sm ${w.visible ? 'text-slate-900' : 'text-slate-400'}`}>
                        {w.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => moveWidget(w.key, 'up')}
                        className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-200"
                      >
                        ↑
                      </button>
                      <button
                        onClick={() => moveWidget(w.key, 'down')}
                        className="flex h-6 w-6 items-center justify-center rounded text-slate-400 hover:bg-slate-200"
                      >
                        ↓
                      </button>
                    </div>
                  </div>
                ))}
            </div>
            <button
              onClick={() => setShowConfig(false)}
              className="mt-4 w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
            >
              <Check size={14} className="inline mr-1" /> Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBarChart() {
  const { projects } = useProjects();
  const statusOrder = ['Brouillon', 'APS/APD', 'BC/OS', 'En cours', 'PV/Réception', 'Clôturé', 'À planifier'];
  const counts: Record<string, number> = {};
  projects.forEach((p) => {
    counts[p.status] = (counts[p.status] || 0) + 1;
  });
  const maxCount = Math.max(...Object.values(counts), 1);

  const statusColors: Record<string, string> = {
    'Brouillon': 'bg-slate-300',
    'APS/APD': 'bg-sky-500',
    'BC/OS': 'bg-blue-600',
    'En cours': 'bg-emerald-500',
    'PV/Réception': 'bg-amber-500',
    'Clôturé': 'bg-slate-700',
    'À planifier': 'bg-violet-500',
  };

  return (
    <div className="flex items-end gap-3 h-40">
      {statusOrder.map((status) => {
        const count = counts[status] || 0;
        const height = maxCount ? (count / maxCount) * 100 : 0;
        return (
          <div key={status} className="flex flex-1 flex-col items-center gap-2">
            <div className="w-full flex items-end justify-center h-28">
              <div
                className={`w-full max-w-[48px] rounded-t-md ${statusColors[status]} transition-all`}
                style={{ height: `${height}%` }}
                title={`${status}: ${count}`}
              />
            </div>
            <span className="text-[10px] font-medium text-slate-500 text-center leading-tight">
              {status}
            </span>
            <span className="text-xs font-bold text-slate-900">{count}</span>
          </div>
        );
      })}
    </div>
  );
}
