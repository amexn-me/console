import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router, usePage, useForm } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { FileDown, Search, Loader2, Plus, ArrowUpDown, ArrowUp, ArrowDown, X } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Companies',
        href: '/sales/companies',
    },
];

interface Contact {
    id: number;
    name: string;
    email: string;
    interest_level: string;
    is_pic: boolean;
}

interface Company {
    id: number;
    name: string;
    stage: string;
    agent?: {
        id: number;
        name: string;
    };
    partner?: {
        id: number;
        name: string;
    };
    contacts: Contact[];
    contacts_count: number;
    highest_interest_level: string;
    next_followup_date: string;
}

interface Agent {
    id: number;
    name: string;
}

interface Campaign {
    id: number;
    name: string;
}

interface PageProps {
    companies: {
        data: Company[];
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
    agents: Agent[];
    campaigns: Campaign[];
    stages: string[];
    filters: {
        stage?: string | string[];
        agent_id?: number | number[];
        search?: string;
        pic_status?: string | string[];
        interest_level?: string | string[];
        sort_by?: string;
        sort_direction?: string;
    };
    [key: string]: any;
}

export default function CompaniesIndex() {
    const { companies: initialCompanies, agents, campaigns, stages, filters } = usePage<PageProps>().props;
    const permissions = usePermissions();
    
    const [companies, setCompanies] = useState(initialCompanies.data);
    const [currentPage, setCurrentPage] = useState(initialCompanies.current_page);
    const [hasMorePages, setHasMorePages] = useState(initialCompanies.current_page < initialCompanies.last_page);
    const [totalCount, setTotalCount] = useState(initialCompanies.total);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(false);
    const isInitialLoad = useRef(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    // Helper function to parse filter values
    const parseFilterArray = (value: string | string[] | number | number[] | undefined): string[] => {
        if (!value) return [];
        if (Array.isArray(value)) return value.map(v => v.toString());
        return [value.toString()];
    };

    const [localFilters, setLocalFilters] = useState({
        stage: parseFilterArray(filters.stage),
        agent_id: parseFilterArray(filters.agent_id),
        search: filters.search || '',
        pic_status: parseFilterArray(filters.pic_status),
        interest_level: parseFilterArray(filters.interest_level),
        sort_by: filters.sort_by || 'created_at',
        sort_direction: filters.sort_direction || 'desc',
    });

    const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);

    const addCompanyForm = useForm({
        name: '',
        stage: 'PIC Not Identified',
        agent_id: '',
        campaign_id: '',
    });

    // Only reset companies on initial load or when page 1 is loaded
    useEffect(() => {
        if (isInitialLoad.current || initialCompanies.current_page === 1) {
            setCompanies(initialCompanies.data);
            setCurrentPage(initialCompanies.current_page);
            setHasMorePages(initialCompanies.current_page < initialCompanies.last_page);
            setTotalCount(initialCompanies.total);
            isInitialLoad.current = false;
        }
    }, [initialCompanies.data, initialCompanies.current_page]);

    useEffect(() => {
        if (searchDebounce) clearTimeout(searchDebounce);

        const timeout = setTimeout(() => {
            applyFilters();
        }, 500);

        setSearchDebounce(timeout);

        return () => {
            if (timeout) clearTimeout(timeout);
        };
    }, [localFilters.search]);

    const applyFilters = () => {
        const params: any = {};
        
        if (localFilters.stage.length > 0) params.stage = localFilters.stage;
        if (localFilters.agent_id.length > 0) params.agent_id = localFilters.agent_id;
        if (localFilters.search) params.search = localFilters.search;
        if (localFilters.pic_status.length > 0) params.pic_status = localFilters.pic_status;
        if (localFilters.interest_level.length > 0) params.interest_level = localFilters.interest_level;
        if (localFilters.sort_by) params.sort_by = localFilters.sort_by;
        if (localFilters.sort_direction) params.sort_direction = localFilters.sort_direction;

        router.get('/sales/companies', params, {
            preserveState: true,
            preserveScroll: true,
            only: ['companies'],
        });
    };

    const handleFilterChange = (key: string, value: string | string[]) => {
        const newFilters = { ...localFilters, [key]: value };
        setLocalFilters(newFilters);

        if (key !== 'search') {
            // Apply immediately for non-search filters
            setTimeout(() => {
                const params: any = {};
                if (Array.isArray(newFilters.stage) && newFilters.stage.length > 0) params.stage = newFilters.stage;
                if (Array.isArray(newFilters.agent_id) && newFilters.agent_id.length > 0) params.agent_id = newFilters.agent_id;
                if (newFilters.search) params.search = newFilters.search;
                if (Array.isArray(newFilters.pic_status) && newFilters.pic_status.length > 0) params.pic_status = newFilters.pic_status;
                if (Array.isArray(newFilters.interest_level) && newFilters.interest_level.length > 0) params.interest_level = newFilters.interest_level;
                if (newFilters.sort_by) params.sort_by = newFilters.sort_by;
                if (newFilters.sort_direction) params.sort_direction = newFilters.sort_direction;

                router.get('/sales/companies', params, {
                    preserveState: true,
                    preserveScroll: true,
                    only: ['companies'],
                });
            }, 0);
        }
    };

    const loadMoreCompanies = useCallback(() => {
        if (loadingRef.current || !hasMorePages || isLoadingMore) return;

        loadingRef.current = true;
        setIsLoadingMore(true);

        const params: any = {
            page: (currentPage + 1).toString(),
        };
        
        if (localFilters.stage.length > 0) params.stage = localFilters.stage;
        if (localFilters.agent_id.length > 0) params.agent_id = localFilters.agent_id;
        if (localFilters.search) params.search = localFilters.search;
        if (localFilters.pic_status.length > 0) params.pic_status = localFilters.pic_status;
        if (localFilters.interest_level.length > 0) params.interest_level = localFilters.interest_level;
        if (localFilters.sort_by) params.sort_by = localFilters.sort_by;
        if (localFilters.sort_direction) params.sort_direction = localFilters.sort_direction;

        router.get('/sales/companies', params, {
            preserveState: true,
            preserveScroll: true,
            only: ['companies'],
            onSuccess: (page: any) => {
                const newCompanies = page.props.companies;
                setCompanies(prev => [...prev, ...newCompanies.data]);
                setCurrentPage(newCompanies.current_page);
                setHasMorePages(newCompanies.current_page < newCompanies.last_page);
                setIsLoadingMore(false);
                loadingRef.current = false;
            },
            onError: () => {
                setIsLoadingMore(false);
                loadingRef.current = false;
            },
        });
    }, [hasMorePages, isLoadingMore, currentPage, localFilters]);

    // Infinite scroll handler
    useEffect(() => {
        const container = scrollContainerRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
            
            if (distanceFromBottom < 200 && hasMorePages && !isLoadingMore && !loadingRef.current) {
                loadMoreCompanies();
            }
        };

        container.addEventListener('scroll', handleScroll);
        
        const checkInitialLoad = () => {
            const { scrollHeight, clientHeight } = container;
            if (scrollHeight <= clientHeight && hasMorePages && !isLoadingMore) {
                loadMoreCompanies();
            }
        };
        
        setTimeout(checkInitialLoad, 100);

        return () => container.removeEventListener('scroll', handleScroll);
    }, [hasMorePages, isLoadingMore, currentPage, companies.length, loadMoreCompanies]);

