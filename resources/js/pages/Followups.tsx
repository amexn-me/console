import AppLayout from '@/layouts/app-layout';
import { type BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { MultiSelect } from '@/components/ui/multi-select';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { RefreshCw, X, CalendarClock, AlertCircle, CheckCircle2, Timer, Search, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { useState, useEffect, useRef } from 'react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Sales',
        href: '/sales/leads',
    },
    {
        title: 'Followups',
        href: '/sales/followups',
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

interface Agent {
    id: number;
    name: string;
}

interface Campaign {
    id: number;
    name: string;
}

interface Activity {
    id: string;
    company_name?: string;
    campaign_name?: string;
    contact_name?: string;
    agent_name?: string;
    agent_id?: number;
    campaign_id?: number;
    interest_level?: string;
    lead_id?: number;
    next_followup_datetime: string;
}

interface FollowupsData {
    overdue: Activity[];
    upcoming: Activity[];
}

interface Filters {
    search?: string | null;
    agent_id?: number | null;
    campaign_id?: number | null;
    date_from?: string | null;
    date_to?: string | null;
}

interface CampaignProgress {
    campaign_id: number | null;
    campaign_name: string;
    total: number;
    pending: number;
    overdue: number;
}

interface ProgressData {
    daily: {
        total: number;
        completed: number;
        percentage: number;
    };
    weekly: {
        total: number;
        completed: number;
        percentage: number;
    };
    campaigns: CampaignProgress[];
}

interface StaleLead {
    id: number;
    company_name: string;
    agent_name: string;
    campaign_name: string | null;
    last_activity_date: string | null;
    stage: string;
}

interface PageProps {
    followups: FollowupsData;
    progress: ProgressData;
    staleLeads: StaleLead[];
    filters: Filters;
    agents: Agent[];
    campaigns: Campaign[];
    [key: string]: any;
}

export default function Followups() {
    const { followups, progress, staleLeads, filters, agents, campaigns } = usePage<PageProps>().props;
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [selectedAgents, setSelectedAgents] = useState<string[]>(() => {
        if (!filters.agent_id) return [];
        if (Array.isArray(filters.agent_id)) {
            return filters.agent_id.map((id: number) => id.toString());
        }
        return [filters.agent_id.toString()];
    });
    const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>(() => {
        if (!filters.campaign_id) return [];
        if (Array.isArray(filters.campaign_id)) {
            return filters.campaign_id.map((id: number) => id.toString());
        }
        return [filters.campaign_id.toString()];
    });
    const [dateFrom, setDateFrom] = useState(filters.date_from || '');
    const [dateTo, setDateTo] = useState(filters.date_to || '');
    
    // Debounce search
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Auto-apply filters whenever they change (with debounce for search)
    useEffect(() => {
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            const params: any = {
                search: searchQuery || undefined,
                date_from: dateFrom || undefined,
                date_to: dateTo || undefined,
            };

            // Add agent_id as array if selected
            if (selectedAgents.length > 0) {
                params.agent_id = selectedAgents;
            }

            // Add campaign_id as array if selected
            if (selectedCampaigns.length > 0) {
                params.campaign_id = selectedCampaigns;
            }

            router.get('/sales/followups', params, {
                preserveState: true,
                preserveScroll: true,
                only: ['followups', 'progress', 'staleLeads'],
            });
        }, 300); // 300ms debounce for search

        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, selectedAgents, selectedCampaigns, dateFrom, dateTo]);

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
        const interval = setInterval(handleStorageChange, 1000);

        return () => {
            window.removeEventListener('storage', handleStorageChange);
            clearInterval(interval);
        };
    }, [selectedTimezone.id]);

    const convertToTimezone = (utcDatetime: string): Date => {
        return new Date(utcDatetime);
    };

    const formatInTimezone = (datetime: string, formatStr: string): string => {
        const date = convertToTimezone(datetime);
        
        if (selectedTimezone.id === 'system') {
            return format(date, formatStr);
        } else {
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
        
        let nowInTimezone: number;
        if (selectedTimezone.id === 'system') {
            nowInTimezone = now.getTime();
        } else {
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
            
            if (absDays > 0) return `${absDays}d ago`;
            if (absHours > 0) return `${absHours}h ago`;
            return `${absMins}m ago`;
        }

        if (diffDays > 0) return `in ${diffDays}d`;
        if (diffHours > 0) return `in ${diffHours}h`;
        return `in ${diffMins}m`;
    };

    const clearFilters = () => {
        setSearchQuery('');
        setSelectedAgents([]);
        setSelectedCampaigns([]);
        setDateFrom('');
        setDateTo('');
    };

    const refreshData = () => {
        setIsRefreshing(true);
        router.reload({
            only: ['followups', 'progress', 'staleLeads'],
            onFinish: () => {
                setIsRefreshing(false);
            },
        });
    };

    const hasActiveFilters = searchQuery || selectedAgents.length > 0 || selectedCampaigns.length > 0 || dateFrom || dateTo;

    const renderFilters = () => (
        <div className="bg-gray-50 rounded-lg border p-4 mb-4">
            <div className="flex flex-col gap-4">
                {/* Search Bar and Date Filters */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1 min-w-0">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search by company or contact..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-10 w-full"
                        />
                    </div>

                    <div className="w-full md:w-40 shrink-0">
                        <Input
                            type="date"
                            value={dateFrom}
                            onChange={(e) => setDateFrom(e.target.value)}
                            placeholder="From date"
                            className="h-10"
                        />
                    </div>

                    <div className="w-full md:w-40 shrink-0">
                        <Input
                            type="date"
                            value={dateTo}
                            onChange={(e) => setDateTo(e.target.value)}
                            placeholder="To date"
                            className="h-10"
                        />
                    </div>
                </div>

                {/* Agent, Campaign Filters and Clear Button */}
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <MultiSelect
                            options={agents.map(agent => ({
                                label: agent.name,
                                value: agent.id.toString()
                            }))}
                            selected={selectedAgents}
                            onChange={setSelectedAgents}
                            placeholder="All agents"
                        />
                    </div>

                    <div className="flex-1">
                        <MultiSelect
                            options={campaigns.map(campaign => ({
                                label: campaign.name,
                                value: campaign.id.toString()
                            }))}
                            selected={selectedCampaigns}
                            onChange={setSelectedCampaigns}
                            placeholder="All campaigns"
                        />
                    </div>

                    <Button
                        variant="outline"
                        onClick={clearFilters}
                        disabled={!hasActiveFilters}
                        className="shrink-0 h-10 px-3 text-red-600 border-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-700 disabled:text-red-300 disabled:border-red-300"
                        title="Clear all filters"
                    >
                        <X className="h-4 w-4" />
                    </Button>
                </div>
            </div>
        </div>
    );

    const renderTable = (followupsList: Activity[], isOverdue: boolean) => (
        <div className="flex-1 overflow-hidden bg-white rounded-lg border">
            <div className="h-full overflow-y-auto">
                {followupsList.length > 0 ? (
                    <Table>
                        <TableHeader className="sticky top-0 bg-white z-10">
                            <TableRow>
                                <TableHead className="w-[40%]">Company</TableHead>
                                <TableHead className="w-[30%]">Agent</TableHead>
                                <TableHead className="w-[30%] text-right">Follow-up Time</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {followupsList.map((followup) => (
                                <TableRow
                                    key={followup.id}
                                    className="cursor-pointer hover:bg-gray-50"
                                >
                                    <TableCell className="p-0">
                                        <Link 
                                            href={followup.lead_id ? `/sales/leads/${followup.lead_id}` : '#'}
                                            className="block px-4 py-3"
                                        >
                                            <div className="font-medium text-sm break-words whitespace-normal">
                                                {followup.company_name}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-0.5 break-words whitespace-normal">
                                                {followup.contact_name}
                                            </div>
                                        </Link>
                                    </TableCell>
                                    <TableCell className="p-0">
                                        <Link 
                                            href={followup.lead_id ? `/sales/leads/${followup.lead_id}` : '#'}
                                            className="block px-4 py-3"
                                        >
                                            <div className="text-sm">
                                                {followup.agent_name || '-'}
                                            </div>
                                            <div className="text-xs text-muted-foreground mt-0.5">
                                                {followup.campaign_name || '-'}
                                            </div>
                                        </Link>
                                    </TableCell>
                                    <TableCell className="p-0">
                                        <Link 
                                            href={followup.lead_id ? `/sales/leads/${followup.lead_id}` : '#'}
                                            className="block px-4 py-3 text-right"
                                        >
                                            <div className="text-sm font-medium">
                                                {formatInTimezone(followup.next_followup_datetime, 'MMM dd, h:mm a')}
                                            </div>
                                            <div className="mt-1">
                                                <Badge 
                                                    variant={isOverdue ? 'destructive' : 'secondary'} 
                                                    className="text-xs"
                                                >
                                                    {getRelativeTime(followup.next_followup_datetime)}
                                                </Badge>
                                            </div>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                ) : (
                    <div className="flex items-center justify-center h-full p-12">
                        <div className="text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                                {isOverdue ? (
                                    <CheckCircle2 className="h-8 w-8 text-green-500" />
                                ) : (
                                    <CalendarClock className="h-8 w-8 text-gray-400" />
                                )}
                            </div>
                            <h3 className="text-lg font-semibold text-gray-900 mb-2">
                                {isOverdue ? 'All caught up!' : 'No upcoming followups'}
                            </h3>
                            <p className="text-gray-600">
                                {isOverdue 
                                    ? 'No overdue followups at the moment.'
                                    : 'No upcoming followups scheduled.'}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Followups" />
            <div className="flex h-screen flex-col gap-6 rounded-xl p-6 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Followups</h1>
                        <p className="text-gray-600 mt-1">
                            {followups.overdue.length} overdue • {followups.upcoming.length} upcoming
                        </p>
                    </div>
                </div>

                {/* Main Content: 60% Tabs with Followups, 40% Placeholder */}
                <div className="flex-1 flex gap-4 overflow-hidden">
                    {/* Followups Section - 60% */}
                    <div className="flex-[3] flex flex-col overflow-hidden">
                        <Tabs defaultValue="upcoming" className="flex-1 flex flex-col overflow-hidden">
                            <TabsList className="grid w-full max-w-md grid-cols-2">
                                <TabsTrigger value="upcoming" className="flex items-center gap-2">
                                    <CalendarClock className="h-4 w-4" />
                                    Upcoming ({followups.upcoming.length})
                                </TabsTrigger>
                                <TabsTrigger value="overdue" className="flex items-center gap-2">
                                    <AlertCircle className="h-4 w-4" />
                                    Overdue ({followups.overdue.length})
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="upcoming" className="flex-1 flex flex-col overflow-hidden mt-4">
                                {renderFilters()}
                                {renderTable(followups.upcoming, false)}
                            </TabsContent>

                            <TabsContent value="overdue" className="flex-1 flex flex-col overflow-hidden mt-4">
                                {renderFilters()}
                                {renderTable(followups.overdue, true)}
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Progress and Stale Leads Cards - 40% */}
                    <div className="flex-[2] flex flex-col gap-4 overflow-hidden">
                        {/* Refresh Button - aligned with tabs */}
                        <div className="flex justify-end shrink-0">
                            <Button
                                variant="default"
                                size="sm"
                                onClick={refreshData}
                                disabled={isRefreshing}
                                className="flex items-center gap-2"
                            >
                                <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>

                        {/* Followup Progress Card */}
                        <Card className="shrink-0">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-base">Followup Progress</CardTitle>
                                        <CardDescription className="text-xs">Track completion rates</CardDescription>
                                    </div>
                                    <Timer className="h-5 w-5 text-primary shrink-0" />
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4 pt-0">
                                {/* Daily Progress */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-medium">Daily Followups</span>
                                        <span className="text-muted-foreground">
                                            {progress.daily.completed} / {progress.daily.total}
                                        </span>
                                    </div>
                                    <Progress value={progress.daily.percentage} className="h-1.5" />
                                    <p className="text-xs text-muted-foreground">
                                        {progress.daily.completed} completed • {progress.daily.total - progress.daily.completed} pending
                                    </p>
                                </div>

                                {/* Weekly Progress */}
                                <div className="space-y-1.5">
                                    <div className="flex items-center justify-between text-xs">
                                        <span className="font-medium">Weekly Followups</span>
                                        <span className="text-muted-foreground">
                                            {progress.weekly.completed} / {progress.weekly.total}
                                        </span>
                                    </div>
                                    <Progress value={progress.weekly.percentage} className="h-1.5" />
                                    <p className="text-xs text-muted-foreground">
                                        {progress.weekly.completed} completed • {progress.weekly.total - progress.weekly.completed} pending
                                    </p>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Stale Leads Card */}
                        <Card className="flex-1 flex flex-col overflow-hidden">
                            <CardHeader className="pb-3 shrink-0">
                                <div className="flex items-start justify-between">
                                    <div>
                                        <CardTitle className="text-base">Stale Leads</CardTitle>
                                        <CardDescription className="text-xs">Need your attention</CardDescription>
                                    </div>
                                    <Clock className="h-5 w-5 text-orange-500 shrink-0" />
                                </div>
                            </CardHeader>
                            <CardContent className="pt-0 flex-1 overflow-y-auto">
                                {staleLeads.length > 0 ? (
                                    <div className="space-y-1">
                                        {staleLeads.map((lead) => (
                                            <Link
                                                key={lead.id}
                                                href={`/sales/leads/${lead.id}`}
                                                className="flex items-center justify-between gap-2 p-2 rounded-md hover:bg-accent border-l-2 border-r-2 border-orange-400 cursor-pointer transition-colors"
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-medium text-xs break-words">
                                                        {lead.company_name}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground mt-0.5">
                                                        {lead.agent_name}
                                                        {lead.campaign_name && (
                                                            <span> • {lead.campaign_name}</span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {lead.last_activity_date 
                                                        ? format(new Date(lead.last_activity_date), 'MMM dd')
                                                        : 'Never'}
                                                </div>
                                            </Link>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-6 text-muted-foreground">
                                        <CheckCircle2 className="h-6 w-6 mx-auto mb-1 text-green-500" />
                                        <p className="text-xs">All up to date!</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

