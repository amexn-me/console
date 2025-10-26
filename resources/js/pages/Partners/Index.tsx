import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import { FileDown, Pencil, Trash2, Eye, Loader2, X, Search } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Partners',
        href: '/sales/partners',
    },
];

interface Partner {
    id: number;
    name: string;
    email: string | null;
    partnership_model: string | null;
    notes: string | null;
    contract_status: string;
    created_at: string;
}

interface Company {
    id: number;
    name: string;
    stage: string;
    partner: Partner | null;
    lockin_date: string | null;
}

interface PageProps {
    partners: {
        data: Partner[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    partnerCompanies: {
        data: Company[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    allPartners: Partner[];
    stages: string[];
    filters: {
        partner_id?: number | number[];
        stage?: string | string[];
        search?: string;
        contract_status?: string | string[];
    };
    [key: string]: any;
}

export default function PartnersIndex() {
    const { partners: initialPartners, partnerCompanies: initialPartnerCompanies, allPartners, stages, filters } = usePage<PageProps>().props;

    // Partners state (All Partners tab)
    const [partners, setPartners] = useState(initialPartners.data);
    const [partnersCurrentPage, setPartnersCurrentPage] = useState(initialPartners.current_page);
    const [partnersHasMorePages, setPartnersHasMorePages] = useState(initialPartners.current_page < initialPartners.last_page);
    const [partnersTotalCount, setPartnersTotalCount] = useState(initialPartners.total);
    const [isLoadingMorePartners, setIsLoadingMorePartners] = useState(false);
    const partnersScrollRef = useRef<HTMLDivElement>(null);
    const partnersLoadingRef = useRef(false);
    const partnersIsInitialLoad = useRef(true);

    // Partner Companies state (Companies tab)
    const [partnerCompanies, setPartnerCompanies] = useState(initialPartnerCompanies.data);
    const [companiesCurrentPage, setCompaniesCurrentPage] = useState(initialPartnerCompanies.current_page);
    const [companiesHasMorePages, setCompaniesHasMorePages] = useState(initialPartnerCompanies.current_page < initialPartnerCompanies.last_page);
    const [companiesTotalCount, setCompaniesTotalCount] = useState(initialPartnerCompanies.total);
    const [isLoadingMoreCompanies, setIsLoadingMoreCompanies] = useState(false);
    const companiesScrollRef = useRef<HTMLDivElement>(null);
    const companiesLoadingRef = useRef(false);
    const companiesIsInitialLoad = useRef(true);

    const [dialogOpen, setDialogOpen] = useState(false);
    const [viewDialogOpen, setViewDialogOpen] = useState(false);
    const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
    const [viewingPartner, setViewingPartner] = useState<Partner | null>(null);

    // Helper function to parse filter values
    const parseFilterArray = (value: string | string[] | number | number[] | undefined): string[] => {
        if (!value) return [];
        if (Array.isArray(value)) return value.map(v => v.toString());
        return [value.toString()];
    };

    const [localFilters, setLocalFilters] = useState({
        partner_id: parseFilterArray(filters.partner_id),
        stage: parseFilterArray(filters.stage),
    });

    const [partnerFilters, setPartnerFilters] = useState({
        search: filters.search || '',
        contract_status: parseFilterArray(filters.contract_status),
    });

    // Debounce timer ref for search
    const searchDebounceTimer = useRef<NodeJS.Timeout | null>(null);

    // Cleanup debounce timer on unmount
    useEffect(() => {
        return () => {
            if (searchDebounceTimer.current) {
                clearTimeout(searchDebounceTimer.current);
            }
        };
    }, []);

    // Reset partners on initial load or when page 1 is loaded
    useEffect(() => {
        if (partnersIsInitialLoad.current || initialPartners.current_page === 1) {
            setPartners(initialPartners.data);
            setPartnersCurrentPage(initialPartners.current_page);
            setPartnersHasMorePages(initialPartners.current_page < initialPartners.last_page);
            setPartnersTotalCount(initialPartners.total);
            partnersIsInitialLoad.current = false;
        }
    }, [initialPartners.data, initialPartners.current_page]);

    // Reset partner companies on initial load or when page 1 is loaded
    useEffect(() => {
        if (companiesIsInitialLoad.current || initialPartnerCompanies.current_page === 1) {
            setPartnerCompanies(initialPartnerCompanies.data);
            setCompaniesCurrentPage(initialPartnerCompanies.current_page);
            setCompaniesHasMorePages(initialPartnerCompanies.current_page < initialPartnerCompanies.last_page);
            setCompaniesTotalCount(initialPartnerCompanies.total);
            companiesIsInitialLoad.current = false;
        }
    }, [initialPartnerCompanies.data, initialPartnerCompanies.current_page]);

    const loadMorePartners = () => {
        if (partnersLoadingRef.current || !partnersHasMorePages || isLoadingMorePartners) return;

        partnersLoadingRef.current = true;
        setIsLoadingMorePartners(true);

        const params: any = {
            partners_page: (partnersCurrentPage + 1).toString(),
        };
        
        if (partnerFilters.search) params.search = partnerFilters.search;
        if (partnerFilters.contract_status.length > 0) params.contract_status = partnerFilters.contract_status;

        router.get('/sales/partners', params, {
            preserveState: true,
            preserveScroll: true,
            only: ['partners'],
            onSuccess: (page: any) => {
                const newPartners = page.props.partners;
                setPartners(prev => [...prev, ...newPartners.data]);
                setPartnersCurrentPage(newPartners.current_page);
                setPartnersHasMorePages(newPartners.current_page < newPartners.last_page);
                setIsLoadingMorePartners(false);
                partnersLoadingRef.current = false;
            },
            onError: () => {
                setIsLoadingMorePartners(false);
                partnersLoadingRef.current = false;
            },
        });
    };

    const loadMorePartnerCompanies = () => {
        if (companiesLoadingRef.current || !companiesHasMorePages || isLoadingMoreCompanies) return;

        companiesLoadingRef.current = true;
        setIsLoadingMoreCompanies(true);

        const params: any = {
            companies_page: (companiesCurrentPage + 1).toString(),
        };
        
        if (localFilters.partner_id.length > 0) params.partner_id = localFilters.partner_id;
        if (localFilters.stage.length > 0) params.stage = localFilters.stage;

        router.get('/sales/partners', params, {
            preserveState: true,
            preserveScroll: true,
            only: ['partnerCompanies'],
            onSuccess: (page: any) => {
                const newCompanies = page.props.partnerCompanies;
                setPartnerCompanies(prev => [...prev, ...newCompanies.data]);
                setCompaniesCurrentPage(newCompanies.current_page);
                setCompaniesHasMorePages(newCompanies.current_page < newCompanies.last_page);
                setIsLoadingMoreCompanies(false);
                companiesLoadingRef.current = false;
            },
            onError: () => {
                setIsLoadingMoreCompanies(false);
                companiesLoadingRef.current = false;
            },
        });
    };

    // Infinite scroll handler for partners tab
    useEffect(() => {
        const container = partnersScrollRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
            
            if (distanceFromBottom < 200 && partnersHasMorePages && !isLoadingMorePartners && !partnersLoadingRef.current) {
                loadMorePartners();
            }
        };

        container.addEventListener('scroll', handleScroll);
        
        const checkInitialLoad = () => {
            const { scrollHeight, clientHeight } = container;
            if (scrollHeight <= clientHeight && partnersHasMorePages && !isLoadingMorePartners) {
                loadMorePartners();
            }
        };
        
        setTimeout(checkInitialLoad, 100);

        return () => container.removeEventListener('scroll', handleScroll);
    }, [partnersHasMorePages, isLoadingMorePartners, partnersCurrentPage, partners.length]);

    // Infinite scroll handler for partner companies tab
    useEffect(() => {
        const container = companiesScrollRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
            
            if (distanceFromBottom < 200 && companiesHasMorePages && !isLoadingMoreCompanies && !companiesLoadingRef.current) {
                loadMorePartnerCompanies();
            }
        };

        container.addEventListener('scroll', handleScroll);
        
        const checkInitialLoad = () => {
            const { scrollHeight, clientHeight } = container;
            if (scrollHeight <= clientHeight && companiesHasMorePages && !isLoadingMoreCompanies) {
                loadMorePartnerCompanies();
            }
        };
        
        setTimeout(checkInitialLoad, 100);

        return () => container.removeEventListener('scroll', handleScroll);
    }, [companiesHasMorePages, isLoadingMoreCompanies, companiesCurrentPage, partnerCompanies.length]);

    const form = useForm({
        name: '',
        email: '',
        partnership_model: '',
        notes: '',
        contract_status: 'Early Stage',
    });

    const openCreateDialog = () => {
        setEditingPartner(null);
        form.reset();
        form.setData({
            name: '',
            email: '',
            partnership_model: '',
            notes: '',
            contract_status: 'Early Stage',
        });
        setDialogOpen(true);
    };

    const openEditDialog = (partner: Partner) => {
        setEditingPartner(partner);
        form.setData({
            name: partner.name,
            email: partner.email || '',
            partnership_model: partner.partnership_model || '',
            notes: partner.notes || '',
            contract_status: partner.contract_status,
        });
        setDialogOpen(true);
    };

    const openViewDialog = (partner: Partner) => {
        setViewingPartner(partner);
        setViewDialogOpen(true);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingPartner) {
            form.put(route('partners.update', editingPartner.id), {
                onSuccess: () => {
                    setDialogOpen(false);
                    form.reset();
                },
            });
        } else {
            form.post(route('partners.store'), {
                onSuccess: () => {
                    setDialogOpen(false);
                    form.reset();
                },
            });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this partner?')) {
            router.delete(route('partners.destroy', id));
        }
    };

    const handlePartnerFilterChange = (key: string, value: string | string[]) => {
        const newFilters = { ...partnerFilters, [key]: value };
        setPartnerFilters(newFilters);

        // Clear existing debounce timer
        if (searchDebounceTimer.current) {
            clearTimeout(searchDebounceTimer.current);
        }

        // For search, apply debouncing
        if (key === 'search') {
            searchDebounceTimer.current = setTimeout(() => {
                const params: any = {};
                if (newFilters.search) params.search = newFilters.search;
                if (Array.isArray(newFilters.contract_status) && newFilters.contract_status.length > 0) params.contract_status = newFilters.contract_status;

                router.get('/sales/partners', params, {
                    preserveState: true,
                    preserveScroll: true,
                    only: ['partners'],
                });
            }, 500); // 500ms debounce
        } else {
            // For other filters (like contract_status), apply immediately
            setTimeout(() => {
                const params: any = {};
                if (newFilters.search) params.search = newFilters.search;
                if (Array.isArray(newFilters.contract_status) && newFilters.contract_status.length > 0) params.contract_status = newFilters.contract_status;

                router.get('/sales/partners', params, {
                    preserveState: true,
                    preserveScroll: true,
                    only: ['partners'],
                });
            }, 0);
        }
    };

    const handleCompanyFilterChange = (key: string, value: string[]) => {
        const newFilters = { ...localFilters, [key]: value };
        setLocalFilters(newFilters);

        setTimeout(() => {
            const params: any = {};
            if (newFilters.partner_id.length > 0) params.partner_id = newFilters.partner_id;
            if (newFilters.stage.length > 0) params.stage = newFilters.stage;

            router.get('/sales/partners', params, {
                preserveState: true,
                preserveScroll: true,
                only: ['partnerCompanies'],
            });
        }, 0);
    };

    const handleExportCompanies = () => {
        const params = new URLSearchParams();
        localFilters.partner_id.forEach(id => params.append('partner_id[]', id));
        localFilters.stage.forEach(stage => params.append('stage[]', stage));

        window.location.href = `/sales/partners/companies/export?${params.toString()}`;
    };

    const hasPartnerFilters = partnerFilters.search || partnerFilters.contract_status.length > 0;
    const hasCompanyFilters = localFilters.partner_id.length > 0 || localFilters.stage.length > 0;

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'early stage':
                return 'bg-blue-100 text-blue-700';
            case 'demo completed':
                return 'bg-purple-100 text-purple-700';
            case 'pending contract':
                return 'bg-yellow-100 text-yellow-700';
            case 'contract sent':
                return 'bg-orange-100 text-orange-700';
            case 'contract signed':
                return 'bg-green-100 text-green-700';
            case 'terminated':
                return 'bg-red-100 text-red-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Partners Management" />
            <div className="flex h-screen flex-col gap-4 rounded-xl p-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Partners Management</h1>
                    <Button onClick={openCreateDialog}>Add New Partner</Button>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="partners" className="flex-1 flex flex-col overflow-hidden">
                    <div className="w-fit">
                        <TabsList>
                            <TabsTrigger value="partners">All Partners</TabsTrigger>
                            <TabsTrigger value="companies">Companies with Partner Assignments</TabsTrigger>
                        </TabsList>
                    </div>

                    {/* All Partners Tab */}
                    <TabsContent value="partners" className="space-y-4 h-full flex flex-col overflow-hidden">
                        {/* Partner Filters */}
                        <div className="bg-white rounded-lg border p-4">
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="relative flex-1">
                                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                    <Input
                                        placeholder="Search by name or email..."
                                        value={partnerFilters.search}
                                        onChange={(e) => handlePartnerFilterChange('search', e.target.value)}
                                        className="pl-10 h-10"
                                    />
                                </div>

                                <div className="flex-1">
                                    <MultiSelect
                                        options={[
                                            { label: 'Early Stage', value: 'Early Stage' },
                                            { label: 'Demo completed', value: 'Demo completed' },
                                            { label: 'Pending contract', value: 'Pending contract' },
                                            { label: 'Contract sent', value: 'Contract sent' },
                                            { label: 'Contract signed', value: 'Contract signed' },
                                            { label: 'Terminated', value: 'Terminated' }
                                        ]}
                                        selected={partnerFilters.contract_status}
                                        onChange={(values) => handlePartnerFilterChange('contract_status', values)}
                                        placeholder="Contract Status"
                                    />
                                </div>

                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setPartnerFilters({ search: '', contract_status: [] });
                                        router.get('/sales/partners', {}, { preserveState: true, preserveScroll: true, only: ['partners'] });
                                    }}
                                    disabled={!hasPartnerFilters}
                                    className="shrink-0 h-10 px-3 text-red-600 border-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-700 disabled:text-red-300 disabled:border-red-300"
                                    title="Clear all filters"
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div>
                                Total: {partnersTotalCount} (Loaded: {partners.length})
                            </div>
                        </div>

                        <div className="flex-1 overflow-hidden rounded-lg border flex flex-col">
                            <div ref={partnersScrollRef} className="overflow-auto flex-1">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>ID</TableHead>
                                            <TableHead>Partner Name</TableHead>
                                            <TableHead>Email</TableHead>
                                            <TableHead>Partnership Model</TableHead>
                                            <TableHead>Contract Status</TableHead>
                                            <TableHead>Created</TableHead>
                                            <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                {partners.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                            No partners found
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    partners.map((partner) => (
                                            <TableRow key={partner.id}>
                                                <TableCell>{partner.id}</TableCell>
                                                <TableCell className="font-medium">{partner.name}</TableCell>
                                                <TableCell>{partner.email || '—'}</TableCell>
                                                <TableCell>{partner.partnership_model || '—'}</TableCell>
                                                <TableCell>
                                                    <span className={`rounded-full px-2 py-1 text-xs ${getStatusColor(partner.contract_status)}`}>
                                                        {partner.contract_status}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{new Date(partner.created_at).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <div className="flex gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openViewDialog(partner)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openEditDialog(partner)}
                                                        >
                                                            <Pencil className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleDelete(partner.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4 text-red-600" />
                                                        </Button>
                                                    </div>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                    {isLoadingMorePartners && (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center py-6">
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
                    </TabsContent>

                    {/* Companies with Partner Assignments Tab */}
                    <TabsContent value="companies" className="space-y-4 h-full flex flex-col overflow-hidden">
                        {/* Filters */}
                        <div className="bg-white rounded-lg border p-4">
                            <div className="flex flex-col md:flex-row gap-4">
                                <div className="flex-1">
                                    <MultiSelect
                                        options={allPartners.map(partner => ({
                                            label: partner.name,
                                            value: partner.id.toString()
                                        }))}
                                        selected={localFilters.partner_id}
                                        onChange={(values) => handleCompanyFilterChange('partner_id', values)}
                                        placeholder="All partners"
                                    />
                                </div>

                                <div className="flex-1">
                                    <MultiSelect
                                        options={stages.map(stage => ({
                                            label: stage,
                                            value: stage
                                        }))}
                                        selected={localFilters.stage}
                                        onChange={(values) => handleCompanyFilterChange('stage', values)}
                                        placeholder="All stages"
                                    />
                                </div>

                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setLocalFilters({ partner_id: [], stage: [] });
                                        router.get('/sales/partners', {}, { preserveState: true, preserveScroll: true, only: ['partnerCompanies'] });
                                    }}
                                    disabled={!hasCompanyFilters}
                                    className="shrink-0 h-10 px-3 text-red-600 border-red-600 hover:text-red-700 hover:bg-red-50 hover:border-red-700 disabled:text-red-300 disabled:border-red-300"
                                    title="Clear all filters"
                                >
                                    <X className="h-4 w-4" />
                                </Button>

                                <Button onClick={handleExportCompanies} className="shrink-0 h-10">
                                    <FileDown className="mr-2 h-4 w-4" />
                                    Export
                                </Button>
                            </div>
                        </div>

                        <div className="flex items-center justify-end text-sm text-muted-foreground">
                            Total: {companiesTotalCount} (Loaded: {partnerCompanies.length})
                        </div>

                        <div className="flex-1 overflow-hidden rounded-lg border flex flex-col">
                            <div ref={companiesScrollRef} className="overflow-auto flex-1">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Company Name</TableHead>
                                        <TableHead>Stage</TableHead>
                                        <TableHead>Partner Name</TableHead>
                                        <TableHead>Lock-in Period</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {partnerCompanies.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                                                No companies with partner assignments found
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        partnerCompanies.map((company) => (
                                            <TableRow key={company.id}>
                                                <TableCell className="font-medium">{company.name}</TableCell>
                                                <TableCell>
                                                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-700">
                                                        {company.stage || 'N/A'}
                                                    </span>
                                                </TableCell>
                                                <TableCell>{company.partner?.name || 'N/A'}</TableCell>
                                                <TableCell>
                                                    {company.lockin_date 
                                                        ? new Date(company.lockin_date).toLocaleDateString()
                                                        : 'N/A'}
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                    {isLoadingMoreCompanies && (
                                        <TableRow>
                                            <TableCell colSpan={4} className="text-center py-6">
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
                    </TabsContent>
                </Tabs>

                {/* Create/Edit Partner Dialog */}
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>{editingPartner ? 'Edit Partner' : 'Add New Partner'}</DialogTitle>
                        </DialogHeader>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="name">Partner Name *</Label>
                                <Input
                                    id="name"
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                    required
                                />
                                {form.errors.name && <p className="text-sm text-red-600 mt-1">{form.errors.name}</p>}
                            </div>

                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    value={form.data.email}
                                    onChange={(e) => form.setData('email', e.target.value)}
                                />
                                {form.errors.email && <p className="text-sm text-red-600 mt-1">{form.errors.email}</p>}
                            </div>

                            <div>
                                <Label htmlFor="partnership_model">Partnership Model</Label>
                                <Textarea
                                    id="partnership_model"
                                    value={form.data.partnership_model}
                                    onChange={(e) => form.setData('partnership_model', e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <div>
                                <Label htmlFor="contract_status">Contract Status</Label>
                                <Select
                                    value={form.data.contract_status}
                                    onValueChange={(val) => form.setData('contract_status', val)}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="Early Stage">Early Stage</SelectItem>
                                        <SelectItem value="Demo completed">Demo completed</SelectItem>
                                        <SelectItem value="Pending contract">Pending contract</SelectItem>
                                        <SelectItem value="Contract sent">Contract sent</SelectItem>
                                        <SelectItem value="Contract signed">Contract signed</SelectItem>
                                        <SelectItem value="Terminated">Terminated</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div>
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    value={form.data.notes}
                                    onChange={(e) => form.setData('notes', e.target.value)}
                                    rows={3}
                                />
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={form.processing}>
                                    {editingPartner ? 'Update' : 'Create'}
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* View Partner Dialog */}
                <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
                    <DialogContent className="max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Partner Details</DialogTitle>
                        </DialogHeader>
                        {viewingPartner && (
                            <div className="space-y-4">
                                <div>
                                    <Label className="text-muted-foreground">Partner Name</Label>
                                    <p className="font-medium">{viewingPartner.name}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Email</Label>
                                    <p>{viewingPartner.email || '—'}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Partnership Model</Label>
                                    <p className="whitespace-pre-wrap">{viewingPartner.partnership_model || '—'}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Contract Status</Label>
                                    <p>
                                        <span className={`rounded-full px-2 py-1 text-xs ${getStatusColor(viewingPartner.contract_status)}`}>
                                            {viewingPartner.contract_status}
                                        </span>
                                    </p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Notes</Label>
                                    <p className="whitespace-pre-wrap">{viewingPartner.notes || '—'}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Created</Label>
                                    <p>{new Date(viewingPartner.created_at).toLocaleString()}</p>
                                </div>
                                <div className="flex justify-end">
                                    <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
                                </div>
                            </div>
                        )}
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}

