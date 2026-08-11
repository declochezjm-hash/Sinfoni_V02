import type { User } from '@supabase/supabase-js';
import { supabase } from './supabase';
import type { Database } from '../types/database';
import { getDefaultOrganizationId } from './organization';
import { formatApiError } from './formatApiError';
import { logSupabaseError } from './supabaseDiagnostics';

export type DbUser = Database['public']['Views']['users']['Row'];

export interface ProfileLoadResult {
  profile: DbUser | null;
  error: string | null;
  httpStatus: number | null;
}

export async function loadUserProfileByEmail(email: string): Promise<ProfileLoadResult> {
  try {
    const result = await Promise.race([
      supabase.from('users').select('*').eq('email', email).maybeSingle(),
      new Promise<never>((_, reject) => {
        window.setTimeout(
          () => reject(new Error('Timeout : chargement du profil utilisateur (8s).')),
          8_000,
        );
      }),
    ]);

    const { data, error, status } = result;

    if (error) {
      logSupabaseError('users.select (profil Auth)', error, status);
      return {
        profile: null,
        error: formatApiError({ ...error, status: status ?? error }),
        httpStatus: status ?? null,
      };
    }

    if (!data) {
      const msg = `Profil app.users introuvable pour ${email}.`;
      console.warn('[authService]', msg);
      return { profile: null, error: msg, httpStatus: status ?? null };
    }

    return { profile: data, error: null, httpStatus: status ?? null };
  } catch (err) {
    const message = err instanceof Error ? err.message : formatApiError(err);
    console.error('[authService] loadUserProfileByEmail:', message);
    return { profile: null, error: message, httpStatus: null };
  }
}

/** Org depuis profil app.users, sinon claims JWT, sinon défaut démo. */
export function resolveOrganizationId(
  profile: DbUser | null,
  authUser?: User | null,
): string {
  if (profile?.organization_id) return profile.organization_id;

  const meta = authUser?.user_metadata as Record<string, unknown> | undefined;
  const appMeta = authUser?.app_metadata as Record<string, unknown> | undefined;
  const fromUserMeta = meta?.organization_id;
  const fromAppMeta = appMeta?.organization_id;

  if (typeof fromUserMeta === 'string' && fromUserMeta) return fromUserMeta;
  if (typeof fromAppMeta === 'string' && fromAppMeta) return fromAppMeta;

  return getDefaultOrganizationId();
}
