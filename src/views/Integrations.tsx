import { useRole } from '../hooks/useRole';
import { useState } from 'react';
import {
  Plug,
  FileSpreadsheet,
  BookOpen,
  Database,
  Webhook,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Download,
} from 'lucide-react';

const CONNECTORS = [
  {
    id: 'excel',
    name: 'Export Excel',
    description: 'Export des données d\'affaires vers des fichiers Excel formatés avec mise en page professionnelle.',
    icon: <FileSpreadsheet size={20} />,
    enabled: true,
    category: 'Export',
    lastSync: '2024-06-22T14:30:00Z',
    status: 'ok',
  },
  {
    id: 'accounting',
    name: 'Outil comptable',
    description: 'Interfaçage avec le système comptable pour la synchronisation des budgets, factures et paiements.',
    icon: <BookOpen size={20} />,
    enabled: false,
    category: 'Comptabilité',
    lastSync: null,
    status: 'disabled',
  },
  {
    id: 'api',
    name: 'API tierce',
    description: 'Connecteur API REST pour échanges bidirectionnels avec des systèmes externes (GED, ERP, CRM).',
    icon: <Plug size={20} />,
    enabled: false,
    category: 'API',
    lastSync: null,
    status: 'disabled',
  },
  {
    id: 'ged_external',
    name: 'GED externe',
    description: 'Synchronisation avec une GED externe pour la conservation à long terme des documents.',
    icon: <Database size={20} />,
    enabled: false,
    category: 'Documents',
    lastSync: null,
    status: 'disabled',
  },
  {
    id: 'webhook',
    name: 'Webhooks',
    description: 'Notifications HTTP vers des services externes lors des changements de statut d\'affaires.',
    icon: <Webhook size={20} />,
    enabled: true,
    category: 'Notifications',
    lastSync: '2024-06-22T08:00:00Z',
    status: 'ok',
  },
];

const SYNC_LOGS = [
  { id: 1, connector: 'Export Excel', action: 'Export 42 lignes', status: 'success', time: '2024-06-22T14:30:00Z' },
  { id: 2, connector: 'Webhooks', action: 'Notification statut AFF-2024-003', status: 'success', time: '2024-06-22T09:15:00Z' },
  { id: 3, connector: 'Outil comptable', action: 'Tentative de connexion', status: 'error', time: '2024-06-21T16:00:00Z' },
  { id: 4, connector: 'Export Excel', action: 'Export 128 lignes', status: 'success', time: '2024-06-20T11:00:00Z' },
];

export default function Integrations() {
  const { canAccess } = useRole();
  const [connectors, setConnectors] = useState(CONNECTORS);
  const [exportDone] = useState(false);

  if (!canAccess(['DGS', 'DST'])) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm text-slate-500">Accès réservé aux profils DGS et DST.</p>
      </div>
    );
  }

  const toggle = (id: string) => {
    setConnectors((prev) =>
      prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled, status: !c.enabled ? 'ok' : 'disabled' } : c))
    );
  };

  const handleDownload = () => {
    const headers = ['Référence', 'Titre', 'Type', 'Statut', 'Budget Total', 'Budget Consommé', 'Localisation', 'Chargé d\'affaires'];
    const rows = [
      ['AFF-2024-001', 'Renforcement réseau BT — Quartier Nord', 'Électricité', 'En cours', '245000', '132000', 'Quartier Nord, 75000', 'Sophie Bernard'],
      ['AFF-2024-002', 'Rénovation éclairage public — Avenue des Champs', 'Éclairage Public', 'APS/APD', '180000', '12000', 'Avenue des Champs, 75000', 'Sophie Bernard'],
      ['AFF-2024-003', 'Déploiement fibre optique — ZI Est', 'Télécom', 'BC/OS', '320000', '45000', 'ZI Est, 75000', 'Sophie Bernard'],
    ];
    const csv = [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `export_affaires_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Intégrations & Connecteurs</h1>
        <p className="text-sm text-slate-500">Paramétrage des interfaces avec l'écosystème SI</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-3">
          {connectors.map((c) => (
            <div
              key={c.id}
              className="flex items-start justify-between rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-50 text-slate-600">
                  {c.icon}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-slate-900">{c.name}</p>
                    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                      c.status === 'ok' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {c.status === 'ok' ? 'Opérationnel' : 'Désactivé'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>
                  {c.lastSync && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      Dernière sync : {new Date(c.lastSync).toLocaleString('fr-FR')}
                    </p>
                  )}
                </div>
              </div>
              <button
                onClick={() => toggle(c.id)}
                className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  c.enabled
                    ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                {c.enabled ? 'Activé' : 'Désactivé'}
              </button>
            </div>
          ))}
        </div>

        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Download size={16} className="text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Exports de données</h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Exportez les affaires au format CSV/Excel pour analyse externe.
            </p>
            <button
              onClick={handleDownload}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
            >
              Exporter les affaires (CSV)
            </button>
            {exportDone && (
              <p className="mt-2 text-xs text-emerald-600 flex items-center gap-1">
                <CheckCircle size={12} /> Export réussi
              </p>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <RefreshCw size={16} className="text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Journal de synchronisation</h3>
            </div>
            <div className="space-y-2">
              {SYNC_LOGS.map((log) => (
                <div key={log.id} className="flex items-center gap-2 text-xs">
                  {log.status === 'success' ? (
                    <CheckCircle size={12} className="text-emerald-500 shrink-0" />
                  ) : (
                    <AlertTriangle size={12} className="text-amber-500 shrink-0" />
                  )}
                  <span className="text-slate-600 truncate">{log.action}</span>
                  <span className="ml-auto text-slate-400 whitespace-nowrap">
                    {new Date(log.time).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