    const handleSort = (column: string) => {
        let newDirection: 'asc' | 'desc' = 'asc';
        
        // If clicking the same column, toggle direction
        if (localFilters.sort_by === column) {
            newDirection = localFilters.sort_direction === 'asc' ? 'desc' : 'asc';
        }
        
        const newFilters = {
            ...localFilters,
            sort_by: column,
            sort_direction: newDirection
        };
        
        setLocalFilters(newFilters);
        
        // Apply sort immediately
        const params: any = {};
        if (newFilters.stage.length > 0) params.stage = newFilters.stage;
        if (newFilters.agent_id.length > 0) params.agent_id = newFilters.agent_id;
        if (newFilters.search) params.search = newFilters.search;
        if (newFilters.pic_status.length > 0) params.pic_status = newFilters.pic_status;
        if (newFilters.interest_level.length > 0) params.interest_level = newFilters.interest_level;
        params.sort_by = column;
        params.sort_direction = newDirection;

        router.get('/sales/companies', params, {
            preserveState: true,
            preserveScroll: true,
            only: ['companies'],
        });
    };

    const getSortIcon = (column: string) => {
        if (localFilters.sort_by !== column) {
            return <ArrowUpDown className="ml-2 h-4 w-4 text-gray-400" />;
        }
        return localFilters.sort_direction === 'asc' 
            ? <ArrowUp className="ml-2 h-4 w-4 text-blue-600" />
            : <ArrowDown className="ml-2 h-4 w-4 text-blue-600" />;
    };

