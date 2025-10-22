import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router, usePage, useForm } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { FileDown, Search, Loader2, Plus, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
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
    stages: string[];
    filters: {
        stage?: string;
        agent_id?: number;
        search?: string;
        pic_status?: string;
        interest_level?: string;
        sort_by?: string;
        sort_direction?: string;
    };
    [key: string]: any;
}

export default function CompaniesIndex() {
    const { companies: initialCompanies, agents, stages, filters } = usePage<PageProps>().props;
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

    const [localFilters, setLocalFilters] = useState({
        stage: filters.stage || 'all',
        agent_id: filters.agent_id?.toString() || 'all',
        search: filters.search || '',
        pic_status: filters.pic_status || 'all',
        interest_level: filters.interest_level || 'all',
        sort_by: filters.sort_by || 'created_at',
        sort_direction: filters.sort_direction || 'desc',
    });

    const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);

    const addCompanyForm = useForm({
        name: '',
        stage: 'PIC Not Identified',
        agent_id: '',
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
        const params: Record<string, string> = {};
        
        if (localFilters.stage && localFilters.stage !== 'all') params.stage = localFilters.stage;
        if (localFilters.agent_id && localFilters.agent_id !== 'all') params.agent_id = localFilters.agent_id;
        if (localFilters.search) params.search = localFilters.search;
        if (localFilters.pic_status && localFilters.pic_status !== 'all') params.pic_status = localFilters.pic_status;
        if (localFilters.interest_level && localFilters.interest_level !== 'all') params.interest_level = localFilters.interest_level;
        if (localFilters.sort_by) params.sort_by = localFilters.sort_by;
        if (localFilters.sort_direction) params.sort_direction = localFilters.sort_direction;

        router.get('/sales/companies', params, {
            preserveState: true,
            preserveScroll: true,
            only: ['companies'],
        });
    };

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...localFilters, [key]: value };
        setLocalFilters(newFilters);

        if (key !== 'search') {
            // Apply immediately for non-search filters
            const params: Record<string, string> = {};
            if (newFilters.stage && newFilters.stage !== 'all') params.stage = newFilters.stage;
            if (newFilters.agent_id && newFilters.agent_id !== 'all') params.agent_id = newFilters.agent_id;
            if (newFilters.search) params.search = newFilters.search;
            if (newFilters.pic_status && newFilters.pic_status !== 'all') params.pic_status = newFilters.pic_status;
            if (newFilters.interest_level && newFilters.interest_level !== 'all') params.interest_level = newFilters.interest_level;
            if (newFilters.sort_by) params.sort_by = newFilters.sort_by;
            if (newFilters.sort_direction) params.sort_direction = newFilters.sort_direction;

            router.get('/sales/companies', params, {
                preserveState: true,
                preserveScroll: true,
                only: ['companies'],
            });
        }
    };

    const loadMoreCompanies = useCallback(() => {
        if (loadingRef.current || !hasMorePages || isLoadingMore) return;

        loadingRef.current = true;
        setIsLoadingMore(true);

        const params: Record<string, string> = {
            page: (currentPage + 1).toString(),
        };
        
        if (localFilters.stage && localFilters.stage !== 'all') params.stage = localFilters.stage;
        if (localFilters.agent_id && localFilters.agent_id !== 'all') params.agent_id = localFilters.agent_id;
        if (localFilters.search) params.search = localFilters.search;
        if (localFilters.pic_status && localFilters.pic_status !== 'all') params.pic_status = localFilters.pic_status;
        if (localFilters.interest_level && localFilters.interest_level !== 'all') params.interest_level = localFilters.interest_level;
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
        const params: Record<string, string> = {};
        if (newFilters.stage && newFilters.stage !== 'all') params.stage = newFilters.stage;
        if (newFilters.agent_id && newFilters.agent_id !== 'all') params.agent_id = newFilters.agent_id;
        if (newFilters.search) params.search = newFilters.search;
        if (newFilters.pic_status && newFilters.pic_status !== 'all') params.pic_status = newFilters.pic_status;
        if (newFilters.interest_level && newFilters.interest_level !== 'all') params.interest_level = newFilters.interest_level;
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
        if (localFilters.stage && localFilters.stage !== 'all') params.append('stage', localFilters.stage);
        if (localFilters.agent_id && localFilters.agent_id !== 'all') params.append('agent_id', localFilters.agent_id);
        if (localFilters.search) params.append('search', localFilters.search);
        if (localFilters.pic_status && localFilters.pic_status !== 'all') params.append('pic_status', localFilters.pic_status);
        if (localFilters.interest_level && localFilters.interest_level !== 'all') params.append('interest_level', localFilters.interest_level);
        if (localFilters.sort_by) params.append('sort_by', localFilters.sort_by);
        if (localFilters.sort_direction) params.append('sort_direction', localFilters.sort_direction);

        window.location.href = `/sales/companies/export?${params.toString()}`;
    };

    const clearFilters = () => {
        setLocalFilters({
            stage: 'all',
            agent_id: 'all',
            search: '',
            pic_status: 'all',
            interest_level: 'all',
            sort_by: 'created_at',
            sort_direction: 'desc',
        });
        router.get('/sales/companies', {}, {
            preserveState: true,
            preserveScroll: true,
            only: ['companies'],
        });
    };

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
                    <h1 className="text-2xl font-bold">Companies</h1>
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
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 rounded-lg border bg-card p-4">
                    <div className="space-y-2">
                        <Label htmlFor="search">Search</Label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                            <Input
                                id="search"
                                placeholder="Search companies..."
                                value={localFilters.search}
                                onChange={(e) => handleFilterChange('search', e.target.value)}
                                className="pl-9"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="stage-filter">Stage</Label>
                        <Select value={localFilters.stage} onValueChange={(val) => handleFilterChange('stage', val)}>
                            <SelectTrigger id="stage-filter">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Stages</SelectItem>
                                {stages.map((stage) => (
                                    <SelectItem key={stage} value={stage}>
                                        {stage}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="agent-filter">Agent</Label>
                        <Select value={localFilters.agent_id} onValueChange={(val) => handleFilterChange('agent_id', val)}>
                            <SelectTrigger id="agent-filter">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Agents</SelectItem>
                                {agents.map((agent) => (
                                    <SelectItem key={agent.id} value={agent.id.toString()}>
                                        {agent.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="pic-status-filter">PIC Status</Label>
                        <Select value={localFilters.pic_status} onValueChange={(val) => handleFilterChange('pic_status', val)}>
                            <SelectTrigger id="pic-status-filter">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All</SelectItem>
                                <SelectItem value="identified">Identified</SelectItem>
                                <SelectItem value="not_identified">Not Identified</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="interest-level-filter">Interest Level</Label>
                        <Select value={localFilters.interest_level} onValueChange={(val) => handleFilterChange('interest_level', val)}>
                            <SelectTrigger id="interest-level-filter">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Levels</SelectItem>
                                <SelectItem value="Cold">Cold</SelectItem>
                                <SelectItem value="Warm">Warm</SelectItem>
                                <SelectItem value="Hot">Hot</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div>
                        Total: {totalCount} (Loaded: {companies.length})
                    </div>
                    {(localFilters.stage !== 'all' || localFilters.agent_id !== 'all' || localFilters.search || localFilters.pic_status !== 'all' || localFilters.interest_level !== 'all') && (
                        <Button variant="ghost" size="sm" onClick={clearFilters}>
                            Clear Filters
                        </Button>
                    )}
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

