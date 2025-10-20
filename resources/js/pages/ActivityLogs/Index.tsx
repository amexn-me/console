import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';
import { FileDown, Loader2 } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Activity Logs',
        href: '/sales/activity-logs',
    },
];

interface Company {
    id: number;
    name: string;
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
    id: number;
    created_at: string;
    company: Company | null;
    agent: Agent | null;
    contact: Contact | null;
    activity_type: string | null;
    conversation_method: string | null;
    conversation_connected: string | null;
    remarks: string | null;
    notes: string | null;
}

interface PageProps {
    activities: {
        data: Activity[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        next_page_url: string | null;
    };
    companies: Company[];
    agents: Agent[];
    filters: {
        company_id?: number;
        activity_type?: string;
        agent_id?: number;
        conversation_method?: string;
        conversation_connected?: string;
        from_date?: string;
        to_date?: string;
    };
}

export default function ActivityLogsIndex() {
    const { activities: initialActivities, companies, agents, filters } = usePage<PageProps>().props;
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [activities, setActivities] = useState(initialActivities.data);
    const [currentPage, setCurrentPage] = useState(initialActivities.current_page);
    const [hasMorePages, setHasMorePages] = useState(initialActivities.current_page < initialActivities.last_page);
    const [totalCount, setTotalCount] = useState(initialActivities.total);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(false);
    const isInitialLoad = useRef(true);

    const [localFilters, setLocalFilters] = useState({
        company_id: filters.company_id?.toString() || 'all',
        activity_type: filters.activity_type || 'all',
        agent_id: filters.agent_id?.toString() || 'all',
        conversation_method: filters.conversation_method || 'all',
        conversation_connected: filters.conversation_connected || 'all',
        from_date: filters.from_date || '',
        to_date: filters.to_date || '',
    });

    // Only reset activities on initial load or when page is explicitly reset (not on pagination)
    useEffect(() => {
        if (isInitialLoad.current || initialActivities.current_page === 1) {
            setActivities(initialActivities.data);
            setCurrentPage(initialActivities.current_page);
            setHasMorePages(initialActivities.current_page < initialActivities.last_page);
            setTotalCount(initialActivities.total);
            isInitialLoad.current = false;
        }
    }, [initialActivities.data, initialActivities.current_page]);

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...localFilters, [key]: value };
        setLocalFilters(newFilters);
        applyFilters(newFilters);
    };

    const applyFilters = (newFilters = localFilters) => {
        const params: Record<string, string> = {};
        
        if (newFilters.company_id && newFilters.company_id !== 'all') params.company_id = newFilters.company_id;
        if (newFilters.activity_type && newFilters.activity_type !== 'all') params.activity_type = newFilters.activity_type;
        if (newFilters.agent_id && newFilters.agent_id !== 'all') params.agent_id = newFilters.agent_id;
        if (newFilters.conversation_method && newFilters.conversation_method !== 'all') params.conversation_method = newFilters.conversation_method;
        if (newFilters.conversation_connected && newFilters.conversation_connected !== 'all') params.conversation_connected = newFilters.conversation_connected;
        if (newFilters.from_date) params.from_date = newFilters.from_date;
        if (newFilters.to_date) params.to_date = newFilters.to_date;

        setIsLoading(true);
        router.get('/sales/activity-logs', params, {
            preserveState: false,
            preserveScroll: false,
            onFinish: () => setIsLoading(false),
        });
    };

    const loadMoreActivities = () => {
        if (loadingRef.current || !hasMorePages || isLoadingMore) return;

        loadingRef.current = true;
        setIsLoadingMore(true);

        const params: Record<string, string> = {
            page: (currentPage + 1).toString(),
        };
        
        if (localFilters.company_id && localFilters.company_id !== 'all') params.company_id = localFilters.company_id;
        if (localFilters.activity_type && localFilters.activity_type !== 'all') params.activity_type = localFilters.activity_type;
        if (localFilters.agent_id && localFilters.agent_id !== 'all') params.agent_id = localFilters.agent_id;
        if (localFilters.conversation_method && localFilters.conversation_method !== 'all') params.conversation_method = localFilters.conversation_method;
        if (localFilters.conversation_connected && localFilters.conversation_connected !== 'all') params.conversation_connected = localFilters.conversation_connected;
        if (localFilters.from_date) params.from_date = localFilters.from_date;
        if (localFilters.to_date) params.to_date = localFilters.to_date;

        router.get('/sales/activity-logs', params, {
            preserveState: true,
            preserveScroll: true,
            only: ['activities'],
            onSuccess: (page: any) => {
                const newActivities = page.props.activities;
                setActivities(prev => [...prev, ...newActivities.data]);
                setCurrentPage(newActivities.current_page);
                setHasMorePages(newActivities.current_page < newActivities.last_page);
                setIsLoadingMore(false);
                loadingRef.current = false;
            },
            onError: () => {
                setIsLoadingMore(false);
                loadingRef.current = false;
            },
        });
    };

    // Infinite scroll handler
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            
            // Calculate distance from bottom
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
            
            // Load more when within 200px of bottom
            if (distanceFromBottom < 200 && hasMorePages && !isLoadingMore && !loadingRef.current) {
                loadMoreActivities();
            }
        };

        container.addEventListener('scroll', handleScroll);
        
        // Check on mount if content is too short
        const checkInitialLoad = () => {
            const { scrollHeight, clientHeight } = container;
            if (scrollHeight <= clientHeight && hasMorePages && !isLoadingMore) {
                loadMoreActivities();
            }
        };
        
        // Delay to ensure content is rendered
        setTimeout(checkInitialLoad, 100);

        return () => container.removeEventListener('scroll', handleScroll);
    }, [hasMorePages, isLoadingMore, currentPage, activities.length]);

    const clearFilters = () => {
        const today = new Date().toISOString().split('T')[0];
        const resetFilters = {
            company_id: 'all',
            activity_type: 'all',
            agent_id: 'all',
            conversation_method: 'all',
            conversation_connected: 'all',
            from_date: today,
            to_date: today,
        };
        setLocalFilters(resetFilters);
        setIsLoading(true);
        router.get('/activity-logs', { from_date: today, to_date: today }, {
            preserveState: false,
            preserveScroll: false,
            onFinish: () => setIsLoading(false),
        });
    };

    const handleExport = () => {
        const params = new URLSearchParams();
        if (localFilters.company_id && localFilters.company_id !== 'all') params.append('company_id', localFilters.company_id);
        if (localFilters.activity_type && localFilters.activity_type !== 'all') params.append('activity_type', localFilters.activity_type);
        if (localFilters.agent_id && localFilters.agent_id !== 'all') params.append('agent_id', localFilters.agent_id);
        if (localFilters.conversation_method && localFilters.conversation_method !== 'all') params.append('conversation_method', localFilters.conversation_method);
        if (localFilters.conversation_connected && localFilters.conversation_connected !== 'all') params.append('conversation_connected', localFilters.conversation_connected);
        if (localFilters.from_date) params.append('from_date', localFilters.from_date);
        if (localFilters.to_date) params.append('to_date', localFilters.to_date);

        window.location.href = `/sales/activity-logs/export?${params.toString()}`;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Activity Logs" />
            <div className="flex h-screen flex-col gap-4 rounded-xl p-4 overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                    <h1 className="text-2xl font-bold">Activity Logs</h1>
                    <Button onClick={handleExport}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Export to Excel
                    </Button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 rounded-lg border bg-card p-4">
                    <div className="space-y-2">
                        <Label htmlFor="company-filter">Company Name</Label>
                        <Select value={localFilters.company_id} onValueChange={(val) => handleFilterChange('company_id', val)}>
                            <SelectTrigger id="company-filter">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Companies</SelectItem>
                                {companies.map((company) => (
                                    <SelectItem key={company.id} value={company.id.toString()}>
                                        {company.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="activity-type-filter">Activity Type</Label>
                        <Select value={localFilters.activity_type} onValueChange={(val) => handleFilterChange('activity_type', val)}>
                            <SelectTrigger id="activity-type-filter">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Types</SelectItem>
                                <SelectItem value="Call">Call</SelectItem>
                                <SelectItem value="Email">Email</SelectItem>
                                <SelectItem value="Meeting">Meeting</SelectItem>
                                <SelectItem value="Follow-up">Follow-up</SelectItem>
                                <SelectItem value="Demo">Demo</SelectItem>
                                <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="user-filter">User</Label>
                        <Select value={localFilters.agent_id} onValueChange={(val) => handleFilterChange('agent_id', val)}>
                            <SelectTrigger id="user-filter">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Users</SelectItem>
                                {agents.map((agent) => (
                                    <SelectItem key={agent.id} value={agent.id.toString()}>
                                        {agent.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="conversation-method-filter">Conversation Method</Label>
                        <Select value={localFilters.conversation_method} onValueChange={(val) => handleFilterChange('conversation_method', val)}>
                            <SelectTrigger id="conversation-method-filter">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Methods</SelectItem>
                                <SelectItem value="Phone">Phone</SelectItem>
                                <SelectItem value="Email">Email</SelectItem>
                                <SelectItem value="Video Call">Video Call</SelectItem>
                                <SelectItem value="In-Person">In-Person</SelectItem>
                                <SelectItem value="WhatsApp">WhatsApp</SelectItem>
                                <SelectItem value="LinkedIn">LinkedIn</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="connection-status-filter">Connection Status</Label>
                        <Select value={localFilters.conversation_connected} onValueChange={(val) => handleFilterChange('conversation_connected', val)}>
                            <SelectTrigger id="connection-status-filter">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Statuses</SelectItem>
                                <SelectItem value="Yes">Connected</SelectItem>
                                <SelectItem value="No">Not Connected</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="from-date">From Date</Label>
                        <Input
                            id="from-date"
                            type="date"
                            value={localFilters.from_date}
                            onChange={(e) => handleFilterChange('from_date', e.target.value)}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="to-date">To Date</Label>
                        <Input
                            id="to-date"
                            type="date"
                            value={localFilters.to_date}
                            onChange={(e) => handleFilterChange('to_date', e.target.value)}
                        />
                    </div>

                    <div className="flex items-end">
                        <Button variant="outline" onClick={clearFilters} className="w-full">
                            Clear Filters
                        </Button>
                    </div>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div>
                        <strong>Total:</strong> {totalCount} (Loaded: {activities.length})
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-hidden rounded-lg border flex flex-col">
                    <div ref={scrollContainerRef} className="overflow-auto flex-1">
                        <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Date & Time</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Agent</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Activity Type</TableHead>
                                <TableHead>Conversation Method</TableHead>
                                <TableHead>Connected</TableHead>
                                <TableHead>Remarks</TableHead>
                                <TableHead>Notes</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-12">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                                            <span className="text-muted-foreground">Loading activities...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ) : activities.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                                        No activity logs found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                activities.map((activity) => (
                                    <TableRow key={activity.id}>
                                        <TableCell className="whitespace-nowrap">
                                            {new Date(activity.created_at).toLocaleString()}
                                        </TableCell>
                                        <TableCell className="font-medium">
                                            {activity.company?.name || 'N/A'}
                                        </TableCell>
                                        <TableCell>{activity.agent?.name || 'N/A'}</TableCell>
                                        <TableCell>{activity.contact?.name || 'N/A'}</TableCell>
                                        <TableCell>
                                            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                                                {activity.activity_type || 'N/A'}
                                            </span>
                                        </TableCell>
                                        <TableCell>{activity.conversation_method || 'N/A'}</TableCell>
                                        <TableCell>
                                            {activity.conversation_connected === 'Yes' ? (
                                                <span className="rounded-full bg-green-100 px-2 py-1 text-xs text-green-700">
                                                    Yes
                                                </span>
                                            ) : activity.conversation_connected === 'No' ? (
                                                <span className="rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">
                                                    No
                                                </span>
                                            ) : (
                                                'N/A'
                                            )}
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate">
                                            {activity.remarks || '—'}
                                        </TableCell>
                                        <TableCell className="max-w-xs truncate">
                                            {activity.notes || '—'}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                            {isLoadingMore && !isLoading && (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-6">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                            <span className="text-sm text-muted-foreground">Loading more activities...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

