import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import { FileDown, Pencil, Trash2, Eye, Loader2 } from 'lucide-react';

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
        partner_id?: number;
        stage?: string;
        search?: string;
        contract_status?: string;
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

    const [localFilters, setLocalFilters] = useState({
        partner_id: filters.partner_id?.toString() || 'all',
        stage: filters.stage || 'all',
    });

    const [partnerFilters, setPartnerFilters] = useState({
        search: filters.search || '',
        contract_status: filters.contract_status || 'all',
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

        const params: Record<string, string> = {
            partners_page: (partnersCurrentPage + 1).toString(),
        };
        
        if (partnerFilters.search) params.search = partnerFilters.search;
        if (partnerFilters.contract_status && partnerFilters.contract_status !== 'all') params.contract_status = partnerFilters.contract_status;

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

        const params: Record<string, string> = {
            companies_page: (companiesCurrentPage + 1).toString(),
        };
        
        if (localFilters.partner_id && localFilters.partner_id !== 'all') params.partner_id = localFilters.partner_id;
        if (localFilters.stage && localFilters.stage !== 'all') params.stage = localFilters.stage;

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

    const handlePartnerFilterChange = (key: string, value: string) => {
        const newFilters = { ...partnerFilters, [key]: value };
        setPartnerFilters(newFilters);

        // Clear existing debounce timer
        if (searchDebounceTimer.current) {
            clearTimeout(searchDebounceTimer.current);
        }

        // For search, apply debouncing
        if (key === 'search') {
            searchDebounceTimer.current = setTimeout(() => {
                const params: Record<string, string> = {};
                if (newFilters.search) params.search = newFilters.search;
                if (newFilters.contract_status && newFilters.contract_status !== 'all') params.contract_status = newFilters.contract_status;

                router.get('/sales/partners', params, {
                    preserveState: true,
                    preserveScroll: true,
                    only: ['partners'],
                });
            }, 500); // 500ms debounce
        } else {
            // For other filters (like contract_status), apply immediately
            const params: Record<string, string> = {};
            if (newFilters.search) params.search = newFilters.search;
            if (newFilters.contract_status && newFilters.contract_status !== 'all') params.contract_status = newFilters.contract_status;

            router.get('/sales/partners', params, {
                preserveState: true,
                preserveScroll: true,
                only: ['partners'],
            });
        }
    };

    const handleCompanyFilterChange = (key: string, value: string) => {
        const newFilters = { ...localFilters, [key]: value };
        setLocalFilters(newFilters);

        const params: Record<string, string> = {};
        if (newFilters.partner_id && newFilters.partner_id !== 'all') params.partner_id = newFilters.partner_id;
        if (newFilters.stage && newFilters.stage !== 'all') params.stage = newFilters.stage;

        router.get('/sales/partners', params, {
            preserveState: false,
            preserveScroll: false,
        });
    };

    const handleExportCompanies = () => {
        const params = new URLSearchParams();
        if (localFilters.partner_id && localFilters.partner_id !== 'all') params.append('partner_id', localFilters.partner_id);
        if (localFilters.stage && localFilters.stage !== 'all') params.append('stage', localFilters.stage);

        window.location.href = `/sales/partners/companies/export?${params.toString()}`;
    };

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
                        <div className="flex gap-3 items-center rounded-lg border bg-card p-4">
                            <div className="relative flex-1 max-w-xs">
                                <Input
                                    placeholder="Search by name or email..."
                                    value={partnerFilters.search}
                                    onChange={(e) => handlePartnerFilterChange('search', e.target.value)}
                                />
                            </div>

                            <Select 
                                value={partnerFilters.contract_status} 
                                onValueChange={(val) => handlePartnerFilterChange('contract_status', val)}
                            >
                                <SelectTrigger className="w-[200px]">
                                    <SelectValue placeholder="Contract Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="Early Stage">Early Stage</SelectItem>
                                    <SelectItem value="Demo completed">Demo completed</SelectItem>
                                    <SelectItem value="Pending contract">Pending contract</SelectItem>
                                    <SelectItem value="Contract sent">Contract sent</SelectItem>
                                    <SelectItem value="Contract signed">Contract signed</SelectItem>
                                    <SelectItem value="Terminated">Terminated</SelectItem>
                                </SelectContent>
                            </Select>

                            {(partnerFilters.search || partnerFilters.contract_status !== 'all') && (
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setPartnerFilters({ search: '', contract_status: 'all' });
                                        router.get('/sales/partners', {}, { preserveState: false, preserveScroll: false });
                                    }}
                                >
                                    Clear Filters
                                </Button>
                            )}
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
                        <div className="flex gap-3 items-center rounded-lg border bg-card p-4">
                            <Select value={localFilters.partner_id} onValueChange={(val) => handleCompanyFilterChange('partner_id', val)}>
                                <SelectTrigger className="w-[250px]">
                                    <SelectValue placeholder="Filter by Partner" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Partners</SelectItem>
                                    {allPartners.map((partner) => (
                                        <SelectItem key={partner.id} value={partner.id.toString()}>
                                            {partner.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select value={localFilters.stage} onValueChange={(val) => handleCompanyFilterChange('stage', val)}>
                                <SelectTrigger className="w-[250px]">
                                    <SelectValue placeholder="Filter by Stage" />
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

                            <Button onClick={handleExportCompanies} className="ml-auto">
                                <FileDown className="mr-2 h-4 w-4" />
                                Export to Excel
                            </Button>
                        </div>

                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                            <div>
                                Total: {companiesTotalCount} (Loaded: {partnerCompanies.length})
                            </div>
                            {(localFilters.partner_id !== 'all' || localFilters.stage !== 'all') && (
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => {
                                        setLocalFilters({ partner_id: 'all', stage: 'all' });
                                        router.get('/sales/partners', {}, { preserveState: false, preserveScroll: false });
                                    }}
                                >
                                    Clear Filters
                                </Button>
                            )}
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

