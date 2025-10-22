import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { ArrowLeft, Plus, Trash2, Pencil, TrendingUp, Users as UsersIcon, Target, Search, X, Download, BarChart3, List, ChevronLeft, ChevronRight, Award, Activity as ActivityIcon, AlertTriangle, Clock, FileSpreadsheet, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { usePermissions } from '@/hooks/use-permissions';
import { SalesFunnelChart } from '@/components/SalesFunnelChart';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
    {
        title: 'Campaigns',
        href: '/sales/campaigns',
    },
    {
        title: 'Campaign Details',
        href: '#',
    },
];

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface Product {
    id: number;
    name: string;
    country: string;
}

interface Company {
    id: number;
    name: string;
}

interface Lead {
    id: number;
    stage: string;
    company: Company;
    agent?: User;
    partner?: {
        id: number;
        name: string;
    };
    created_at: string;
}

interface Campaign {
    id: number;
    name: string;
    product?: Product;
    description: string | null;
    status: string;
    start_date: string | null;
    end_date: string | null;
    creator: User;
    users: User[];
    leads_count: number;
    closed_leads_count: number;
}

interface AgentPerformance {
    agent_id: number;
    agent_name: string;
    total_leads: number;
    won_leads: number;
    lost_leads: number;
    disqualified_leads: number;
    in_progress_leads: number;
    conversion_rate: number;
    close_rate: number;
    last_activity_date: string | null;
    last_update_date: string | null;
    activities_last_7_days: number;
    activities_last_30_days: number;
}

interface StaleLead {
    lead_id: number;
    company_name: string;
    company_id: number;
    stage: string;
    agent_id: number | null;
    agent_name: string;
    last_activity_date: string;
    days_since_activity: number;
    next_followup_date: string | null;
    updated_at: string;
}

interface StaleLeadsData {
    oldest_10?: StaleLead[];
    over_30_days: StaleLead[];
    over_14_days: StaleLead[];
    over_7_days: StaleLead[];
    all_stale: StaleLead[];
}

interface Analytics {
    total_leads: number;
    by_stage?: Record<string, number>;
    by_agent?: Array<{ name: string; count: number }>;
    stage_agent_breakdown?: Array<Record<string, any>>;
    agent_performance?: AgentPerformance[];
    stale_leads?: StaleLeadsData;
}

