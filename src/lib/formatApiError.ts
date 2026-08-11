import { getSupabaseHttpStatus } from './supabaseDiagnostics';

export function formatApiError(err: unknown): string {
  const message = getErrorMessage(err);
  const status = getSupabaseHttpStatus(err);

  if (status === 401) {
    return 'Non autorisé (401) : session expirée ou JWT invalide. Reconnectez-vous.';
  }

  if (status === 403) {
    return 'Accès interdit (403) : droits insuffisants ou politique RLS. Vérifiez le profil app.users et organization_id.';
  }

  if (/fetch|network|connexion|failed to fetch|load failed/i.test(message)) {
    return 'Impossible de joindre Supabase. Vérifiez que Supabase local tourne (port 54321) et que le serveur Vite est démarré (npm run dev).';
  }

  if (/database error querying schema/i.test(message)) {
    return 'Erreur Auth Supabase (auth.users). Exécutez supabase/seed/fix_auth_database_error_querying_schema.sql puis reconnectez-vous.';
  }

  if (/schema must be one of|PGRST106/i.test(message)) {
    return 'Schéma API incorrect : le client doit utiliser les vues public.* (pas app.*).';
  }

  return message;
}

/** Extrait un message lisible depuis Error, PostgREST, Auth, string, etc. */
export function getErrorMessage(err: unknown): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === 'string' && err.trim()) return err;

  if (err && typeof err === 'object') {
    const obj = err as Record<string, unknown>;
    if (typeof obj.message === 'string' && obj.message.trim()) return obj.message;
    if (typeof obj.error_description === 'string' && obj.error_description.trim()) {
      return obj.error_description;
    }
    if (typeof obj.details === 'string' && obj.details.trim()) return obj.details;
    if (typeof obj.hint === 'string' && obj.hint.trim()) return obj.hint;
    try {
      return JSON.stringify(err);
    } catch {
      /* ignore */
    }
  }

  return 'Une erreur est survenue.';
}
