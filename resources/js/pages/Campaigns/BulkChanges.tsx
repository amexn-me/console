import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router, usePage } from '@inertiajs/react';
import { ArrowLeft, Save, X, Search, Loader2, AlertTriangle } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';

interface User {
    id: number;
    name: string;
    email: string;
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
    next_followup_date: string | null;
    created_at: string;
}

interface Campaign {
    id: number;
    name: string;
    status: string;
}

interface PageProps {
    campaign: Campaign;
    leads: {
        data: Lead[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
    };
    users: User[];
    stages: string[];
    totalLeadsCount: number;
    filters: {
        search?: string;
        stage?: string;
        agent_id?: string;
    };
}

export default function CampaignsBulkChanges() {
    const { campaign, leads: initialLeads, users, stages, totalLeadsCount, filters = {} } = usePage<PageProps>().props;
    
    // Pagination state
    const [leads, setLeads] = useState<Lead[]>(initialLeads?.data || []);
    const [currentPage, setCurrentPage] = useState(initialLeads?.current_page || 1);
    const [hasMorePages, setHasMorePages] = useState(initialLeads ? initialLeads.current_page < initialLeads.last_page : false);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const loadingRef = useRef(false);

    // Filter state
    const [searchQuery, setSearchQuery] = useState(filters.search || '');
    const [selectedStage, setSelectedStage] = useState<string>(filters.stage || 'all');
    const [selectedAgent, setSelectedAgent] = useState<string>(filters.agent_id || 'all');
    const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    // Selection state
    const [selectedLeads, setSelectedLeads] = useState<number[]>([]);
    const [selectAll, setSelectAll] = useState(false); // True means select ALL (including unloaded)
    
    // Bulk action state
    const [bulkAction, setBulkAction] = useState<'agent' | 'stage' | null>(null);
    const [bulkValue, setBulkValue] = useState<string>('');
    
    // Confirmation dialog state
    const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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
            title: campaign.name,
            href: `/sales/campaigns/${campaign.id}`,
        },
        {
            title: 'Bulk Changes',
            href: '#',
        },
    ];

    const [processing, setProcessing] = useState(false);

    // Load more leads
    const loadMoreLeads = useCallback(() => {
        if (loadingRef.current || !hasMorePages || isLoadingMore) return;

        loadingRef.current = true;
        setIsLoadingMore(true);

        const params: any = {
            page: currentPage + 1,
        };

        if (searchQuery) params.search = searchQuery;
        if (selectedStage !== 'all') params.stage = selectedStage;
        if (selectedAgent !== 'all') params.agent_id = selectedAgent;

        router.get(route('campaigns.bulk-changes', campaign.id), params, {
            preserveState: true,
            preserveScroll: true,
            only: ['leads'],
            onSuccess: (response: any) => {
                const newLeads = response.props.leads;
                setLeads((prev) => [...prev, ...newLeads.data]);
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
    }, [currentPage, hasMorePages, isLoadingMore, searchQuery, selectedStage, selectedAgent, campaign.id]);

    // Infinite scroll
    useEffect(() => {
        const container = scrollContainerRef.current;
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
            if (scrollHeight <= clientHeight && hasMorePages && !isLoadingMore && !loadingRef.current) {
                loadMoreLeads();
            }
        };

        setTimeout(checkInitialLoad, 100);

        return () => container.removeEventListener('scroll', handleScroll);
    }, [hasMorePages, isLoadingMore, currentPage, leads.length, loadMoreLeads]);

    // Apply filters
    const applyFilters = useCallback((search?: string) => {
        const params: any = {};

        const searchValue = search !== undefined ? search : searchQuery;
        if (searchValue) params.search = searchValue;
        if (selectedStage !== 'all') params.stage = selectedStage;
        if (selectedAgent !== 'all') params.agent_id = selectedAgent;

        setSelectedLeads([]);
        setSelectAll(false);

        router.get(route('campaigns.bulk-changes', campaign.id), params, {
            preserveState: false,
            preserveScroll: false,
        });
    }, [searchQuery, selectedStage, selectedAgent, campaign.id]);

    // Handle search with debounce
    const handleSearchChange = (value: string) => {
        setSearchQuery(value);

        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }

        searchTimeoutRef.current = setTimeout(() => {
            applyFilters(value);
        }, 500);
    };

    // Handle filter changes
    const handleStageChange = (value: string) => {
        setSelectedStage(value);
        
        // Apply filters immediately with new stage value
        const params: any = {};
        if (searchQuery) params.search = searchQuery;
        if (value !== 'all') params.stage = value;
        if (selectedAgent !== 'all') params.agent_id = selectedAgent;

        setSelectedLeads([]);
        setSelectAll(false);

        router.get(route('campaigns.bulk-changes', campaign.id), params, {
            preserveState: false,
            preserveScroll: false,
        });
    };

    const handleAgentFilterChange = (value: string) => {
        setSelectedAgent(value);
        
        // Apply filters immediately with new agent value
        const params: any = {};
        if (searchQuery) params.search = searchQuery;
        if (selectedStage !== 'all') params.stage = selectedStage;
        if (value !== 'all') params.agent_id = value;

        setSelectedLeads([]);
        setSelectAll(false);

        router.get(route('campaigns.bulk-changes', campaign.id), params, {
            preserveState: false,
            preserveScroll: false,
        });
    };

    // Selection handlers
    const handleSelectAllToggle = (checked: boolean) => {
        if (checked) {
            // Select all mode - even unloaded leads
            setSelectAll(true);
            setSelectedLeads(leads.map(lead => lead.id));
        } else {
            setSelectAll(false);
            setSelectedLeads([]);
        }
    };

    const handleSelectLead = (leadId: number, checked: boolean) => {
        // If we're in "select all" mode and user deselects, exit that mode
        if (selectAll && !checked) {
            setSelectAll(false);
            // Select all loaded leads except this one
            setSelectedLeads(leads.map(l => l.id).filter(id => id !== leadId));
        } else if (checked) {
            setSelectedLeads([...selectedLeads, leadId]);
        } else {
            setSelectedLeads(selectedLeads.filter(id => id !== leadId));
        }
    };

    const handleCancel = () => {
        setSelectedLeads([]);
        setSelectAll(false);
        setBulkAction(null);
        setBulkValue('');
    };

    const handleShowConfirmation = () => {
        if (!bulkAction || !bulkValue || (selectedLeads.length === 0 && !selectAll)) {
            alert('Please select leads, choose an action, and provide a value');
            return;
        }
        setShowConfirmDialog(true);
    };

    const handleBulkUpdate = () => {
        const submitData: any = {
            action: bulkAction,
            value: bulkValue,
        };

        if (selectAll) {
            submitData.select_all = true;
            submitData.filters = {
                search: searchQuery || undefined,
                stage: selectedStage !== 'all' ? selectedStage : undefined,
                agent_id: selectedAgent !== 'all' ? selectedAgent : undefined,
            };
        } else {
            submitData.lead_ids = selectedLeads;
        }

        setProcessing(true);

        router.post(route('campaigns.bulk-update', campaign.id), submitData, {
            preserveScroll: true,
            onSuccess: () => {
                setShowConfirmDialog(false);
                setSelectedLeads([]);
                setSelectAll(false);
                setBulkAction(null);
                setBulkValue('');
                setProcessing(false);
            },
            onError: () => {
                setProcessing(false);
            },
        });
    };

    const getStageColor = (stage: string) => {
        const lowerStage = stage?.toLowerCase() || '';
        if (lowerStage.includes('won')) return 'bg-green-100 text-green-700';
        if (lowerStage.includes('lost') || lowerStage.includes('disqualified')) return 'bg-red-100 text-red-700';
        if (lowerStage.includes('proposal')) return 'bg-purple-100 text-purple-700';
        if (lowerStage.includes('demo')) return 'bg-blue-100 text-blue-700';
        return 'bg-gray-100 text-gray-700';
    };

    const getSelectedCount = () => {
        return selectAll ? totalLeadsCount : selectedLeads.length;
    };

    const getAgentName = (agentId: string) => {
        return users.find(u => u.id.toString() === agentId)?.name || '';
    };

    // Get affected leads for confirmation dialog
    const getAffectedLeads = () => {
        if (selectAll) {
            // Return all loaded leads as preview (with note about more)
            return leads;
        } else {
            // Return only selected leads
            return leads.filter(lead => selectedLeads.includes(lead.id));
        }
    };

    const getOldValue = (lead: Lead) => {
        if (bulkAction === 'agent') {
            return lead.agent?.name || 'Unassigned';
        } else if (bulkAction === 'stage') {
            return lead.stage;
        }
        return '';
    };

    const getNewValue = () => {
        if (bulkAction === 'agent') {
            return getAgentName(bulkValue);
        } else if (bulkAction === 'stage') {
            return bulkValue;
        }
        return '';
    };

    const allVisibleSelected = leads.length > 0 && selectedLeads.length === leads.length;
    const someVisibleSelected = selectedLeads.length > 0 && selectedLeads.length < leads.length;

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Bulk Changes - ${campaign.name}`} />

            <div className="flex h-screen flex-col gap-4 rounded-xl p-4 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => router.visit(route('campaigns.show', campaign.id))}
                        >
                            <ArrowLeft className="h-4 w-4" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold">Bulk Changes</h1>
                            <p className="text-muted-foreground">
                                {campaign.name} • {totalLeadsCount} total leads
                                {getSelectedCount() > 0 && ` • ${getSelectedCount()} selected`}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Filters & Bulk Action Controls - Combined Card */}
                <Card className={`flex-shrink-0 ${getSelectedCount() > 0 ? 'border-blue-200' : ''}`}>
                    <CardContent className="p-4 space-y-4">
                        {/* Filters Section */}
                        <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex-1 min-w-[200px]">
                                <div className="relative">
                                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search companies..."
                                        value={searchQuery}
                                        onChange={(e) => handleSearchChange(e.target.value)}
                                        className="pl-8"
                                    />
                                </div>
                            </div>

                            <div className="w-[200px]">
                                <Select value={selectedStage} onValueChange={handleStageChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Stages" />
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

                            <div className="w-[200px]">
                                <Select value={selectedAgent} onValueChange={handleAgentFilterChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="All Agents" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Agents</SelectItem>
                                        {users.map((user) => (
                                            <SelectItem key={user.id} value={user.id.toString()}>
                                                {user.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="border-t" />

                        {/* Bulk Action Controls Section */}
                        <div className={`flex items-center gap-4 flex-wrap ${getSelectedCount() > 0 ? 'bg-blue-50 -m-4 p-4 rounded-b-lg' : ''}`}>
                            <div className="flex items-center gap-2">
                                <Badge 
                                    variant={getSelectedCount() > 0 ? 'default' : 'secondary'}
                                    className="text-base px-3 py-1"
                                >
                                    {getSelectedCount()} lead(s) selected
                                    {selectAll && ' (All)'}
                                </Badge>
                            </div>
                            
                            <div className="flex items-center gap-2">
                                <Label className="text-sm font-medium">Action:</Label>
                                <Select 
                                    value={bulkAction || ''} 
                                    onValueChange={(value) => {
                                        setBulkAction(value as 'agent' | 'stage');
                                        setBulkValue('');
                                    }}
                                    disabled={getSelectedCount() === 0}
                                >
                                    <SelectTrigger className="w-[180px] bg-white">
                                        <SelectValue placeholder="Select action" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="agent">Change Agent</SelectItem>
                                        <SelectItem value="stage">Change Stage</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {bulkAction === 'agent' && (
                                <div className="flex items-center gap-2">
                                    <Label className="text-sm font-medium">To:</Label>
                                    <Select value={bulkValue} onValueChange={setBulkValue}>
                                        <SelectTrigger className="w-[200px] bg-white">
                                            <SelectValue placeholder="Select agent" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {users.map((user) => (
                                                <SelectItem key={user.id} value={user.id.toString()}>
                                                    {user.name}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {bulkAction === 'stage' && (
                                <div className="flex items-center gap-2">
                                    <Label className="text-sm font-medium">To:</Label>
                                    <Select value={bulkValue} onValueChange={setBulkValue}>
                                        <SelectTrigger className="w-[200px] bg-white">
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
                                </div>
                            )}

                            <div className="flex items-center gap-2 ml-auto">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleCancel}
                                    disabled={getSelectedCount() === 0}
                                >
                                    <X className="mr-2 h-4 w-4" />
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={handleShowConfirmation}
                                    disabled={processing || !bulkAction || !bulkValue || getSelectedCount() === 0}
                                >
                                    <Save className="mr-2 h-4 w-4" />
                                    Apply Changes
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Leads Table with Infinite Scroll */}
                <div className="flex-1 overflow-auto" ref={scrollContainerRef}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Leads ({totalLeadsCount})</CardTitle>
                            <CardDescription>Select multiple leads to apply bulk changes</CardDescription>
                        </CardHeader>
                        <CardContent className="p-0">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gray-50 border-b sticky top-0">
                                        <tr>
                                            <th className="px-4 py-3 text-left w-12">
                                                <Checkbox
                                                    checked={selectAll || allVisibleSelected}
                                                    onCheckedChange={handleSelectAllToggle}
                                                    aria-label="Select all"
                                                />
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                                                Company
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                                                Stage
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                                                Agent
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                                                Partner
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                                                Next Follow-up
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900">
                                                Created
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {leads.length === 0 ? (
                                            <tr>
                                                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                                                    No leads found in this campaign
                                                </td>
                                            </tr>
                                        ) : (
                                            leads.map((lead) => (
                                                <tr
                                                    key={lead.id}
                                                    className={`hover:bg-gray-50 transition-colors ${
                                                        selectedLeads.includes(lead.id) || selectAll ? 'bg-blue-50' : ''
                                                    }`}
                                                >
                                                    <td className="px-4 py-3">
                                                        <Checkbox
                                                            checked={selectedLeads.includes(lead.id) || selectAll}
                                                            onCheckedChange={(checked) =>
                                                                handleSelectLead(lead.id, checked as boolean)
                                                            }
                                                            aria-label={`Select ${lead.company.name}`}
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="font-medium text-gray-900">
                                                            {lead.company.name}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <Badge className={getStageColor(lead.stage)}>
                                                            {lead.stage}
                                                        </Badge>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                        {lead.agent?.name || '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                        {lead.partner?.name || '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                        {lead.next_followup_date
                                                            ? new Date(lead.next_followup_date).toLocaleDateString()
                                                            : '—'}
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-gray-900">
                                                        {new Date(lead.created_at).toLocaleDateString()}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                                
                                {isLoadingMore && (
                                    <div className="flex justify-center py-4 border-t">
                                        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                                    </div>
                                )}
                                
                                {!hasMorePages && leads.length > 0 && (
                                    <div className="text-center py-4 text-sm text-gray-500 border-t">
                                        All leads loaded
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Confirmation Dialog */}
            <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
                <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-yellow-500" />
                            Confirm Bulk Changes
                        </DialogTitle>
                        <DialogDescription>
                            Review the changes you're about to make. {getSelectedCount()} lead(s) will be affected.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex-1 overflow-hidden flex flex-col">
                        {selectAll && (
                            <div className="rounded-lg bg-orange-50 border border-orange-200 p-3 mb-4 flex-shrink-0">
                                <p className="text-xs text-orange-700 font-medium">
                                    ⚠️ ALL {getSelectedCount()} leads matching the current filters will be affected, including those not displayed below.
                                </p>
                            </div>
                        )}

                        {/* Affected Leads List - Scrollable */}
                        <div className="flex-1 overflow-hidden flex flex-col">
                            <h4 className="text-sm font-semibold text-gray-900 mb-2 flex-shrink-0">
                                Affected Leads {selectAll ? `(showing ${getAffectedLeads().length} of ${getSelectedCount()})` : `(${getAffectedLeads().length})`}:
                            </h4>
                            <div className="border rounded-lg overflow-auto flex-1">
                                <table className="w-full text-sm">
                                    <thead className="bg-gray-50 sticky top-0 border-b">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                                                Company
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                                                Old Value
                                            </th>
                                            <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700">
                                                
                                            </th>
                                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">
                                                New Value
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {getAffectedLeads().map((lead) => (
                                            <tr key={lead.id} className="hover:bg-gray-50">
                                                <td className="px-3 py-2 font-medium text-gray-900">
                                                    {lead.company.name}
                                                </td>
                                                <td className="px-3 py-2">
                                                    <Badge variant="outline" className="text-xs">
                                                        {getOldValue(lead)}
                                                    </Badge>
                                                </td>
                                                <td className="px-3 py-2 text-center text-gray-400">
                                                    →
                                                </td>
                                                <td className="px-3 py-2">
                                                    <Badge variant="default" className="text-xs">
                                                        {getNewValue()}
                                                    </Badge>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            {selectAll && getAffectedLeads().length < getSelectedCount() && (
                                <p className="text-xs text-gray-500 mt-2 flex-shrink-0">
                                    ... and {getSelectedCount() - getAffectedLeads().length} more lead(s) not shown
                                </p>
                            )}
                        </div>
                    </div>

                    <DialogFooter className="flex-shrink-0">
                        <Button
                            variant="outline"
                            onClick={() => setShowConfirmDialog(false)}
                            disabled={processing}
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleBulkUpdate}
                            disabled={processing}
                        >
                            {processing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Applying...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Confirm & Apply ({getSelectedCount()})
                                </>
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </AppLayout>
    );
}
