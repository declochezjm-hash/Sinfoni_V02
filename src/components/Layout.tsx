import { Outlet, useLocation, useNavigate, Navigate, Link } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import ApiErrorAlert from './ApiErrorAlert';
import { useRole } from '../hooks/useRole';
import { useAuth } from '../hooks/useAuth';

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isCommune } = useRole();
  const {
    profileError,
    profile,
    authReady,
    isAuthenticated,
    refreshProfile,
    clearSessionEmergency,
  } = useAuth();

  const activePath = location.pathname.startsWith('/affaires/')
    ? '/affaires'
    : location.pathname.startsWith('/commune/dossiers/')
      ? '/commune/dossiers'
      : location.pathname.split('?')[0];

  if (isCommune && location.pathname === '/') {
    return <Navigate to="/commune/carte" replace />;
  }

  if (isCommune && !location.pathname.startsWith('/commune') && location.pathname !== '/maintenance') {
    return <Navigate to="/commune/carte" replace />;
  }

  return (
    <div className="flex h-screen bg-slate-50">
      <Sidebar
        activePath={activePath}
        onNavigate={(path) => navigate(path)}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">
          <div className="mx-auto max-w-7xl">
            {!isAuthenticated && (
              <ApiErrorAlert
                title="Mode démo — pas de session Supabase"
                message="Connectez-vous pour voir Affaires, Utilisateurs et Interlocuteurs (RLS)."
                className="mb-4"
              />
            )}
            {!isAuthenticated && (
              <div className="mb-4">
                <Link
                  to="/login"
                  className="inline-flex rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
                >
                  Se connecter (Marie Lefranc)
                </Link>
              </div>
            )}
            {authReady && profileError && !profile && (
              <ApiErrorAlert
                title="Profil utilisateur introuvable ou inaccessible"
                message={profileError}
                onRetry={() => {
                  void refreshProfile();
                }}
                className="mb-4"
              />
            )}
            {authReady && profileError && !profile && (
              <button
                type="button"
                className="mb-4 text-xs font-medium text-sky-700 underline"
                onClick={() => void clearSessionEmergency()}
              >
                Forcer la reconnexion
              </button>
            )}
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
