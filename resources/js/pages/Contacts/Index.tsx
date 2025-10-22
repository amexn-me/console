import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router, usePage, useForm } from '@inertiajs/react';
import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, ExternalLink, CheckCircle, XCircle, Loader2, ArrowUpDown, ArrowUp, ArrowDown, Plus } from 'lucide-react';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Contacts',
        href: '/sales/contacts',
    },
];

interface Company {
    id: number;
    name: string;
}

interface Contact {
    id: number;
    name: string;
    title: string | null;
    company: Company | null;
    phone1: string | null;
    phone2: string | null;
    email: string | null;
    linkedin_url: string | null;
    is_pic: boolean | null;
    interest_level: string;
}

interface PageProps {
    contacts: {
        data: Contact[];
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
    companies: Array<{
        id: number;
        name: string;
    }>;
    filters: {
        search?: string;
        interest_level?: string;
        pic_status?: string;
        sort_by?: string;
        sort_direction?: string;
    };
    [key: string]: any;
}

export default function ContactsIndex() {
    const { contacts: initialContacts, companies, filters } = usePage<PageProps>().props;
    
    const [contacts, setContacts] = useState(initialContacts.data);
    const [currentPage, setCurrentPage] = useState(initialContacts.current_page);
    const [hasMorePages, setHasMorePages] = useState(initialContacts.current_page < initialContacts.last_page);
    const [totalCount, setTotalCount] = useState(initialContacts.total);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(false);
    const isInitialLoad = useRef(true);
    const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

    const [localFilters, setLocalFilters] = useState({
        search: filters.search || '',
        interest_level: filters.interest_level || 'all',
        pic_status: filters.pic_status || 'all',
        sort_by: filters.sort_by || 'created_at',
        sort_direction: filters.sort_direction || 'desc',
    });

    const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);

    const addContactForm = useForm<{
        company_id: string;
        name: string;
        title: string;
        email: string;
        phone1: string;
        phone2: string;
        linkedin_url: string;
        is_pic: boolean;
        interest_level: string;
    }>({
        company_id: '',
        name: '',
        title: '',
        email: '',
        phone1: '',
        phone2: '',
        linkedin_url: '',
        is_pic: false,
        interest_level: 'Cold',
    });

    // Only reset contacts on initial load or when page 1 is loaded
    useEffect(() => {
        if (isInitialLoad.current || initialContacts.current_page === 1) {
            setContacts(initialContacts.data);
            setCurrentPage(initialContacts.current_page);
            setHasMorePages(initialContacts.current_page < initialContacts.last_page);
            setTotalCount(initialContacts.total);
            isInitialLoad.current = false;
        }
    }, [initialContacts.data, initialContacts.current_page]);

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
        
        if (localFilters.search) params.search = localFilters.search;
        if (localFilters.interest_level && localFilters.interest_level !== 'all') params.interest_level = localFilters.interest_level;
        if (localFilters.pic_status && localFilters.pic_status !== 'all') params.pic_status = localFilters.pic_status;
        if (localFilters.sort_by) params.sort_by = localFilters.sort_by;
        if (localFilters.sort_direction) params.sort_direction = localFilters.sort_direction;

