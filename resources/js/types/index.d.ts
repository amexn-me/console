import { LucideIcon } from 'lucide-react';
import type { Config } from 'ziggy-js';

export type UserRole = 
    | 'super_admin'
    | 'sales_admin'
    | 'dev_admin'
    | 'project_admin'
    | 'sales_user'
    | 'dev_user'
    | 'project_user';

export type UserSegment = 'super_admin' | 'sales' | 'dev' | 'project' | null;

export interface UserPermissions {
    isSuperAdmin: boolean;
    isAdmin: boolean;
    isSegmentAdmin: boolean;
    isUser: boolean;
    segment: UserSegment;
    isSalesSegment: boolean;
    isDevSegment: boolean;
    isProjectSegment: boolean;
    can: {
        manageUsers: boolean;
        managePartners: boolean;
        manageCompanies: boolean;
        manageContacts: boolean;
        manageLeads: boolean;
        viewActivityLogs: boolean;
        exportData: boolean;
        manageProjects: boolean;
        viewProjects: boolean;
        manageDevelopment: boolean;
        viewDevelopment: boolean;
        manageCalendar: boolean;
        viewCalendar: boolean;
    };
}

export interface User {
    id: number;
    name: string;
    email: string;
    role: UserRole;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
    permissions?: UserPermissions;
    [key: string]: unknown; // This allows for additional properties...
}

export interface Auth {
    user: User | null;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavGroup {
    title?: string; // Optional title for category label
    items: NavItem[];
}

export interface NavItem {
    title: string;
    href: string;
    icon?: LucideIcon | null;
    isActive?: boolean;
    requiredPermission?: string; // Permission required to see this item
}

export interface SharedData {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    ziggy: Config & { location: string };
    sidebarOpen: boolean;
    [key: string]: unknown;
}


export interface Task {
  id: number;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed' | 'closed';
  assignee_id: string | null; // Assuming assignee_id can be a string or null
  assignee?: {
    id: number;
    name: string;
  };
  is_completed: boolean;
  created_at: string;
  updated_at: string;
}
