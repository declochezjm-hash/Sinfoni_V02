import { supabase } from './supabase';
import { queryClient } from './queryClient';

const SUPABASE_STORAGE_KEY_PREFIX = 'sb-';

/** Purge localStorage / sessionStorage liés à Supabase et au cache app. */
export function clearClientSessionStorage(): void {
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (
        key.startsWith(SUPABASE_STORAGE_KEY_PREFIX) ||
        key.includes('supabase') ||
        key.startsWith('sinfoni-')
      ) {
        keysToRemove.push(key);
      }
    }
    for (const key of keysToRemove) {
      localStorage.removeItem(key);
    }
  } catch {
    // ignore (mode privé / accès refusé)
  }

  try {
    sessionStorage.clear();
  } catch {
    // ignore
  }

  queryClient.clear();
}

const AUTH_OP_TIMEOUT_MS = 2_000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      reject(new Error(`Timeout : ${label} (${ms} ms)`));
    }, ms);
    promise.then(
      (value) => {
        window.clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        window.clearTimeout(timer);
        reject(err);
      },
    );
  });
}

/** Déconnexion Supabase + purge cache client (ne bloque jamais plus de 2 s). */
export async function signOutAndClearSession(): Promise<void> {
  try {
    await withTimeout(
      supabase.auth.signOut({ scope: 'local' }),
      AUTH_OP_TIMEOUT_MS,
      'signOut',
    );
  } catch (err) {
    console.error('signOut échoué ou timeout — purge locale forcée', err);
  } finally {
    clearClientSessionStorage();
  }
}

/**
 * Déconnexion fiable : purge + signOut (timeout) + rechargement hard.
 * Évite le bouton « Déconnexion » coincé en disabled si Auth ne répond pas.
 */
export async function clearSessionAndReload(redirectTo = '/login'): Promise<void> {
  try {
    await signOutAndClearSession();
  } finally {
    window.location.assign(redirectTo);
  }
}

/** Rafraîchit le JWT et renvoie la nouvelle session (claims / org). */
export async function refreshAuthSession() {
  const { data, error } = await withTimeout(
    supabase.auth.refreshSession(),
    AUTH_OP_TIMEOUT_MS,
    'refreshSession',
  );
  if (error) throw error;
  await queryClient.invalidateQueries();
  return data.session;
}

declare global {
  interface Window {
    __sinfoniClearSession?: () => Promise<void>;
  }
}

/** Expose un fallback console : `await __sinfoniClearSession()` */
export function registerEmergencyLogoutGlobal(): void {
  window.__sinfoniClearSession = () => clearSessionAndReload('/login');
}