    const handleExport = () => {
        const params = new URLSearchParams();
        localFilters.stage.forEach(s => params.append('stage[]', s));
        localFilters.agent_id.forEach(a => params.append('agent_id[]', a));
        if (localFilters.search) params.append('search', localFilters.search);
        localFilters.pic_status.forEach(p => params.append('pic_status[]', p));
        localFilters.interest_level.forEach(i => params.append('interest_level[]', i));
        if (localFilters.sort_by) params.append('sort_by', localFilters.sort_by);
        if (localFilters.sort_direction) params.append('sort_direction', localFilters.sort_direction);

        window.location.href = `/sales/companies/export?${params.toString()}`;
    };

    const clearFilters = () => {
        setLocalFilters({
            stage: [],
            agent_id: [],
            search: '',
            pic_status: [],
            interest_level: [],
            sort_by: 'created_at',
            sort_direction: 'desc',
        });
        router.get('/sales/companies', {}, {
            preserveState: true,
            preserveScroll: true,
            only: ['companies'],
        });
    };

    const hasActiveFilters = localFilters.search || localFilters.stage.length > 0 || localFilters.agent_id.length > 0 || localFilters.pic_status.length > 0 || localFilters.interest_level.length > 0;

    const getPICStatus = (company: Company) => {
        const hasPIC = company.contacts.some(c => c.is_pic);
        return hasPIC ? 'Identified' : 'Not Identified';
    };

    const getInterestLevel = (company: Company) => {
        return company.highest_interest_level || 'N/A';
    };

