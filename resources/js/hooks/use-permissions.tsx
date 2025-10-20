import { usePage } from '@inertiajs/react';
import { SharedData, UserRole, UserSegment } from '@/types';

export function usePermissions() {
  const { auth } = usePage<SharedData>().props;
  const user = auth.user;
  const permissions = user?.permissions;

  return {
    // User info
    user,
    role: user?.role,
    segment: permissions?.segment,

    // Role checks
    isSuperAdmin: permissions?.isSuperAdmin ?? false,
    isAdmin: permissions?.isAdmin ?? false,
    isSegmentAdmin: permissions?.isSegmentAdmin ?? false,
    isUser: permissions?.isUser ?? false,

    // Segment checks
    isSalesSegment: permissions?.isSalesSegment ?? false,
    isDevSegment: permissions?.isDevSegment ?? false,
    isProjectSegment: permissions?.isProjectSegment ?? false,

    // Permission checks
    can: permissions?.can ?? {},

    // Helper methods
    hasRole: (role: UserRole | UserRole[]) => {
      if (!user?.role) return false;
      if (Array.isArray(role)) {
        return role.includes(user.role);
      }
      return user.role === role;
    },

    hasAnyRole: (roles: UserRole[]) => {
      if (!user?.role) return false;
      return roles.includes(user.role);
    },

    belongsToSegment: (segment: UserSegment) => {
      return permissions?.segment === segment;
    },

    canAccess: (permission: keyof typeof permissions.can) => {
      return permissions?.can?.[permission] ?? false;
    },
  };
}

export function useAuth() {
  const { auth } = usePage<SharedData>().props;
  return {
    user: auth.user,
    isAuthenticated: !!auth.user,
  };
}

