import { useRole } from '../hooks/useRole';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';
import {
  ChevronDown,
  LogOut,
  RefreshCw,
  Shield,
  ShieldAlert,
  User,
} from 'lucide-react';
import { useState, useRef, useEffect } from 'react';

const ROLES: UserRole[] = ['DGS', 'DST', 'Chargé d\'Affaires', 'Prestataire Extérieur', 'COMMUNE'];

const ROLE_DESCRIPTIONS: Record<UserRole, string> = {
  'DGS': 'Directeur Général des Services',
  'DST': 'Directeur des Services Techniques',
  'Chargé d\'Affaires': 'Chef de projet / Chargé d\'affaires',
  'Prestataire Extérieur': 'Entreprise prestataire',
  'COMMUNE': 'Élu / Portail des communes',
};

const isDev = import.meta.env.DEV;

export default function RoleSwitcher() {
  const { user, switchRole, resetToAuthProfile } = useRole();
  const { isAuthenticated, clearSessionEmergency, authUser } = useAuth();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Si Auth pend, busy ne doit jamais rester bloqué
  useEffect(() => {
    if (!busy) return;
    const timer = window.setTimeout(() => setBusy(false), 3_000);
    return () => window.clearTimeout(timer);
  }, [busy]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const runBusy = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
    } finally {
      setBusy(false);
    }
  };

  const handleSwitchRole = (role: UserRole) => {
    void runBusy(async () => {
      await switchRole(role);
      setOpen(false);
    });
  };

  /** Toujours hard-reload : évite signOut qui pend et laisse le menu disabled. */
  const handleLogout = () => {
    setOpen(false);
    setBusy(true);
    void clearSessionEmergency();
  };

  const handleResetAuthProfile = () => {
    void runBusy(async () => {
      await resetToAuthProfile();
      setOpen(false);
    });
  };

  const handleEmergencyClear = () => {
    setOpen(false);
    setBusy(true);
    void clearSessionEmergency();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm shadow-sm hover:border-slate-300 transition-colors"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-800 text-xs font-semibold text-white">
          {user.avatar || <User size={14} />}
        </div>
        <div className="hidden sm:flex flex-col items-start">
          <span className="font-medium text-slate-900 leading-tight">{user.name}</span>
          <span className="text-[11px] text-slate-500 leading-tight">
            {user.role}
            {isAuthenticated ? '' : ' · démo'}
          </span>
        </div>
        <ChevronDown size={14} className="text-slate-400" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-[1200] mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
          <div className="mb-2 px-2 py-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
            Changer de profil
          </div>
          {ROLES.map((role) => {
            const active = user.role === role;
            return (
              <button
                key={role}
                type="button"
                disabled={busy}
                onClick={() => handleSwitchRole(role)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  active
                    ? 'bg-slate-800 text-white'
                    : 'hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    active ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  <Shield size={14} />
                </div>
                <div className="flex flex-col">
                  <span className="text-sm font-medium">{role}</span>
                  <span className={`text-xs ${active ? 'text-slate-300' : 'text-slate-500'}`}>
                    {ROLE_DESCRIPTIONS[role]}
                  </span>
                </div>
                {active && (
                  <span className="ml-auto text-xs font-medium">Actif</span>
                )}
              </button>
            );
          })}

          <div className="my-2 border-t border-slate-100" />

          {isAuthenticated && (
            <button
              type="button"
              disabled={busy}
              onClick={handleResetAuthProfile}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw size={14} />
              Recharger le profil Auth
              {authUser?.email ? (
                <span className="ml-auto truncate text-[10px] text-slate-400 max-w-[110px]">
                  {authUser.email}
                </span>
              ) : null}
            </button>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-700 hover:bg-red-50"
          >
            <LogOut size={14} />
            Déconnexion
          </button>

          {isDev && (
            <button
              type="button"
              onClick={handleEmergencyClear}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-amber-800 hover:bg-amber-50"
              title="Purge localStorage + sessionStorage + signOut"
            >
              <ShieldAlert size={14} />
              Clear Session &amp; Logout
            </button>
          )}
        </div>
      )}
    </div>
  );
}