    const handleAddCompany = (e: React.FormEvent) => {
        e.preventDefault();
        addCompanyForm.post('/sales/companies', {
            preserveScroll: true,
            onSuccess: () => {
                setIsAddDialogOpen(false);
                addCompanyForm.reset();
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Companies" />
            <div className="flex h-screen flex-col gap-4 rounded-xl p-4 overflow-hidden">
                <div className="mb-2 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold">Companies</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Total: {totalCount} (Loaded: {companies.length})
                        </p>
                    </div>
                    <div className="flex gap-2">
                        {(permissions.isSuperAdmin || permissions.isSegmentAdmin) && (
                            <Button onClick={() => setIsAddDialogOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Company
                            </Button>
                        )}
                        <Button onClick={handleExport}>
                            <FileDown className="mr-2 h-4 w-4" />
                            Export to Excel
                        </Button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-white rounded-lg border p-4">
                    <div className="flex flex-col md:flex-row gap-4">
                        {/* Search Bar */}
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <Input
                                type="text"
                                placeholder="Search companies..."
                                value={localFilters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                className="pl-10 h-10"
                            />
                        </div>

                        {/* Filters */}
                        <div className="flex-1">
                            <MultiSelect
                                options={stages.map(stage => ({
                                    label: stage,
                                    value: stage
                                }))}
                                selected={localFilters.stage}
                                onChange={(values) => handleFilterChange('stage', values)}
                                placeholder="All stages"
                            />
                        </div>

                        <div className="flex-1">
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

                        <div className="flex-1">
                            <MultiSelect
                                options={[
                                    { label: 'Identified', value: 'identified' },
                                    { label: 'Not Identified', value: 'not_identified' }
                                ]}
                                selected={localFilters.pic_status}
                                onChange={(values) => handleFilterChange('pic_status', values)}
                                placeholder="PIC Status"
                            />
                        </div>

                        <div className="flex-1">
                            <MultiSelect
                                options={[
                                    { label: 'Cold', value: 'Cold' },
                                    { label: 'Warm', value: 'Warm' },
                                    { label: 'Hot', value: 'Hot' }
                                ]}
                                selected={localFilters.interest_level}
                                onChange={(values) => handleFilterChange('interest_level', values)}
                                placeholder="Interest Level"
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

                {/* Table */}
                <div className="flex-1 overflow-hidden rounded-lg border flex flex-col">
                    <div ref={scrollContainerRef} className="overflow-auto flex-1">
                        <Table>
                        <TableHeader className="sticky top-0 bg-white z-10">
                            <TableRow>
                                <TableHead>
                                    <button 
                                        onClick={() => handleSort('name')}
                                        className="flex items-center hover:text-blue-600 transition-colors font-medium"
                                    >
                                        Company
                                        {getSortIcon('name')}
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
                                <TableHead>
                                    <button 
                                        onClick={() => handleSort('contacts_count')}
                                        className="flex items-center hover:text-blue-600 transition-colors font-medium"
                                    >
                                        Contacts
                                        {getSortIcon('contacts_count')}
                                    </button>
                                </TableHead>
                                <TableHead>PIC Status</TableHead>
                                <TableHead>Interest</TableHead>
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
                            {companies.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                        No companies found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                companies.map((company) => (
                                    <TableRow 
                                        key={company.id}
                                        className="cursor-pointer hover:bg-muted/50 transition-colors"
                                        onClick={() => router.visit(`/sales/companies/${company.id}`)}
                                    >
                                        <TableCell className="font-medium max-w-[250px] whitespace-normal break-words">{company.name}</TableCell>
                                        <TableCell>
                                            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                                                {company.stage || 'N/A'}
                                            </span>
                                        </TableCell>
                                        <TableCell>{company.agent?.name || '—'}</TableCell>
                                        <TableCell>{company.contacts_count || 0}</TableCell>
                                        <TableCell>
                                            <span className={`rounded-full px-2 py-1 text-xs ${
                                                getPICStatus(company) === 'Identified'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-gray-100 text-gray-700'
                                            }`}>
                                                {getPICStatus(company)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            <span className={`rounded-full px-2 py-1 text-xs ${
                                                getInterestLevel(company) === 'Hot'
                                                    ? 'bg-red-100 text-red-700'
                                                    : getInterestLevel(company) === 'Warm'
                                                    ? 'bg-yellow-100 text-yellow-700'
                                                    : 'bg-gray-100 text-gray-700'
                                            }`}>
                                                {getInterestLevel(company)}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {company.next_followup_date || '—'}
                                        </TableCell>
                                        <TableCell>{company.partner?.name || '—'}</TableCell>
                                    </TableRow>
                                ))
                            )}
                            {isLoadingMore && (
                                <TableRow>
                                    <TableCell colSpan={8} className="text-center py-6">
                                        <div className="flex items-center justify-center gap-2">
                                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                            <span className="text-sm text-muted-foreground">Loading more...</span>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                    </div>
                </div>
            </div>

            {/* Add Company Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Add New Company</DialogTitle>
                        <DialogDescription>
                            Create a new company in the system.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddCompany} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Company Name *</Label>
                            <Input
                                id="name"
                                value={addCompanyForm.data.name}
                                onChange={(e) => addCompanyForm.setData('name', e.target.value)}
                                placeholder="Enter company name"
                                required
                            />
                            {addCompanyForm.errors.name && (
                                <p className="text-sm text-red-500">{addCompanyForm.errors.name}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="stage">Stage *</Label>
                            <Select
                                value={addCompanyForm.data.stage}
                                onValueChange={(value) => addCompanyForm.setData('stage', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select stage" />
                                </SelectTrigger>
                                <SelectContent>
                                    {stages.map((stage) => (
                                        <SelectItem key={stage} value={stage}>
                                            {stage}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {addCompanyForm.errors.stage && (
                                <p className="text-sm text-red-500">{addCompanyForm.errors.stage}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="agent_id">Assign to Agent *</Label>
                            <Select
                                value={addCompanyForm.data.agent_id}
                                onValueChange={(value) => addCompanyForm.setData('agent_id', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select agent" />
                                </SelectTrigger>
                                <SelectContent>
                                    {agents.map((agent) => (
                                        <SelectItem key={agent.id} value={agent.id.toString()}>
                                            {agent.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {addCompanyForm.errors.agent_id && (
                                <p className="text-sm text-red-500">{addCompanyForm.errors.agent_id}</p>
                            )}
                        </div>

                        {campaigns && campaigns.length > 0 && (
                            <div className="space-y-2">
                                <Label htmlFor="campaign_id">Select Campaign (Optional)</Label>
                                <Select
                                    value={addCompanyForm.data.campaign_id || undefined}
                                    onValueChange={(value) => addCompanyForm.setData('campaign_id', value)}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="None - Don't add to campaign" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {campaigns.map((campaign) => (
                                            <SelectItem key={campaign.id} value={campaign.id.toString()}>
                                                {campaign.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {addCompanyForm.errors.campaign_id && (
                                    <p className="text-sm text-red-500">{addCompanyForm.errors.campaign_id}</p>
                                )}
                            </div>
                        )}

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsAddDialogOpen(false);
                                    addCompanyForm.reset();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={addCompanyForm.processing}>
                                {addCompanyForm.processing ? 'Creating...' : 'Create Company'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

