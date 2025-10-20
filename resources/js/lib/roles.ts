import { UserRole, UserSegment } from '@/types';

// Role constants (matching backend)
export const ROLES = {
  SUPER_ADMIN: 'super_admin' as const,
  SALES_ADMIN: 'sales_admin' as const,
  DEV_ADMIN: 'dev_admin' as const,
  PROJECT_ADMIN: 'project_admin' as const,
  SALES_USER: 'sales_user' as const,
  DEV_USER: 'dev_user' as const,
  PROJECT_USER: 'project_user' as const,
};

// Role groups
export const ADMIN_ROLES: UserRole[] = [
  ROLES.SUPER_ADMIN,
  ROLES.SALES_ADMIN,
  ROLES.DEV_ADMIN,
  ROLES.PROJECT_ADMIN,
];

export const USER_ROLES: UserRole[] = [
  ROLES.SALES_USER,
  ROLES.DEV_USER,
  ROLES.PROJECT_USER,
];

export const SALES_ROLES: UserRole[] = [
  ROLES.SALES_ADMIN,
  ROLES.SALES_USER,
];

export const DEV_ROLES: UserRole[] = [
  ROLES.DEV_ADMIN,
  ROLES.DEV_USER,
];

export const PROJECT_ROLES: UserRole[] = [
  ROLES.PROJECT_ADMIN,
  ROLES.PROJECT_USER,
];

// Role display names
export const ROLE_LABELS: Record<UserRole, string> = {
  super_admin: 'Super Admin',
  sales_admin: 'Sales Admin',
  dev_admin: 'Development Admin',
  project_admin: 'Project Admin',
  sales_user: 'Sales User',
  dev_user: 'Development User',
  project_user: 'Project User',
};

// Segment labels
export const SEGMENT_LABELS: Record<Exclude<UserSegment, null>, string> = {
  super_admin: 'Super Admin',
  sales: 'Sales',
  dev: 'Development',
  project: 'Project',
};

// Helper functions
export function getRoleLabel(role: UserRole): string {
  return ROLE_LABELS[role] || role;
}

export function getSegmentLabel(segment: UserSegment): string {
  if (!segment) return 'Unknown';
  return SEGMENT_LABELS[segment] || segment;
}

export function isAdminRole(role: UserRole): boolean {
  return ADMIN_ROLES.includes(role);
}

export function isUserRole(role: UserRole): boolean {
  return USER_ROLES.includes(role);
}

export function getRolesBySegment(segment: UserSegment): UserRole[] {
  switch (segment) {
    case 'sales':
      return SALES_ROLES;
    case 'dev':
      return DEV_ROLES;
    case 'project':
      return PROJECT_ROLES;
    case 'super_admin':
      return [ROLES.SUPER_ADMIN];
    default:
      return [];
  }
}

