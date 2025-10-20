import { Badge } from '@/components/ui/badge';
import { usePermissions } from '@/hooks/use-permissions';
import { getRoleLabel, getSegmentLabel } from '@/lib/roles';
import { UserRole } from '@/types';

interface RoleBadgeProps {
  role?: UserRole;
  showSegment?: boolean;
  className?: string;
}

/**
 * Badge component to display user role and segment
 * 
 * @example
 * <RoleBadge /> // Shows current user's role
 * <RoleBadge role="sales_admin" /> // Shows specific role
 * <RoleBadge showSegment /> // Shows role and segment
 */
export function RoleBadge({ role, showSegment = false, className }: RoleBadgeProps) {
  const permissions = usePermissions();
  const displayRole = role || permissions.role;

  if (!displayRole) return null;

  const roleLabel = getRoleLabel(displayRole);
  const segmentLabel = getSegmentLabel(permissions.segment);

  const getBadgeVariant = (role: UserRole) => {
    if (role === 'super_admin') return 'default';
    if (role.endsWith('_admin')) return 'secondary';
    return 'outline';
  };

  return (
    <div className={className}>
      <Badge variant={getBadgeVariant(displayRole)}>
        {roleLabel}
      </Badge>
      {showSegment && permissions.segment && (
        <Badge variant="outline" className="ml-2">
          {segmentLabel}
        </Badge>
      )}
    </div>
  );
}

