import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem, User as UserType, UserRole } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState } from 'react';
import { 
    UserPlus, 
    MoreHorizontal, 
    Edit, 
    Ban, 
    CheckCircle, 
    Key,
    Mail,
    Users as UsersIcon,
    Shield,
    UserCheck,
    UserX,
} from 'lucide-react';
import { getRoleLabel } from '@/lib/roles';

const breadcrumbs: BreadcrumbItem[] = [
    { title: 'Dashboard', href: '/dashboard' },
    { title: 'Users', href: '/users' },
];

interface ExtendedUser extends UserType {
    is_active: boolean;
    last_login_at: string | null;
    disabled_reason: string | null;
    disabled_at: string | null;
    disabled_by_user?: {
        id: number;
        name: string;
        email: string;
    } | null;
}

interface PageProps {
    users: {
        data: ExtendedUser[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        links: Array<{
            url: string | null;
            label: string;
            active: boolean;
        }>;
    };
    stats: {
        total: number;
        active: number;
        inactive: number;
        super_admins: number;
        admins: number;
        users: number;
    };
    availableRoles: string[];
    roleLabels: Record<string, string>;
}

export default function UsersIndex() {
    const { users, stats, availableRoles, roleLabels } = usePage<PageProps>().props;

    // Modals state
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [disableDialogOpen, setDisableDialogOpen] = useState(false);
    const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
    const [selectedUser, setSelectedUser] = useState<ExtendedUser | null>(null);

    // Forms
    const createForm = useForm({
        name: '',
        email: '',
        password: '',
        role: 'sales_user' as UserRole,
        is_active: true,
    });

    const editForm = useForm({
        name: '',
        email: '',
        role: '' as UserRole,
        password: '',
    });

    const disableForm = useForm({
        reason: '',
    });

    const resetPasswordForm = useForm({
        password: '',
        password_confirmation: '',
    });

    const handleCreate = () => {
        createForm.post('/users', {
            preserveState: false,
            preserveScroll: false,
            replace: true,
            onSuccess: () => {
                setCreateDialogOpen(false);
                createForm.reset();
            },
        });
    };

    const handleEdit = (user: ExtendedUser) => {
        setSelectedUser(user);
        editForm.setData({
            name: user.name,
            email: user.email,
            role: user.role,
            password: '',
        });
        setEditDialogOpen(true);
    };

    const handleUpdate = () => {
        if (!selectedUser) return;
        editForm.put(`/users/${selectedUser.id}`, {
            preserveState: false,
            preserveScroll: false,
            replace: true,
            onSuccess: () => {
                setEditDialogOpen(false);
                editForm.reset();
                setSelectedUser(null);
            },
        });
    };

    const handleToggleStatus = (user: ExtendedUser) => {
        if (user.is_active) {
            setSelectedUser(user);
            setDisableDialogOpen(true);
        } else {
            router.post(`/users/${user.id}/toggle-status`, {}, {
                preserveState: false,
                preserveScroll: false,
                replace: true,
            });
        }
    };

    const confirmDisable = () => {
        if (!selectedUser) return;
        disableForm.post(`/users/${selectedUser.id}/toggle-status`, {
            preserveState: false,
            preserveScroll: false,
            replace: true,
            onSuccess: () => {
                setDisableDialogOpen(false);
                disableForm.reset();
                setSelectedUser(null);
            },
        });
    };

    const handleResetPassword = (user: ExtendedUser) => {
        setSelectedUser(user);
        setResetPasswordDialogOpen(true);
    };

    const confirmResetPassword = () => {
        if (!selectedUser) return;
        resetPasswordForm.post(`/users/${selectedUser.id}/reset-password`, {
            preserveState: false,
            preserveScroll: false,
            replace: true,
            onSuccess: () => {
                setResetPasswordDialogOpen(false);
                resetPasswordForm.reset();
                setSelectedUser(null);
            },
        });
    };

    const handleVerifyEmail = (user: ExtendedUser) => {
        router.post(`/users/${user.id}/verify-email`, {}, {
            preserveState: false,
            preserveScroll: false,
            replace: true,
        });
    };

    const getStatusBadge = (user: ExtendedUser) => {
        if (user.is_active) {
            return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Active</Badge>;
        }
        return <Badge variant="destructive"><Ban className="w-3 h-3 mr-1" />Disabled</Badge>;
    };

    const getRoleBadge = (role: string) => {
        const variant = role === 'super_admin' ? 'default' : role.endsWith('_admin') ? 'secondary' : 'outline';
        return <Badge variant={variant as any}>{roleLabels[role]}</Badge>;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="User Management" />
            
            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">User Management</h1>
                        <p className="text-muted-foreground">Manage system users, roles, and permissions</p>
                    </div>
                    <Button onClick={() => setCreateDialogOpen(true)}>
                        <UserPlus className="w-4 h-4 mr-2" />
                        Add User
                    </Button>
                </div>

                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                            <UsersIcon className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.total}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
                            <UserCheck className="h-4 w-4 text-green-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.active}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Inactive Users</CardTitle>
                            <UserX className="h-4 w-4 text-red-600" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.inactive}</div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Administrators</CardTitle>
                            <Shield className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.admins}</div>
                        </CardContent>
                    </Card>
                </div>

                <div className="text-sm text-muted-foreground">
                    Showing {users.data.length} of {users.total} users
                </div>

                {/* Users Table */}
                <div className="overflow-x-auto rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>User</TableHead>
                                <TableHead>Role</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Email Verified</TableHead>
                                <TableHead>Last Login</TableHead>
                                <TableHead>Joined</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users.data.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                        No users found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                users.data.map((user) => (
                                    <TableRow key={user.id} className={!user.is_active ? 'opacity-60' : ''}>
                                        <TableCell>
                                            <div>
                                                <div className="font-medium">{user.name}</div>
                                                <div className="text-sm text-muted-foreground">{user.email}</div>
                                                {user.disabled_reason && (
                                                    <div className="text-xs text-red-600 mt-1">
                                                        Reason: {user.disabled_reason}
                                                    </div>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                                        <TableCell>{getStatusBadge(user)}</TableCell>
                                        <TableCell>
                                            {user.email_verified_at ? (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                                    Verified
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                                                    Not Verified
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {user.last_login_at ? (
                                                <span className="text-sm">
                                                    {new Date(user.last_login_at).toLocaleString()}
                                                </span>
                                            ) : (
                                                <span className="text-sm text-muted-foreground">Never</span>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="sm">
                                                        <MoreHorizontal className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                    {user.role === 'super_admin' ? (
                                                        // Super admins only get password reset
                                                        <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                                                            <Key className="w-4 h-4 mr-2" />
                                                            Reset Password
                                                        </DropdownMenuItem>
                                                    ) : (
                                                        // All other users get full menu
                                                        <>
                                                            <DropdownMenuItem onClick={() => handleEdit(user)}>
                                                                <Edit className="w-4 h-4 mr-2" />
                                                                Edit User
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleResetPassword(user)}>
                                                                <Key className="w-4 h-4 mr-2" />
                                                                Reset Password
                                                            </DropdownMenuItem>
                                                            {!user.email_verified_at && (
                                                                <DropdownMenuItem onClick={() => handleVerifyEmail(user)}>
                                                                    <Mail className="w-4 h-4 mr-2" />
                                                                    Verify Email
                                                                </DropdownMenuItem>
                                                            )}
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onClick={() => handleToggleStatus(user)}>
                                                                {user.is_active ? (
                                                                    <>
                                                                        <Ban className="w-4 h-4 mr-2" />
                                                                        Disable User
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <CheckCircle className="w-4 h-4 mr-2" />
                                                                        Enable User
                                                                    </>
                                                                )}
                                                            </DropdownMenuItem>
                                                        </>
                                                    )}
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                {users.last_page > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-4">
                        {users.links.map((link, index) => (
                            <Button
                                key={index}
                                variant={link.active ? 'default' : 'outline'}
                                size="sm"
                                disabled={!link.url}
                                onClick={() => {
                                    if (link.url) {
                                        router.get(link.url, {}, { preserveState: true, preserveScroll: true });
                                    }
                                }}
                                dangerouslySetInnerHTML={{ __html: link.label }}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Create User Dialog */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Create New User</DialogTitle>
                        <DialogDescription>
                            Add a new user to the system with assigned role and permissions.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Name</Label>
                            <Input
                                id="name"
                                value={createForm.data.name}
                                onChange={(e) => createForm.setData('name', e.target.value)}
                                placeholder="John Doe"
                            />
                            {createForm.errors.name && (
                                <p className="text-sm text-red-600">{createForm.errors.name}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={createForm.data.email}
                                onChange={(e) => createForm.setData('email', e.target.value)}
                                placeholder="john@example.com"
                            />
                            {createForm.errors.email && (
                                <p className="text-sm text-red-600">{createForm.errors.email}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                value={createForm.data.password}
                                onChange={(e) => createForm.setData('password', e.target.value)}
                                placeholder="••••••••"
                            />
                            {createForm.errors.password && (
                                <p className="text-sm text-red-600">{createForm.errors.password}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select
                                value={createForm.data.role}
                                onValueChange={(value) => createForm.setData('role', value as UserRole)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableRoles.map((role) => (
                                        <SelectItem key={role} value={role}>
                                            {roleLabels[role]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {createForm.errors.role && (
                                <p className="text-sm text-red-600">{createForm.errors.role}</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleCreate} disabled={createForm.processing}>
                            {createForm.processing ? 'Creating...' : 'Create User'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit User Dialog */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="sm:max-w-[500px]">
                    <DialogHeader>
                        <DialogTitle>Edit User</DialogTitle>
                        <DialogDescription>
                            Update user information and role. Leave password empty to keep current password.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input
                                id="edit-name"
                                value={editForm.data.name}
                                onChange={(e) => editForm.setData('name', e.target.value)}
                            />
                            {editForm.errors.name && (
                                <p className="text-sm text-red-600">{editForm.errors.name}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-email">Email</Label>
                            <Input
                                id="edit-email"
                                type="email"
                                value={editForm.data.email}
                                onChange={(e) => editForm.setData('email', e.target.value)}
                            />
                            {editForm.errors.email && (
                                <p className="text-sm text-red-600">{editForm.errors.email}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-role">Role</Label>
                            <Select
                                value={editForm.data.role}
                                onValueChange={(value) => editForm.setData('role', value as UserRole)}
                            >
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {availableRoles.map((role) => (
                                        <SelectItem key={role} value={role}>
                                            {roleLabels[role]}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {editForm.errors.role && (
                                <p className="text-sm text-red-600">{editForm.errors.role}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-password">New Password (optional)</Label>
                            <Input
                                id="edit-password"
                                type="password"
                                value={editForm.data.password}
                                onChange={(e) => editForm.setData('password', e.target.value)}
                                placeholder="Leave empty to keep current"
                            />
                            {editForm.errors.password && (
                                <p className="text-sm text-red-600">{editForm.errors.password}</p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleUpdate} disabled={editForm.processing}>
                            {editForm.processing ? 'Updating...' : 'Update User'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Disable User Dialog */}
            <AlertDialog open={disableDialogOpen} onOpenChange={setDisableDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Disable User Account</AlertDialogTitle>
                        <AlertDialogDescription>
                            You are about to disable <strong>{selectedUser?.name}</strong>'s account.
                            They will be logged out immediately and won't be able to access the system.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="space-y-2 py-4">
                        <Label htmlFor="disable-reason">Reason (optional)</Label>
                        <Textarea
                            id="disable-reason"
                            value={disableForm.data.reason}
                            onChange={(e) => disableForm.setData('reason', e.target.value)}
                            placeholder="Enter reason for disabling this account..."
                            rows={3}
                        />
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDisable} className="bg-red-600 hover:bg-red-700">
                            {disableForm.processing ? 'Disabling...' : 'Disable User'}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Reset Password Dialog */}
            <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Reset Password</DialogTitle>
                        <DialogDescription>
                            Set a new password for <strong>{selectedUser?.name}</strong>
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="new-password">New Password</Label>
                            <Input
                                id="new-password"
                                type="password"
                                value={resetPasswordForm.data.password}
                                onChange={(e) => resetPasswordForm.setData('password', e.target.value)}
                                placeholder="••••••••"
                            />
                            {resetPasswordForm.errors.password && (
                                <p className="text-sm text-red-600">{resetPasswordForm.errors.password}</p>
                            )}
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirm-password">Confirm Password</Label>
                            <Input
                                id="confirm-password"
                                type="password"
                                value={resetPasswordForm.data.password_confirmation}
                                onChange={(e) => resetPasswordForm.setData('password_confirmation', e.target.value)}
                                placeholder="••••••••"
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={confirmResetPassword} disabled={resetPasswordForm.processing}>
                            {resetPasswordForm.processing ? 'Resetting...' : 'Reset Password'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
