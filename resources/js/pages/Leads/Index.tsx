import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Download, X } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Leads',
        href: '/sales/leads',
    },
];

interface Agent {
    id: number;
    name: string;
}

interface Campaign {
    id: number;
    name: string;
    status: string;
}

interface Company {
    id: number;
    name: string;
}

interface Partner {
    id: number;
    name: string;
}

interface Lead {
    id: number;
    campaign_id: number;
    campaign: Campaign;
    company_id: number;
    company: Company;
    contacts_count: number;
    stage: string;
    agent_id: number;
    agent: Agent;
    partner_id: number | null;
    partner: Partner | null;
    next_followup_date: string | null;
    last_activity_date: string | null;
    updated_at: string;
}

interface PageProps {
    leads: {
        data: Lead[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    campaigns: Campaign[];
    agents: Agent[];
    stages: string[];
    filters: {
        search?: string;
        campaign_id?: string | string[];
        stage?: string | string[];
        agent_id?: string | string[];
        sort_by?: string;
        sort_direction?: 'asc' | 'desc';
    };
    [key: string]: any;
}

export default function LeadsIndex() {
    const { leads: initialLeads, campaigns = [], agents = [], stages = [], filters = {} } = usePage<PageProps>().props;
    
    const [leads, setLeads] = useState<Lead[]>(initialLeads?.data || []);
    const [currentPage, setCurrentPage] = useState(initialLeads?.current_page || 1);
    const [hasMorePages, setHasMorePages] = useState(initialLeads ? initialLeads.current_page < initialLeads.last_page : false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(false);

    // Helper function to parse filter values
    const parseFilterArray = (value: string | string[] | undefined): string[] => {
        if (!value) return [];
        return Array.isArray(value) ? value : [value];
    };

    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>(parseFilterArray(filters.campaign_id));
    const [selectedStages, setSelectedStages] = useState<string[]>(parseFilterArray(filters.stage));
    const [selectedAgents, setSelectedAgents] = useState<string[]>(parseFilterArray(filters.agent_id));
    const [sortBy, setSortBy] = useState<string>(filters.sort_by || '');
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(filters.sort_direction || 'asc');
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    const loadMoreLeads = useCallback(() => {
        if (loadingRef.current || !hasMorePages || isLoadingMore) return;

        loadingRef.current = true;
        setIsLoadingMore(true);

        const params: any = {
            page: (currentPage + 1).toString(),
        };

        if (searchQuery) params.search = searchQuery;
        if (selectedCampaigns.length > 0) params.campaign_id = selectedCampaigns;
        if (selectedStages.length > 0) params.stage = selectedStages;
        if (selectedAgents.length > 0) params.agent_id = selectedAgents;
        if (sortBy) {
            params.sort_by = sortBy;
            params.sort_direction = sortDirection;
        }

        router.get('/sales/leads', params, {
            preserveState: true,
            preserveScroll: true,
            only: ['leads'],
            onSuccess: (response: any) => {
                const newLeads = response.props.leads;
                setLeads(prev => [...prev, ...newLeads.data]);
                setCurrentPage(newLeads.current_page);
                setHasMorePages(newLeads.current_page < newLeads.last_page);
                setIsLoadingMore(false);
                loadingRef.current = false;
            },
            onError: () => {
                setIsLoadingMore(false);
                loadingRef.current = false;
            },
        });
    }, [hasMorePages, isLoadingMore, currentPage, searchQuery, selectedCampaigns, selectedStages, selectedAgents, sortBy, sortDirection]);

    // Infinite scroll
    useEffect(() => {
        const container = scrollRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
            
            if (distanceFromBottom < 200 && hasMorePages && !isLoadingMore && !loadingRef.current) {
                loadMoreLeads();
            }
        };

        container.addEventListener('scroll', handleScroll);
        
        const checkInitialLoad = () => {
            const { scrollHeight, clientHeight } = container;
            if (scrollHeight <= clientHeight && hasMorePages && !isLoadingMore) {
                loadMoreLeads();
            }
        };
        
        setTimeout(checkInitialLoad, 100);

        return () => container.removeEventListener('scroll', handleScroll);
    }, [hasMorePages, isLoadingMore, currentPage, leads.length, loadMoreLeads]);

    const applyFilters = useCallback((search?: string) => {
        const params: any = {};
        const currentSearch = search !== undefined ? search : searchQuery;
        
        if (currentSearch) params.search = currentSearch;
        if (selectedCampaigns.length > 0) params.campaign_id = selectedCampaigns;
        if (selectedStages.length > 0) params.stage = selectedStages;
        if (selectedAgents.length > 0) params.agent_id = selectedAgents;
        if (sortBy) {
            params.sort_by = sortBy;
            params.sort_direction = sortDirection;
        }

        router.get('/sales/leads', params, {
            preserveState: true,
            preserveScroll: true,
            only: ['leads'],
            onSuccess: (response: any) => {
                setLeads(response.props.leads.data);
                setCurrentPage(response.props.leads.current_page);
                setHasMorePages(response.props.leads.current_page < response.props.leads.last_page);
            },
        });
    }, [searchQuery, selectedCampaigns, selectedStages, selectedAgents, sortBy, sortDirection]);

    // Debounced search
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);
        
        // Clear existing timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        
        // Set new timeout for debounced search
        searchTimeoutRef.current = setTimeout(() => {
            applyFilters(value);
        }, 500);
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, []);

