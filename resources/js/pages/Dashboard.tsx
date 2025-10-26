import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, usePage } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, TrendingUp, AlertCircle, CalendarClock } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useEffect } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

interface Timezone {
    id: string;
    name: string;
    flag: string;
    timezone: string;
}

const timezones: Timezone[] = [
    { id: 'system', name: 'SYS', flag: '💻', timezone: '' },
    { id: 'uae', name: 'UAE', flag: '🇦🇪', timezone: 'Asia/Dubai' },
    { id: 'india', name: 'IND', flag: '🇮🇳', timezone: 'Asia/Kolkata' },
    { id: 'nigeria', name: 'NGR', flag: '🇳🇬', timezone: 'Africa/Lagos' },
    { id: 'malaysia', name: 'MYS', flag: '🇲🇾', timezone: 'Asia/Kuala_Lumpur' },
    { id: 'saudi', name: 'KSA', flag: '🇸🇦', timezone: 'Asia/Riyadh' },
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
    company_name?: string;
    campaign_name?: string;
    contact_name?: string;
    agent_name?: string;
    interest_level?: string;
    lead_id?: number;
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

interface PageProps {
    stats: DashboardStats;
    followups: DashboardFollowups;
    [key: string]: any;
}

export default function Dashboard() {
    const { stats, followups } = usePage<PageProps>().props;

    // Get selected timezone from localStorage
    const [selectedTimezone, setSelectedTimezone] = useState<Timezone>(() => {
        const saved = localStorage.getItem('selectedTimezone');
        if (saved) {
            const found = timezones.find(tz => tz.id === saved);
            if (found) return found;
        }
        return timezones[0];
    });

    // Listen for timezone changes from localStorage
    useEffect(() => {
        const handleStorageChange = () => {
            const saved = localStorage.getItem('selectedTimezone');
            if (saved) {
                const found = timezones.find(tz => tz.id === saved);
                if (found && found.id !== selectedTimezone.id) {
                    setSelectedTimezone(found);
                }
            }
        };

        window.addEventListener('storage', handleStorageChange);
        
        // Also check periodically for changes in the same tab
        const interval = setInterval(handleStorageChange, 1000);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, [selectedTimezone.id]);

    // Convert UTC datetime to selected timezone
    const convertToTimezone = (utcDatetime: string): Date => {
        // Parse the UTC datetime string
        const utcDate = new Date(utcDatetime);
        return utcDate;
    };

    // Format datetime in selected timezone
    const formatInTimezone = (datetime: string, formatStr: string): string => {
        const date = convertToTimezone(datetime);
        
        if (selectedTimezone.id === 'system') {
            // Use system timezone
            return format(date, formatStr);
        } else {
            // Format for selected timezone
            const options: Intl.DateTimeFormatOptions = {
                timeZone: selectedTimezone.timezone,
                year: 'numeric',
                month: 'short',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true,
            };
            
            const formatter = new Intl.DateTimeFormat('en-US', options);
            return formatter.format(date);
        }
    };

    const getRelativeTime = (datetime: string) => {
        const date = convertToTimezone(datetime);
        const now = new Date();
        
        // Get the current time in the selected timezone
        let nowInTimezone: number;
        if (selectedTimezone.id === 'system') {
            nowInTimezone = now.getTime();
        } else {
            // Get current time in selected timezone by formatting and parsing
            const nowStr = now.toLocaleString('en-US', { timeZone: selectedTimezone.timezone });
            nowInTimezone = new Date(nowStr).getTime();
        }
        
        const diffMs = date.getTime() - nowInTimezone;
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
                                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                    {followups.overdue.map((followup) => (
                                        <Link
                                            key={followup.id}
                                            href={followup.lead_id ? `/sales/leads/${followup.lead_id}` : '#'}
                                            className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-red-50 dark:hover:bg-red-950/20 border-l-2 border-r-2 border-red-500 cursor-pointer transition-colors"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm text-red-700 dark:text-red-300 truncate">
                                                        {followup.company_name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">•</span>
                                                    <span className="text-xs text-muted-foreground truncate">
                                                        {followup.contact_name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                                    <CalendarClock className="h-3 w-3" />
                                                    <span>
                                                        {formatInTimezone(followup.next_followup_datetime, 'MMM dd, h:mm a')}
                                                    </span>
                                                </div>
                                            </div>
                                            <Badge variant="destructive" className="text-xs whitespace-nowrap">
                                                {getRelativeTime(followup.next_followup_datetime)}
                                            </Badge>
                                        </Link>
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
                                <div className="space-y-2 max-h-[600px] overflow-y-auto">
                                    {followups.upcoming.map((followup) => (
                                        <Link
                                            key={followup.id}
                                            href={followup.lead_id ? `/sales/leads/${followup.lead_id}` : '#'}
                                            className="flex items-center justify-between gap-3 p-2 rounded-md hover:bg-accent border-l-2 border-r-2 border-blue-500 cursor-pointer transition-colors"
                                        >
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2">
                                                    <span className="font-medium text-sm truncate">
                                                        {followup.company_name}
                                                    </span>
                                                    <span className="text-xs text-muted-foreground">•</span>
                                                    <span className="text-xs text-muted-foreground truncate">
                                                        {followup.contact_name}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                                                    <CalendarClock className="h-3 w-3" />
                                                    <span>
                                                        {formatInTimezone(followup.next_followup_datetime, 'MMM dd, h:mm a')}
                                                    </span>
                                                </div>
                                            </div>
                                            <Badge variant="secondary" className="text-xs whitespace-nowrap">
                                                {getRelativeTime(followup.next_followup_datetime)}
                                            </Badge>
                                        </Link>
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
