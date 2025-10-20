import IntegrationsLayout from '@/layouts/integrations/layout';
import AppLayout from '@/layouts/app-layout';
import { Head, router } from '@inertiajs/react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Trash2, Calendar as CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { type BreadcrumbItem } from '@/types';
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

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Integrations',
        href: '/integrations/calendar',
    },
    {
        title: 'Google Calendar',
        href: '/integrations/calendar',
    },
];

interface GoogleCalendarAccount {
    id: number;
    user_id: number;
    email: string;
    name: string;
    is_active: boolean;
    is_staff_calendar: boolean;
    created_at: string;
    user?: {
        name: string;
        email: string;
    };
}

interface Props {
    accounts: GoogleCalendarAccount[];
    hasGoogleAuth: boolean;
}

export default function GoogleCalendarIntegration({ accounts, hasGoogleAuth }: Props) {
    const [deleteAccountId, setDeleteAccountId] = useState<number | null>(null);

    const handleConnectGoogle = () => {
        const width = 600;
        const height = 700;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        window.open(
            route('calendar.auth.google'),
            'Google Calendar Auth',
            `width=${width},height=${height},left=${left},top=${top},popup=yes`
        );
    };

    const toggleActive = (accountId: number, currentState: boolean) => {
        router.put(
            route('integrations.calendar.toggle-active', accountId),
            { is_active: !currentState },
            {
                preserveScroll: true,
            }
        );
    };

    const toggleStaffCalendar = (accountId: number, currentState: boolean) => {
        router.put(
            route('integrations.calendar.toggle-staff', accountId),
            { is_staff_calendar: !currentState },
            {
                preserveScroll: true,
            }
        );
    };

    const handleDelete = () => {
        if (deleteAccountId) {
            router.delete(route('integrations.calendar.delete', deleteAccountId), {
                preserveScroll: true,
                onSuccess: () => setDeleteAccountId(null),
            });
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Google Calendar Integration" />

            <IntegrationsLayout>
                <div className="space-y-6">
                <div>
                    <h3 className="text-lg font-medium">Google Calendar Integration</h3>
                    <p className="text-sm text-muted-foreground">
                        Connect Google Calendar accounts to sync events and manage team availability in the Meetings view.
                    </p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>Connect Google Calendar</CardTitle>
                        <CardDescription>
                            Connect your Google Calendar account to enable calendar integration across the platform.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button onClick={handleConnectGoogle} className="w-full sm:w-auto">
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {hasGoogleAuth ? 'Connect Another Account' : 'Connect Google Calendar'}
                        </Button>
                    </CardContent>
                </Card>

                {accounts.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Connected Accounts</CardTitle>
                            <CardDescription>Manage your connected Google Calendar accounts and their settings.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {accounts.map((account) => (
                                <div key={account.id} className="flex flex-col space-y-4 rounded-lg border p-4">
                                    <div className="flex items-start justify-between">
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <p className="font-medium">{account.name}</p>
                                                {account.is_active && <Badge variant="default">Active</Badge>}
                                                {account.is_staff_calendar && (
                                                    <Badge variant="secondary">Staff Calendar</Badge>
                                                )}
                                            </div>
                                            <p className="text-sm text-muted-foreground">{account.email}</p>
                                            {account.user && (
                                                <p className="text-xs text-muted-foreground">
                                                    Connected by: {account.user.name} ({account.user.email})
                                                </p>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => setDeleteAccountId(account.id)}
                                            className="text-destructive hover:text-destructive"
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="flex flex-col space-y-3 border-t pt-4">
                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label htmlFor={`active-${account.id}`}>Account Active</Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Enable or disable this calendar account
                                                </p>
                                            </div>
                                            <Switch
                                                id={`active-${account.id}`}
                                                checked={account.is_active}
                                                onCheckedChange={() => toggleActive(account.id, account.is_active)}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <Label htmlFor={`staff-${account.id}`}>Staff Calendar</Label>
                                                <p className="text-xs text-muted-foreground">
                                                    Show this calendar in team meetings view
                                                </p>
                                            </div>
                                            <Switch
                                                id={`staff-${account.id}`}
                                                checked={account.is_staff_calendar}
                                                onCheckedChange={() =>
                                                    toggleStaffCalendar(account.id, account.is_staff_calendar)
                                                }
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </CardContent>
                    </Card>
                )}

                {accounts.length === 0 && hasGoogleAuth && (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-10">
                            <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
                            <p className="text-sm text-muted-foreground text-center">
                                No calendar accounts configured yet. Connect a Google Calendar account to get started.
                            </p>
                        </CardContent>
                    </Card>
                )}
                </div>

                <AlertDialog open={deleteAccountId !== null} onOpenChange={() => setDeleteAccountId(null)}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                            <AlertDialogDescription>
                                This will disconnect the Google Calendar account. You can always reconnect it later.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </IntegrationsLayout>
        </AppLayout>
    );
}