    const clearFilters = () => {
        // Clear timeout if exists
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        
        setSearchQuery('');
        setSelectedCampaigns([]);
        setSelectedStages([]);
        setSelectedAgents([]);
        setSortBy('');
        setSortDirection('asc');
        
        router.get('/sales/leads', {}, {
            preserveState: false,
            onSuccess: (response: any) => {
                setLeads(response.props.leads.data);
                setCurrentPage(response.props.leads.current_page);
                setHasMorePages(response.props.leads.current_page < response.props.leads.last_page);
            },
        });
    };

    // Handle filter changes - apply immediately
    const handleCampaignChange = (values: string[]) => {
        setSelectedCampaigns(values);
        setTimeout(() => {
            const params: any = {};
            if (searchQuery) params.search = searchQuery;
            if (values.length > 0) params.campaign_id = values;
            if (selectedStages.length > 0) params.stage = selectedStages;
            if (selectedAgents.length > 0) params.agent_id = selectedAgents;
            if (sortBy) {
                params.sort_by = sortBy;
                params.sort_direction = sortDirection;
            }

            router.get('/sales/leads', params, {
                preserveState: true,
                preserveScroll: true,
                only: ['leads'],
                onSuccess: (response: any) => {
                    setLeads(response.props.leads.data);
                    setCurrentPage(response.props.leads.current_page);
                    setHasMorePages(response.props.leads.current_page < response.props.leads.last_page);
                },
            });
        }, 0);
    };

    const handleStageChange = (values: string[]) => {
        setSelectedStages(values);
        setTimeout(() => {
            const params: any = {};
            if (searchQuery) params.search = searchQuery;
            if (selectedCampaigns.length > 0) params.campaign_id = selectedCampaigns;
            if (values.length > 0) params.stage = values;
            if (selectedAgents.length > 0) params.agent_id = selectedAgents;
            if (sortBy) {
                params.sort_by = sortBy;
                params.sort_direction = sortDirection;
            }

            router.get('/sales/leads', params, {
                preserveState: true,
                preserveScroll: true,
                only: ['leads'],
                onSuccess: (response: any) => {
                    setLeads(response.props.leads.data);
                    setCurrentPage(response.props.leads.current_page);
                    setHasMorePages(response.props.leads.current_page < response.props.leads.last_page);
            },
        });
        }, 0);
    };

    const handleAgentChange = (values: string[]) => {
        setSelectedAgents(values);
        setTimeout(() => {
            const params: any = {};
            if (searchQuery) params.search = searchQuery;
            if (selectedCampaigns.length > 0) params.campaign_id = selectedCampaigns;
            if (selectedStages.length > 0) params.stage = selectedStages;
            if (values.length > 0) params.agent_id = values;
            if (sortBy) {
                params.sort_by = sortBy;
                params.sort_direction = sortDirection;
            }

            router.get('/sales/leads', params, {
                preserveState: true,
                preserveScroll: true,
                only: ['leads'],
                onSuccess: (response: any) => {
                    setLeads(response.props.leads.data);
                    setCurrentPage(response.props.leads.current_page);
                    setHasMorePages(response.props.leads.current_page < response.props.leads.last_page);
            },
        });
        }, 0);
    };

    const handleSort = (column: string) => {
        let newDirection: 'asc' | 'desc' = 'asc';
        
        // If clicking the same column, toggle direction
        if (sortBy === column) {
            newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        }
        
        setSortBy(column);
        setSortDirection(newDirection);
        
        // Apply sort immediately
        const params: any = {};
        if (searchQuery) params.search = searchQuery;
        if (selectedCampaigns.length > 0) params.campaign_id = selectedCampaigns;
        if (selectedStages.length > 0) params.stage = selectedStages;
        if (selectedAgents.length > 0) params.agent_id = selectedAgents;
        params.sort_by = column;
        params.sort_direction = newDirection;

        router.get('/sales/leads', params, {
            preserveState: true,
            preserveScroll: true,
            only: ['leads'],
            onSuccess: (response: any) => {
                setLeads(response.props.leads.data);
                setCurrentPage(response.props.leads.current_page);
                setHasMorePages(response.props.leads.current_page < response.props.leads.last_page);
            },
        });
    };

