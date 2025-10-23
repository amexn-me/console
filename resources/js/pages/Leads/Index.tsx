import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, Link, router, usePage } from '@inertiajs/react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Download } from 'lucide-react';

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
        campaign_id?: string;
        stage?: string;
        agent_id?: string;
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

    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [selectedCampaign, setSelectedCampaign] = useState<string>(filters.campaign_id || 'all');
    const [selectedStage, setSelectedStage] = useState<string>(filters.stage || 'all');
    const [selectedAgent, setSelectedAgent] = useState<string>(filters.agent_id || 'all');
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
        if (selectedCampaign !== 'all') params.campaign_id = selectedCampaign;
        if (selectedStage !== 'all') params.stage = selectedStage;
        if (selectedAgent !== 'all') params.agent_id = selectedAgent;
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
    }, [hasMorePages, isLoadingMore, currentPage, searchQuery, selectedCampaign, selectedStage, selectedAgent, sortBy, sortDirection]);

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
        if (selectedCampaign !== 'all') params.campaign_id = selectedCampaign;
        if (selectedStage !== 'all') params.stage = selectedStage;
        if (selectedAgent !== 'all') params.agent_id = selectedAgent;
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
    }, [searchQuery, selectedCampaign, selectedStage, selectedAgent, sortBy, sortDirection]);

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
        setSelectedCampaign('all');
        setSelectedStage('all');
        setSelectedAgent('all');
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
    const handleCampaignChange = (value: string) => {
        setSelectedCampaign(value);
        setTimeout(() => {
            const params: any = {};
            if (searchQuery) params.search = searchQuery;
            if (value !== 'all') params.campaign_id = value;
            if (selectedStage !== 'all') params.stage = selectedStage;
            if (selectedAgent !== 'all') params.agent_id = selectedAgent;
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

    const handleStageChange = (value: string) => {
        setSelectedStage(value);
        setTimeout(() => {
            const params: any = {};
            if (searchQuery) params.search = searchQuery;
            if (selectedCampaign !== 'all') params.campaign_id = selectedCampaign;
            if (value !== 'all') params.stage = value;
            if (selectedAgent !== 'all') params.agent_id = selectedAgent;
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

    const handleAgentChange = (value: string) => {
        setSelectedAgent(value);
        setTimeout(() => {
            const params: any = {};
            if (searchQuery) params.search = searchQuery;
            if (selectedCampaign !== 'all') params.campaign_id = selectedCampaign;
            if (selectedStage !== 'all') params.stage = selectedStage;
            if (value !== 'all') params.agent_id = value;
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
        if (selectedCampaign !== 'all') params.campaign_id = selectedCampaign;
        if (selectedStage !== 'all') params.stage = selectedStage;
        if (selectedAgent !== 'all') params.agent_id = selectedAgent;
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

    const hasActiveFilters = searchQuery || selectedCampaign !== 'all' || selectedStage !== 'all' || selectedAgent !== 'all';

    const handleExport = () => {
        const params = new URLSearchParams();
        if (searchQuery) params.append('search', searchQuery);
        if (selectedCampaign !== 'all') params.append('campaign_id', selectedCampaign);
        if (selectedStage !== 'all') params.append('stage', selectedStage);
        if (selectedAgent !== 'all') params.append('agent_id', selectedAgent);
        
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
                <div className="bg-white rounded-lg border p-6 space-y-4">
                    {/* Search Bar */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                            type="text"
                            placeholder="Search by company name..."
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="pl-10"
                        />
                    </div>

                    {/* Filters */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <Label htmlFor="campaign-filter">Campaign</Label>
                            <Select value={selectedCampaign} onValueChange={handleCampaignChange}>
                                <SelectTrigger id="campaign-filter">
                                    <SelectValue placeholder="All campaigns" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Campaigns</SelectItem>
                                    {campaigns.map(campaign => (
                                        <SelectItem key={campaign.id} value={campaign.id.toString()}>
                                            {campaign.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="stage-filter">Stage</Label>
                            <Select value={selectedStage} onValueChange={handleStageChange}>
                                <SelectTrigger id="stage-filter">
                                    <SelectValue placeholder="All stages" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Stages</SelectItem>
                                    {stages.map(stage => (
                                        <SelectItem key={stage} value={stage}>
                                            {stage}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div>
                            <Label htmlFor="agent-filter">Agent</Label>
                            <Select value={selectedAgent} onValueChange={handleAgentChange}>
                                <SelectTrigger id="agent-filter">
                                    <SelectValue placeholder="All agents" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Agents</SelectItem>
                                    {agents.map(agent => (
                                        <SelectItem key={agent.id} value={agent.id.toString()}>
                                            {agent.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-end">
                            {hasActiveFilters && (
                            <Button
                                variant="outline"
                                    onClick={clearFilters}
                                    className="w-full"
                            >
                                    Clear Filters
                            </Button>
                                            )}
                                        </div>
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
