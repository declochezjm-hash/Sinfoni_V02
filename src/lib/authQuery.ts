import { useAuth } from '../hooks/useAuth';

/**
 * Gate des requêtes Supabase.
 * - authInitialized : getSession() a terminé (succès ou échec)
 * - authReady : JWT présent → requêtes authentifiées autorisées
 */
export function useSupabaseQueryEnabled(): {
  authInitialized: boolean;
  authReady: boolean;
  organizationId: string;
  enabled: boolean;
} {
  const { authReady, authLoading, organizationId } = useAuth();
  const authInitialized = !authLoading;
  return {
    authInitialized,
    authReady,
    organizationId,
    enabled: authReady && !!organizationId,
  };
}

/**
 * Évite le spinner infini :
 * - pendant l'init Auth → loading
 * - query désactivée (pas de session) → pas de loading (l'UI gère login / erreur)
 * - query active → isLoading React Query
 */
export function queryLoadingWhileAuth(
  authInitialized: boolean,
  queryEnabled: boolean,
  queryIsLoading: boolean,
): boolean {
  if (!authInitialized) return true;
  if (!queryEnabled) return false;
  return queryIsLoading;
}
