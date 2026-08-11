import { useRole } from '../hooks/useRole';
import { useActivityLogs } from '../hooks/useProjects';
import {
  ShieldCheck,
  Server,
  Lock,
  Database,
  FileCheck,
  Activity,
  CheckCircle,
  AlertTriangle,
  Shield,
  HardDrive,
  Globe,
  KeyRound,
} from 'lucide-react';

const STATUS_ITEMS = [
  { label: 'Hébergement', value: 'France (OVH Gravelines)', icon: <Server size={16} />, ok: true },
  { label: 'Chiffrement TLS', value: 'TLS 1.3 actif', icon: <Lock size={16} />, ok: true },
  { label: 'Sauvegardes', value: 'Quotidiennes — dernière : il y a 4 h', icon: <Database size={16} />, ok: true },
  { label: 'RGPD', value: 'Conforme — DPO désigné', icon: <FileCheck size={16} />, ok: true },
  { label: 'Authentification', value: 'MFA activée pour les rôles sensibles', icon: <ShieldCheck size={16} />, ok: true },
  { label: 'Audit', value: 'Journalisation complète active', icon: <Activity size={16} />, ok: true },
];

const BACKUP_LOGS = [
  { date: '2024-06-22T02:00:00Z', status: 'success', size: '1.2 Go', duration: '4 min 12 s' },
  { date: '2024-06-21T02:00:00Z', status: 'success', size: '1.1 Go', duration: '3 min 58 s' },
  { date: '2024-06-20T02:00:00Z', status: 'success', size: '1.1 Go', duration: '4 min 05 s' },
  { date: '2024-06-19T02:00:00Z', status: 'success', size: '1.1 Go', duration: '3 min 45 s' },
  { date: '2024-06-18T02:00:00Z', status: 'warning', size: '1.0 Go', duration: '5 min 30 s' },
];

export default function Conformite() {
  const { canAccess } = useRole();
  const { logs: auditLogs, loading: auditLoading } = useActivityLogs();

  if (!canAccess(['DGS', 'DST'])) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm text-slate-500">Accès réservé aux profils DGS et DST.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Conformité & Sécurité</h1>
        <p className="text-sm text-slate-500">RGPD, hébergement, sauvegardes et traçabilité</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STATUS_ITEMS.map((item) => (
          <div
            key={item.label}
            className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
              {item.icon}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{item.label}</p>
              <p className="text-sm font-medium text-slate-900">{item.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <HardDrive size={16} className="text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Journal des sauvegardes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Date</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Taille</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Durée</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Statut</th>
                </tr>
              </thead>
              <tbody>
                {BACKUP_LOGS.map((b, i) => (
                  <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 text-slate-700">
                      {new Date(b.date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{b.size}</td>
                    <td className="px-4 py-3 text-slate-600">{b.duration}</td>
                    <td className="px-4 py-3">
                      {b.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                          <CheckCircle size={10} /> OK
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                          <AlertTriangle size={10} /> Lent
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-4">
            <Shield size={16} className="text-slate-500" />
            <h3 className="text-sm font-bold text-slate-900">Journal d'audit système</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Événement</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Utilisateur</th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">Heure</th>
                </tr>
              </thead>
              <tbody>
                {auditLoading ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-sm text-slate-400">
                      Chargement...
                    </td>
                  </tr>
                ) : (
                  auditLogs.slice(0, 8).map((e) => (
                    <tr key={e.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                      <td className="px-4 py-3 font-medium text-slate-800">{e.action}</td>
                      <td className="px-4 py-3 text-slate-600">{e.userName}</td>
                      <td className="px-4 py-3 text-slate-500">
                        {new Date(e.timestamp).toLocaleString('fr-FR', {
                          day: '2-digit',
                          month: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-emerald-600 shadow-sm">
              <Globe size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Hébergement souverain</p>
              <p className="text-xs text-slate-500">Données hébergées en France — Conformité RGPD garantie</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white text-blue-600 shadow-sm">
              <KeyRound size={18} />
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">Chiffrement de bout en bout</p>
              <p className="text-xs text-slate-500">TLS 1.3 + chiffrement au repos AES-256</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
