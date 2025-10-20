import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { useState, useEffect, useRef } from 'react';
import { Search, ExternalLink, CheckCircle, XCircle, Loader2 } from 'lucide-react';

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
    filters: {
        search?: string;
        interest_level?: string;
        pic_status?: string;
    };
}

export default function ContactsIndex() {
    const { contacts: initialContacts, filters } = usePage<PageProps>().props;
    
    const [contacts, setContacts] = useState(initialContacts.data);
    const [currentPage, setCurrentPage] = useState(initialContacts.current_page);
    const [hasMorePages, setHasMorePages] = useState(initialContacts.current_page < initialContacts.last_page);
    const [totalCount, setTotalCount] = useState(initialContacts.total);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(false);
    const isInitialLoad = useRef(true);

    const [localFilters, setLocalFilters] = useState({
        search: filters.search || '',
        interest_level: filters.interest_level || 'all',
        pic_status: filters.pic_status || 'all',
    });

    const [searchDebounce, setSearchDebounce] = useState<NodeJS.Timeout | null>(null);

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

        router.get('/sales/contacts', params, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const loadMoreContacts = () => {
        if (loadingRef.current || !hasMorePages || isLoadingMore) return;

        loadingRef.current = true;
        setIsLoadingMore(true);

        const params: Record<string, string> = {
            page: (currentPage + 1).toString(),
        };
        
        if (localFilters.search) params.search = localFilters.search;
        if (localFilters.interest_level && localFilters.interest_level !== 'all') params.interest_level = localFilters.interest_level;
        if (localFilters.pic_status && localFilters.pic_status !== 'all') params.pic_status = localFilters.pic_status;

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
    };

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
    }, [hasMorePages, isLoadingMore, currentPage, contacts.length]);

    const handleFilterChange = (key: string, value: string) => {
        const newFilters = { ...localFilters, [key]: value };
        setLocalFilters(newFilters);

        if (key !== 'search') {
            const params: Record<string, string> = {};
            if (newFilters.search) params.search = newFilters.search;
            if (newFilters.interest_level && newFilters.interest_level !== 'all') params.interest_level = newFilters.interest_level;
            if (newFilters.pic_status && newFilters.pic_status !== 'all') params.pic_status = newFilters.pic_status;

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
        });
        router.get('/contacts', {}, {
            preserveState: false,
            preserveScroll: false,
        });
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

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Contacts" />
            <div className="flex h-screen flex-col gap-4 rounded-xl p-4 overflow-hidden">
                <div className="mb-2">
                    <h1 className="text-2xl font-bold">Contacts</h1>
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
                        <TableHeader>
                            <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead>Company</TableHead>
                                <TableHead>Phone 1</TableHead>
                                <TableHead>Phone 2</TableHead>
                                <TableHead>Email</TableHead>
                                <TableHead>LinkedIn</TableHead>
                                <TableHead>PIC</TableHead>
                                <TableHead>Interest Level</TableHead>
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
                                        <TableCell className="font-medium">{contact.name}</TableCell>
                                        <TableCell>{contact.title || '—'}</TableCell>
                                        <TableCell>{contact.company?.name || '—'}</TableCell>
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
        </AppLayout>
    );
}