        router.get('/sales/contacts', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const loadMoreContacts = useCallback(() => {
        if (loadingRef.current || !hasMorePages || isLoadingMore) return;

        loadingRef.current = true;
        setIsLoadingMore(true);

        const params: Record<string, string> = {
            page: (currentPage + 1).toString(),
        };
        
        if (localFilters.search) params.search = localFilters.search;
        if (localFilters.interest_level && localFilters.interest_level !== 'all') params.interest_level = localFilters.interest_level;
        if (localFilters.pic_status && localFilters.pic_status !== 'all') params.pic_status = localFilters.pic_status;
        if (localFilters.sort_by) params.sort_by = localFilters.sort_by;
        if (localFilters.sort_direction) params.sort_direction = localFilters.sort_direction;

        router.get('/sales/contacts', params, {
            preserveState: true,
            preserveScroll: true,
            only: ['contacts'],
            onSuccess: (page: any) => {
                const newContacts = page.props.contacts;
                setContacts(prev => [...prev, ...newContacts.data]);
                setCurrentPage(newContacts.current_page);
                setHasMorePages(newContacts.current_page < newContacts.last_page);
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
                loadMoreContacts();
            }
        };

        container.addEventListener('scroll', handleScroll);
        
        const checkInitialLoad = () => {
            const { scrollHeight, clientHeight } = container;
            if (scrollHeight <= clientHeight && hasMorePages && !isLoadingMore) {
                loadMoreContacts();
            }
        };
        
        setTimeout(checkInitialLoad, 100);

        return () => container.removeEventListener('scroll', handleScroll);
    }, [hasMorePages, isLoadingMore, currentPage, contacts.length, loadMoreContacts]);

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...localFilters, [key]: value };
        setLocalFilters(newFilters);

        if (key !== 'search') {
            const params: Record<string, string> = {};
            if (newFilters.search) params.search = newFilters.search;
            if (newFilters.interest_level && newFilters.interest_level !== 'all') params.interest_level = newFilters.interest_level;
            if (newFilters.pic_status && newFilters.pic_status !== 'all') params.pic_status = newFilters.pic_status;
            if (newFilters.sort_by) params.sort_by = newFilters.sort_by;
            if (newFilters.sort_direction) params.sort_direction = newFilters.sort_direction;

            router.get('/sales/contacts', params, {
                preserveState: false,
                preserveScroll: false,
            });
        }
    };

    const clearFilters = () => {
        setLocalFilters({
            search: '',
            interest_level: 'all',
            pic_status: 'all',
            sort_by: 'created_at',
            sort_direction: 'desc',
        });
        router.get('/sales/contacts', {}, {
            preserveState: false,
            preserveScroll: false,
        });
    };

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
        if (newFilters.search) params.search = newFilters.search;
        if (newFilters.interest_level && newFilters.interest_level !== 'all') params.interest_level = newFilters.interest_level;
        if (newFilters.pic_status && newFilters.pic_status !== 'all') params.pic_status = newFilters.pic_status;
        params.sort_by = column;
        params.sort_direction = newDirection;