    const getSortIcon = (column: string) => {
        if (sortBy !== column) {
            return <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />;
        }
        return sortDirection === 'asc' 
            ? <ArrowUp className="ml-2 h-4 w-4 text-blue-600" />
            : <ArrowDown className="ml-2 h-4 w-4 text-blue-600" />;
    };

    const getStageBadgeColor = (stage: string) => {
        switch (stage) {
            case 'PIC Not Identified': return 'bg-slate-100 text-slate-800';
            case 'PIC Identified': return 'bg-blue-100 text-blue-800';
            case 'Contacted': return 'bg-purple-100 text-purple-800';
            case 'Demo Requested': return 'bg-indigo-100 text-indigo-800';
            case 'Demo Completed': return 'bg-cyan-100 text-cyan-800';
            case 'Questionnaire Sent': return 'bg-sky-100 text-sky-800';
            case 'Questionnaire Replied': return 'bg-teal-100 text-teal-800';
            case 'Proposal': return 'bg-yellow-100 text-yellow-800';
            case 'Closed Won': return 'bg-green-100 text-green-800';
            case 'Closed Lost': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDateTime = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const hasActiveFilters = searchQuery || selectedCampaigns.length > 0 || selectedStages.length > 0 || selectedAgents.length > 0;

    const handleExport = () => {
        const params = new URLSearchParams();
        if (searchQuery) params.append('search', searchQuery);
        selectedCampaigns.forEach(id => params.append('campaign_id[]', id));
        selectedStages.forEach(stage => params.append('stage[]', stage));
        selectedAgents.forEach(id => params.append('agent_id[]', id));
        if (sortBy) {
            params.append('sort_by', sortBy);
            params.append('sort_direction', sortDirection);
        }
        
        window.location.href = `/sales/leads/export?${params.toString()}`;
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Leads" />

            <div className="flex h-screen flex-col gap-6 rounded-xl p-6 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                    <h1 className="text-3xl font-bold">Leads Management</h1>
                        <p className="text-gray-600 mt-1">
                            {initialLeads?.total || 0} total leads
                        </p>
                    </div>
                    <Button 
                        onClick={handleExport}
                        className="flex items-center gap-2"
                    >
                        <Download className="h-4 w-4" />
                        Export to Excel
                    </Button>
                </div>

                {/* Search and Filters */}
                <div className="bg-white rounded-lg border p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search Bar */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search by company name..."
                                value={searchQuery}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                className="pl-10 h-10"
                            />
                        </div>

                        {/* Filters */}
                        <div className="flex-1">
                            <MultiSelect
                                options={campaigns.map(campaign => ({
                                    label: campaign.name,
                                    value: campaign.id.toString()
                                }))}
                                selected={selectedCampaigns}
                                onChange={handleCampaignChange}
                                placeholder="All campaigns"
                            />
                        </div>

                        <div className="flex-1">
                            <MultiSelect
                                options={stages.map(stage => ({
                                    label: stage,
                                    value: stage
                                }))}
                                selected={selectedStages}
                                onChange={handleStageChange}
                                placeholder="All stages"
                            />
                        </div>

                        <div className="flex-1">
                            <MultiSelect
                                options={agents.map(agent => ({
                                    label: agent.name,
                                    value: agent.id.toString()
                                }))}
                                selected={selectedAgents}
                                onChange={handleAgentChange}
                                placeholder="All agents"
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

                {/* Leads Table */}
                <div className="flex-1 overflow-hidden bg-white rounded-lg border">
                    <div className="h-full overflow-y-auto" ref={scrollRef}>
                        {leads.length > 0 ? (
                            <>
                                <Table>
                                    <TableHeader className="sticky top-0 bg-white z-10">
                                        <TableRow>
                                            <TableHead>
                                                <button 
                                                    onClick={() => handleSort('company_name')}
                                                    className="flex items-center hover:text-blue-600 transition-colors font-medium"
                                                >
                                                    Company
                                                    {getSortIcon('company_name')}
                                                </button>
                                            </TableHead>
                                            <TableHead>
                                                <button 
                                                    onClick={() => handleSort('campaign_name')}
                                                    className="flex items-center hover:text-blue-600 transition-colors font-medium"
                                                >
                                                    Campaign
                                                    {getSortIcon('campaign_name')}
                                                </button>
                                            </TableHead>
                                            <TableHead>
                                                <button 
                                                    onClick={() => handleSort('stage')}
                                                    className="flex items-center hover:text-blue-600 transition-colors font-medium"
                                                >
                                                    Stage
                                                    {getSortIcon('stage')}
                                                </button>
                                            </TableHead>
                                            <TableHead>
                                                <button 
                                                    onClick={() => handleSort('agent_name')}
                                                    className="flex items-center hover:text-blue-600 transition-colors font-medium"
                                                >
                                                    Agent
                                                    {getSortIcon('agent_name')}
                                                </button>
                                            </TableHead>
                                            <TableHead className="text-center">
                                                <button 
                                                    onClick={() => handleSort('contacts_count')}
                                                    className="flex items-center justify-center hover:text-blue-600 transition-colors font-medium mx-auto"
                                                >
                                                    Contacts
                                                    {getSortIcon('contacts_count')}
                                                </button>
                                            </TableHead>
                                            <TableHead>
                                                <button 
                                                    onClick={() => handleSort('next_followup_date')}
                                                    className="flex items-center hover:text-blue-600 transition-colors font-medium"
                                                >
                                                    Next Follow-up
                                                    {getSortIcon('next_followup_date')}
                                                </button>
                                            </TableHead>
                                            <TableHead>
                                                <button 
                                                    onClick={() => handleSort('last_activity_date')}
                                                    className="flex items-center hover:text-blue-600 transition-colors font-medium"
                                                >
                                                    Last Activity
                                                    {getSortIcon('last_activity_date')}
                                                </button>
                                            </TableHead>
                                            <TableHead>
                                                <button 
                                                    onClick={() => handleSort('partner_name')}
                                                    className="flex items-center hover:text-blue-600 transition-colors font-medium"
                                                >
                                                    Partner
                                                    {getSortIcon('partner_name')}
                                                </button>
                                            </TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {leads.map(lead => (
                                            <TableRow
                                                key={lead.id}
                                                className="cursor-pointer hover:bg-gray-50"
                                            >
                                                <TableCell className="font-medium max-w-[250px] whitespace-normal break-words p-0">
                                                    <Link href={`/sales/leads/${lead.id}`} className="block px-4 py-4">
                                                        {lead.company.name}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="text-sm p-0">
                                                    <Link href={`/sales/leads/${lead.id}`} className="block px-4 py-4">
                                                        {lead.campaign.name}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="p-0">
                                                    <Link href={`/sales/leads/${lead.id}`} className="block px-4 py-4">
                                                        <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStageBadgeColor(lead.stage)}`}>
                                                            {lead.stage}
                                                        </span>
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="p-0">
                                                    <Link href={`/sales/leads/${lead.id}`} className="block px-4 py-4">
                                                        {lead.agent ? lead.agent.name : '-'}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="text-center p-0">
                                                    <Link href={`/sales/leads/${lead.id}`} className="block px-4 py-4">
                                                        <span className="inline-flex items-center justify-center px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">
                                                            {lead.contacts_count}
                                                        </span>
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-600 p-0">
                                                    <Link href={`/sales/leads/${lead.id}`} className="block px-4 py-4">
                                                        {lead.next_followup_date 
                                                            ? new Date(lead.next_followup_date).toLocaleDateString('en-US', {
                                                                year: 'numeric',
                                                                month: 'short',
                                                                day: 'numeric',
                                                            })
                                                            : '-'}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="text-sm text-gray-600 p-0">
                                                    <Link href={`/sales/leads/${lead.id}`} className="block px-4 py-4">
                                                        {lead.last_activity_date 
                                                            ? formatDateTime(lead.last_activity_date)
                                                            : '-'}
                                                    </Link>
                                                </TableCell>
                                                <TableCell className="p-0">
                                                    <Link href={`/sales/leads/${lead.id}`} className="block px-4 py-4">
                                                        {lead.partner ? lead.partner.name : '-'}
                                                    </Link>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                                
                                {isLoadingMore && (
                                    <div className="flex justify-center py-4 border-t">
                                        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                                    </div>
                                )}
                                
                                {!hasMorePages && leads.length > 0 && (
                                    <div className="text-center py-4 text-sm text-gray-500 border-t">
                                        No more leads to load
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="flex items-center justify-center h-full p-12">
                                <div className="text-center">
                                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100 mb-4">
                                        <Search className="h-8 w-8 text-gray-400" />
                            </div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No leads found</h3>
                                    <p className="text-gray-600">
                                        {hasActiveFilters 
                                            ? 'Try adjusting your search or filters to find what you\'re looking for.'
                                            : 'There are no leads available at the moment.'}
                                    </p>
                                    {hasActiveFilters && (
                                <Button
                                    variant="outline"
                                            onClick={clearFilters}
                                            className="mt-4"
                                        >
                                            Clear Filters
                                </Button>
                                    )}
                                </div>
                                                        </div>
                                    )}
                                </div>
                                </div>
            </div>
        </AppLayout>
    );
}
