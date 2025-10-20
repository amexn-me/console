import { ReactNode } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { UserRole, UserSegment } from '@/types';

interface CanProps {
  children: ReactNode;
  permission?: keyof ReturnType<typeof usePermissions>['can'];
  role?: UserRole | UserRole[];
  segment?: UserSegment | UserSegment[];
  requireSuperAdmin?: boolean;
  requireAdmin?: boolean;
  fallback?: ReactNode;
}

/**
 * Component for conditional rendering based on user permissions
 * 
 * @example
 * <Can permission="manageUsers">
 *   <Button>Manage Users</Button>
 * </Can>
 * 
 * @example
 * <Can role="super_admin">
 *   <AdminPanel />
 * </Can>
 * 
 * @example
 * <Can segment="sales">
 *   <SalesContent />
 * </Can>
 */
export function Can({
  children,
  permission,
  role,
  segment,
  requireSuperAdmin,
  requireAdmin,
  fallback = null,
}: CanProps) {
  const permissions = usePermissions();

  // Check super admin
  if (requireSuperAdmin && !permissions.isSuperAdmin) {
    return <>{fallback}</>;
  }

  // Check admin
  if (requireAdmin && !permissions.isAdmin) {
    return <>{fallback}</>;
  }

  // Check specific permission
  if (permission && !permissions.can[permission]) {
    return <>{fallback}</>;
  }

  // Check role
  if (role) {
    if (Array.isArray(role)) {
      if (!permissions.hasAnyRole(role)) {
        return <>{fallback}</>;
      }
    } else {
      if (!permissions.hasRole(role)) {
        return <>{fallback}</>;
      }
    }
  }

  // Check segment
  if (segment) {
    const segments = Array.isArray(segment) ? segment : [segment];
    if (!segments.includes(permissions.segment ?? null)) {
      return <>{fallback}</>;
    }
  }

  return <>{children}</>;
}

interface CannotProps {
  children: ReactNode;
  permission?: keyof ReturnType<typeof usePermissions>['can'];
  role?: UserRole | UserRole[];
  segment?: UserSegment | UserSegment[];
}

/**
 * Component for inverse conditional rendering - shows content when user does NOT have permission
 * 
 * @example
 * <Cannot permission="manageUsers">
 *   <p>You don't have permission to manage users</p>
 * </Cannot>
 */
export function Cannot({
  children,
  permission,
  role,
  segment,
}: CannotProps) {
  const permissions = usePermissions();

  // Check specific permission
  if (permission && permissions.can[permission]) {
    return null;
  }

  // Check role
  if (role) {
    if (Array.isArray(role)) {
      if (permissions.hasAnyRole(role)) {
        return null;
      }
    } else {
      if (permissions.hasRole(role)) {
        return null;
      }
    }
  }

  // Check segment
  if (segment) {
    const segments = Array.isArray(segment) ? segment : [segment];
    if (segments.includes(permissions.segment ?? null)) {
      return null;
    }
  }

  return <>{children}</>;
}

