import { useState, useEffect, useCallback } from 'react';
import { useRole } from '../hooks/useRole';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { formatApiError } from '../lib/formatApiError';
import { logSupabaseError } from '../lib/supabaseDiagnostics';
import ApiErrorAlert from '../components/ApiErrorAlert';
import {
  Mail,
  Bell,
  AlertTriangle,
  Settings,
  Users,
  ToggleLeft,
  ToggleRight,
  Plus,
  X,
  Check,
  Edit2,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react';
import type { UserRole } from '../types';

interface UserRecord {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar: string;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

const ROLE_OPTIONS: UserRole[] = ['DGS', 'DST', "Chargé d'Affaires", 'Prestataire Extérieur'];

const ALERT_RULES = [
  { id: 'budget_80', label: 'Alerte budget > 80%', description: 'Notifier quand la consommation dépasse 80% du budget total', enabled: true, threshold: 80 },
  { id: 'delay_30', label: 'Alerte retard > 30 jours', description: 'Notifier quand une affaire dépasse de 30 jours la date de fin prévue', enabled: true, threshold: 30 },
  { id: 'validation_pending', label: 'Validation en attente', description: 'Rappel quotidien des validations APS/APD en attente', enabled: true, threshold: 1 },
  { id: 'document_missing', label: 'Document manquant', description: 'Alerte si un dossier clôturé manque le PV de réception', enabled: false, threshold: 0 },
];

const NOTIFICATION_CHANNELS = [
  { id: 'email', label: 'Email', enabled: true },
  { id: 'dashboard', label: 'Tableau de bord', enabled: true },
  { id: 'webhook', label: 'Webhook', enabled: false },
];

export default function Utilisateurs() {
  const { canAccess, organizationId } = useRole();
  const { authReady, authLoading: sessionLoading, profileError } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [fetching, setFetching] = useState(false);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'users' | 'rules'>('users');
  const [rules, setRules] = useState(ALERT_RULES);
  const [channels, setChannels] = useState(NOTIFICATION_CHANNELS);
  const [showModal, setShowModal] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'DST' as UserRole, active: true });

  const fetchUsers = useCallback(async () => {
    setFetching(true);
    setFetchError(null);

    const { data, error, status } = await supabase
      .from('users')
      .select('*')
      .eq('organization_id', organizationId)
      .order('created_at', { ascending: true });

    if (error) {
      logSupabaseError('users.select (liste admin)', error, status);
      setFetchError(formatApiError({ ...error, status: status ?? error }));
      setUsers([]);
    } else if (data) {
      setUsers(
        data.map((row) => ({
          id: String(row.id),
          name: String(row.name),
          email: String(row.email),
          role: String(row.role) as UserRole,
          avatar: String(row.avatar || ''),
          active: Boolean(row.active),
          createdAt: String(row.created_at),
          updatedAt: String(row.updated_at),
        })),
      );
    } else {
      setUsers([]);
    }

    if (import.meta.env.DEV) {
      console.log('[Utilisateurs] requête Supabase', {
        organizationId,
        httpStatus: status ?? null,
        rawCount: data?.length ?? 0,
      });
    }

    setFetching(false);
  }, [organizationId]);

  useEffect(() => {
    if (!authReady) return;
    void fetchUsers();
  }, [fetchUsers, authReady]);

  const loading = sessionLoading || (authReady && fetching);

  const openCreateModal = () => {
    setEditingUser(null);
    setForm({ name: '', email: '', role: 'DST', active: true });
    setShowModal(true);
  };

  const openEditModal = (user: UserRecord) => {
    setEditingUser(user);
    setForm({ name: user.name, email: user.email, role: user.role, active: user.active });
    setShowModal(true);
  };

  const saveUser = async () => {
    if (!form.name.trim() || !form.email.trim()) return;

    const avatar = form.name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    if (editingUser) {
      await supabase
        .from('users')
        .update({ name: form.name, email: form.email, role: form.role, active: form.active, avatar, updated_at: new Date().toISOString() })
        .eq('id', editingUser.id);
    } else {
      await supabase.from('users').insert({
        organization_id: organizationId,
        name: form.name,
        email: form.email,
        role: form.role,
        active: form.active,
        avatar,
      });
    }

    setShowModal(false);
    fetchUsers();
  };

  const deleteUser = async (id: string) => {
    if (!confirm('Supprimer cet utilisateur ?')) return;
    await supabase.from('users').delete().eq('id', id);
    fetchUsers();
  };

  const toggleUserActive = async (user: UserRecord) => {
    await supabase
      .from('users')
      .update({ active: !user.active, updated_at: new Date().toISOString() })
      .eq('id', user.id);
    fetchUsers();
  };

  if (!canAccess(['DGS', 'DST'])) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-10 text-center shadow-sm">
        <p className="text-sm text-slate-500">Accès réservé aux profils DGS et DST.</p>
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

  const listError = fetchError ?? profileError;

  if (!authReady && !sessionLoading) {
    return (
      <ApiErrorAlert
        title="Session requise"
        message="Connectez-vous pour afficher la liste des utilisateurs."
      />
    );
  }

  const toggleRule = (id: string) => {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  };

  const toggleChannel = (id: string) => {
    setChannels((prev) => prev.map((c) => (c.id === id ? { ...c, enabled: !c.enabled } : c)));
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Administration</h1>
        <p className="text-sm text-slate-500">Utilisateurs, habilitations et règles métier</p>
      </div>

      <div className="flex gap-1 rounded-lg border border-slate-200 bg-white p-1 shadow-sm w-fit">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === 'users' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users size={14} /> Utilisateurs
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            activeTab === 'rules' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Settings size={14} /> Règles métier
        </button>
      </div>

      {listError && (
        <ApiErrorAlert
          title="Impossible de charger les utilisateurs"
          message={listError}
          onRetry={() => void fetchUsers()}
        />
      )}

      {!listError && users.length === 0 && authReady && (
        <ApiErrorAlert
          title="Aucun utilisateur trouvé"
          message={`Aucune ligne dans public.users pour l'organisation ${organizationId}.`}
          onRetry={() => void fetchUsers()}
        />
      )}

      {activeTab === 'users' && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">{users.length} utilisateur{users.length > 1 ? 's' : ''}</p>
            <button
              onClick={openCreateModal}
              className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
            >
              <Plus size={14} /> Nouvel utilisateur
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {users.map((u) => (
              <div
                key={u.id}
                className={`rounded-xl border ${u.active ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50'} p-4 shadow-sm hover:shadow-md transition-shadow`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${u.active ? 'bg-slate-800' : 'bg-slate-400'} text-xs font-bold text-white`}>
                      {u.avatar || '??'}
                    </div>
                    <div className="min-w-0">
                      <p className={`truncate text-sm font-semibold ${u.active ? 'text-slate-900' : 'text-slate-400'}`}>{u.name}</p>
                      <p className={`truncate text-xs ${u.active ? 'text-slate-500' : 'text-slate-300'}`}>{u.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => openEditModal(u)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                      <Edit2 size={14} />
                    </button>
                    <button onClick={() => deleteUser(u.id)} className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-600">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <div className="mt-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <Mail size={12} />
                    <span className="truncate">{u.email}</span>
                  </div>
                  <button
                    onClick={() => toggleUserActive(u)}
                    className={`flex items-center gap-2 text-xs ${u.active ? 'text-emerald-600' : 'text-slate-400'} hover:opacity-80`}
                  >
                    {u.active ? <UserCheck size={12} /> : <UserX size={12} />}
                    <span>{u.active ? 'Accès actif' : 'Accès désactivé'}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-3">Matrice des habilitations</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="px-3 py-2 text-left font-semibold text-slate-600">Rôle</th>
                    <th className="px-3 py-2 text-center font-semibold text-slate-600">Lecture</th>
                    <th className="px-3 py-2 text-center font-semibold text-slate-600">Écriture</th>
                    <th className="px-3 py-2 text-center font-semibold text-slate-600">Validation</th>
                    <th className="px-3 py-2 text-center font-semibold text-slate-600">Admin</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { role: 'DGS', read: true, write: true, validate: true, admin: true },
                    { role: 'DST', read: true, write: true, validate: true, admin: true },
                    { role: "Chargé d'Affaires", read: true, write: true, validate: false, admin: false },
                    { role: 'Prestataire Extérieur', read: true, write: false, validate: false, admin: false },
                  ].map((r) => (
                    <tr key={r.role} className="border-b border-slate-50">
                      <td className="px-3 py-2 font-medium text-slate-800">{r.role}</td>
                      <td className="px-3 py-2 text-center">{r.read ? '✓' : '—'}</td>
                      <td className="px-3 py-2 text-center">{r.write ? '✓' : '—'}</td>
                      <td className="px-3 py-2 text-center">{r.validate ? '✓' : '—'}</td>
                      <td className="px-3 py-2 text-center">{r.admin ? '✓' : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'rules' && (
        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={16} className="text-amber-500" />
              <h3 className="text-sm font-bold text-slate-900">Règles d'alerte</h3>
            </div>
            <div className="space-y-3">
              {rules.map((rule) => (
                <div
                  key={rule.id}
                  className="flex items-start justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3"
                >
                  <div>
                    <p className="text-sm font-medium text-slate-900">{rule.label}</p>
                    <p className="text-xs text-slate-500">{rule.description}</p>
                    {rule.threshold > 0 && (
                      <p className="text-xs text-slate-400 mt-1">Seuil : {rule.threshold}%</p>
                    )}
                  </div>
                  <button onClick={() => toggleRule(rule.id)} className="shrink-0">
                    {rule.enabled ? (
                      <ToggleRight size={22} className="text-emerald-600" />
                    ) : (
                      <ToggleLeft size={22} className="text-slate-400" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Bell size={16} className="text-slate-500" />
              <h3 className="text-sm font-bold text-slate-900">Canaux de notification</h3>
            </div>
            <div className="space-y-3">
              {channels.map((ch) => (
                <div
                  key={ch.id}
                  className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3"
                >
                  <span className="text-sm font-medium text-slate-900">{ch.label}</span>
                  <button onClick={() => toggleChannel(ch.id)}>
                    {ch.enabled ? (
                      <ToggleRight size={22} className="text-emerald-600" />
                    ) : (
                      <ToggleLeft size={22} className="text-slate-400" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                {editingUser ? 'Modifier l\'utilisateur' : 'Nouvel utilisateur'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100"
              >
                <X size={16} />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nom complet</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  placeholder="Marie Lefranc"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                  placeholder="marie@syndicat.fr"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Rôle</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value as UserRole })}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="active"
                  checked={form.active}
                  onChange={(e) => setForm({ ...form, active: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <label htmlFor="active" className="text-sm text-slate-600">Accès actif</label>
              </div>
            </div>
            <div className="mt-5 flex gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={saveUser}
                className="flex-1 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
              >
                <Check size={14} className="inline mr-1" /> Enregistrer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
