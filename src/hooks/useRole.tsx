import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import type { UserProfile, UserRole } from '../types';
import { MOCK_USERS } from '../data/mockData';
import { useAuth } from './useAuth';
import { getDefaultOrganizationId } from '../lib/organization';
import { queryClient } from '../lib/queryClient';

interface RoleContextValue {
  user: UserProfile;
  organizationId: string;
  communeInseeCode: string | undefined;
  switchRole: (role: UserRole) => Promise<void>;
  resetToAuthProfile: () => Promise<void>;
  canAccess: (allowedRoles: UserRole[]) => boolean;
  isRole: (role: UserRole) => boolean;
  isCommune: boolean;
}

const RoleContext = createContext<RoleContextValue | null>(null);

function withOrganizationId(user: UserProfile, organizationId: string): UserProfile {
  return { ...user, organizationId };
}

export function RoleProvider({ children }: { children: ReactNode }) {
  const {
    organizationId: authOrganizationId,
    toUserProfile,
    isAuthenticated,
    loading: authLoading,
    refreshSession,
    refreshProfile,
  } = useAuth();
  const [user, setUser] = useState<UserProfile>(() =>
    withOrganizationId(MOCK_USERS[0], getDefaultOrganizationId()),
  );
  const [roleOverridden, setRoleOverridden] = useState(false);

  useEffect(() => {
    if (authLoading || roleOverridden) return;

    const profile = toUserProfile();
    if (isAuthenticated && profile) {
      setUser(profile);
      return;
    }

    setUser((prev) => {
      const mockUser = MOCK_USERS.find((u) => u.role === prev.role) ?? MOCK_USERS[0];
      return withOrganizationId(mockUser, authOrganizationId);
    });
  }, [authLoading, isAuthenticated, toUserProfile, authOrganizationId, roleOverridden]);

  const switchRole = useCallback(
    async (role: UserRole) => {
      const found = MOCK_USERS.find((u) => u.role === role);
      if (!found) return;

      // Rafraîchir le JWT / profil Auth pour réaligner organization_id côté RLS
      try {
        if (isAuthenticated) {
          await refreshSession();
        } else {
          await refreshProfile();
        }
      } catch (err) {
        console.warn('Refresh session lors du changement de rôle :', err);
        await refreshProfile().catch(() => undefined);
      }

      setUser(withOrganizationId(found, authOrganizationId));
      setRoleOverridden(true);
      await queryClient.invalidateQueries();
    },
    [authOrganizationId, isAuthenticated, refreshSession, refreshProfile],
  );

  const resetToAuthProfile = useCallback(async () => {
    setRoleOverridden(false);
    try {
      if (isAuthenticated) {
        await refreshSession();
      } else {
        await refreshProfile();
      }
    } catch {
      await refreshProfile().catch(() => undefined);
    }
    const profile = toUserProfile();
    if (profile) {
      setUser(profile);
    }
    await queryClient.invalidateQueries();
  }, [isAuthenticated, refreshSession, refreshProfile, toUserProfile]);

  const canAccess = useCallback(
    (allowedRoles: UserRole[]) => allowedRoles.includes(user.role),
    [user.role],
  );

  const isRole = useCallback(
    (role: UserRole) => user.role === role,
    [user.role],
  );

  const isCommune = user.role === 'COMMUNE';
  const communeInseeCode = user.communeInseeCode;

  return (
    <RoleContext.Provider
      value={{
        user,
        organizationId: authOrganizationId,
        communeInseeCode,
        switchRole,
        resetToAuthProfile,
        canAccess,
        isRole,
        isCommune,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error('useRole must be used within a RoleProvider');
  return ctx;
}
