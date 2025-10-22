import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, Link, router } from '@inertiajs/react';
import { Plus } from 'lucide-react';
import { usePermissions } from '@/hooks/use-permissions';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Campaigns',
        href: '/sales/campaigns',
    },
];

interface Product {
    id: number;
    name: string;
    country: string;
}

interface Campaign {
    id: number;
    name: string;
    product?: Product;
    description: string | null;
    status: 'active' | 'paused' | 'completed';
    start_date: string | null;
    end_date: string | null;
    creator: {
        id: number;
        name: string;
    };
    leads_count: number;
    contacts_count: number;
    closed_won_count: number;
    closed_leads_count: number;
    users_count: number;
    created_at: string;
}

interface PageProps {
    campaigns: Campaign[];
}

export default function CampaignsIndex({ campaigns }: PageProps) {
    const permissions = usePermissions();

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
            active: 'default',
            paused: 'secondary',
            completed: 'destructive',
        };
        return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
    };

    const calculateProgress = (campaign: Campaign) => {
        if (campaign.leads_count === 0) return 100;
        return Math.round((campaign.closed_leads_count / campaign.leads_count) * 100);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title="Campaigns" />

            <div className="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">Campaigns</h1>
                        <p className="text-muted-foreground">Manage your sales campaigns</p>
                    </div>
                    {permissions.isAdmin && (
                        <Link href={route('campaigns.create')}>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Create Campaign
                            </Button>
                        </Link>
                    )}
                </div>

                <div className="rounded-lg border">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Name</TableHead>
                                <TableHead>Product</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-center">Leads</TableHead>
                                <TableHead className="text-center">Contacts</TableHead>
                                <TableHead className="text-center">Won</TableHead>
                                <TableHead className="text-center">Agents</TableHead>
                                <TableHead>Progress</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {campaigns.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                                        No campaigns found. Create your first campaign to get started.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                campaigns.map((campaign) => (
                                    <TableRow 
                                        key={campaign.id}
                                        className="cursor-pointer hover:bg-muted/50"
                                        onClick={() => router.visit(route('campaigns.show', campaign.id))}
                                    >
                                        <TableCell className="font-mono text-sm text-muted-foreground">{campaign.id}</TableCell>
                                        <TableCell className="font-medium">{campaign.name}</TableCell>
                                        <TableCell>
                                            {campaign.product ? (
                                                <div>
                                                    <div className="font-medium">{campaign.product.name}</div>
                                                    <div className="text-xs text-muted-foreground">{campaign.product.country}</div>
                                                </div>
                                            ) : (
                                                '-'
                                            )}
                                        </TableCell>
                                        <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                                        <TableCell className="text-center">{campaign.leads_count}</TableCell>
                                        <TableCell className="text-center">{campaign.contacts_count}</TableCell>
                                        <TableCell className="text-center">{campaign.closed_won_count}</TableCell>
                                        <TableCell className="text-center">{campaign.users_count}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-3 min-w-[200px]">
                                                <Progress value={calculateProgress(campaign)} className="flex-1" />
                                                <span className="text-sm text-muted-foreground whitespace-nowrap">
                                                    {calculateProgress(campaign)}%
                                                </span>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
        </AppLayout>
    );
}

