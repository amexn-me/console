import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, TrendingUp, AlertCircle, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

interface Company {
    id: number;
    company_name: string;
}

interface Campaign {
    id: number;
    name: string;
}

interface Lead {
    id: number;
    campaign?: Campaign;
}

interface Agent {
    id: number;
    name: string;
}

interface Contact {
    id: number;
    name: string;
}

interface Activity {
    id: string;
    company?: Company;
    lead?: Lead;
    agent?: Agent;
    contact?: Contact;
    activity_type: string;
    conversation_method?: string;
    next_followup_datetime: string;
    remarks?: string;
    notes?: string;
}

interface DashboardStats {
    openTasks: number;
    pendingFollowups: number;
    openLeads: number;
}

interface DashboardFollowups {
    overdue: Activity[];
    upcoming: Activity[];
}

interface DashboardProps {
    stats: DashboardStats;
    followups: DashboardFollowups;
}

export default function Dashboard() {
    const { stats, followups } = usePage<DashboardProps>().props;

    const getRelativeTime = (datetime: string) => {
        const date = new Date(datetime);
        const now = new Date();
        const diffMs = date.getTime() - now.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffMs < 0) {
            const absDays = Math.abs(diffDays);
            const absHours = Math.abs(diffHours);
            const absMins = Math.abs(diffMins);
            
            if (absDays > 0) return `${absDays} day${absDays > 1 ? 's' : ''} ago`;
            if (absHours > 0) return `${absHours} hour${absHours > 1 ? 's' : ''} ago`;
            return `${absMins} minute${absMins > 1 ? 's' : ''} ago`;
        }

        if (diffDays > 0) return `in ${diffDays} day${diffDays > 1 ? 's' : ''}`;
        if (diffHours > 0) return `in ${diffHours} hour${diffHours > 1 ? 's' : ''}`;
        return `in ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Dashboard" />
            <div className="flex h-full flex-1 flex-col gap-6 rounded-xl p-4 overflow-x-auto">
                {/* Stats Cards */}
                <div className="grid gap-4 md:grid-cols-3">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Open Tasks
                            </CardTitle>
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.openTasks}</div>
                            <p className="text-xs text-muted-foreground">
                                Tasks assigned to you
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Pending Followups
                            </CardTitle>
                            <Clock className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.pendingFollowups}</div>
                            <p className="text-xs text-muted-foreground">
                                Upcoming followups scheduled
                            </p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                Open Leads
                            </CardTitle>
                            <TrendingUp className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{stats.openLeads}</div>
                            <p className="text-xs text-muted-foreground">
                                Active leads in pipeline
                            </p>
                        </CardContent>
                    </Card>
                </div>

                {/* Followups Section */}
                <div className="grid gap-4 md:grid-cols-2">
                    {/* Overdue Followups */}
                    <Card className="border-red-200 dark:border-red-900">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                                <CardTitle className="text-red-600 dark:text-red-400">Overdue Followups</CardTitle>
                            </div>
                            <CardDescription>
                                {followups.overdue.length} followup{followups.overdue.length !== 1 ? 's' : ''} require{followups.overdue.length === 1 ? 's' : ''} immediate attention
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {followups.overdue.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <CheckCircle2 className="h-12 w-12 mx-auto mb-2 text-green-500" />
                                    <p>All caught up! No overdue followups.</p>
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                                    {followups.overdue.map((followup) => (
                                        <div
                                            key={followup.id}
                                            className="p-4 rounded-lg border border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <div className="flex-1">
                                                    <div className="font-semibold text-red-700 dark:text-red-300">
                                                        {followup.company_name}
                                                    </div>
                                                    {followup.campaign_name && (
                                                        <Badge variant="outline" className="mt-1 text-xs">
                                                            {followup.campaign_name}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <Badge variant="destructive" className="text-xs">
                                                    {getRelativeTime(followup.next_followup_datetime)}
                                                </Badge>
                                            </div>
                                            <div className="space-y-1 text-sm">
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <CalendarClock className="h-3 w-3" />
                                                    <span>
                                                        {format(new Date(followup.next_followup_datetime), 'MMM dd, yyyy h:mm a')}
                                                    </span>
                                                </div>
                                                <div className="text-xs">
                                                    <span className="font-medium">Contact:</span> {followup.contact_name}
                                                </div>
                                                <div className="text-xs">
                                                    <span className="font-medium">Agent:</span> {followup.agent_name}
                                                </div>
                                                {followup.interest_level && (
                                                    <div className="text-xs">
                                                        <span className="font-medium">Interest:</span> {followup.interest_level}
                                                    </div>
                                                )}
                                            </div>
                                            {followup.lead_id && (
                                                <div className="mt-3">
                                                    <Link
                                                        href={`/sales/leads/${followup.lead_id}`}
                                                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-red-600 text-white hover:bg-red-700 h-8 px-3"
                                                    >
                                                        View Lead
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Upcoming Followups */}
                    <Card>
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <Clock className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                                <CardTitle>Upcoming Followups</CardTitle>
                            </div>
                            <CardDescription>
                                Next {followups.upcoming.length} scheduled followup{followups.upcoming.length !== 1 ? 's' : ''}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {followups.upcoming.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground">
                                    <CalendarClock className="h-12 w-12 mx-auto mb-2" />
                                    <p>No upcoming followups scheduled.</p>
                                </div>
                            ) : (
                                <div className="space-y-4 max-h-[600px] overflow-y-auto">
                                    {followups.upcoming.map((followup) => (
                                        <div
                                            key={followup.id}
                                            className="p-4 rounded-lg border"
                                        >
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <div className="flex-1">
                                                    <div className="font-semibold">
                                                        {followup.company_name}
                                                    </div>
                                                    {followup.campaign_name && (
                                                        <Badge variant="outline" className="mt-1 text-xs">
                                                            {followup.campaign_name}
                                                        </Badge>
                                                    )}
                                                </div>
                                                <Badge variant="secondary" className="text-xs">
                                                    {getRelativeTime(followup.next_followup_datetime)}
                                                </Badge>
                                            </div>
                                            <div className="space-y-1 text-sm">
                                                <div className="flex items-center gap-2 text-muted-foreground">
                                                    <CalendarClock className="h-3 w-3" />
                                                    <span>
                                                        {format(new Date(followup.next_followup_datetime), 'MMM dd, yyyy h:mm a')}
                                                    </span>
                                                </div>
                                                <div className="text-xs">
                                                    <span className="font-medium">Contact:</span> {followup.contact_name}
                                                </div>
                                                <div className="text-xs">
                                                    <span className="font-medium">Agent:</span> {followup.agent_name}
                                                </div>
                                                {followup.interest_level && (
                                                    <div className="text-xs">
                                                        <span className="font-medium">Interest:</span> {followup.interest_level}
                                                    </div>
                                                )}
                                            </div>
                                            {followup.lead_id && (
                                                <div className="mt-3">
                                                    <Link
                                                        href={`/sales/leads/${followup.lead_id}`}
                                                        className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-8 px-3"
                                                    >
                                                        View Lead
                                                    </Link>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </AppLayout>
    );
}