type PageProps = {
    campaign: Campaign;
    leads: {
        data: Lead[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    } | null;
    analytics: Analytics;
    companies: Company[];
    users: User[];
} & Record<string, any>;

export default function CampaignsShow() {
    const { campaign, leads: initialLeads, analytics: initialAnalytics, companies, users } = usePage<PageProps>().props;
    const permissions = usePermissions();
    const [isAddCompanyDrawerOpen, setIsAddCompanyDrawerOpen] = useState(false);
    
    // Get current tab from URL
    const urlParams = new URLSearchParams(window.location.search);
    const currentTab = urlParams.get('tab') || 'overview';
    
    const [activeTab, setActiveTab] = useState(currentTab);
    const [loadedTabs, setLoadedTabs] = useState<Set<string>>(new Set([currentTab]));
    const [isLoadingTab, setIsLoadingTab] = useState(false);
    
    // Store loaded data in state to persist across tab switches
    const [analytics, setAnalytics] = useState<Analytics>(initialAnalytics);
    const [leads, setLeads] = useState<typeof initialLeads>(initialLeads);

    // Stale leads section visibility state
    const [visibleStaleSection, setVisibleStaleSection] = useState<'oldest_10' | 'over_30_days' | 'over_14_days' | 'over_7_days' | null>('oldest_10');

    // Bulk add companies state
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCompanies, setSelectedCompanies] = useState<number[]>([]);
    const [bulkAgent, setBulkAgent] = useState<string>('none');
    const [bulkStage, setBulkStage] = useState<string>('PIC Not Identified');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        company_id: '',
        agent_id: '',
        stage: 'PIC Not Identified',
    });

    const handleAddCompany = (e: React.FormEvent) => {
        e.preventDefault();
        post(route('campaigns.companies.add', campaign.id), {
            preserveScroll: true,
            onSuccess: (page) => {
                // Update local state with new data from the response
                const newAnalytics = page.props.analytics as Analytics;
                const newLeads = page.props.leads as typeof initialLeads;
                
                if (newAnalytics) {
                    setAnalytics(newAnalytics);
                }
                if (newLeads) {
                    setLeads(newLeads);
                }
                
                setIsAddCompanyDrawerOpen(false);
                reset();
            },
        });
    };

    const handleRemoveLead = (leadId: number) => {
        if (confirm('Are you sure you want to remove this company from the campaign?')) {
            router.delete(route('campaigns.companies.remove', [campaign.id, leadId]), {
                preserveScroll: true,
                onSuccess: (page) => {
                    // Update local state with new data from the response
                    const newAnalytics = page.props.analytics as Analytics;
                    const newLeads = page.props.leads as typeof initialLeads;
                    
                    if (newAnalytics) {
                        setAnalytics(newAnalytics);
                    }
                    if (newLeads) {
                        setLeads(newLeads);
                    }
                },
            });
        }
    };

    // Filter companies by search (companies already filtered on backend)
    const getFilteredCompanies = () => {
        if (!searchQuery) return companies;
        
        return companies.filter(company => 
            company.name.toLowerCase().includes(searchQuery.toLowerCase())
        );
    };

    const handleSelectAllCompanies = (checked: boolean) => {
        if (checked) {
            const allIds = getFilteredCompanies().map(c => c.id);
            setSelectedCompanies(allIds);
        } else {
            setSelectedCompanies([]);
        }
    };

    const handleSelectCompany = (companyId: number, checked: boolean) => {
        if (checked) {
            setSelectedCompanies([...selectedCompanies, companyId]);
        } else {
            setSelectedCompanies(selectedCompanies.filter(id => id !== companyId));
        }
    };

    const handleBulkAddCompanies = () => {
        if (selectedCompanies.length === 0) {
            alert('Please select at least one company');
            return;
        }

        setIsSubmitting(true);

        router.post(route('campaigns.companies.bulk-add', campaign.id), {
            company_ids: selectedCompanies,
            agent_id: bulkAgent !== 'none' ? bulkAgent : null,
            stage: bulkStage,
        }, {
            preserveScroll: true,
            onSuccess: (page) => {
                // Update local state with new data from the response
                const newAnalytics = page.props.analytics as Analytics;
                const newLeads = page.props.leads as typeof initialLeads;
                
                if (newAnalytics) {
                    setAnalytics(newAnalytics);
                }
                if (newLeads) {
                    setLeads(newLeads);
                }
                
                setIsAddCompanyDrawerOpen(false);
                setSelectedCompanies([]);
                setSearchQuery('');
                setBulkAgent('none');
                setBulkStage('PIC Not Identified');
                setIsSubmitting(false);
            },
            onError: () => {
                setIsSubmitting(false);
            },
        });
    };

    const handleCancelBulkAdd = () => {
        setIsAddCompanyDrawerOpen(false);
        setSelectedCompanies([]);
        setSearchQuery('');
        setBulkAgent('none');
        setBulkStage('PIC Not Identified');
    };

    const handlePageChange = (page: number) => {
        router.get(
            route('campaigns.show', campaign.id),
            { page, tab: 'leads' },
            {
                preserveState: true,
                preserveScroll: true,
                only: ['leads'],
                onSuccess: (response) => {
                    const newLeads = response.props.leads as typeof initialLeads;
                    if (newLeads) {
                        setLeads(newLeads);
                    }
                },
            }
        );
    };

    const handleExportToExcel = () => {
        window.location.href = route('campaigns.leads.export', campaign.id);
    };

    const handleTabChange = (tab: string) => {
        setActiveTab(tab);
        
        // If tab hasn't been loaded yet, fetch its data
        if (!loadedTabs.has(tab)) {
            setIsLoadingTab(true);
            router.get(
                route('campaigns.show', campaign.id),
                { tab },
                {
                    preserveState: true,
                    preserveScroll: false,
                    only: ['analytics', 'leads'],
                    onSuccess: (page) => {
                        // Merge the new data into our cached state
                        const newAnalytics = page.props.analytics as Analytics;
                        const newLeads = page.props.leads as typeof initialLeads;
                        
                        setAnalytics(prev => ({
                            ...prev,
                            ...newAnalytics,
                        }));
                        
                        if (newLeads) {
                            setLeads(newLeads);
                        }
                        
                        setLoadedTabs(prev => new Set([...prev, tab]));
                        setIsLoadingTab(false);
                    },
                    onError: () => {
                        setIsLoadingTab(false);
                    },
                }
            );
        } else {
            // Tab already loaded, just update URL
            router.get(
                route('campaigns.show', campaign.id),
                { tab },
                {
                    preserveState: true,
                    preserveScroll: true,
                    only: [], // Don't fetch any data, just update URL
                }
            );
        }
    };

    const getStatusBadge = (status: string) => {
        const variants: Record<string, 'default' | 'secondary' | 'destructive'> = {
            active: 'default',
            paused: 'secondary',
            completed: 'destructive',
        };
        return <Badge variant={variants[status] || 'default'}>{status}</Badge>;
    };

    const calculateProgress = () => {
        if (campaign.leads_count === 0) return 100;
        return Math.round((campaign.closed_leads_count / campaign.leads_count) * 100);
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={campaign.name} />

            <div className="flex h-screen flex-col gap-4 rounded-xl p-4 overflow-hidden">
                {/* Header - Fixed */}
                <div className="flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.visit(route('campaigns.index'))}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold">{campaign.name}</h1>
                            <p className="text-muted-foreground">
                                {campaign.product && (
                                    <span className="font-medium">{campaign.product.name} ({campaign.product.country})</span>
                                )}
                                {!campaign.product && campaign.description && campaign.description}
                            </p>
                        </div>
                    </div>
                    {permissions.isAdmin && (
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline"
                                onClick={() => router.visit(route('campaigns.bulk-changes', campaign.id))}
                            >
                                <FileSpreadsheet className="mr-2 h-4 w-4" />
                                Bulk Changes
                            </Button>
                            <Button onClick={() => router.visit(route('campaigns.edit', campaign.id))}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit Campaign
                            </Button>
                        </div>
                    )}
                </div>

                {/* Tabs Section */}
                <Tabs value={activeTab} onValueChange={handleTabChange} className="flex-1 flex flex-col overflow-hidden">
                    <TabsList className="w-full justify-start flex-shrink-0">
                        <TabsTrigger value="overview" className="gap-2">
                            <BarChart3 className="h-4 w-4" />
                            Overview
                        </TabsTrigger>
                        <TabsTrigger value="leads" className="gap-2">
                            <List className="h-4 w-4" />
                            Leads ({analytics.total_leads})
                        </TabsTrigger>
                        <TabsTrigger value="performance" className="gap-2">
                            <Award className="h-4 w-4" />
                            Performance Analysis
                        </TabsTrigger>
                        <TabsTrigger value="lead-analysis" className="gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Lead Analysis
                        </TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="flex-1 overflow-y-auto space-y-6 mt-4">
                        {isLoadingTab && activeTab === 'overview' ? (
                            <div className="flex items-center justify-center py-12">
                                <TrendingUp className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <>
                {/* Analytics Section - Compact */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="border rounded-lg p-3 bg-card">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Total Leads</div>
                        <div className="flex items-center gap-2">
                            <Target className="h-4 w-4 text-blue-600" />
                            <span className="text-2xl font-bold">{analytics.total_leads}</span>
                        </div>
                    </div>

                    <div className="border rounded-lg p-3 bg-card">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Status</div>
                        <div className="text-lg font-bold">{getStatusBadge(campaign.status)}</div>
                    </div>

                    <div className="border rounded-lg p-3 bg-card">
                        <div className="text-xs font-medium text-muted-foreground mb-1">Assigned Users</div>
                        <div className="flex items-center gap-2">
                            <UsersIcon className="h-4 w-4 text-green-600" />
                            <span className="text-2xl font-bold">{campaign.users.length}</span>
                        </div>
                    </div>

                    <div className="border rounded-lg p-3 bg-card">
                                <div className="text-xs font-medium text-muted-foreground mb-1">Progress</div>
                                <div className="flex items-baseline gap-1 mb-2">
                                    <span className="text-2xl font-bold">{campaign.closed_leads_count}</span>
                                    <span className="text-xs text-muted-foreground">/ {campaign.leads_count} total</span>
                        </div>
                                <Progress value={calculateProgress()} className="h-1.5" />
                    </div>
                </div>

                {/* Sales Funnel - Stacked Bar Chart by Agent */}
                <Card>
                    <CardHeader>
                        <CardTitle>Sales Funnel - Stage Progression by Agent</CardTitle>
                        <CardDescription>Visual breakdown of leads across stages, segmented by assigned agent</CardDescription>
                    </CardHeader>
                    <CardContent>
                                <SalesFunnelChart data={analytics.stage_agent_breakdown || []} />
                    </CardContent>
                </Card>

                {/* Leads by Agent */}
                        {analytics.by_agent && analytics.by_agent.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle>Leads by Agent</CardTitle>
                            <CardDescription>Lead distribution across assigned agents</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                {analytics.by_agent.map((agent, idx) => (
                                    <div key={idx} className="border rounded-lg p-3">
                                        <div className="text-xs text-muted-foreground truncate">{agent.name}</div>
                                        <div className="text-2xl font-bold mt-1">{agent.count}</div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                )}
                            </>
                        )}
                    </TabsContent>

                    {/* Leads Tab */}
                    <TabsContent value="leads" className="flex-1 flex flex-col overflow-hidden mt-4">
                        {isLoadingTab && activeTab === 'leads' ? (
                            <div className="flex items-center justify-center py-12">
                                <TrendingUp className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : leads ? (
                            <>
                        <div className="flex items-center justify-between mb-4 flex-shrink-0">
                        <h2 className="text-xl font-semibold">Leads ({analytics.total_leads})</h2>
                            <div className="flex gap-2">
                                <Button variant="outline" onClick={handleExportToExcel}>
                                    <Download className="mr-2 h-4 w-4" />
                                    Export to Excel
                                </Button>
                        {permissions.isAdmin && (
                            <Button onClick={() => setIsAddCompanyDrawerOpen(true)}>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Companies
                            </Button>
                        )}
                            </div>
                    </div>

                        <div className="flex-1 overflow-y-auto">
                    <div className="rounded-lg border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Company</TableHead>
                                    <TableHead>Stage</TableHead>
                                    <TableHead>Agent</TableHead>
                                    <TableHead>Partner</TableHead>
                                    <TableHead>Added On</TableHead>
                                    {permissions.isAdmin && <TableHead className="text-right">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                        {leads.data.length === 0 ? (
                                    <TableRow>
                                        <TableCell
                                            colSpan={permissions.isAdmin ? 6 : 5}
                                            className="text-center text-muted-foreground py-8"
                                        >
                                            No companies added to this campaign yet
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                            leads.data.map((lead) => (
                                        <TableRow 
                                            key={lead.id}
                                            onClick={() => router.visit(`/sales/leads/${lead.id}`)}
                                            className="cursor-pointer hover:bg-gray-50"
                                        >
                                            <TableCell className="font-medium">{lead.company.name}</TableCell>
                                            <TableCell>{lead.stage}</TableCell>
                                            <TableCell>{lead.agent?.name || '-'}</TableCell>
                                            <TableCell>{lead.partner?.name || '-'}</TableCell>
                                            <TableCell>
                                                {new Date(lead.created_at).toLocaleDateString()}
                                            </TableCell>
                                            {permissions.isAdmin && (
                                                <TableCell className="text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleRemoveLead(lead.id);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4 text-red-500" />
                                                    </Button>
                                                </TableCell>
                                            )}
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                            </div>

                            {/* Pagination */}
                            {leads.last_page > 1 && (
                                <div className="flex items-center justify-between px-4 py-4">
                                    <div className="text-sm text-muted-foreground">
                                        Showing {((leads.current_page - 1) * leads.per_page) + 1} to{' '}
                                        {Math.min(leads.current_page * leads.per_page, leads.total)} of{' '}
                                        {leads.total} leads
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePageChange(leads.current_page - 1)}
                                            disabled={leads.current_page === 1}
                                        >
                                            <ChevronLeft className="h-4 w-4 mr-1" />
                                            Previous
                                        </Button>
                                        <div className="text-sm">
                                            Page {leads.current_page} of {leads.last_page}
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => handlePageChange(leads.current_page + 1)}
                                            disabled={leads.current_page === leads.last_page}
                                        >
                                            Next
                                            <ChevronRight className="h-4 w-4 ml-1" />
                                        </Button>
                                    </div>
                            </div>
                        )}
                        </div>
                            </>
                        ) : (
                            <div className="flex items-center justify-center py-12 text-muted-foreground">
                                Switch to Leads tab to load data
                            </div>
                        )}
                    </TabsContent>

                    {/* Lead Analysis Tab */}
                    <TabsContent value="lead-analysis" className="flex-1 overflow-y-auto space-y-6 mt-4 px-6">
                        {isLoadingTab && activeTab === 'lead-analysis' ? (
                            <div className="flex items-center justify-center py-12">
                                <TrendingUp className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : analytics.stale_leads ? (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-semibold">Stale Lead Monitoring</h2>
                                    <p className="text-sm text-muted-foreground">
                                        Track inactive leads that need follow-up attention (excluding Closed Won/Closed Lost/Disqualified)
                                    </p>
                                </div>

                                {/* Summary Cards - Now Clickable and on Top */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <Card 
                                        className={`cursor-pointer transition-all hover:shadow-lg ${visibleStaleSection === 'oldest_10' ? 'ring-2 ring-purple-500 shadow-lg' : ''}`}
                                        onClick={() => setVisibleStaleSection('oldest_10')}
                                    >
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                <AlertTriangle className="h-4 w-4 text-purple-600" />
                                                Top 10 Oldest
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold text-purple-600">
                                                {analytics.stale_leads.oldest_10?.length || 0}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Click to view
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <Card 
                                        className={`cursor-pointer transition-all hover:shadow-lg ${visibleStaleSection === 'over_30_days' ? 'ring-2 ring-red-500 shadow-lg' : ''}`}
                                        onClick={() => setVisibleStaleSection('over_30_days')}
                                    >
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-red-600" />
                                                Stale 30+ Days
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold text-red-600">
                                                {analytics.stale_leads.over_30_days.length}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Critical attention needed
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <Card 
                                        className={`cursor-pointer transition-all hover:shadow-lg ${visibleStaleSection === 'over_14_days' ? 'ring-2 ring-orange-500 shadow-lg' : ''}`}
                                        onClick={() => setVisibleStaleSection('over_14_days')}
                                    >
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-orange-600" />
                                                Stale 14-29 Days
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold text-orange-600">
                                                {analytics.stale_leads.over_14_days.length}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Needs follow-up soon
                                            </p>
                                        </CardContent>
                                    </Card>

                                    <Card 
                                        className={`cursor-pointer transition-all hover:shadow-lg ${visibleStaleSection === 'over_7_days' ? 'ring-2 ring-yellow-500 shadow-lg' : ''}`}
                                        onClick={() => setVisibleStaleSection('over_7_days')}
                                    >
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-yellow-600" />
                                                Stale 7-13 Days
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="text-3xl font-bold text-yellow-600">
                                                {analytics.stale_leads.over_7_days.length}
                                            </div>
                                            <p className="text-xs text-muted-foreground mt-1">
                                                Monitor closely
                                            </p>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Top 10 Leads with Oldest Activity */}
                                {visibleStaleSection === 'oldest_10' && analytics.stale_leads.oldest_10 && analytics.stale_leads.oldest_10.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                            <AlertTriangle className="h-5 w-5 text-purple-600" />
                                            Top 10 Leads with Oldest Activity
                                        </h3>
                                        <div className="rounded-lg border border-purple-300 shadow-md">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow className="bg-purple-50">
                                                        <TableHead className="font-semibold">#</TableHead>
                                                        <TableHead className="font-semibold">Company</TableHead>
                                                        <TableHead className="font-semibold">Stage</TableHead>
                                                        <TableHead className="font-semibold">Agent</TableHead>
                                                        <TableHead className="font-semibold">Days Inactive</TableHead>
                                                        <TableHead className="font-semibold">Last Activity</TableHead>
                                                        <TableHead className="font-semibold">Next Follow-up</TableHead>
                                                        <TableHead className="text-right font-semibold">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {analytics.stale_leads.oldest_10.map((lead, index) => (
                                                        <TableRow key={lead.lead_id} className="hover:bg-purple-50">
                                                            <TableCell className="font-semibold text-muted-foreground">
                                                                {index + 1}
                                                            </TableCell>
                                                            <TableCell className="font-medium">{lead.company_name}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="outline">{lead.stage}</Badge>
                                                            </TableCell>
                                                            <TableCell>{lead.agent_name}</TableCell>
                                                            <TableCell>
                                                                <Badge 
                                                                    variant={lead.days_since_activity >= 30 ? "destructive" : "default"}
                                                                    className={lead.days_since_activity >= 30 ? "" : lead.days_since_activity >= 14 ? "bg-orange-100 text-orange-800 hover:bg-orange-200" : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"}
                                                                >
                                                                    {lead.days_since_activity} days
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-xs">
                                                                {new Date(lead.last_activity_date).toLocaleDateString()}
                                                            </TableCell>
                                                            <TableCell className="text-xs">
                                                                {lead.next_followup_date ? new Date(lead.next_followup_date).toLocaleDateString() : '-'}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => router.visit(`/sales/leads/${lead.lead_id}`)}
                                                                >
                                                                    Follow Up
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                                    </div>
                                )}

                                {/* Stale Leads Table - 30+ Days */}
                                {visibleStaleSection === 'over_30_days' && analytics.stale_leads.over_30_days.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                            <AlertTriangle className="h-5 w-5 text-red-600" />
                                            Critical: Inactive 30+ Days
                                        </h3>
                                        <div className="rounded-lg border border-red-200">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Company</TableHead>
                                                        <TableHead>Stage</TableHead>
                                                        <TableHead>Agent</TableHead>
                                                        <TableHead>Days Inactive</TableHead>
                                                        <TableHead>Last Activity</TableHead>
                                                        <TableHead>Next Follow-up</TableHead>
                                                        <TableHead className="text-right">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {analytics.stale_leads.over_30_days.map((lead) => (
                                                        <TableRow key={lead.lead_id} className="hover:bg-red-50">
                                                            <TableCell className="font-medium">{lead.company_name}</TableCell>
                                                            <TableCell>{lead.stage}</TableCell>
                                                            <TableCell>{lead.agent_name}</TableCell>
                                                            <TableCell>
                                                                <Badge variant="destructive">
                                                                    {lead.days_since_activity} days
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-xs">
                                                                {new Date(lead.last_activity_date).toLocaleDateString()}
                                                            </TableCell>
                                                            <TableCell className="text-xs">
                                                                {lead.next_followup_date ? new Date(lead.next_followup_date).toLocaleDateString() : '-'}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => router.visit(`/sales/leads/${lead.lead_id}`)}
                                                                >
                                                                    Follow Up
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                        </div>
                            </div>
                        )}

                                {/* Stale Leads Table - 14-29 Days */}
                                {visibleStaleSection === 'over_14_days' && analytics.stale_leads.over_14_days.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                                            Warning: Inactive 14-29 Days
                                        </h3>
                                        <div className="rounded-lg border border-orange-200">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Company</TableHead>
                                                        <TableHead>Stage</TableHead>
                                                        <TableHead>Agent</TableHead>
                                                        <TableHead>Days Inactive</TableHead>
                                                        <TableHead>Last Activity</TableHead>
                                                        <TableHead>Next Follow-up</TableHead>
                                                        <TableHead className="text-right">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {analytics.stale_leads.over_14_days.map((lead) => (
                                                        <TableRow key={lead.lead_id} className="hover:bg-orange-50">
                                                            <TableCell className="font-medium">{lead.company_name}</TableCell>
                                                            <TableCell>{lead.stage}</TableCell>
                                                            <TableCell>{lead.agent_name}</TableCell>
                                                            <TableCell>
                                                                <Badge className="bg-orange-100 text-orange-800 hover:bg-orange-200">
                                                                    {lead.days_since_activity} days
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-xs">
                                                                {new Date(lead.last_activity_date).toLocaleDateString()}
                                                            </TableCell>
                                                            <TableCell className="text-xs">
                                                                {lead.next_followup_date ? new Date(lead.next_followup_date).toLocaleDateString() : '-'}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => router.visit(`/sales/leads/${lead.lead_id}`)}
                                                                >
                                                                    Follow Up
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                    </div>
                </div>
                                )}

                                {/* Stale Leads Table - 7-13 Days */}
                                {visibleStaleSection === 'over_7_days' && analytics.stale_leads.over_7_days.length > 0 && (
                                    <div>
                                        <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                                            <Clock className="h-5 w-5 text-yellow-600" />
                                            Monitor: Inactive 7-13 Days
                                        </h3>
                                        <div className="rounded-lg border border-yellow-200">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Company</TableHead>
                                                        <TableHead>Stage</TableHead>
                                                        <TableHead>Agent</TableHead>
                                                        <TableHead>Days Inactive</TableHead>
                                                        <TableHead>Last Activity</TableHead>
                                                        <TableHead>Next Follow-up</TableHead>
                                                        <TableHead className="text-right">Actions</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {analytics.stale_leads.over_7_days.map((lead) => (
                                                        <TableRow key={lead.lead_id} className="hover:bg-yellow-50">
                                                            <TableCell className="font-medium">{lead.company_name}</TableCell>
                                                            <TableCell>{lead.stage}</TableCell>
                                                            <TableCell>{lead.agent_name}</TableCell>
                                                            <TableCell>
                                                                <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">
                                                                    {lead.days_since_activity} days
                                                                </Badge>
                                                            </TableCell>
                                                            <TableCell className="text-xs">
                                                                {new Date(lead.last_activity_date).toLocaleDateString()}
                                                            </TableCell>
                                                            <TableCell className="text-xs">
                                                                {lead.next_followup_date ? new Date(lead.next_followup_date).toLocaleDateString() : '-'}
                                                            </TableCell>
                                                            <TableCell className="text-right">
                                                                <Button
                                                                    variant="outline"
                                                                    size="sm"
                                                                    onClick={() => router.visit(`/sales/leads/${lead.lead_id}`)}
                                                                >
                                                                    Follow Up
                                                                </Button>
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                </div>
                                    </div>
                                )}

                                {analytics.stale_leads.all_stale.length === 0 && (
                                    <Card>
                                        <CardContent className="py-12">
                                            <div className="text-center text-muted-foreground">
                                                <Target className="h-12 w-12 mx-auto mb-4 text-green-600" />
                                                <p className="text-lg font-semibold">All Leads Are Active!</p>
                                                <p className="text-sm">No inactive leads detected in this campaign</p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center py-12 text-muted-foreground">
                                Switch to Lead Analysis tab to load data
                            </div>
                        )}
                    </TabsContent>

                    {/* Performance Analysis Tab */}
                    <TabsContent value="performance" className="flex-1 overflow-y-auto space-y-6 mt-4">
                        {isLoadingTab && activeTab === 'performance' ? (
                            <div className="flex items-center justify-center py-12">
                                <TrendingUp className="h-8 w-8 animate-spin text-muted-foreground" />
                            </div>
                        ) : analytics.agent_performance ? (
                        <div className="space-y-4">
                            <div>
                                <h2 className="text-xl font-semibold">Agent Performance Analysis</h2>
                                <p className="text-sm text-muted-foreground">
                                    Track agent activity, conversion rates, and engagement metrics
                                </p>
                            </div>

                            {!analytics.agent_performance || analytics.agent_performance.length === 0 ? (
                                <Card>
                                    <CardContent className="py-12">
                                        <div className="text-center text-muted-foreground">
                                            No agent performance data available yet
                                        </div>
                                    </CardContent>
                                </Card>
                            ) : (
                                <div className="rounded-lg border">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Agent</TableHead>
                                                <TableHead className="text-center">Total Leads</TableHead>
                                                <TableHead className="text-center">Closed Won</TableHead>
                                                <TableHead className="text-center">Closed Lost</TableHead>
                                                <TableHead className="text-center">Disqualified</TableHead>
                                                <TableHead className="text-center">In Progress</TableHead>
                                                <TableHead className="text-center">Win Rate</TableHead>
                                                <TableHead className="text-center">Close Rate</TableHead>
                                                <TableHead className="text-center">Last 7d</TableHead>
                                                <TableHead className="text-center">Last 30d</TableHead>
                                                <TableHead>Last Activity</TableHead>
                                                <TableHead>Last Update</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {analytics.agent_performance.map((agent) => (
                                                <TableRow key={agent.agent_id}>
                                                    <TableCell className="font-medium">{agent.agent_name}</TableCell>
                                                    <TableCell className="text-center">{agent.total_leads}</TableCell>
                                                    <TableCell className="text-center">
                                                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                                                            {agent.won_leads}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
                                                            {agent.lost_leads}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                                                            {agent.disqualified_leads}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <span className="inline-flex items-center justify-center px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                                                            {agent.in_progress_leads}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className="font-medium">{agent.conversion_rate}%</span>
                                                            <Progress value={agent.conversion_rate} className="h-1 w-16 mt-1" />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex flex-col items-center">
                                                            <span className="font-medium">{agent.close_rate}%</span>
                                                            <Progress value={agent.close_rate} className="h-1 w-16 mt-1" />
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <ActivityIcon className="h-3 w-3 text-muted-foreground" />
                                                            <span className="text-sm">{agent.activities_last_7_days}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-center">
                                                        <div className="flex items-center justify-center gap-1">
                                                            <ActivityIcon className="h-3 w-3 text-muted-foreground" />
                                                            <span className="text-sm">{agent.activities_last_30_days}</span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {agent.last_activity_date ? (
                                                            <div>
                                                                <div>{new Date(agent.last_activity_date).toLocaleDateString()}</div>
                                                                <div className="text-muted-foreground">
                                                                    {new Date(agent.last_activity_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground">No activity</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-xs">
                                                        {agent.last_update_date ? (
                                                            <div>
                                                                <div>{new Date(agent.last_update_date).toLocaleDateString()}</div>
                                                                <div className="text-muted-foreground">
                                                                    {new Date(agent.last_update_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-muted-foreground">No updates</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                            </div>
                        )}

                            {/* Performance Summary Cards */}
                            {analytics.agent_performance && analytics.agent_performance.length > 0 && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm">Top Performer (Win Rate)</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {(() => {
                                                const topAgent = [...analytics.agent_performance].sort((a, b) => b.conversion_rate - a.conversion_rate)[0];
                                                return (
                                                    <div>
                                                        <div className="text-2xl font-bold">{topAgent.agent_name}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {topAgent.conversion_rate}% conversion rate
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm">Most Active (30 Days)</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {(() => {
                                                const mostActive = [...analytics.agent_performance].sort((a, b) => b.activities_last_30_days - a.activities_last_30_days)[0];
                                                return (
                                                    <div>
                                                        <div className="text-2xl font-bold">{mostActive.agent_name}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {mostActive.activities_last_30_days} activities
                                                        </div>
                                                    </div>
                                                );
                                            })()}
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm">Highest Close Rate</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {(() => {
                                                const highestClose = [...analytics.agent_performance].sort((a, b) => b.close_rate - a.close_rate)[0];
                                                return (
                                                    <div>
                                                        <div className="text-2xl font-bold">{highestClose.agent_name}</div>
                                                        <div className="text-sm text-muted-foreground">
                                                            {highestClose.close_rate}% close rate
                    </div>
                </div>
                                                );
                                            })()}
                                        </CardContent>
                                    </Card>
                                </div>
                            )}
                        </div>
                        ) : (
                            <div className="flex items-center justify-center py-12 text-muted-foreground">
                                Switch to Performance Analysis tab to load data
                </div>
                        )}
                    </TabsContent>
                </Tabs>

            </div>

            {/* Add Companies Drawer */}
            <Sheet open={isAddCompanyDrawerOpen} onOpenChange={setIsAddCompanyDrawerOpen}>
                <SheetContent className="w-full max-w-full sm:max-w-[95vw] flex flex-col h-full">
                    <SheetHeader className="flex-shrink-0">
                        <SheetTitle className="text-2xl">Add Companies to Campaign</SheetTitle>
                        <SheetDescription>
                            Select multiple companies to add to this campaign
                        </SheetDescription>
                    </SheetHeader>

                    <div className="flex-1 flex flex-col gap-4 overflow-hidden py-4">
                        {/* Top Bar with Search and Bulk Settings */}
                        <div className="flex-shrink-0 grid grid-cols-1 lg:grid-cols-3 gap-3">
                            {/* Search Bar */}
                            <div className="relative">
                                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search companies..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-8"
                                />
                            </div>

                            {/* Assign Agent */}
                            <div>
                                <Select value={bulkAgent} onValueChange={setBulkAgent}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Assign Agent (optional)" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="none">No Agent</SelectItem>
                                        {users.map((user) => (
                                            <SelectItem key={user.id} value={user.id.toString()}>
                                                {user.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* Initial Stage */}
                            <div>
                                <Select value={bulkStage} onValueChange={setBulkStage}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="PIC Not Identified">PIC Not Identified</SelectItem>
                                        <SelectItem value="PIC Identified">PIC Identified</SelectItem>
                                        <SelectItem value="Contacted">Contacted</SelectItem>
                                        <SelectItem value="Demo Requested">Demo Requested</SelectItem>
                                        <SelectItem value="Demo Completed">Demo Completed</SelectItem>
                                        <SelectItem value="Questionnaire Sent">Questionnaire Sent</SelectItem>
                                        <SelectItem value="Questionnaire Replied">Questionnaire Replied</SelectItem>
                                        <SelectItem value="Proposal">Proposal</SelectItem>
                                        <SelectItem value="Closed Won">Closed Won</SelectItem>
                                        <SelectItem value="Closed Lost">Closed Lost</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Selection Summary */}
                        <div className="flex-shrink-0 flex items-center justify-between p-3 bg-gray-50 rounded-lg border">
                            <div className="flex items-center gap-4">
                                <Badge variant={selectedCompanies.length > 0 ? 'default' : 'secondary'}>
                                    {selectedCompanies.length} of {getFilteredCompanies().length} selected
                                </Badge>
                                {getFilteredCompanies().length > 0 && (
                                    <div className="flex items-center gap-2">
                                        <Checkbox
                                            checked={selectedCompanies.length === getFilteredCompanies().length && getFilteredCompanies().length > 0}
                                            onCheckedChange={handleSelectAllCompanies}
                                            aria-label="Select all"
                                        />
                                        <span className="text-sm font-medium">Select All</span>
                                    </div>
                                )}
                            </div>
                            {selectedCompanies.length > 0 && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setSelectedCompanies([])}
                                >
                                    <X className="mr-2 h-4 w-4" />
                                    Clear
                                </Button>
                            )}
                        </div>

                        {/* Companies List - Scrollable */}
                        <div className="flex-1 overflow-y-auto border rounded-lg">
                            {getFilteredCompanies().length === 0 ? (
                                <div className="text-center py-12 text-muted-foreground">
                                    {companies.length === 0 
                                        ? 'All companies have been added to this campaign'
                                        : 'No companies match your search'
                                    }
                                </div>
                            ) : (
                                <div className="divide-y">
                                    {getFilteredCompanies().map((company) => (
                                        <div
                                            key={company.id}
                                            className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 transition-colors ${
                                                selectedCompanies.includes(company.id) ? 'bg-blue-50' : ''
                                            }`}
                                            onClick={() => handleSelectCompany(company.id, !selectedCompanies.includes(company.id))}
                                        >
                                            <Checkbox
                                                checked={selectedCompanies.includes(company.id)}
                                                onCheckedChange={(checked) => handleSelectCompany(company.id, checked as boolean)}
                                                aria-label={`Select ${company.name}`}
                                            />
                                            <span className="text-sm">{company.name}</span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <SheetFooter className="flex-shrink-0 border-t pt-4">
                        <div className="flex items-center justify-between w-full">
                            <div className="text-sm text-muted-foreground">
                                {selectedCompanies.length > 0 && (
                                    <span>{selectedCompanies.length} {selectedCompanies.length === 1 ? 'company' : 'companies'} selected</span>
                                )}
                            </div>
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    onClick={handleCancelBulkAdd}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleBulkAddCompanies}
                                    disabled={isSubmitting || selectedCompanies.length === 0}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Adding...
                                        </>
                                    ) : (
                                        <>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add {selectedCompanies.length > 0 ? selectedCompanies.length : ''} {selectedCompanies.length === 1 ? 'Company' : 'Companies'}
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </SheetFooter>
                </SheetContent>
            </Sheet>
        </AppLayout>
    );
}

