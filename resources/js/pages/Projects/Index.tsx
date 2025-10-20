import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { Search, ExternalLink, Calendar, Building2, FolderKanban } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';

interface Agent {
    id: number;
    name: string;
}

interface Partner {
    id: number;
    name: string;
}

interface Company {
    id: number;
    name: string;
}

interface Campaign {
    id: number;
    name: string;
}

interface Product {
    id: number;
    name: string;
}

interface Contact {
    id: number;
    name: string;
}

interface Project {
    id: number;
    name: string;
    description: string | null;
    status: string;
    company: Company;
    campaign: Campaign;
    product: Product | null;
    agent: Agent | null;
    partner: Partner | null;
    contacts: Contact[];
    start_date: string | null;
    expected_completion_date: string | null;
    actual_completion_date: string | null;
    created_at: string;
    updated_at: string;
}

interface PageProps {
    projects: {
        data: Project[];
        links: any[];
        meta: any;
    };
    agents: Agent[];
    statuses: string[];
    filters: {
        search: string | null;
        status: string | null;
    };
    [key: string]: any;
}

export default function ProjectsIndex() {
    const { projects, agents, statuses, filters } = usePage<PageProps>().props;
    const [search, setSearch] = useState(filters.search || '');

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Dashboard',
            href: '/dashboard',
        },
        {
            title: 'Projects',
            href: '#',
        },
    ];

    const handleSearch = () => {
        router.get('/projects/projects', { search, status: filters.status }, { preserveState: true });
    };

    const handleStatusFilter = (status: string | null) => {
        router.get('/projects/projects', { search, status }, { preserveState: true });
    };

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '—';
        try {
            return format(new Date(dateString), 'MMM dd, yyyy');
        } catch {
            return dateString;
        }
    };

    const getStatusColor = (status: string) => {
        const lowerStatus = status?.toLowerCase() || '';
        if (lowerStatus === 'active') return 'bg-green-100 text-green-700';
        if (lowerStatus === 'completed') return 'bg-blue-100 text-blue-700';
        if (lowerStatus === 'on_hold') return 'bg-yellow-100 text-yellow-700';
        if (lowerStatus === 'cancelled') return 'bg-red-100 text-red-700';
        return 'bg-gray-100 text-gray-700';
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Projects" />
            
            <div className="flex flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Projects</h1>
                        <p className="text-muted-foreground mt-1">
                            Manage and track all active projects
                        </p>
                    </div>
                </div>

                {/* Projects Table */}
                <Card>
                    <CardHeader>
                        <CardTitle>Projects ({projects.data.length})</CardTitle>
                        <CardDescription>List of all projects in the system</CardDescription>
                    </CardHeader>
                    <CardContent>
                        {/* Search & Filters */}
                        <div className="mb-6 space-y-4">
                            <div className="flex gap-4 items-end">
                                <div className="flex-1">
                                    <label className="text-sm font-medium mb-2 block">Search</label>
                                    <Input
                                        placeholder="Search by project name or company..."
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                                    />
                                </div>
                                <Button onClick={handleSearch}>
                                    <Search className="h-4 w-4 mr-2" />
                                    Search
                                </Button>
                            </div>
                            <div className="flex gap-2">
                                <Button
                                    variant={filters.status === null ? 'default' : 'outline'}
                                    size="sm"
                                    onClick={() => handleStatusFilter(null)}
                                >
                                    All
                                </Button>
                                {statuses.map((status) => (
                                    <Button
                                        key={status}
                                        variant={filters.status === status ? 'default' : 'outline'}
                                        size="sm"
                                        onClick={() => handleStatusFilter(status)}
                                    >
                                        {status.replace('_', ' ')}
                                    </Button>
                                ))}
                            </div>
                        </div>
                        {projects.data.length === 0 ? (
                            <div className="text-center py-12">
                                <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                                <p className="text-muted-foreground">No projects found</p>
                            </div>
                        ) : (
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Project Name</TableHead>
                                        <TableHead>Company</TableHead>
                                        <TableHead>Product</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead>Start Date</TableHead>
                                        <TableHead>Expected Completion</TableHead>
                                        <TableHead>Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {projects.data.map((project) => (
                                        <TableRow key={project.id}>
                                            <TableCell className="font-medium">{project.name}</TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Building2 className="h-4 w-4 text-muted-foreground" />
                                                    {project.company.name}
                                                </div>
                                            </TableCell>
                                            <TableCell>{project.product?.name || '—'}</TableCell>
                                            <TableCell>
                                                <Badge className={getStatusColor(project.status)}>
                                                    {project.status.replace('_', ' ')}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Calendar className="h-4 w-4 text-muted-foreground" />
                                                    {formatDate(project.start_date)}
                                                </div>
                                            </TableCell>
                                            <TableCell>{formatDate(project.expected_completion_date)}</TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => router.visit(`/projects/projects/${project.id}`)}
                                                >
                                                    View
                                                    <ExternalLink className="ml-2 h-3 w-3" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        )}
                    </CardContent>
                </Card>
            </div>
        </AppLayout>
    );
}

