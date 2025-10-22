import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router, usePage, useForm } from '@inertiajs/react';
import { User, Users, Briefcase, FileText, Activity, Calendar, Mail, Phone, Linkedin, ExternalLink, Download, Plus, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { format } from 'date-fns';

interface Contact {
    id: number;
    name: string;
    title: string | null;
    email: string | null;
    phone1: string | null;
    phone2: string | null;
    linkedin_url: string | null;
    is_pic: boolean;
    interest_level: string;
    created_at: string;
}

interface Agent {
    id: number;
    name: string;
    email: string;
}

interface Partner {
    id: number;
    name: string;
}

interface Campaign {
    id: number;
    name: string;
    status: string;
    pivot: {
        id: number;
        stage: string;
        agent_id: number;
        next_followup_date: string | null;
    };
}

interface Proposal {
    id: number;
    company_id: number;
    campaign_id: number;
    campaign?: {
        id: number;
        name: string;
    };
    currency: string;
    one_time_fees: number | null;
    annual_subscription: number | null;
    other_info: string | null;
    creator?: {
        id: number;
        name: string;
    };
    created_at: string;
    updated_at: string;
}

interface CompanyFile {
    id: number;
    filename: string;
    original_filename: string;
    file_path: string;
    file_size: number;
    file_category: string;
    uploaded_at: string;
}

interface ActivityLog {
    id: number;
    activity_type: string;
    notes: string | null;
    agent?: {
        id: number;
        name: string;
    };
    created_at: string;
}

interface Todo {
    id: number;
    task: string;
    is_completed: boolean;
    created_at: string;
    completed_at: string | null;
}

interface Company {
    id: number;
    name: string;
    stage: string;
    agent?: Agent;
    partner?: Partner;
    contacts: Contact[];
    campaigns: Campaign[];
    proposals: Proposal[];
    files: CompanyFile[];
    activities: ActivityLog[];
    todos: Todo[];
    next_followup_date: string | null;
    li_company_code: string | null;
    proposal_currency: string | null;
    proposal_one_time_fees: number | null;
    proposal_annual_subscription: number | null;
    proposal_other_info: string | null;
    created_at: string;
    updated_at: string;
}

interface PageProps {
    company: Company;
    [key: string]: any;
}

export default function CompaniesShow() {
    const { company } = usePage<PageProps>().props;
    const [activeTab, setActiveTab] = useState('overview');
    const [isAddContactDialogOpen, setIsAddContactDialogOpen] = useState(false);

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
        company_id: company.id.toString(),
        name: '',
        title: '',
        email: '',
        phone1: '',
        phone2: '',
        linkedin_url: '',
        is_pic: false,
        interest_level: 'Cold',
    });

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Dashboard',
            href: '/dashboard',
        },
        {
            title: 'Companies',
            href: '/sales/companies',
        },
        {
            title: company.name,
            href: '#',
        },
    ];

    const formatDate = (dateString: string | null) => {
        if (!dateString) return '—';
        try {
            return format(new Date(dateString), 'MMM dd, yyyy');
        } catch {
            return dateString;
        }
    };

    const formatDateTime = (dateString: string | null) => {
        if (!dateString) return '—';
        try {
            return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
        } catch {
            return dateString;
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const getInterestLevelColor = (level: string) => {
        switch (level?.toLowerCase()) {
            case 'hot':
                return 'bg-red-100 text-red-700';
            case 'warm':
                return 'bg-yellow-100 text-yellow-700';
            case 'cold':
                return 'bg-blue-100 text-blue-700';
            default:
                return 'bg-gray-100 text-gray-700';
        }
    };

    const getStageColor = (stage: string) => {
        const lowerStage = stage?.toLowerCase() || '';
        if (lowerStage.includes('won')) return 'bg-green-100 text-green-700';
        if (lowerStage.includes('lost') || lowerStage.includes('disqualified')) return 'bg-red-100 text-red-700';
        if (lowerStage.includes('proposal')) return 'bg-purple-100 text-purple-700';
        if (lowerStage.includes('demo')) return 'bg-blue-100 text-blue-700';
        return 'bg-gray-100 text-gray-700';
    };

    const handleDownloadFile = (file: CompanyFile) => {
        window.open(`/storage/${file.file_path}`, '_blank');
    };

    const handleAddContact = (e: React.FormEvent) => {
        e.preventDefault();
        addContactForm.post('/sales/contacts', {
            preserveScroll: true,
            onSuccess: () => {
                setIsAddContactDialogOpen(false);
                addContactForm.reset();
                addContactForm.setData('company_id', company.id.toString());
                // Reload the page to show the new contact
                router.reload({ only: ['company'] });
            },
        });
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`${company.name} - Company Details`} />
            
            <div className="flex flex-col gap-6 p-6">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold">{company.name}</h1>
                        <p className="text-muted-foreground mt-1">
                            Company ID: {company.id} • Stage: <span className="font-medium">{company.stage}</span>
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <a
                            href={company.li_company_code ? `https://www.linkedin.com/company/${company.li_company_code}` : '#'}
                            target={company.li_company_code ? "_blank" : undefined}
                            rel={company.li_company_code ? "noopener noreferrer" : undefined}
                            onClick={(e) => !company.li_company_code && e.preventDefault()}
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors"
                            style={{ 
                                backgroundColor: '#0A66C2', 
                                color: 'white',
                                opacity: company.li_company_code ? 1 : 0.5,
                                cursor: company.li_company_code ? 'pointer' : 'not-allowed'
                            }}
                            title={company.li_company_code ? "View on LinkedIn" : "LinkedIn URL not available"}
                        >
                            LinkedIn
                            <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors opacity-50 cursor-not-allowed"
                            style={{ 
                                backgroundColor: 'rgb(235, 242, 18)', 
                                color: 'black'
                            }}
                            title="Apollo integration coming soon"
                            disabled
                        >
                            Apollo
                            <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                        <button
                            className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors opacity-50 cursor-not-allowed"
                            style={{ 
                                backgroundColor: 'rgb(134, 63, 255)', 
                                color: 'white'
                            }}
                            title="Lusha integration coming soon"
                            disabled
                        >
                            Lusha
                            <ExternalLink className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                {/* Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground">Agent</p>
                            <p className="text-sm font-medium">{company.agent?.name || '—'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground">Partner</p>
                            <p className="text-sm font-medium">{company.partner?.name || 'No Partner'}</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground">Contacts</p>
                            <p className="text-sm font-medium">
                                {company.contacts.length} ({company.contacts.filter(c => c.is_pic).length} PIC)
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-3 rounded-lg border bg-card p-3">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <div>
                            <p className="text-xs text-muted-foreground">Next Follow-up</p>
                            <p className="text-sm font-medium">{formatDate(company.next_followup_date)}</p>
                        </div>
                    </div>
                </div>

                {/* Tabs Section */}
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-6">
                        <TabsTrigger value="overview">Overview</TabsTrigger>
                        <TabsTrigger value="contacts">Contacts ({company.contacts.length})</TabsTrigger>
                        <TabsTrigger value="campaigns">Campaigns ({company.campaigns.length})</TabsTrigger>
                        <TabsTrigger value="proposals">Proposals ({company.proposals.length})</TabsTrigger>
                        <TabsTrigger value="files">Files ({company.files.length})</TabsTrigger>
                        <TabsTrigger value="activities">Activities</TabsTrigger>
                    </TabsList>

                    {/* Overview Tab */}
                    <TabsContent value="overview" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Company Information</CardTitle>
                                <CardDescription>General information about this company</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Company Name</label>
                                        <p className="text-base mt-1">{company.name}</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Stage</label>
                                        <p className="text-base mt-1">
                                            <Badge className={getStageColor(company.stage)}>{company.stage}</Badge>
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Industry</label>
                                        <p className="text-base mt-1">—</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Headcount</label>
                                        <p className="text-base mt-1">—</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Follower Count</label>
                                        <p className="text-base mt-1">—</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Last Sequence Run</label>
                                        <p className="text-base mt-1">—</p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Last Communicated</label>
                                        <p className="text-base mt-1">
                                            {company.activities.length > 0 
                                                ? formatDate(company.activities[0].created_at)
                                                : '—'
                                            }
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Last Activity Log</label>
                                        <p className="text-base mt-1">
                                            {company.activities.length > 0 
                                                ? `${company.activities[0].activity_type.replace(/_/g, ' ')} - ${formatDate(company.activities[0].created_at)}`
                                                : '—'
                                            }
                                        </p>
                                    </div>
                                    <div>
                                        <label className="text-sm font-medium text-muted-foreground">Created Date</label>
                                        <p className="text-base mt-1">{formatDate(company.created_at)}</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Proposal Information */}
                        {(company.proposal_currency || company.proposal_one_time_fees || company.proposal_annual_subscription) && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Current Proposal</CardTitle>
                                    <CardDescription>Latest proposal information</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Currency</label>
                                            <p className="text-base mt-1">{company.proposal_currency || '—'}</p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">One-time Fees</label>
                                            <p className="text-base mt-1">
                                                {company.proposal_one_time_fees 
                                                    ? `${company.proposal_currency || ''} ${company.proposal_one_time_fees.toLocaleString()}`
                                                    : '—'
                                                }
                                            </p>
                                        </div>
                                        <div>
                                            <label className="text-sm font-medium text-muted-foreground">Annual Subscription</label>
                                            <p className="text-base mt-1">
                                                {company.proposal_annual_subscription 
                                                    ? `${company.proposal_currency || ''} ${company.proposal_annual_subscription.toLocaleString()}`
                                                    : '—'
                                                }
                                            </p>
                                        </div>
                                        {company.proposal_other_info && (
                                            <div className="col-span-2">
                                                <label className="text-sm font-medium text-muted-foreground">Other Information</label>
                                                <p className="text-base mt-1">{company.proposal_other_info}</p>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Todos */}
                        {company.todos.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>To-Do Items</CardTitle>
                                    <CardDescription>Pending tasks for this company</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {company.todos.map((todo) => (
                                            <div key={todo.id} className="flex items-start gap-3 p-3 rounded-lg border">
                                                <div className="flex-1">
                                                    <p className="font-medium">{todo.task}</p>
                                                    <p className="text-xs text-muted-foreground mt-1">
                                                        Created: {formatDate(todo.created_at)}
                                                    </p>
                                                    {todo.completed_at && (
                                                        <p className="text-xs text-muted-foreground">
                                                            Completed: {formatDate(todo.completed_at)}
                                                        </p>
                                                    )}
                                                </div>
                                                <Badge variant={todo.is_completed ? 'default' : 'secondary'}>
                                                    {todo.is_completed ? 'Completed' : 'Pending'}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}
                    </TabsContent>

                    {/* Contacts Tab */}
                    <TabsContent value="contacts" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <div>
                                        <CardTitle>Contacts</CardTitle>
                                        <CardDescription>People associated with this company</CardDescription>
                                    </div>
                                    <Button onClick={() => setIsAddContactDialogOpen(true)}>
                                        <Plus className="mr-2 h-4 w-4" />
                                        Add Contact
                                    </Button>
                                </div>
                            </CardHeader>
                            <CardContent>
                                {company.contacts.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-12 text-center">
                                        <UserPlus className="h-12 w-12 text-muted-foreground mb-4" />
                                        <h3 className="text-lg font-semibold mb-2">No contacts yet</h3>
                                        <p className="text-muted-foreground mb-4">Get started by adding your first contact for this company.</p>
                                        <Button onClick={() => setIsAddContactDialogOpen(true)}>
                                            <Plus className="mr-2 h-4 w-4" />
                                            Add First Contact
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        {company.contacts.map((contact) => (
                                            <div key={contact.id} className="flex items-start gap-4 p-4 rounded-lg border">
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <h3 className="font-semibold text-lg">{contact.name}</h3>
                                                        {contact.is_pic && (
                                                            <Badge className="bg-green-100 text-green-700">PIC</Badge>
                                                        )}
                                                        <Badge className={getInterestLevelColor(contact.interest_level)}>
                                                            {contact.interest_level}
                                                        </Badge>
                                                    </div>
                                                    {contact.title && (
                                                        <p className="text-sm text-muted-foreground mb-2">{contact.title}</p>
                                                    )}
                                                    <div className="space-y-1">
                                                        {contact.email && (
                                                            <div className="flex items-center gap-2 text-sm">
                                                                <Mail className="h-4 w-4 text-muted-foreground" />
                                                                <a href={`mailto:${contact.email}`} className="text-primary hover:underline">
                                                                    {contact.email}
                                                                </a>
                                                            </div>
                                                        )}
                                                        {contact.phone1 && (
                                                            <div className="flex items-center gap-2 text-sm">
                                                                <Phone className="h-4 w-4 text-muted-foreground" />
                                                                <a href={`tel:${contact.phone1}`} className="text-primary hover:underline">
                                                                    {contact.phone1}
                                                                </a>
                                                            </div>
                                                        )}
                                                        {contact.linkedin_url && (
                                                            <div className="flex items-center gap-2 text-sm">
                                                                <Linkedin className="h-4 w-4 text-muted-foreground" />
                                                                <a 
                                                                    href={contact.linkedin_url} 
                                                                    target="_blank" 
                                                                    rel="noopener noreferrer"
                                                                    className="text-primary hover:underline flex items-center gap-1"
                                                                >
                                                                    LinkedIn Profile
                                                                    <ExternalLink className="h-3 w-3" />
                                                                </a>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Campaigns Tab */}
                    <TabsContent value="campaigns" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Campaigns</CardTitle>
                                <CardDescription>Campaigns this company is part of</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {company.campaigns.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">Not part of any campaigns</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>Campaign Name</TableHead>
                                                <TableHead>Campaign Status</TableHead>
                                                <TableHead>Lead Stage</TableHead>
                                                <TableHead>Next Follow-up</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {company.campaigns.map((campaign) => (
                                                <TableRow key={campaign.id}>
                                                    <TableCell className="font-medium">{campaign.name}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={campaign.status === 'Active' ? 'default' : 'secondary'}>
                                                            {campaign.status}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge className={getStageColor(campaign.pivot.stage)}>
                                                            {campaign.pivot.stage}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>{formatDate(campaign.pivot.next_followup_date)}</TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => router.visit(`/sales/leads/${campaign.pivot.id}`)}
                                                        >
                                                            View Lead
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
                    </TabsContent>

                    {/* Proposals Tab */}
                    <TabsContent value="proposals" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Proposals</CardTitle>
                                <CardDescription>All proposals submitted to this company</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {company.proposals.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No proposals found</p>
                                ) : (
                                    <div className="space-y-4">
                                        {company.proposals.map((proposal) => (
                                            <div key={proposal.id} className="p-4 rounded-lg border">
                                                <div className="flex items-start justify-between mb-3">
                                                    <div>
                                                        <h4 className="font-semibold">
                                                            {proposal.campaign?.name || `Proposal #${proposal.id}`}
                                                        </h4>
                                                        <p className="text-sm text-muted-foreground">
                                                            Created by {proposal.creator?.name || 'Unknown'} on {formatDate(proposal.created_at)}
                                                        </p>
                                                    </div>
                                                    <Badge>{proposal.currency}</Badge>
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="text-sm font-medium text-muted-foreground">One-time Fees</label>
                                                        <p className="text-base mt-1">
                                                            {proposal.one_time_fees 
                                                                ? `${proposal.currency} ${proposal.one_time_fees.toLocaleString()}`
                                                                : '—'
                                                            }
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <label className="text-sm font-medium text-muted-foreground">Annual Subscription</label>
                                                        <p className="text-base mt-1">
                                                            {proposal.annual_subscription 
                                                                ? `${proposal.currency} ${proposal.annual_subscription.toLocaleString()}`
                                                                : '—'
                                                            }
                                                        </p>
                                                    </div>
                                                </div>
                                                {proposal.other_info && (
                                                    <div className="mt-3">
                                                        <label className="text-sm font-medium text-muted-foreground">Additional Information</label>
                                                        <p className="text-sm mt-1">{proposal.other_info}</p>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Files Tab */}
                    <TabsContent value="files" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Files</CardTitle>
                                <CardDescription>Documents and files related to this company</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {company.files.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No files uploaded</p>
                                ) : (
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>File Name</TableHead>
                                                <TableHead>Category</TableHead>
                                                <TableHead>Size</TableHead>
                                                <TableHead>Uploaded</TableHead>
                                                <TableHead>Actions</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {company.files.map((file) => (
                                                <TableRow key={file.id}>
                                                    <TableCell className="font-medium">
                                                        <div className="flex items-center gap-2">
                                                            <FileText className="h-4 w-4 text-muted-foreground" />
                                                            {file.original_filename || file.filename}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="outline">{file.file_category || 'General'}</Badge>
                                                    </TableCell>
                                                    <TableCell>{formatFileSize(file.file_size)}</TableCell>
                                                    <TableCell>{formatDate(file.uploaded_at)}</TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            onClick={() => handleDownloadFile(file)}
                                                        >
                                                            <Download className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Activities Tab */}
                    <TabsContent value="activities" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Activity Log</CardTitle>
                                <CardDescription>Recent activities and interactions</CardDescription>
                            </CardHeader>
                            <CardContent>
                                {company.activities.length === 0 ? (
                                    <p className="text-center text-muted-foreground py-8">No activities recorded</p>
                                ) : (
                                    <div className="border rounded-lg">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date & Time</TableHead>
                                                    <TableHead>Agent</TableHead>
                                                    <TableHead>Type</TableHead>
                                                    <TableHead>Notes</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {company.activities.map((activity) => (
                                                    <TableRow key={activity.id}>
                                                        <TableCell className="text-sm">
                                                            {formatDateTime(activity.created_at)}
                                                        </TableCell>
                                                        <TableCell>{activity.agent?.name || 'N/A'}</TableCell>
                                                        <TableCell>
                                                            <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                                                                {activity.activity_type.replace(/_/g, ' ')}
                                                            </span>
                                                        </TableCell>
                                                        <TableCell className="max-w-xs">
                                                            {activity.notes || '—'}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>

            {/* Add Contact Dialog */}
            <Dialog open={isAddContactDialogOpen} onOpenChange={setIsAddContactDialogOpen}>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Add New Contact to {company.name}</DialogTitle>
                        <DialogDescription>
                            Create a new contact for this company.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleAddContact} className="space-y-4">
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
                                    setIsAddContactDialogOpen(false);
                                    addContactForm.reset();
                                    addContactForm.setData('company_id', company.id.toString());
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

