import { NavFooter } from '@/components/nav-footer';
import { NavMain } from '@/components/nav-main';
import { NavUser } from '@/components/nav-user';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type NavGroup } from '@/types';
import { Link } from '@inertiajs/react';
import { BookOpen, Building2, CalendarDays, Clipboard, FileText, Folder, Gauge, Handshake, LayoutGrid, Megaphone, Puzzle, Target, UserCircle, Users, FolderKanban, FileSignature } from 'lucide-react';
import AppLogo from './app-logo';
import { usePermissions } from '@/hooks/use-permissions';
import { useMemo } from 'react';

const allNavGroups: (NavGroup & { requiredPermission?: string })[] = [
    // Super Admin only - Cockpit (no category)
    // {
    //     items: [
    //         {
    //             title: 'Cockpit',
    //             href: '/cockpit',
    //             icon: Gauge,
    //         },
    //     ],
    //     requiredPermission: 'isSuperAdmin',
    // },
    // For all users - no category label
    {
        items: [
            {
                title: 'Dashboard',
                href: '/dashboard',
                icon: LayoutGrid,
            },
            {
                title: 'Tasks',
                href: '/tasks',
                icon: Clipboard,
            },
        ],
    },
    // Sales category
    {
        title: 'Sales',
        items: [
            {
                title: 'Campaigns',
                href: '/sales/campaigns',
                icon: Megaphone,
                requiredPermission: 'isAdmin',
            },
            {
                title: 'Leads',
                href: '/sales/leads',
                icon: Target,
            },
            {
                title: 'Meetings',
                href: '/sales/meetings',
                icon: CalendarDays,
            },
            {
                title: 'Companies',
                href: '/sales/companies',
                icon: Building2,
            },
            {
                title: 'Contacts',
                href: '/sales/contacts',
                icon: Users,
            },
            {
                title: 'Partners',
                href: '/sales/partners',
                icon: Handshake,
                requiredPermission: 'isAdmin',
            },
            {
                title: 'Activity Logs',
                href: '/sales/activity-logs',
                icon: FileText,
                requiredPermission: 'viewActivityLogs',
            },
        ],
    },
    // Projects category - Only visible to project segment (project_user, project_admin) + super_admin
    // HIDDEN: Projects section
    // {
    //     title: 'Projects',
    //     items: [
    //         {
    //             title: 'Projects',
    //             href: '/projects/projects',
    //             icon: FolderKanban,
    //         },
    //     ],
    //     requiredPermission: 'isProjectSegment',
    // },
    // Finance category - Only visible to finance segment (finance_user, finance_admin) + super_admin
    // HIDDEN: Finance section
    // {
    //     title: 'Finance',
    //     items: [
    //         {
    //             title: 'Contracts',
    //             href: '/finance/contracts',
    //             icon: FileSignature,
    //         },
    //     ],
    //     requiredPermission: 'isFinanceSegment',
    // },
    // Settings category (Super Admin only)
    {
        title: 'Settings',
        items: [
            {
                title: 'Users',
                href: '/users',
                icon: UserCircle,
            },
            {
                title: 'Integrations',
                href: '/integrations/calendar',
                icon: Puzzle,
            },
        ],
        requiredPermission: 'isSuperAdmin',
    },
];

const footerNavItems: NavItem[] = [
    {
        title: 'Documentation',
        href: '/',
        icon: BookOpen,
    },
];

export function AppSidebar() {
    const permissions = usePermissions();

    // Filter nav groups based on user permissions
    const filteredNavGroups = useMemo(() => {
        return allNavGroups
            .filter((group) => {
                // Check if group has permission requirement
                if (group.requiredPermission) {
                    // Handle isSuperAdmin permission check
                    if (group.requiredPermission === 'isSuperAdmin') {
                        return permissions.isSuperAdmin;
                    }
                    // Handle segment permission checks
                    if (group.requiredPermission === 'isProjectSegment') {
                        return permissions.isSuperAdmin || permissions.segment === 'project';
                    }
                    if (group.requiredPermission === 'isFinanceSegment') {
                        return permissions.isSuperAdmin || permissions.segment === 'finance';
                    }
                    
                    const permKey = group.requiredPermission as keyof typeof permissions.can;
                    if (!permissions.can[permKey]) {
                        return false;
                    }
                }

                return true;
            })
            .map((group) => {
                // Filter items within each group based on permissions
                const filteredItems = group.items.filter((item) => {
                    if (!item.requiredPermission) {
                        return true;
                    }

                    // Handle special permission checks
                    if (item.requiredPermission === 'isSuperAdmin') {
                        return permissions.isSuperAdmin;
                    }
                    if (item.requiredPermission === 'isAdmin') {
                        return permissions.isAdmin;
                    }
                    if (item.requiredPermission === 'isProjectSegment') {
                        return permissions.isSuperAdmin || permissions.segment === 'project';
                    }
                    if (item.requiredPermission === 'isFinanceSegment') {
                        return permissions.isSuperAdmin || permissions.segment === 'finance';
                    }

                    // Handle can.* permission checks
                    const permKey = item.requiredPermission as keyof typeof permissions.can;
                    return permissions.can[permKey] || false;
                });

                return {
                    ...group,
                    items: filteredItems,
                };
            })
            .filter((group) => group.items.length > 0); // Remove groups with no items
    }, [permissions]);

    return (
        <Sidebar collapsible="icon" variant="inset">
            <SidebarHeader>
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton size="lg" asChild>
                            <Link href="/dashboard">
                                <AppLogo />
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>
            </SidebarHeader>

            <SidebarContent>
                <NavMain groups={filteredNavGroups} />
            </SidebarContent>

            <SidebarFooter>
                <NavFooter items={footerNavItems} className="mt-auto" />
                <NavUser />
            </SidebarFooter>
        </Sidebar>
    );
}