        router.get('/sales/contacts', params, {
            preserveState: true,
            preserveScroll: true,
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

    const getInterestColor = (level: string) => {
        switch (level) {
            case 'Hot':
                return 'bg-red-100 text-red-700';
            case 'Warm':
                return 'bg-yellow-100 text-yellow-700';
            case 'Cold':
                return 'bg-gray-100 text-gray-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const handleAddContact = (e: React.FormEvent) => {
        e.preventDefault();
        addContactForm.post('/sales/contacts', {
            preserveScroll: true,
            onSuccess: () => {
                setIsAddDialogOpen(false);
                addContactForm.reset();
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Contacts" />
            <div className="flex h-screen flex-col gap-4 rounded-xl p-4 overflow-hidden">
                <div className="mb-2 flex items-center justify-between">
                    <h1 className="text-2xl font-bold">Contacts</h1>
                    <Button onClick={() => setIsAddDialogOpen(true)}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Contact
                    </Button>
                </div>

                {/* Filters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 rounded-lg border bg-card p-4">
                    <div className="relative md:col-span-1">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search across all fields..."
                            value={localFilters.search}
                            onChange={(e) => handleFilterChange('search', e.target.value)}
                            className="pl-9"
                        />
                    </div>

                    <Select value={localFilters.interest_level} onValueChange={(val) => handleFilterChange('interest_level', val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="Interest Level" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Interest Levels</SelectItem>
                            <SelectItem value="Hot">Hot</SelectItem>
                            <SelectItem value="Warm">Warm</SelectItem>
                            <SelectItem value="Cold">Cold</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={localFilters.pic_status} onValueChange={(val) => handleFilterChange('pic_status', val)}>
                        <SelectTrigger>
                            <SelectValue placeholder="PIC Status" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">All Contacts</SelectItem>
                            <SelectItem value="pic">PIC Only</SelectItem>
                            <SelectItem value="not_pic">Non-PIC Only</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div>
                        Total: {totalCount} (Loaded: {contacts.length})
                    </div>
                    {(localFilters.search || localFilters.interest_level !== 'all' || localFilters.pic_status !== 'all') && (
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
                                        Name
                                        {getSortIcon('name')}
                                    </button>
                                </TableHead>
                                <TableHead>
                                    <button 
                                        onClick={() => handleSort('title')}
                                        className="flex items-center hover:text-blue-600 transition-colors font-medium"
                                    >
                                        Title
                                        {getSortIcon('title')}
                                    </button>
                                </TableHead>
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
                                        onClick={() => handleSort('phone1')}
                                        className="flex items-center hover:text-blue-600 transition-colors font-medium"
                                    >
                                        Phone 1
                                        {getSortIcon('phone1')}
                                    </button>
                                </TableHead>
                                <TableHead>
                                    <button 
                                        onClick={() => handleSort('phone2')}
                                        className="flex items-center hover:text-blue-600 transition-colors font-medium"
                                    >
                                        Phone 2
                                        {getSortIcon('phone2')}
                                    </button>
                                </TableHead>
                                <TableHead>
                                    <button 
                                        onClick={() => handleSort('email')}
                                        className="flex items-center hover:text-blue-600 transition-colors font-medium"
                                    >
                                        Email
                                        {getSortIcon('email')}
                                    </button>
                                </TableHead>
                                <TableHead>LinkedIn</TableHead>
                                <TableHead>
                                    <button 
                                        onClick={() => handleSort('is_pic')}
                                        className="flex items-center hover:text-blue-600 transition-colors font-medium"
                                    >
                                        PIC
                                        {getSortIcon('is_pic')}
                                    </button>
                                </TableHead>
                                <TableHead>
                                    <button 
                                        onClick={() => handleSort('interest_level')}
                                        className="flex items-center hover:text-blue-600 transition-colors font-medium"
                                    >
                                        Interest Level
                                        {getSortIcon('interest_level')}
                                    </button>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {contacts.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                                        No contacts found
                                    </TableCell>
                                </TableRow>
                            ) : (
                                contacts.map((contact) => (
                                    <TableRow key={contact.id}>
                                        <TableCell className="font-medium max-w-[200px] whitespace-normal break-words">{contact.name}</TableCell>
                                        <TableCell className="max-w-[200px] whitespace-normal break-words">{contact.title || '—'}</TableCell>
                                        <TableCell className="max-w-[250px] whitespace-normal break-words">{contact.company?.name || '—'}</TableCell>
                                        <TableCell>{contact.phone1 || '—'}</TableCell>
                                        <TableCell>{contact.phone2 || '—'}</TableCell>
                                        <TableCell>
                                            {contact.email ? (
                                                <a 
                                                    href={`mailto:${contact.email}`} 
                                                    className="text-blue-600 hover:underline"
                                                >
                                                    {contact.email}
                                                </a>
                                            ) : (
                                                '—'
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {contact.linkedin_url ? (
                                                <a
                                                    href={contact.linkedin_url}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="inline-flex items-center text-blue-600 hover:underline"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </a>
                                            ) : (
                                                '—'
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {contact.is_pic ? (
                                                <CheckCircle className="h-5 w-5 text-green-600" />
                                            ) : (
                                                <XCircle className="h-5 w-5 text-gray-400" />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <span className={`rounded-full px-2 py-1 text-xs ${getInterestColor(contact.interest_level)}`}>
                                                {contact.interest_level}
                                            </span>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                            {isLoadingMore && (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center py-6">
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

            {/* Add Contact Dialog */}
            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add New Contact</DialogTitle>
                        <DialogDescription>
                            Create a new contact in the system.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddContact} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="company_id">Company *</Label>
                            <Select
                                value={addContactForm.data.company_id}
                                onValueChange={(value) => addContactForm.setData('company_id', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select company" />
                                </SelectTrigger>
                                <SelectContent>
                                    {companies.map((company) => (
                                        <SelectItem key={company.id} value={company.id.toString()}>
                                            {company.name}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            {addContactForm.errors.company_id && (
                                <p className="text-sm text-red-500">{addContactForm.errors.company_id}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="name">Name *</Label>
                            <Input
                                id="name"
                                value={addContactForm.data.name}
                                onChange={(e) => addContactForm.setData('name', e.target.value)}
                                placeholder="Enter contact name"
                                required
                            />
                            {addContactForm.errors.name && (
                                <p className="text-sm text-red-500">{addContactForm.errors.name}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="title">Title</Label>
                            <Input
                                id="title"
                                value={addContactForm.data.title}
                                onChange={(e) => addContactForm.setData('title', e.target.value)}
                                placeholder="Job title (e.g., CEO, CTO)"
                            />
                            {addContactForm.errors.title && (
                                <p className="text-sm text-red-500">{addContactForm.errors.title}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={addContactForm.data.email}
                                onChange={(e) => addContactForm.setData('email', e.target.value)}
                                placeholder="contact@example.com"
                            />
                            {addContactForm.errors.email && (
                                <p className="text-sm text-red-500">{addContactForm.errors.email}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone1">Phone 1</Label>
                            <Input
                                id="phone1"
                                value={addContactForm.data.phone1}
                                onChange={(e) => addContactForm.setData('phone1', e.target.value)}
                                placeholder="+971 XX XXX XXXX"
                            />
                            {addContactForm.errors.phone1 && (
                                <p className="text-sm text-red-500">{addContactForm.errors.phone1}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone2">Phone 2</Label>
                            <Input
                                id="phone2"
                                value={addContactForm.data.phone2}
                                onChange={(e) => addContactForm.setData('phone2', e.target.value)}
                                placeholder="+971 XX XXX XXXX"
                            />
                            {addContactForm.errors.phone2 && (
                                <p className="text-sm text-red-500">{addContactForm.errors.phone2}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="linkedin_url">LinkedIn URL</Label>
                            <Input
                                id="linkedin_url"
                                value={addContactForm.data.linkedin_url}
                                onChange={(e) => addContactForm.setData('linkedin_url', e.target.value)}
                                placeholder="https://linkedin.com/in/username"
                            />
                            {addContactForm.errors.linkedin_url && (
                                <p className="text-sm text-red-500">{addContactForm.errors.linkedin_url}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="interest_level">Interest Level *</Label>
                            <Select
                                value={addContactForm.data.interest_level}
                                onValueChange={(value) => addContactForm.setData('interest_level', value)}
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select interest level" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Cold">Cold</SelectItem>
                                    <SelectItem value="Warm">Warm</SelectItem>
                                    <SelectItem value="Hot">Hot</SelectItem>
                                </SelectContent>
                            </Select>
                            {addContactForm.errors.interest_level && (
                                <p className="text-sm text-red-500">{addContactForm.errors.interest_level}</p>
                            )}
                        </div>

                        <div className="flex items-center space-x-2">
                            <Checkbox
                                id="is_pic"
                                checked={addContactForm.data.is_pic}
                                onCheckedChange={(checked) => addContactForm.setData('is_pic', !!checked)}
                            />
                            <Label htmlFor="is_pic" className="font-normal cursor-pointer">
                                This is a Person In Charge (PIC)
                            </Label>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => {
                                    setIsAddDialogOpen(false);
                                    addContactForm.reset();
                                }}
                            >
                                Cancel
                            </Button>
                            <Button type="submit" disabled={addContactForm.processing}>
                                {addContactForm.processing ? 'Creating...' : 'Create Contact'}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}

