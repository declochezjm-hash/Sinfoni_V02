import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import {
  clearClientSessionStorage,
  clearSessionAndReload,
  refreshAuthSession,
  registerEmergencyLogoutGlobal,
  signOutAndClearSession,
} from '../lib/authSession';
import {
  loadUserProfileByEmail,
  resolveOrganizationId,
  type DbUser,
} from '../lib/authService';
import { formatApiError } from '../lib/formatApiError';
import type { UserProfile, UserRole } from '../types';

interface AuthContextValue {
  session: Session | null;
  authUser: User | null;
  profile: DbUser | null;
  organizationId: string;
  profileError: string | null;
  loading: boolean;
  authLoading: boolean;
  authReady: boolean;
  isAuthenticated: boolean;
  refreshProfile: () => Promise<void>;
  refreshSession: () => Promise<Session | null>;
  signOut: () => Promise<void>;
  clearSessionEmergency: () => Promise<void>;
  toUserProfile: () => UserProfile | null;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function mapDbUserToProfile(profile: DbUser, authUser?: User | null): UserProfile {
  return {
    id: profile.id,
    name: profile.name,
    email: profile.email,
    role: profile.role as UserRole,
    avatar: profile.avatar,
    organizationId: resolveOrganizationId(profile, authUser),
    communeInseeCode: profile.commune_insee_code ?? undefined,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<DbUser | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  // false dès le départ : ne jamais bloquer toute l'UI derrière Auth
  const [loading, setLoading] = useState(false);
  const sessionRef = useRef<Session | null>(null);

  const loadProfileForSession = useCallback(async (currentSession: Session | null) => {
    if (!currentSession?.user?.email) {
      setProfile(null);
      setProfileError(null);
      return;
    }

    try {
      const { profile: data, error } = await loadUserProfileByEmail(currentSession.user.email);
      setProfile(data);
      setProfileError(data ? null : error);

      if (import.meta.env.DEV) {
        console.log('[useAuth] session / profil', {
          email: currentSession.user.email,
          authUserId: currentSession.user.id,
          profileId: data?.id ?? null,
          organizationId: resolveOrganizationId(data, currentSession.user),
          profileError: data ? null : error,
          hasSession: !!currentSession.access_token,
        });
      }
    } catch (err) {
      console.error('[useAuth] loadProfile failed:', err);
      setProfile(null);
      setProfileError(err instanceof Error ? err.message : formatApiError(err));
    }
  }, []);

  const loadProfileRef = useRef(loadProfileForSession);
  loadProfileRef.current = loadProfileForSession;

  const refreshProfile = useCallback(async () => {
    const current = sessionRef.current;
    if (!current) return;
    await loadProfileForSession(current);
  }, [loadProfileForSession]);

  const refreshSession = useCallback(async () => {
    const next = await refreshAuthSession();
    sessionRef.current = next;
    setSession(next);
    await loadProfileForSession(next);
    return next;
  }, [loadProfileForSession]);

  const signOut = useCallback(async () => {
    await signOutAndClearSession();
    sessionRef.current = null;
    setSession(null);
    setProfile(null);
    setProfileError(null);
  }, []);

  const clearSessionEmergency = useCallback(async () => {
    await clearSessionAndReload('/login');
  }, []);

  useEffect(() => {
    registerEmergencyLogoutGlobal();
  }, []);

  useEffect(() => {
    let mounted = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, newSession) => {
      if (!mounted) return;

      sessionRef.current = newSession;
      setSession(newSession);
      setProfileError(null);
      setLoading(false);

      if (import.meta.env.DEV) {
        console.log('[useAuth] auth event', event, { hasSession: !!newSession?.access_token });
      }

      // Différé : évite le deadlock Auth ↔ PostgREST
      window.setTimeout(() => {
        if (!mounted) return;
        void loadProfileRef.current(newSession);
      }, 0);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const organizationId = useMemo(
    () => resolveOrganizationId(profile, session?.user ?? null),
    [profile, session?.user],
  );

  // Requêtes API dès qu'on a un JWT (loading n'est plus un gate)
  const authReady = !!session?.access_token;

  const toUserProfile = useCallback((): UserProfile | null => {
    if (!profile) return null;
    return mapDbUserToProfile(profile, session?.user ?? null);
  }, [profile, session?.user]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      authUser: session?.user ?? null,
      profile,
      organizationId,
      profileError,
      loading,
      authLoading: loading,
      authReady,
      isAuthenticated: !!session,
      refreshProfile,
      refreshSession,
      signOut,
      clearSessionEmergency,
      toUserProfile,
    }),
    [
      session,
      profile,
      organizationId,
      profileError,
      loading,
      authReady,
      refreshProfile,
      refreshSession,
      signOut,
      clearSessionEmergency,
      toUserProfile,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}

export { clearClientSessionStorage };
