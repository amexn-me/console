import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';
import { FileDown, Loader2, X } from 'lucide-react';

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

interface PageProps extends Record<string, unknown> {
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
        company_id?: number | number[];
        activity_type?: string | string[];
        agent_id?: number | number[];
        conversation_method?: string | string[];
        conversation_connected?: string | string[];
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

    // Helper function to parse filter values
    const parseFilterArray = (value: string | string[] | number | number[] | undefined): string[] => {
        if (!value) return [];
        if (Array.isArray(value)) return value.map(v => v.toString());
        return [value.toString()];
    };

    const [localFilters, setLocalFilters] = useState({
        company_id: parseFilterArray(filters.company_id),
        activity_type: parseFilterArray(filters.activity_type),
        agent_id: parseFilterArray(filters.agent_id),
        conversation_method: parseFilterArray(filters.conversation_method),
        conversation_connected: parseFilterArray(filters.conversation_connected),
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

    const handleFilterChange = (key: string, value: string | string[]) => {
        const newFilters = { ...localFilters, [key]: value };
        setLocalFilters(newFilters);
        
        setTimeout(() => {
            applyFilters(newFilters);
        }, 0);
    };

    const applyFilters = (newFilters = localFilters) => {
        const params: any = {};
        
        if (Array.isArray(newFilters.company_id) && newFilters.company_id.length > 0) params.company_id = newFilters.company_id;
        if (Array.isArray(newFilters.activity_type) && newFilters.activity_type.length > 0) params.activity_type = newFilters.activity_type;
        if (Array.isArray(newFilters.agent_id) && newFilters.agent_id.length > 0) params.agent_id = newFilters.agent_id;
        if (Array.isArray(newFilters.conversation_method) && newFilters.conversation_method.length > 0) params.conversation_method = newFilters.conversation_method;
        if (Array.isArray(newFilters.conversation_connected) && newFilters.conversation_connected.length > 0) params.conversation_connected = newFilters.conversation_connected;
        if (newFilters.from_date) params.from_date = newFilters.from_date;
        if (newFilters.to_date) params.to_date = newFilters.to_date;

        setIsLoading(true);
        router.get('/sales/activity-logs', params, {
            preserveState: true,
            preserveScroll: true,
            only: ['activities'],
            onFinish: () => setIsLoading(false),
        });
    };

    const loadMoreActivities = () => {
        if (loadingRef.current || !hasMorePages || isLoadingMore) return;

        loadingRef.current = true;
        setIsLoadingMore(true);

        const params: any = {
            page: (currentPage + 1).toString(),
        };
        
        if (localFilters.company_id.length > 0) params.company_id = localFilters.company_id;
        if (localFilters.activity_type.length > 0) params.activity_type = localFilters.activity_type;
        if (localFilters.agent_id.length > 0) params.agent_id = localFilters.agent_id;
        if (localFilters.conversation_method.length > 0) params.conversation_method = localFilters.conversation_method;
        if (localFilters.conversation_connected.length > 0) params.conversation_connected = localFilters.conversation_connected;
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
            company_id: [],
            activity_type: [],
            agent_id: [],
            conversation_method: [],
            conversation_connected: [],
            from_date: today,
            to_date: today,
        };
        setLocalFilters(resetFilters);
        setIsLoading(true);
        router.get('/sales/activity-logs', { from_date: today, to_date: today }, {
            preserveState: true,
            preserveScroll: true,
            only: ['activities'],
            onFinish: () => setIsLoading(false),
        });
    };

    const hasActiveFilters = localFilters.company_id.length > 0 || localFilters.activity_type.length > 0 || localFilters.agent_id.length > 0 || localFilters.conversation_method.length > 0 || localFilters.conversation_connected.length > 0;

    const handleExport = () => {
        const params = new URLSearchParams();
        localFilters.company_id.forEach(id => params.append('company_id[]', id));
        localFilters.activity_type.forEach(type => params.append('activity_type[]', type));
        localFilters.agent_id.forEach(id => params.append('agent_id[]', id));
        localFilters.conversation_method.forEach(method => params.append('conversation_method[]', method));
        localFilters.conversation_connected.forEach(status => params.append('conversation_connected[]', status));
        if (localFilters.from_date) params.append('from_date', localFilters.from_date);
        if (localFilters.to_date) params.append('to_date', localFilters.to_date);

        window.location.href = `/sales/activity-logs/export?${params.toString()}`;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Activity Logs" />
            <div className="flex h-screen flex-col gap-4 rounded-xl p-4 overflow-hidden">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h1 className="text-2xl font-bold">Activity Logs</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Total: {totalCount} (Loaded: {activities.length})
                        </p>
                    </div>
                    <Button onClick={handleExport}>
                        <FileDown className="mr-2 h-4 w-4" />
                        Export to Excel
                    </Button>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg border p-4">
                    {/* First Row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                        <div>
                            <Label htmlFor="company-filter" className="mb-2 block">Company</Label>
                            <MultiSelect
                                options={companies.map(company => ({
                                    label: company.name,
                                    value: company.id.toString()
                                }))}
                                selected={localFilters.company_id}
                                onChange={(values) => handleFilterChange('company_id', values)}
                                placeholder="All companies"
                            />
                        </div>

                        <div>
                            <Label htmlFor="user-filter" className="mb-2 block">Agent</Label>
                            <MultiSelect
                                options={agents.map(agent => ({
                                    label: agent.name,
                                    value: agent.id.toString()
                                }))}
                                selected={localFilters.agent_id}
                                onChange={(values) => handleFilterChange('agent_id', values)}
                                placeholder="All agents"
                            />
                        </div>

                        <div>
                            <Label htmlFor="conversation-method-filter" className="mb-2 block">Conversation Method</Label>
                            <MultiSelect
                                options={[
                                    { label: 'Call', value: 'Call' },
                                    { label: 'WhatsApp', value: 'WhatsApp' },
                                    { label: 'LinkedIn', value: 'LinkedIn' },
                                    { label: 'Email', value: 'Email' },
                                    { label: 'Teams Chat', value: 'Teams Chat' },
                                    { label: 'Other', value: 'Other' }
                                ]}
                                selected={localFilters.conversation_method}
                                onChange={(values) => handleFilterChange('conversation_method', values)}
                                placeholder="All methods"
                            />
                        </div>

                        <div>
                            <Label htmlFor="connection-status-filter" className="mb-2 block">Connection Status</Label>
                            <MultiSelect
                                options={[
                                    { label: 'Connected', value: 'Yes' },
                                    { label: 'Not Connected', value: 'No' }
                                ]}
                                selected={localFilters.conversation_connected}
                                onChange={(values) => handleFilterChange('conversation_connected', values)}
                                placeholder="All statuses"
                            />
                        </div>
                    </div>

                    {/* Second Row */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <Label htmlFor="activity-type-filter" className="mb-2 block">Activity Type</Label>
                            <MultiSelect
                                options={[
                                    { label: 'Update', value: 'update' },
                                    { label: 'Lead Created', value: 'lead_created' },
                                    { label: 'Lead Removed', value: 'lead_removed' },
                                    { label: 'Contact Added', value: 'contact_added' },
                                    { label: 'Contact Updated', value: 'contact_updated' },
                                    { label: 'Contact Created', value: 'contact_created' },
                                    { label: 'Contact PIC Updated', value: 'contact_pic_updated' },
                                    { label: 'Contact Invalidated', value: 'contact_invalidated' },
                                    { label: 'Stage Changed', value: 'stage_changed' },
                                    { label: 'Agent Change', value: 'agent_change' },
                                    { label: 'Proposal Updated', value: 'proposal_updated' },
                                    { label: 'Partner Updated', value: 'partner_updated' },
                                    { label: 'Partner Created', value: 'partner_created' },
                                    { label: 'Partner Deleted', value: 'partner_deleted' },
                                    { label: 'Project Created', value: 'project_created' },
                                    { label: 'Contract Created', value: 'contract_created' },
                                    { label: 'Files Uploaded', value: 'files_uploaded' },
                                    { label: 'Company Created', value: 'company_created' }
                                ]}
                                selected={localFilters.activity_type}
                                onChange={(values) => handleFilterChange('activity_type', values)}
                                placeholder="All types"
                            />
                        </div>

                        <div>
                            <Label htmlFor="from-date" className="mb-2 block">From Date</Label>
                            <Input
                                id="from-date"
                                type="date"
                                value={localFilters.from_date}
                                onChange={(e) => handleFilterChange('from_date', e.target.value)}
                                className="h-10"
                            />
                        </div>

                        <div>
                            <Label htmlFor="to-date" className="mb-2 block">To Date</Label>
                            <Input
                                id="to-date"
                                type="date"
                                value={localFilters.to_date}
                                onChange={(e) => handleFilterChange('to_date', e.target.value)}
                                className="h-10"
                            />
                        </div>

                        <div className="flex items-end">
                            <Button 
                                variant="outline" 
                                onClick={clearFilters} 
                                disabled={!hasActiveFilters}
                                className="w-full h-10 text-red-600 border-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-700 disabled:text-red-300 disabled:border-red-300"
                                title="Clear all filters"
                            >
                                <X className="h-4 w-4 mr-2" />
                                Clear
                            </Button>
                        </div>
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
                                        <TableCell className="font-medium max-w-[200px] break-words whitespace-normal">
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
                                        <TableCell className="max-w-[300px] break-words whitespace-normal">
                                            {activity.remarks || '—'}
                                        </TableCell>
                                        <TableCell className="max-w-[300px] break-words whitespace-normal">
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

