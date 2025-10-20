import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import AppLayout from '@/layouts/app-layout';
import type { BreadcrumbItem } from '@/types';
import { Head, router, useForm, usePage } from '@inertiajs/react';
import { useState, useRef, useEffect } from 'react';
import { Plus, ExternalLink, UserCheck, UserX, MessageCircle, AlertCircle, Pencil, FileUp, Loader2, Save, X, Trophy, XCircle } from 'lucide-react';
import axios from 'axios';
import { usePermissions } from '@/hooks/use-permissions';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface Agent {
    id: number;
    name: string;
}

interface Partner {
    id: number;
    name: string;
}

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
}

interface Campaign {
    id: number;
    name: string;
    status: string;
}

interface Company {
    id: number;
    name: string;
    contacts: Contact[];
    li_company_code: string | null;
}

interface Lead {
    id: number;
    campaign_id: number;
    campaign: Campaign;
    company_id: number;
    company: Company;
    stage: string;
    agent_id: number;
    agent: Agent;
    proposal_one_time_fees: number | null;
    proposal_annual_subscription: number | null;
    proposal_currency: string | null;
    proposal_other_info: string | null;
    partner_id: number | null;
    partner: Partner | null;
    lockin_date: string | null;
    files: LeadFile[];
    contacts: Contact[];
}

interface LeadFile {
    id: number;
    filename: string;
    original_filename: string;
    file_path: string;
    file_size: number;
    uploaded_at: string;
    file_category: string;
}

interface Proposal {
    id: number;
    company_id: number;
    campaign_id: number;
    currency: string;
    one_time_fees: number | null;
    subscription: number | null;
    annual_subscription: number | null;
    subscription_frequency: string | null;
    other_info: string | null;
    created_by: number;
    creator: {
        id: number;
        name: string;
    };
    created_at: string;
    updated_at: string;
}

interface PageProps {
    lead: Lead;
    agents: Agent[];
    partners: Partner[];
    stages: string[];
    conversationMethods: string[];
    interestLevels: string[];
    remarkOptions: string[];
    [key: string]: any;
}

export default function LeadsShow() {
    const { lead, agents = [], partners = [], stages = [], conversationMethods = [], interestLevels = [], remarkOptions = [] } = usePage<PageProps>().props;
    const permissions = usePermissions();
    
    const [notesDialogOpen, setNotesDialogOpen] = useState(false);
    const [updateDetailsDialogOpen, setUpdateDetailsDialogOpen] = useState(false);
    const [addContactDialogOpen, setAddContactDialogOpen] = useState(false);
    const [editContactDialogOpen, setEditContactDialogOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Contact | null>(null);
    const [updatingContact, setUpdatingContact] = useState<Contact | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadingFiles, setUploadingFiles] = useState(false);
    const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
    const [uploadCategory, setUploadCategory] = useState<string>('questionnaire');
    const [fileNames, setFileNames] = useState<{[key: number]: string}>({});
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [dragOverCategory, setDragOverCategory] = useState<string | null>(null);

    const [leadActivities, setLeadActivities] = useState<any[]>([]);
    const [activitiesCurrentPage, setActivitiesCurrentPage] = useState(1);
    const [activitiesHasMorePages, setActivitiesHasMorePages] = useState(false);
    const [isLoadingMoreActivities, setIsLoadingMoreActivities] = useState(false);
    const [activitiesLoaded, setActivitiesLoaded] = useState(false);
    const activitiesScrollRef = useRef<HTMLDivElement>(null);
    const activitiesLoadingRef = useRef(false);

    const [proposals, setProposals] = useState<Proposal[]>([]);
    const [currentProposal, setCurrentProposal] = useState<Proposal | null>(null);
    const [proposalsLoaded, setProposalsLoaded] = useState(false);
    const [isLoadingProposals, setIsLoadingProposals] = useState(false);

    const [linkedInLeads, setLinkedInLeads] = useState<any[]>([]);
    const [isLoadingLeads, setIsLoadingLeads] = useState(false);
    const [hasSearchedForLead, setHasSearchedForLead] = useState<number | null>(null);
    const [activeTab, setActiveTab] = useState('contacts');

    // Editing states for info card
    const [isEditingPartner, setIsEditingPartner] = useState(false);
    const [isEditingAgent, setIsEditingAgent] = useState(false);
    const [isEditingNotes, setIsEditingNotes] = useState(false);
    const [currentNotes, setCurrentNotes] = useState('');
    const [closedWinDialogOpen, setClosedWinDialogOpen] = useState(false);
    const [selectedSLA, setSelectedSLA] = useState<number | null>(null);
    const [selectedProposalFile, setSelectedProposalFile] = useState<number | null>(null);
    const [selectedQuestionnaire, setSelectedQuestionnaire] = useState<number | null>(null);
    const [showCongratulations, setShowCongratulations] = useState(false);
    const [changeStageDialogOpen, setChangeStageDialogOpen] = useState(false);
    
    // Local state for contacts to enable immediate UI updates during drag and drop
    const [localContacts, setLocalContacts] = useState<Contact[]>(lead.company.contacts);

    // Sync local contacts with server data when lead changes
    useEffect(() => {
        setLocalContacts(lead.company.contacts);
    }, [lead.company.contacts]);

    const breadcrumbs: BreadcrumbItem[] = [
        {
            title: 'Dashboard',
            href: '/dashboard',
        },
        {
            title: 'Leads',
            href: '/sales/leads',
        },
        {
            title: lead.company.name,
            href: `/sales/leads/${lead.id}`,
        },
    ];

    const updateForm = useForm({
        conversation_method: '',
        conversation_connected: '',
        next_followup_date: '',
        followup_time: '',
        lead_stage: lead?.stage || '',
        interest_level: '',
        remarks: '',
        notes: '',
    });

    const proposalForm = useForm({
        currency: 'AED',
        subscription_frequency: 'Yearly',
        subscription: '',
        one_time_fees: '',
        other_info: '',
    });

    const partnerForm = useForm({
        partner_id: lead?.partner_id?.toString() || 'none',
        lockin_date: lead?.lockin_date || '',
    });

    const agentChangeForm = useForm({
        new_agent_id: lead?.agent_id?.toString() || '',
    });

    const contactForm = useForm({
        name: '',
        title: '',
        email: '',
        phone1: '',
        phone2: '',
        linkedin_url: '',
        interest_level: 'Cold',
    });

    const changeStageForm = useForm({
        lead_stage: lead?.stage || '',
        notes: '',
    });

    const loadLeadActivities = async (leadId: number, page: number = 1) => {
        setIsLoadingMoreActivities(true);
        try {
            const response = await axios.get(`/sales/leads/${leadId}/activities?page=${page}`);
            const newActivities = response.data.leadActivities;
            
            if (page === 1) {
                setLeadActivities(newActivities.data);
            } else {
                setLeadActivities(prev => [...prev, ...newActivities.data]);
            }
            setActivitiesCurrentPage(newActivities.current_page);
            setActivitiesHasMorePages(newActivities.current_page < newActivities.last_page);
            setActivitiesLoaded(true);
        } catch (error) {
            console.error('Error loading activities:', error);
        } finally {
            setIsLoadingMoreActivities(false);
            activitiesLoadingRef.current = false;
        }
    };

    const loadProposals = async (forceReload = false) => {
        if (!forceReload && (proposalsLoaded || isLoadingProposals)) return;
        
        setIsLoadingProposals(true);
        try {
            const response = await axios.get(`/sales/leads/${lead.id}/proposals`);
            setProposals(response.data.proposals);
            setCurrentProposal(response.data.currentProposal);
            setProposalsLoaded(true);
            
            // Update form with current proposal data
            if (response.data.currentProposal) {
                proposalForm.setData({
                    currency: response.data.currentProposal.currency || 'AED',
                    subscription_frequency: response.data.currentProposal.subscription_frequency || '',
                    subscription: response.data.currentProposal.subscription || '',
                    one_time_fees: response.data.currentProposal.one_time_fees || '',
                    other_info: response.data.currentProposal.other_info || '',
                });
            }
        } catch (error) {
            console.error('Error loading proposals:', error);
        } finally {
            setIsLoadingProposals(false);
        }
    };

    const loadMoreActivities = () => {
        if (activitiesLoadingRef.current || !activitiesHasMorePages || isLoadingMoreActivities || !lead.id) return;

        activitiesLoadingRef.current = true;
        loadLeadActivities(lead.id, activitiesCurrentPage + 1);
    };

    // Infinite scroll for activities
    useEffect(() => {
        const container = activitiesScrollRef.current;
        if (!container) return;

        const handleScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
            
            if (distanceFromBottom < 200 && activitiesHasMorePages && !isLoadingMoreActivities && !activitiesLoadingRef.current) {
                loadMoreActivities();
            }
        };

        container.addEventListener('scroll', handleScroll);
        
        const checkInitialLoad = () => {
            const { scrollHeight, clientHeight } = container;
            if (scrollHeight <= clientHeight && activitiesHasMorePages && !isLoadingMoreActivities) {
                loadMoreActivities();
            }
        };
        
        setTimeout(checkInitialLoad, 100);

        return () => container.removeEventListener('scroll', handleScroll);
    }, [activitiesHasMorePages, isLoadingMoreActivities, activitiesCurrentPage, leadActivities.length]);

    const openUpdateDetailsDialog = (contact?: Contact) => {
        if (contact) {
            setUpdatingContact(contact);
            updateForm.setData({
                conversation_method: '',
                conversation_connected: '',
                next_followup_date: '',
                followup_time: '',
                lead_stage: lead?.stage || '',
                interest_level: contact.interest_level,
                remarks: '',
                notes: '',
            });
        } else {
            setUpdatingContact(null);
            updateForm.setData({
                conversation_method: '',
                conversation_connected: '',
                next_followup_date: '',
                followup_time: '',
                lead_stage: lead?.stage || '',
                interest_level: '',
                remarks: '',
                notes: '',
            });
        }
        setUpdateDetailsDialogOpen(true);
    };

    const handleUpdateDetails = (e: React.FormEvent) => {
        e.preventDefault();
        if (!lead.id || !updatingContact) return;

        setIsSubmitting(true);
        
        // Check if interest level changed
        const interestLevelChanged = updatingContact.interest_level !== updateForm.data.interest_level;
        
        // First update the lead activity
        updateForm.post(`/sales/leads/${lead.id}/update`, {
            onSuccess: () => {
                // If interest level changed, update the contact
                if (interestLevelChanged) {
                    router.put(`/sales/leads/${lead.id}/contacts/${updatingContact.id}`, {
                        name: updatingContact.name,
                        title: updatingContact.title,
                        email: updatingContact.email,
                        phone1: updatingContact.phone1,
                        phone2: updatingContact.phone2,
                        linkedin_url: updatingContact.linkedin_url,
                        interest_level: updateForm.data.interest_level,
                    }, {
                        preserveScroll: true,
                        preserveState: true,
                        only: ['lead'],
                        onSuccess: () => {
                            // Update local state immediately
                            setLocalContacts(localContacts.map(c => 
                                c.id === updatingContact.id 
                                    ? { ...c, interest_level: updateForm.data.interest_level } 
                                    : c
                            ));
                        }
                    });
                }
                setUpdateDetailsDialogOpen(false);
                setUpdatingContact(null);
                updateForm.reset();
            },
            onFinish: () => {
                setIsSubmitting(false);
            },
        });
    };

    const handleSaveProposal = () => {
        if (!lead.id) return;

        setIsSubmitting(true);
        proposalForm.post(`/sales/leads/${lead.id}/proposal`, {
            onSuccess: () => {
                // Reload proposals after saving with force reload
                loadProposals(true);
            },
            onFinish: () => {
                setIsSubmitting(false);
            },
        });
    };

    const handleSavePartner = () => {
        if (!lead.id) return;

        setIsSubmitting(true);
        partnerForm.post(`/sales/leads/${lead.id}/partner`, {
            onSuccess: () => {
                setIsEditingPartner(false);
            },
            onFinish: () => {
                setIsSubmitting(false);
            },
        });
    };

    const handleUpdateAgent = () => {
        if (!lead.id) return;

        setIsSubmitting(true);
        agentChangeForm.post(`/sales/leads/${lead.id}/agent`, {
            onSuccess: () => {
                setIsEditingAgent(false);
                agentChangeForm.reset();
            },
            onFinish: () => {
                setIsSubmitting(false);
            },
        });
    };

    const openUploadDialog = (category: string) => {
        setUploadCategory(category);
        setUploadDialogOpen(true);
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files) return;
        const files = Array.from(e.target.files);
        setSelectedFiles(files);
        
        // Initialize file names with original names
        const initialNames: {[key: number]: string} = {};
        files.forEach((file, index) => {
            initialNames[index] = file.name;
        });
        setFileNames(initialNames);
    };

    const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, category: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverCategory(category);
    };

    const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        e.stopPropagation();
        // Only clear if leaving the drop zone completely
        if (e.currentTarget === e.target) {
            setDragOverCategory(null);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>, category: string) => {
        e.preventDefault();
        e.stopPropagation();
        setDragOverCategory(null);

        const files = Array.from(e.dataTransfer.files);
        if (files.length === 0) return;

        setUploadCategory(category);
        setSelectedFiles(files);
        
        // Initialize file names with original names
        const initialNames: {[key: number]: string} = {};
        files.forEach((file, index) => {
            initialNames[index] = file.name;
        });
        setFileNames(initialNames);
        setUploadDialogOpen(true);
    };

    const handleFileUpload = () => {
        if (!lead.id || selectedFiles.length === 0) return;

        const formData = new FormData();
        selectedFiles.forEach((file, index) => {
            formData.append('files[]', file);
            formData.append('file_names[]', fileNames[index] || file.name);
        });
        formData.append('file_category', uploadCategory);

        setUploadingFiles(true);
        router.post(`/sales/leads/${lead.id}/files`, formData, {
            onSuccess: () => {
                setSelectedFiles([]);
                setFileNames({});
                setUploadDialogOpen(false);
            },
            onFinish: () => {
                setUploadingFiles(false);
            },
        });
    };

    const groupedFiles = {
        questionnaire: lead?.files.filter(f => f.file_category === 'questionnaire') || [],
        proposal: lead?.files.filter(f => f.file_category === 'proposal') || [],
        sla: lead?.files.filter(f => f.file_category === 'sla') || [],
        other: lead?.files.filter(f => f.file_category === 'other') || [],
    };

    const handleConfirmClosedWin = () => {
        if (!lead.id) return;

        setIsSubmitting(true);
        
        // Collect all selected file IDs
        const selectedFileIds = [
            selectedQuestionnaire,
            selectedProposalFile,
            selectedSLA
        ].filter(id => id !== null);

        router.post(`/sales/leads/${lead.id}/update`, {
            conversation_method: 'Other',
            lead_stage: 'Closed Win',
            interest_level: 'Hot',
            notes: `Lead marked as Closed Win. Selected Files - Questionnaire: ${selectedQuestionnaire}, Proposal: ${selectedProposalFile}, SLA: ${selectedSLA}`,
            selected_file_ids: selectedFileIds,
        }, {
            onSuccess: () => {
                setClosedWinDialogOpen(false);
                setSelectedSLA(null);
                setSelectedProposalFile(null);
                setSelectedQuestionnaire(null);
                
                // Show congratulations
                setShowCongratulations(true);
                setTimeout(() => {
                    setShowCongratulations(false);
                }, 8000);
            },
            onFinish: () => {
                setIsSubmitting(false);
            }
        });
    };

    const handleChangeStage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!lead.id) return;

        setIsSubmitting(true);
        changeStageForm.post(`/sales/leads/${lead.id}/change-stage`, {
            onSuccess: () => {
                setChangeStageDialogOpen(false);
                changeStageForm.reset();
                changeStageForm.setData('lead_stage', lead?.stage || '');
                // Reload activities
                if (activitiesLoaded) {
                    loadLeadActivities(lead.id, 1);
                }
            },
            onFinish: () => {
                setIsSubmitting(false);
            },
        });
    };

    const handleMarkAsPIC = (contactId: number) => {
        if (!lead.id) return;
        router.post(`/sales/leads/${lead.id}/contacts/${contactId}/pic`, {
            is_pic: true,
        });
    };

    const handleMarkAsNotPIC = (contactId: number) => {
        if (!lead.id) return;
        router.post(`/sales/leads/${lead.id}/contacts/${contactId}/pic`, {
            is_pic: false,
        });
    };

    const handleInvalidData = (contactId: number) => {
        if (!lead.id) return;
        if (confirm('Mark this contact as having invalid data?')) {
            router.delete(`/sales/leads/${lead.id}/contacts/${contactId}/invalid`);
        }
    };

    const handleAddContact = (e: React.FormEvent) => {
        e.preventDefault();
        if (!lead.id) return;

        setIsSubmitting(true);
        contactForm.post(`/sales/leads/${lead.id}/contacts`, {
            onSuccess: () => {
                setAddContactDialogOpen(false);
                contactForm.reset();
            },
            onFinish: () => {
                setIsSubmitting(false);
            },
        });
    };

    const handleEditContact = (e: React.FormEvent) => {
        e.preventDefault();
        if (!lead.id || !editingContact) return;

        setIsSubmitting(true);
        contactForm.put(`/sales/leads/${lead.id}/contacts/${editingContact.id}`, {
            onSuccess: () => {
                setEditContactDialogOpen(false);
                setEditingContact(null);
                contactForm.reset();
            },
            onFinish: () => {
                setIsSubmitting(false);
            },
        });
    };

    const openEditContactDialog = (contact: Contact) => {
        setEditingContact(contact);
        contactForm.setData({
            name: contact.name,
            title: contact.title || '',
            email: contact.email || '',
            phone1: contact.phone1 || '',
            phone2: contact.phone2 || '',
            linkedin_url: contact.linkedin_url || '',
            interest_level: contact.interest_level,
        });
        setEditContactDialogOpen(true);
    };

    const getInterestLevelBadgeColor = (level: string) => {
        switch (level) {
            case 'Hot': return 'bg-red-100 text-red-800 border-red-300';
            case 'Warm': return 'bg-orange-100 text-orange-800 border-orange-300';
            case 'Cold': return 'bg-blue-100 text-blue-800 border-blue-300';
            default: return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const getInterestLevelColumnColor = (level: string) => {
        switch (level) {
            case 'Hot': return 'bg-red-50 border-red-200';
            case 'Warm': return 'bg-orange-50 border-orange-200';
            case 'Cold': return 'bg-blue-50 border-blue-200';
            default: return 'bg-gray-50 border-gray-200';
        }
    };

    const handleDragEnd = (result: DropResult) => {
        const { source, destination, draggableId } = result;

        // Dropped outside the list
        if (!destination) {
            return;
        }

        // Dropped in the same position
        if (source.droppableId === destination.droppableId) {
            return;
        }

        // Get the contact ID and new interest level
        const contactId = parseInt(draggableId.replace('contact-', ''));
        const newInterestLevel = destination.droppableId;
        
        // Find the contact in local state
        const contact = localContacts.find(c => c.id === contactId);
        if (!contact) return;

        // Immediately update local state for instant UI feedback
        const updatedContacts = localContacts.map(c => 
            c.id === contactId ? { ...c, interest_level: newInterestLevel } : c
        );
        setLocalContacts(updatedContacts);

        // Update the contact's interest level via the backend in the background
        router.put(`/sales/leads/${lead.id}/contacts/${contactId}`, {
            name: contact.name,
            title: contact.title,
            email: contact.email,
            phone1: contact.phone1,
            phone2: contact.phone2,
            linkedin_url: contact.linkedin_url,
            interest_level: newInterestLevel,
        }, {
            preserveScroll: true,
            preserveState: true,
            only: ['lead'],
            onError: (errors) => {
                console.error('Failed to update contact interest level:', errors);
                // Revert local state on error
                setLocalContacts(lead.company.contacts);
            }
        });
    };

    const handleSearchLinkedIn = async () => {
        if (!lead.id) return;

        setIsLoadingLeads(true);
        try {
            const { data } = await axios.post(`/sales/leads/${lead.id}/linkedin-search`);
            
            if (data.success && data.data?.items) {
                setLinkedInLeads(data.data.items);
                setHasSearchedForLead(lead.id);
            } else {
                alert('Failed to fetch LinkedIn leads: ' + (data.message || 'Unknown error'));
            }
        } catch (error: any) {
            console.error('Error searching LinkedIn:', error);
            alert('An error occurred while searching LinkedIn: ' + (error.response?.data?.message || error.message));
        } finally {
            setIsLoadingLeads(false);
        }
    };

    // Load data when tabs are opened
    useEffect(() => {
        if (activeTab === 'find-leads' && lead.id && lead?.company.li_company_code && hasSearchedForLead !== lead.id && !isLoadingLeads) {
            handleSearchLinkedIn();
        } else if (activeTab === 'activity-logs' && !activitiesLoaded && !isLoadingMoreActivities) {
            loadLeadActivities(lead.id, 1);
        } else if (activeTab === 'proposal' && !proposalsLoaded && !isLoadingProposals) {
            loadProposals();
        }
    }, [activeTab, lead.id, lead?.company.li_company_code]);

    const handleAddLeadToContacts = (linkedInLead: any) => {
        if (!lead.id) return;

        contactForm.setData({
            name: linkedInLead.name || '',
            title: linkedInLead.current_positions?.[0]?.role || '',
            email: '',
            phone1: '',
            phone2: '',
            linkedin_url: linkedInLead.public_profile_url || '',
            interest_level: 'Cold',
        });
        setAddContactDialogOpen(true);
    };

    const truncateText = (text: string, maxLength: number) => {
        if (!text) return '';
        return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };

    const getStageBadgeColor = (stage: string) => {
        switch (stage) {
            case 'PIC Not Identified': return 'bg-slate-100 text-slate-800';
            case 'PIC Identified': return 'bg-blue-100 text-blue-800';
            case 'Contacted': return 'bg-purple-100 text-purple-800';
            case 'Demo Requested': return 'bg-indigo-100 text-indigo-800';
            case 'Demo Completed': return 'bg-cyan-100 text-cyan-800';
            case 'Questionnaire Sent': return 'bg-sky-100 text-sky-800';
            case 'Questionnaire Replied': return 'bg-teal-100 text-teal-800';
            case 'Proposal': return 'bg-yellow-100 text-yellow-800';
            case 'Closed Won': return 'bg-green-100 text-green-800';
            case 'Closed Lost': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    return (
        <AppLayout breadcrumbs={breadcrumbs}>
            <Head title={`Lead - ${lead.company.name}`} />

            {/* Congratulations Overlay with Confetti Effect */}
            {showCongratulations && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-[60] bg-gradient-to-br from-green-900/40 via-blue-900/40 to-purple-900/40 backdrop-blur-md animate-in fade-in duration-500"></div>
                    
                    {/* Celebration Message - Behind Confetti */}
                    <div className="fixed inset-0 z-[65] flex items-center justify-center pointer-events-none p-4">
                        <div className="bg-white rounded-3xl shadow-2xl max-w-2xl w-full animate-in zoom-in slide-in-from-bottom-8 duration-700">
                            <div className="px-16 py-12">
                                <div className="text-center space-y-6">
                                    {/* Title */}
                                    <h2 className="text-6xl font-bold text-green-600 mb-2">
                                        Congratulations!
                                    </h2>
                                    
                                    {/* Agent Name */}
                                    <p className="text-3xl font-semibold text-gray-900">
                                        {lead.agent.name}
                                    </p>
                                    
                                    {/* Illustration */}
                                    <div className="relative my-8">
                                        <img 
                                            src="/images/celebrate.svg" 
                                            alt="Celebration" 
                                            className="w-full max-w-md mx-auto animate-in slide-in-from-bottom duration-1000"
                                        />
                                    </div>
                                    
                                    {/* Deal Details */}
                                    <div className="space-y-2">
                                        <p className="text-base text-gray-600">
                                            You've successfully closed the deal with
                                        </p>
                                        <p className="text-3xl font-bold text-gray-900">
                                            {lead.company.name}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Confetti/Popper Animation Layer - On Top */}
                    <div className="fixed inset-0 z-[70] pointer-events-none overflow-hidden">
                        {/* Confetti particles */}
                        {[...Array(100)].map((_, i) => (
                            <div
                                key={i}
                                className="absolute text-4xl animate-confetti"
                                style={{
                                    left: `${Math.random() * 100}%`,
                                    top: '-10%',
                                    animationDelay: `${Math.random() * 1.5}s`,
                                    animationDuration: `${4 + Math.random() * 3}s`,
                                }}
                            >
                                {['🎉', '🎊', '✨', '🌟', '⭐', '💫', '🏆', '🎈', '🎁', '💎'][Math.floor(Math.random() * 10)]}
                            </div>
                        ))}
                    </div>
                    
                    {/* Add confetti animation keyframes */}
                    <style>{`
                        @keyframes confetti {
                            0% {
                                transform: translateY(0) rotate(0deg);
                                opacity: 1;
                            }
                            100% {
                                transform: translateY(110vh) rotate(1080deg);
                                opacity: 0;
                            }
                        }
                        .animate-confetti {
                            animation: confetti ease-in forwards;
                        }
                    `}</style>
                </>
            )}

            <div className="flex h-screen flex-col gap-4 rounded-xl p-4 overflow-hidden">
                <div className="space-y-6 overflow-y-auto flex-1">
                    {/* Header Section */}
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold">{lead.company.name}</h1>
                            <p className="text-sm text-gray-600 mt-1">
                                Campaign: {lead.campaign.name}
                            </p>
                        </div>
                        <div className="flex gap-2">
                            {lead.stage === 'Closed Win' ? (
                                <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-500 rounded-lg px-6 py-3 flex items-center gap-3 shadow-md">
                                    <Trophy className="h-6 w-6 text-green-600" />
                                    <div className="flex flex-col">
                                        <span className="text-green-800 font-bold text-lg">Congratulations!</span>
                                        <span className="text-green-600 text-sm">Deal Closed Win</span>
                                    </div>
                                </div>
                            ) : lead.stage === 'Closed Lost' ? (
                                <div className="bg-gradient-to-r from-red-50 to-rose-50 border-2 border-red-500 rounded-lg px-6 py-3 flex items-center gap-3 shadow-md">
                                    <XCircle className="h-6 w-6 text-red-600" />
                                    <div className="flex flex-col">
                                        <span className="text-red-800 font-bold text-lg">Closed Lost</span>
                                        <span className="text-red-600 text-sm">Better luck next time</span>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <Button
                                        variant="outline"
                                        onClick={() => {
                                            changeStageForm.setData('lead_stage', lead.stage);
                                            setChangeStageDialogOpen(true);
                                        }}
                                    >
                                        Change Stage
                                    </Button>
                                    <Button
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        onClick={() => {
                                            // Load proposals if not loaded yet
                                            if (!proposalsLoaded) {
                                                loadProposals();
                                            }
                                            setClosedWinDialogOpen(true);
                                        }}
                                    >
                                        Closed Win
                                    </Button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Lead Info Bar - Editable */}
                    <div className="bg-white rounded-lg border">
                        <div className="grid grid-cols-1 md:grid-cols-4 divide-x">
                            <div className="p-4">
                                <Label className="text-xs text-gray-600 uppercase">Stage</Label>
                                <div className="mt-2">
                                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getStageBadgeColor(lead.stage)}`}>
                                        {lead.stage}
                                    </span>
                                </div>
                            </div>
                            
                            {/* Agent - Editable (Admin only) */}
                            <div className="p-4">
                                <Label className="text-xs text-gray-600 uppercase">Agent</Label>
                                {!isEditingAgent ? (
                                    <div className="mt-2 flex items-center gap-2">
                                        <p className="font-medium">{lead.agent.name}</p>
                                        {permissions.isAdmin && (
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setIsEditingAgent(true)}
                                            >
                                                <Pencil className="h-3 w-3" />
                                            </Button>
                                        )}
                                    </div>
                                ) : (
                                    <div className="mt-2 flex items-center gap-2">
                                        <Select
                                            value={agentChangeForm.data.new_agent_id}
                                            onValueChange={(value) => agentChangeForm.setData('new_agent_id', value)}
                                        >
                                            <SelectTrigger className="flex-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {agents.map(agent => (
                                                    <SelectItem key={agent.id} value={agent.id.toString()}>
                                                        {agent.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            size="sm"
                                            onClick={handleUpdateAgent}
                                            disabled={isSubmitting}
                                        >
                                            <Save className="h-3 w-3" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setIsEditingAgent(false);
                                                agentChangeForm.setData('new_agent_id', lead.agent_id.toString());
                                            }}
                                        >
                                            <X className="h-3 w-3" />
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {/* Partner & Lock-in - Editable */}
                            <div className="p-4">
                                <Label className="text-xs text-gray-600 uppercase">Partner & Lock-in</Label>
                                {!isEditingPartner ? (
                                    <div className="mt-2 flex items-center gap-2">
                                        <div>
                                            <p className="font-medium text-sm">{lead.partner?.name || 'Not assigned'}</p>
                                            {lead.lockin_date && (
                                                <p className="text-xs text-gray-500 mt-1">{lead.lockin_date}</p>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setIsEditingPartner(true)}
                                        >
                                            <Pencil className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="mt-2 space-y-2">
                                        <div className="flex items-center gap-2">
                                            <Select
                                                value={partnerForm.data.partner_id}
                                                onValueChange={(value) => partnerForm.setData('partner_id', value)}
                                            >
                                                <SelectTrigger className="flex-1">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">No Partner</SelectItem>
                                                    {partners.map(partner => (
                                                        <SelectItem key={partner.id} value={partner.id.toString()}>
                                                            {partner.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                type="date"
                                                value={partnerForm.data.lockin_date}
                                                onChange={(e) => partnerForm.setData('lockin_date', e.target.value)}
                                                className="flex-1"
                                            />
                                            <Button
                                                size="sm"
                                                onClick={handleSavePartner}
                                                disabled={isSubmitting}
                                            >
                                                <Save className="h-3 w-3" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setIsEditingPartner(false);
                                                    partnerForm.setData({
                                                        partner_id: lead.partner_id?.toString() || 'none',
                                                        lockin_date: lead.lockin_date || '',
                                                    });
                                                }}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Notes Section */}
                            <div className="p-4">
                                <Label className="text-xs text-gray-600 uppercase">Notes</Label>
                                {!isEditingNotes ? (
                                    <div className="mt-2 flex items-start gap-2">
                                        <div className="flex-1">
                                            {currentNotes ? (
                                                <p className="text-sm whitespace-pre-wrap">{currentNotes}</p>
                                            ) : (
                                                <p className="text-sm text-gray-400 italic">Add a note</p>
                                            )}
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setIsEditingNotes(true);
                                                updateForm.setData('notes', currentNotes);
                                            }}
                                        >
                                            <Pencil className="h-3 w-3" />
                                        </Button>
                                    </div>
                                ) : (
                                    <div className="mt-2 space-y-2">
                                        <Textarea
                                            rows={3}
                                            placeholder="Add quick notes..."
                                            value={updateForm.data.notes}
                                            onChange={(e) => updateForm.setData('notes', e.target.value)}
                                            className="text-sm resize-none"
                                        />
                                        <div className="flex items-center gap-2">
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    setCurrentNotes(updateForm.data.notes);
                                                    setIsEditingNotes(false);
                                                }}
                                                className="flex-1"
                                            >
                                                <Save className="h-3 w-3 mr-1" />
                                                Save
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    setIsEditingNotes(false);
                                                    updateForm.setData('notes', currentNotes);
                                                }}
                                            >
                                                <X className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Main Tabs */}
                    <div className="bg-white rounded-lg border">
                        <Tabs defaultValue="contacts" className="w-full" onValueChange={setActiveTab}>
                            <TabsList className="grid w-full grid-cols-5 rounded-t-lg">
                                <TabsTrigger value="contacts">Identified Contacts</TabsTrigger>
                                <TabsTrigger value="find-leads">Find Contacts</TabsTrigger>
                                <TabsTrigger value="activity-logs">Activity Logs</TabsTrigger>
                                <TabsTrigger value="proposal">Proposal</TabsTrigger>
                                <TabsTrigger value="files">Files</TabsTrigger>
                            </TabsList>

                            {/* Contacts Tab */}
                            <TabsContent value="contacts" className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="text-xl font-semibold">Identified Contacts</h2>
                                    <Button onClick={() => setAddContactDialogOpen(true)}>
                                        <Plus className="h-4 w-4 mr-2" />
                                        Add Contact
                                    </Button>
                                </div>

                                {localContacts.length === 0 ? (
                                    <div className="text-center py-8 text-gray-500">
                                        No contacts found. Click "Add Contact" to create one.
                                    </div>
                                ) : (
                                    <DragDropContext onDragEnd={handleDragEnd}>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {interestLevels.map((level) => {
                                                const contactsInLevel = localContacts.filter(
                                                    (contact) => contact.interest_level === level
                                                );

                                                return (
                                                    <div key={level} className="flex flex-col">
                                                        <div className={`rounded-t-lg border-t border-x p-3 ${getInterestLevelColumnColor(level)}`}>
                                                            <h3 className="font-semibold text-center">
                                                                {level} ({contactsInLevel.length})
                                                            </h3>
                                                        </div>
                                                        <Droppable droppableId={level}>
                                                            {(provided, snapshot) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.droppableProps}
                                                                    className={`flex-1 border rounded-b-lg p-3 space-y-3 min-h-[200px] ${
                                                                        snapshot.isDraggingOver
                                                                            ? 'bg-gray-100'
                                                                            : 'bg-white'
                                                                    }`}
                                                                >
                                                                    {contactsInLevel.map((contact, index) => (
                                                                        <Draggable
                                                                            key={contact.id}
                                                                            draggableId={`contact-${contact.id}`}
                                                                            index={index}
                                                                        >
                                                                            {(provided, snapshot) => (
                                                                                <div
                                                                                    ref={provided.innerRef}
                                                                                    {...provided.draggableProps}
                                                                                    {...provided.dragHandleProps}
                                                                                    className={`border rounded-lg p-3 space-y-2 bg-white ${
                                                                                        snapshot.isDragging
                                                                                            ? 'shadow-lg'
                                                                                            : 'hover:shadow-md'
                                                                                    } transition-shadow cursor-move`}
                                                                                >
                                                                                    <div className="flex items-start justify-between gap-2">
                                                                                        <div className="flex-1 min-w-0">
                                                                                            <div className="flex items-center gap-2 flex-wrap">
                                                                                                <h4 className="font-semibold text-sm truncate">
                                                                                                    {contact.name}
                                                                                                </h4>
                                                                                                {contact.is_pic && (
                                                                                                    <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                                                                                                        PIC
                                                                                                    </span>
                                                                                                )}
                                                                                            </div>
                                                                                            {contact.title && (
                                                                                                <p className="text-xs text-gray-600 truncate mt-1">
                                                                                                    {contact.title}
                                                                                                </p>
                                                                                            )}
                                                                                        </div>
                                                                                        <Button
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            className="h-7 px-2"
                                                                                            onClick={() => openUpdateDetailsDialog(contact)}
                                                                                        >
                                                                                            Add Event
                                                                                        </Button>
                                                                                    </div>

                                                                                    <div className="space-y-1 text-xs">
                                                                                        {contact.email && (
                                                                                            <div className="flex items-center gap-1">
                                                                                                <span className="font-medium">Email:</span>
                                                                                                <a
                                                                                                    href={`mailto:${contact.email}`}
                                                                                                    className="text-blue-600 hover:underline truncate"
                                                                                                >
                                                                                                    {contact.email}
                                                                                                </a>
                                                                                            </div>
                                                                                        )}
                                                                                        {contact.phone1 && (
                                                                                            <div className="flex items-center gap-1">
                                                                                                <span className="font-medium">Phone:</span>
                                                                                                <a
                                                                                                    href={`tel:${contact.phone1}`}
                                                                                                    className="text-blue-600 hover:underline"
                                                                                                >
                                                                                                    {contact.phone1}
                                                                                                </a>
                                                                                            </div>
                                                                                        )}
                                                                                        {contact.linkedin_url && (
                                                                                            <div className="flex items-center gap-1">
                                                                                                <span className="font-medium">LinkedIn:</span>
                                                                                                <a
                                                                                                    href={contact.linkedin_url}
                                                                                                    target="_blank"
                                                                                                    rel="noopener noreferrer"
                                                                                                    className="text-blue-600 hover:underline flex items-center gap-0.5"
                                                                                                >
                                                                                                    Profile <ExternalLink className="h-2.5 w-2.5" />
                                                                                                </a>
                                                                                            </div>
                                                                                        )}
                                                                                    </div>

                                                                                    <div className="flex flex-wrap gap-1 pt-1">
                                                                                        <Button
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            className="h-6 px-2 text-xs"
                                                                                            onClick={() => handleMarkAsPIC(contact.id)}
                                                                                            disabled={contact.is_pic}
                                                                                        >
                                                                                            <UserCheck className="h-3 w-3 mr-0.5" />
                                                                                            PIC
                                                                                        </Button>
                                                                                        <Button
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            className="h-6 px-2 text-xs"
                                                                                            onClick={() => handleMarkAsNotPIC(contact.id)}
                                                                                            disabled={!contact.is_pic}
                                                                                        >
                                                                                            <UserX className="h-3 w-3 mr-0.5" />
                                                                                            Not PIC
                                                                                        </Button>
                                                                                        <Button
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            className="h-6 px-2 text-xs"
                                                                                            onClick={() =>
                                                                                                window.open(
                                                                                                    `https://wa.me/${contact.phone1?.replace(/[^0-9]/g, '')}`,
                                                                                                    '_blank'
                                                                                                )
                                                                                            }
                                                                                            disabled={!contact.phone1}
                                                                                        >
                                                                                            <MessageCircle className="h-3 w-3 mr-0.5" />
                                                                                            WA
                                                                                        </Button>
                                                                                        <Button
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            className="h-6 px-2 text-xs"
                                                                                            onClick={() => handleInvalidData(contact.id)}
                                                                                        >
                                                                                            <AlertCircle className="h-3 w-3 mr-0.5" />
                                                                                            Invalid
                                                                                        </Button>
                                                                                        <Button
                                                                                            variant="outline"
                                                                                            size="sm"
                                                                                            className="h-6 px-2 text-xs"
                                                                                            onClick={() => openEditContactDialog(contact)}
                                                                                        >
                                                                                            <Pencil className="h-3 w-3 mr-0.5" />
                                                                                            Edit
                                                                                        </Button>
                                                                                    </div>
                                                                                </div>
                                                                            )}
                                                                        </Draggable>
                                                                    ))}
                                                                    {provided.placeholder}
                                                                    {contactsInLevel.length === 0 && (
                                                                        <div className="text-center py-8 text-gray-400 text-sm">
                                                                            No {level.toLowerCase()} contacts
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            )}
                                                        </Droppable>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </DragDropContext>
                                )}
                            </TabsContent>

                            {/* Find Leads Tab */}
                            <TabsContent value="find-leads" className="p-6">
                                <div className="space-y-4">
                                    {!lead?.company.li_company_code && (
                                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                            <p className="text-yellow-800 font-medium">
                                                ⚠️ LinkedIn Company ID is missing for this company
                                            </p>
                                            <p className="text-yellow-700 text-sm mt-1">
                                                To use the "Find Leads" feature, please add the LinkedIn company code in the company settings.
                                            </p>
                                        </div>
                                    )}

                                    {isLoadingLeads && (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                                            <span className="ml-3 text-gray-600">Searching LinkedIn for leads...</span>
                                        </div>
                                    )}

                                    {!isLoadingLeads && linkedInLeads.length > 0 && (
                                        <div className="space-y-4">
                                            {linkedInLeads.map((linkedInLead, index) => (
                                                <div key={linkedInLead.id || index} className="border rounded-lg p-4 space-y-3">
                                                    <div className="flex items-start gap-4">
                                                        {linkedInLead.profile_picture_url && (
                                                            <img
                                                                src={linkedInLead.profile_picture_url}
                                                                alt={linkedInLead.name}
                                                                className="w-16 h-16 rounded-full object-cover"
                                                            />
                                                        )}
                                                        
                                                        <div className="flex-1">
                                                            <div className="flex items-start justify-between">
                                                                <div>
                                                                    <h3 className="font-semibold text-lg">{linkedInLead.name}</h3>
                                                                    {linkedInLead.current_positions?.[0]?.role && (
                                                                        <p className="text-sm text-gray-600 mt-1">
                                                                            {linkedInLead.current_positions[0].role}
                                                                        </p>
                                                                    )}
                                                                    {linkedInLead.location && (
                                                                        <p className="text-sm text-gray-500 mt-1">
                                                                            📍 {linkedInLead.location}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                                <Button
                                                                    onClick={() => handleAddLeadToContacts(linkedInLead)}
                                                                >
                                                                    <Plus className="h-4 w-4 mr-2" />
                                                                    Add to Contacts
                                                                </Button>
                                                            </div>

                                                            {linkedInLead.summary && (
                                                                <p className="text-sm text-gray-700 mt-2">
                                                                    {truncateText(linkedInLead.summary, 150)}
                                                                </p>
                                                            )}

                                                            {linkedInLead.public_profile_url && (
                                                                <a
                                                                    href={linkedInLead.public_profile_url}
                                                                    target="_blank"
                                                                    rel="noopener noreferrer"
                                                                    className="text-blue-600 hover:underline text-sm mt-2 inline-flex items-center gap-1"
                                                                >
                                                                    View LinkedIn Profile <ExternalLink className="h-3 w-3" />
                                                                </a>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {!isLoadingLeads && linkedInLeads.length === 0 && lead?.company.li_company_code && (
                                        <div className="text-center py-8 text-gray-500">
                                            No leads found for this company.
                                        </div>
                                    )}
                                </div>
                            </TabsContent>

                            {/* Activity Logs Tab */}
                            <TabsContent value="activity-logs" className="p-6">
                                <h2 className="text-xl font-semibold mb-4">Activity Logs</h2>
                                
                                {!activitiesLoaded && isLoadingMoreActivities ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                                        <span className="ml-3 text-gray-600">Loading activities...</span>
                                    </div>
                                ) : (
                                    <div className="max-h-[600px] overflow-y-auto" ref={activitiesScrollRef}>
                                        {leadActivities.length > 0 ? (
                                        <div className="border rounded-lg">
                                            <Table>
                                                <TableHeader>
                                                    <TableRow>
                                                        <TableHead>Date & Time</TableHead>
                                                        <TableHead>Agent</TableHead>
                                                        <TableHead>Contact</TableHead>
                                                        <TableHead>Type</TableHead>
                                                        <TableHead>Method</TableHead>
                                                        <TableHead>Connected</TableHead>
                                                        <TableHead>Remarks</TableHead>
                                                        <TableHead>Notes</TableHead>
                                                    </TableRow>
                                                </TableHeader>
                                                <TableBody>
                                                    {leadActivities.map((activity) => (
                                                        <TableRow key={activity.id}>
                                                            <TableCell className="text-sm">
                                                                {formatDate(activity.created_at)}
                                                            </TableCell>
                                                            <TableCell>{activity.agent?.name || 'N/A'}</TableCell>
                                                            <TableCell>{activity.contact?.name || 'N/A'}</TableCell>
                                                            <TableCell>
                                                                <span className="inline-flex items-center rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800">
                                                                    {activity.activity_type || 'N/A'}
                                                                </span>
                                                            </TableCell>
                                                            <TableCell>{activity.conversation_method || 'N/A'}</TableCell>
                                                            <TableCell>
                                                                {activity.conversation_connected !== null ? (
                                                                    <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                                                        activity.conversation_connected === 'Yes' 
                                                                            ? 'bg-green-100 text-green-800' 
                                                                            : 'bg-red-100 text-red-800'
                                                                    }`}>
                                                                        {activity.conversation_connected}
                                                                    </span>
                                                                ) : 'N/A'}
                                                            </TableCell>
                                                            <TableCell className="max-w-xs truncate">
                                                                {activity.remarks || '-'}
                                                            </TableCell>
                                                            <TableCell className="max-w-xs truncate">
                                                                {activity.notes || '-'}
                                                            </TableCell>
                                                        </TableRow>
                                                    ))}
                                                </TableBody>
                                            </Table>
                                            
                                            {isLoadingMoreActivities && (
                                                <div className="flex justify-center py-4 border-t">
                                                    <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                                                </div>
                                            )}
                                            
                                            {!activitiesHasMorePages && leadActivities.length > 0 && (
                                                <div className="text-center py-4 text-sm text-gray-500 border-t">
                                                    No more activities to load
                                                </div>
                                            )}
                                        </div>
                                        ) : (
                                            <div className="text-center py-8 text-gray-500">
                                                No activities found for this company.
                                            </div>
                                        )}
                                    </div>
                                )}
                            </TabsContent>

                            {/* Proposal Tab */}
                            <TabsContent value="proposal" className="p-6">
                                {!proposalsLoaded && isLoadingProposals ? (
                                    <div className="flex items-center justify-center py-12">
                                        <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
                                        <span className="ml-3 text-gray-600">Loading proposals...</span>
                                    </div>
                                ) : (
                                    <div className="flex flex-col lg:flex-row gap-6">
                                        {/* Left: New/Update Proposal Form */}
                                        <div className="flex-1">
                                            <h2 className="text-xl font-semibold mb-4">New/Update Proposal</h2>
                                            <div className="space-y-4">
                                            {/* First Line: Subscription Frequency and Currency */}
                                            <div className="grid grid-cols-2 gap-4">
                                                <div>
                                                    <Label htmlFor="subscription_frequency">Subscription Frequency</Label>
                                                    <Select
                                                        value={proposalForm.data.subscription_frequency}
                                                        onValueChange={(value) => proposalForm.setData('subscription_frequency', value)}
                                                    >
                                                        <SelectTrigger id="subscription_frequency">
                                                            <SelectValue placeholder="Select frequency..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="Monthly">Monthly</SelectItem>
                                                            <SelectItem value="Quarterly">Quarterly</SelectItem>
                                                            <SelectItem value="Half-Yearly">Half-Yearly</SelectItem>
                                                            <SelectItem value="Yearly">Yearly</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div>
                                                    <Label htmlFor="currency">Currency</Label>
                                                    <Select
                                                        value={proposalForm.data.currency}
                                                        onValueChange={(value) => proposalForm.setData('currency', value)}
                                                    >
                                                        <SelectTrigger id="currency">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="AED">AED</SelectItem>
                                                            <SelectItem value="USD">USD</SelectItem>
                                                            <SelectItem value="EUR">EUR</SelectItem>
                                                            <SelectItem value="GBP">GBP</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>

                                            {/* Second Line: Subscription Amount */}
                                            <div>
                                                <Label htmlFor="subscription">
                                                    Subscription ({proposalForm.data.subscription_frequency || 'Per Period'}) ({proposalForm.data.currency})
                                                </Label>
                                                <Input
                                                    id="subscription"
                                                    type="number"
                                                    step="0.01"
                                                    placeholder={`Enter ${proposalForm.data.subscription_frequency?.toLowerCase() || 'subscription'} amount in ${proposalForm.data.currency}`}
                                                    value={proposalForm.data.subscription}
                                                    onChange={(e) => proposalForm.setData('subscription', e.target.value)}
                                                />
                                                {proposalForm.data.subscription && proposalForm.data.subscription_frequency && (
                                                    <p className="text-sm text-gray-600 mt-1">
                                                        Annual: {proposalForm.data.currency} {(() => {
                                                            const sub = parseFloat(proposalForm.data.subscription);
                                                            const multiplier = {
                                                                'Monthly': 12,
                                                                'Quarterly': 4,
                                                                'Half-Yearly': 2,
                                                                'Yearly': 1,
                                                            }[proposalForm.data.subscription_frequency] || 1;
                                                            return (sub * multiplier).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                                                        })()}
                                                    </p>
                                                )}
                                            </div>

                                            {/* Third Line: One Time Fees */}
                                            <div>
                                                <Label htmlFor="one_time_fees">
                                                    One Time Fees ({proposalForm.data.currency})
                                                </Label>
                                                <Input
                                                    id="one_time_fees"
                                                    type="number"
                                                    step="0.01"
                                                    placeholder={`Enter amount in ${proposalForm.data.currency}`}
                                                    value={proposalForm.data.one_time_fees}
                                                    onChange={(e) => proposalForm.setData('one_time_fees', e.target.value)}
                                                />
                                            </div>

                                            <div>
                                                <Label htmlFor="other_info">Other Information</Label>
                                                <Textarea
                                                    id="other_info"
                                                    rows={4}
                                                    placeholder="Additional details about the proposal..."
                                                    value={proposalForm.data.other_info}
                                                    onChange={(e) => proposalForm.setData('other_info', e.target.value)}
                                                />
                                            </div>

                                            <Button onClick={handleSaveProposal} disabled={isSubmitting} className="w-full">
                                                {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                                Save Proposal
                                            </Button>
                                        </div>
                                    </div>

                                    {/* Vertical Divider */}
                                    <div className="hidden lg:block w-px bg-gray-300"></div>

                                    {/* Right: Proposal History Timeline */}
                                    <div className="flex-1">
                                        <h2 className="text-xl font-semibold mb-4">Proposal History</h2>
                                        {proposals.length > 0 ? (
                                            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2">
                                                {proposals.map((proposal, index) => (
                                                    <div 
                                                        key={proposal.id} 
                                                        className={`border rounded-md p-2 ${index === 0 ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}
                                                    >
                                                        <div className="flex items-center justify-between mb-1">
                                                            <div className="flex items-center gap-2">
                                                                {index === 0 && (
                                                                    <span className="px-1.5 py-0.5 text-xs font-medium bg-blue-600 text-white rounded">
                                                                        Current
                                                                    </span>
                                                                )}
                                                                <span className="text-xs text-gray-600">
                                                                    {new Date(proposal.created_at).toLocaleDateString('en-US', {
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                        hour: '2-digit',
                                                                        minute: '2-digit'
                                                                    })}
                                                                </span>
                                                            </div>
                                                            <span className="text-xs text-gray-500">
                                                                {proposal.creator.name}
                                                            </span>
                                                        </div>

                                                        <div className="space-y-0.5 text-xs">
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">Currency:</span>
                                                                <span className="font-medium">{proposal.currency}</span>
                                                            </div>
                                                            {proposal.subscription_frequency && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-600">Frequency:</span>
                                                                    <span className="font-medium">{proposal.subscription_frequency}</span>
                                                                </div>
                                                            )}
                                                            {proposal.subscription && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-600">Subscription ({proposal.subscription_frequency || 'Per Period'}):</span>
                                                                    <span className="font-medium">
                                                                        {`${proposal.currency} ${parseFloat(proposal.subscription.toString()).toLocaleString()}`}
                                                                    </span>
                                                                </div>
                                                            )}
                                                            <div className="flex justify-between">
                                                                <span className="text-gray-600">One Time:</span>
                                                                <span className="font-medium">
                                                                    {proposal.one_time_fees 
                                                                        ? `${proposal.currency} ${parseFloat(proposal.one_time_fees.toString()).toLocaleString()}` 
                                                                        : '-'}
                                                                </span>
                                                            </div>
                                                            {proposal.annual_subscription && (
                                                                <div className="flex justify-between">
                                                                    <span className="text-gray-600">Annual (Calculated):</span>
                                                                    <span className="font-medium">
                                                                        {`${proposal.currency} ${parseFloat(proposal.annual_subscription.toString()).toLocaleString()}`}
                                                                    </span>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {proposal.other_info && (
                                                            <div className="mt-1.5 pt-1.5 border-t">
                                                                <p className="text-xs text-gray-700 line-clamp-2">{proposal.other_info}</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-12 text-gray-500 border rounded-lg">
                                                <p className="text-sm">No proposals yet.</p>
                                                <p className="text-xs mt-1">Create your first proposal on the left.</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                )}
                            </TabsContent>

                            {/* Files Tab */}
                            <TabsContent value="files" className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    {/* Questionnaire */}
                                    <div 
                                        className={`border-2 border-dashed rounded-lg p-4 transition-all relative ${
                                            dragOverCategory === 'questionnaire' 
                                                ? 'border-blue-500 bg-blue-50 shadow-lg' 
                                                : 'border-gray-300 hover:border-blue-400'
                                        }`}
                                        onDragOver={handleDragOver}
                                        onDragEnter={(e) => handleDragEnter(e, 'questionnaire')}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, 'questionnaire')}
                                    >
                                        {dragOverCategory === 'questionnaire' && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-blue-100/95 rounded-lg z-10">
                                                <div className="text-center">
                                                    <FileUp className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                                                    <p className="text-sm font-medium text-blue-700">Drop files here to upload</p>
                                                    <p className="text-xs text-blue-600 mt-1">to Questionnaire</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold flex items-center gap-2">
                                                <FileUp className="h-4 w-4 text-blue-500" />
                                                Questionnaire
                                            </h3>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openUploadDialog('questionnaire')}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        {groupedFiles.questionnaire.length > 0 ? (
                                            <div className="space-y-2">
                                                {groupedFiles.questionnaire.map(file => (
                                                    <div key={file.id} className="p-2 bg-gray-50 rounded">
                                                        <p className="text-sm font-medium truncate">{file.original_filename}</p>
                                                        <div className="flex items-center justify-between mt-1">
                                                            <p className="text-xs text-gray-500">
                                                                {(file.file_size / 1024).toFixed(2)} KB
                                                            </p>
                                                            <a
                                                                href={file.file_path}
                                                                download
                                                                className="text-xs text-blue-600 hover:underline"
                                                            >
                                                                Download
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-500 text-center py-4">Drag & drop or click +</p>
                                        )}
                                    </div>

                                    {/* Proposal */}
                                    <div 
                                        className={`border-2 border-dashed rounded-lg p-4 transition-all relative ${
                                            dragOverCategory === 'proposal' 
                                                ? 'border-green-500 bg-green-50 shadow-lg' 
                                                : 'border-gray-300 hover:border-green-400'
                                        }`}
                                        onDragOver={handleDragOver}
                                        onDragEnter={(e) => handleDragEnter(e, 'proposal')}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, 'proposal')}
                                    >
                                        {dragOverCategory === 'proposal' && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-green-100/95 rounded-lg z-10">
                                                <div className="text-center">
                                                    <FileUp className="h-8 w-8 text-green-600 mx-auto mb-2" />
                                                    <p className="text-sm font-medium text-green-700">Drop files here to upload</p>
                                                    <p className="text-xs text-green-600 mt-1">to Proposal</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold flex items-center gap-2">
                                                <FileUp className="h-4 w-4 text-green-500" />
                                                Proposal
                                            </h3>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openUploadDialog('proposal')}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        {groupedFiles.proposal.length > 0 ? (
                                            <div className="space-y-2">
                                                {groupedFiles.proposal.map(file => (
                                                    <div key={file.id} className="p-2 bg-gray-50 rounded">
                                                        <p className="text-sm font-medium truncate">{file.original_filename}</p>
                                                        <div className="flex items-center justify-between mt-1">
                                                            <p className="text-xs text-gray-500">
                                                                {(file.file_size / 1024).toFixed(2)} KB
                                                            </p>
                                                            <a
                                                                href={file.file_path}
                                                                download
                                                                className="text-xs text-blue-600 hover:underline"
                                                            >
                                                                Download
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-500 text-center py-4">Drag & drop or click +</p>
                                        )}
                                    </div>

                                    {/* SLA */}
                                    <div 
                                        className={`border-2 border-dashed rounded-lg p-4 transition-all relative ${
                                            dragOverCategory === 'sla' 
                                                ? 'border-purple-500 bg-purple-50 shadow-lg' 
                                                : 'border-gray-300 hover:border-purple-400'
                                        }`}
                                        onDragOver={handleDragOver}
                                        onDragEnter={(e) => handleDragEnter(e, 'sla')}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, 'sla')}
                                    >
                                        {dragOverCategory === 'sla' && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-purple-100/95 rounded-lg z-10">
                                                <div className="text-center">
                                                    <FileUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
                                                    <p className="text-sm font-medium text-purple-700">Drop files here to upload</p>
                                                    <p className="text-xs text-purple-600 mt-1">to SLA</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold flex items-center gap-2">
                                                <FileUp className="h-4 w-4 text-purple-500" />
                                                SLA
                                            </h3>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openUploadDialog('sla')}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        {groupedFiles.sla.length > 0 ? (
                                            <div className="space-y-2">
                                                {groupedFiles.sla.map(file => (
                                                    <div key={file.id} className="p-2 bg-gray-50 rounded">
                                                        <p className="text-sm font-medium truncate">{file.original_filename}</p>
                                                        <div className="flex items-center justify-between mt-1">
                                                            <p className="text-xs text-gray-500">
                                                                {(file.file_size / 1024).toFixed(2)} KB
                                                            </p>
                                                            <a
                                                                href={file.file_path}
                                                                download
                                                                className="text-xs text-blue-600 hover:underline"
                                                            >
                                                                Download
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-500 text-center py-4">Drag & drop or click +</p>
                                        )}
                                    </div>

                                    {/* Other */}
                                    <div 
                                        className={`border-2 border-dashed rounded-lg p-4 transition-all relative ${
                                            dragOverCategory === 'other' 
                                                ? 'border-gray-500 bg-gray-50 shadow-lg' 
                                                : 'border-gray-300 hover:border-gray-400'
                                        }`}
                                        onDragOver={handleDragOver}
                                        onDragEnter={(e) => handleDragEnter(e, 'other')}
                                        onDragLeave={handleDragLeave}
                                        onDrop={(e) => handleDrop(e, 'other')}
                                    >
                                        {dragOverCategory === 'other' && (
                                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100/95 rounded-lg z-10">
                                                <div className="text-center">
                                                    <FileUp className="h-8 w-8 text-gray-600 mx-auto mb-2" />
                                                    <p className="text-sm font-medium text-gray-700">Drop files here to upload</p>
                                                    <p className="text-xs text-gray-600 mt-1">to Other</p>
                                                </div>
                                            </div>
                                        )}
                                        <div className="flex items-center justify-between mb-3">
                                            <h3 className="font-semibold flex items-center gap-2">
                                                <FileUp className="h-4 w-4 text-gray-500" />
                                                Other
                                            </h3>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => openUploadDialog('other')}
                                            >
                                                <Plus className="h-3 w-3" />
                                            </Button>
                                        </div>
                                        {groupedFiles.other.length > 0 ? (
                                            <div className="space-y-2">
                                                {groupedFiles.other.map(file => (
                                                    <div key={file.id} className="p-2 bg-gray-50 rounded">
                                                        <p className="text-sm font-medium truncate">{file.original_filename}</p>
                                                        <div className="flex items-center justify-between mt-1">
                                                            <p className="text-xs text-gray-500">
                                                                {(file.file_size / 1024).toFixed(2)} KB
                                                            </p>
                                                            <a
                                                                href={file.file_path}
                                                                download
                                                                className="text-xs text-blue-600 hover:underline"
                                                            >
                                                                Download
                                                            </a>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-xs text-gray-500 text-center py-4">Drag & drop or click +</p>
                                        )}
                                    </div>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>

                {/* Update Details Dialog */}
                <Dialog open={updateDetailsDialogOpen} onOpenChange={setUpdateDetailsDialogOpen}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Add New Event{updatingContact ? ` - ${updatingContact.name}` : ''}</DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleUpdateDetails} className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <Label htmlFor="conversation_method">
                                        Conversation Method <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={updateForm.data.conversation_method}
                                        onValueChange={(value) => updateForm.setData('conversation_method', value)}
                                    >
                                        <SelectTrigger id="conversation_method">
                                            <SelectValue placeholder="Select method..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {conversationMethods.map(method => (
                                                <SelectItem key={method} value={method}>
                                                    {method}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {updateForm.errors.conversation_method && (
                                        <p className="text-sm text-red-500 mt-1">{updateForm.errors.conversation_method}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="conversation_connected">Conversation Connected?</Label>
                                    <Select
                                        value={updateForm.data.conversation_connected}
                                        onValueChange={(value) => updateForm.setData('conversation_connected', value)}
                                    >
                                        <SelectTrigger id="conversation_connected">
                                            <SelectValue placeholder="Select..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Yes">Yes</SelectItem>
                                            <SelectItem value="No">No</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div>
                                    <Label htmlFor="next_followup_date">Next Follow-up Date</Label>
                                    <Input
                                        id="next_followup_date"
                                        type="date"
                                        value={updateForm.data.next_followup_date}
                                        onChange={(e) => updateForm.setData('next_followup_date', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="followup_time">Follow-up Time</Label>
                                    <Input
                                        id="followup_time"
                                        type="time"
                                        value={updateForm.data.followup_time}
                                        onChange={(e) => updateForm.setData('followup_time', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="lead_stage">
                                        Lead Stage <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={updateForm.data.lead_stage}
                                        onValueChange={(value) => updateForm.setData('lead_stage', value)}
                                    >
                                        <SelectTrigger id="lead_stage">
                                            <SelectValue placeholder="Select stage..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {stages.map(stage => (
                                                <SelectItem key={stage} value={stage}>
                                                    {stage}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {updateForm.errors.lead_stage && (
                                        <p className="text-sm text-red-500 mt-1">{updateForm.errors.lead_stage}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="interest_level">
                                        Interest Level Changed <span className="text-red-500">*</span>
                                    </Label>
                                    <Select
                                        value={updateForm.data.interest_level}
                                        onValueChange={(value) => updateForm.setData('interest_level', value)}
                                    >
                                        <SelectTrigger id="interest_level">
                                            <SelectValue placeholder="Select level..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {interestLevels.map(level => (
                                                <SelectItem key={level} value={level}>
                                                    {level}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    {updateForm.errors.interest_level && (
                                        <p className="text-sm text-red-500 mt-1">{updateForm.errors.interest_level}</p>
                                    )}
                                </div>

                                <div>
                                    <Label htmlFor="remarks">Remarks</Label>
                                    <Select
                                        value={updateForm.data.remarks}
                                        onValueChange={(value) => updateForm.setData('remarks', value)}
                                    >
                                        <SelectTrigger id="remarks">
                                            <SelectValue placeholder="Select remark..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {remarkOptions.map(remark => (
                                                <SelectItem key={remark} value={remark}>
                                                    {remark}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div>
                                <Label htmlFor="notes">Notes</Label>
                                <Textarea
                                    id="notes"
                                    rows={4}
                                    value={updateForm.data.notes}
                                    onChange={(e) => updateForm.setData('notes', e.target.value)}
                                    placeholder="Enter any additional notes..."
                                />
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setUpdateDetailsDialogOpen(false);
                                        setUpdatingContact(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Update Details
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Add Contact Dialog */}
                <Dialog open={addContactDialogOpen} onOpenChange={setAddContactDialogOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Add Contact</DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleAddContact} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Label htmlFor="contact_name">
                                        Name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="contact_name"
                                        value={contactForm.data.name}
                                        onChange={(e) => contactForm.setData('name', e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="contact_title">Title/Role</Label>
                                    <Input
                                        id="contact_title"
                                        value={contactForm.data.title}
                                        onChange={(e) => contactForm.setData('title', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="contact_interest_level">Interest Level</Label>
                                    <Select
                                        value={contactForm.data.interest_level}
                                        onValueChange={(value) => contactForm.setData('interest_level', value)}
                                    >
                                        <SelectTrigger id="contact_interest_level">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {interestLevels.map(level => (
                                                <SelectItem key={level} value={level}>
                                                    {level}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="col-span-2">
                                    <Label htmlFor="contact_email">Email</Label>
                                    <Input
                                        id="contact_email"
                                        type="email"
                                        value={contactForm.data.email}
                                        onChange={(e) => contactForm.setData('email', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="contact_phone1">Phone 1</Label>
                                    <Input
                                        id="contact_phone1"
                                        value={contactForm.data.phone1}
                                        onChange={(e) => contactForm.setData('phone1', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="contact_phone2">Phone 2</Label>
                                    <Input
                                        id="contact_phone2"
                                        value={contactForm.data.phone2}
                                        onChange={(e) => contactForm.setData('phone2', e.target.value)}
                                    />
                                </div>

                                <div className="col-span-2">
                                    <Label htmlFor="contact_linkedin">LinkedIn Profile URL</Label>
                                    <Input
                                        id="contact_linkedin"
                                        type="url"
                                        value={contactForm.data.linkedin_url}
                                        onChange={(e) => contactForm.setData('linkedin_url', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setAddContactDialogOpen(false);
                                        contactForm.reset();
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Add Contact
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Edit Contact Dialog */}
                <Dialog open={editContactDialogOpen} onOpenChange={setEditContactDialogOpen}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Edit Contact</DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleEditContact} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <Label htmlFor="edit_contact_name">
                                        Name <span className="text-red-500">*</span>
                                    </Label>
                                    <Input
                                        id="edit_contact_name"
                                        value={contactForm.data.name}
                                        onChange={(e) => contactForm.setData('name', e.target.value)}
                                        required
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="edit_contact_title">Title/Role</Label>
                                    <Input
                                        id="edit_contact_title"
                                        value={contactForm.data.title}
                                        onChange={(e) => contactForm.setData('title', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="edit_contact_interest_level">Interest Level</Label>
                                    <Select
                                        value={contactForm.data.interest_level}
                                        onValueChange={(value) => contactForm.setData('interest_level', value)}
                                    >
                                        <SelectTrigger id="edit_contact_interest_level">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {interestLevels.map(level => (
                                                <SelectItem key={level} value={level}>
                                                    {level}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="col-span-2">
                                    <Label htmlFor="edit_contact_email">Email</Label>
                                    <Input
                                        id="edit_contact_email"
                                        type="email"
                                        value={contactForm.data.email}
                                        onChange={(e) => contactForm.setData('email', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="edit_contact_phone1">Phone 1</Label>
                                    <Input
                                        id="edit_contact_phone1"
                                        value={contactForm.data.phone1}
                                        onChange={(e) => contactForm.setData('phone1', e.target.value)}
                                    />
                                </div>

                                <div>
                                    <Label htmlFor="edit_contact_phone2">Phone 2</Label>
                                    <Input
                                        id="edit_contact_phone2"
                                        value={contactForm.data.phone2}
                                        onChange={(e) => contactForm.setData('phone2', e.target.value)}
                                    />
                                </div>

                                <div className="col-span-2">
                                    <Label htmlFor="edit_contact_linkedin">LinkedIn Profile URL</Label>
                                    <Input
                                        id="edit_contact_linkedin"
                                        type="url"
                                        value={contactForm.data.linkedin_url}
                                        onChange={(e) => contactForm.setData('linkedin_url', e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setEditContactDialogOpen(false);
                                        setEditingContact(null);
                                        contactForm.reset();
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Save Changes
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Closed Win Confirmation Dialog */}
                <Dialog open={closedWinDialogOpen} onOpenChange={setClosedWinDialogOpen}>
                    <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Confirm Closed Win</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-6">
                            {/* File Selection Section */}
                            <div className="space-y-4">
                                <h3 className="font-semibold">Select Required Files</h3>
                                
                                {/* Questionnaire Files */}
                                <div>
                                    <Label className="text-sm font-medium">Questionnaire</Label>
                                    {groupedFiles.questionnaire.length > 0 ? (
                                        <div className="mt-2 space-y-2 border rounded-lg p-3">
                                            {groupedFiles.questionnaire.map(file => (
                                                <label key={file.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                                    <input
                                                        type="radio"
                                                        name="questionnaire"
                                                        value={file.id}
                                                        checked={selectedQuestionnaire === file.id}
                                                        onChange={() => setSelectedQuestionnaire(file.id)}
                                                        className="h-4 w-4"
                                                    />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium">{file.original_filename}</p>
                                                        <p className="text-xs text-gray-500">{(file.file_size / 1024).toFixed(2)} KB</p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-red-600 mt-2">⚠️ No questionnaire files uploaded</p>
                                    )}
                                </div>

                                {/* Proposal Files */}
                                <div>
                                    <Label className="text-sm font-medium">Proposal</Label>
                                    {groupedFiles.proposal.length > 0 ? (
                                        <div className="mt-2 space-y-2 border rounded-lg p-3">
                                            {groupedFiles.proposal.map(file => (
                                                <label key={file.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                                    <input
                                                        type="radio"
                                                        name="proposal"
                                                        value={file.id}
                                                        checked={selectedProposalFile === file.id}
                                                        onChange={() => setSelectedProposalFile(file.id)}
                                                        className="h-4 w-4"
                                                    />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium">{file.original_filename}</p>
                                                        <p className="text-xs text-gray-500">{(file.file_size / 1024).toFixed(2)} KB</p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-red-600 mt-2">⚠️ No proposal files uploaded</p>
                                    )}
                                </div>

                                {/* SLA Files */}
                                <div>
                                    <Label className="text-sm font-medium">SLA</Label>
                                    {groupedFiles.sla.length > 0 ? (
                                        <div className="mt-2 space-y-2 border rounded-lg p-3">
                                            {groupedFiles.sla.map(file => (
                                                <label key={file.id} className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded">
                                                    <input
                                                        type="radio"
                                                        name="sla"
                                                        value={file.id}
                                                        checked={selectedSLA === file.id}
                                                        onChange={() => setSelectedSLA(file.id)}
                                                        className="h-4 w-4"
                                                    />
                                                    <div className="flex-1">
                                                        <p className="text-sm font-medium">{file.original_filename}</p>
                                                        <p className="text-xs text-gray-500">{(file.file_size / 1024).toFixed(2)} KB</p>
                                                    </div>
                                                </label>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-red-600 mt-2">⚠️ No SLA files uploaded</p>
                                    )}
                                </div>
                            </div>

                            {/* Proposal Amounts Confirmation */}
                            <div className="border-t pt-4">
                                <h3 className="font-semibold mb-3">Confirm Proposal Amounts</h3>
                                {isLoadingProposals ? (
                                    <div className="flex items-center justify-center py-4">
                                        <Loader2 className="h-6 w-6 animate-spin text-gray-500" />
                                    </div>
                                ) : currentProposal ? (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <Label className="text-xs text-gray-600">Currency</Label>
                                                <p className="font-medium">{currentProposal.currency}</p>
                                            </div>
                                            {currentProposal.subscription_frequency && (
                                                <div>
                                                    <Label className="text-xs text-gray-600">Subscription Frequency</Label>
                                                    <p className="font-medium">{currentProposal.subscription_frequency}</p>
                                                </div>
                                            )}
                                            {currentProposal.subscription && (
                                                <div>
                                                    <Label className="text-xs text-gray-600">Subscription ({currentProposal.subscription_frequency || 'Per Period'})</Label>
                                                    <p className="font-medium">
                                                        {`${currentProposal.currency} ${parseFloat(currentProposal.subscription.toString()).toLocaleString()}`}
                                                    </p>
                                                </div>
                                            )}
                                            <div>
                                                <Label className="text-xs text-gray-600">One Time Fees</Label>
                                                <p className="font-medium">
                                                    {currentProposal.one_time_fees 
                                                        ? `${currentProposal.currency} ${parseFloat(currentProposal.one_time_fees.toString()).toLocaleString()}` 
                                                        : '-'}
                                                </p>
                                            </div>
                                            {currentProposal.annual_subscription && (
                                                <div>
                                                    <Label className="text-xs text-gray-600">Annual (Calculated)</Label>
                                                    <p className="font-medium">
                                                        {`${currentProposal.currency} ${parseFloat(currentProposal.annual_subscription.toString()).toLocaleString()}`}
                                                    </p>
                                                </div>
                                            )}
                                        </div>
                                        {currentProposal.other_info && (
                                            <div className="mt-3">
                                                <Label className="text-xs text-gray-600">Other Information</Label>
                                                <p className="text-sm mt-1">{currentProposal.other_info}</p>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-red-600">⚠️ No proposal found</p>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="flex justify-end gap-2 border-t pt-4">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setClosedWinDialogOpen(false);
                                        setSelectedSLA(null);
                                        setSelectedProposalFile(null);
                                        setSelectedQuestionnaire(null);
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    className="bg-green-600 hover:bg-green-700"
                                    onClick={handleConfirmClosedWin}
                                    disabled={
                                        !selectedQuestionnaire || 
                                        !selectedProposalFile || 
                                        !selectedSLA || 
                                        !currentProposal ||
                                        isSubmitting
                                    }
                                >
                                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Confirm Closed Win
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* Change Stage Dialog */}
                <Dialog open={changeStageDialogOpen} onOpenChange={setChangeStageDialogOpen}>
                    <DialogContent className="max-w-md">
                        <DialogHeader>
                            <DialogTitle>Change Lead Stage</DialogTitle>
                        </DialogHeader>

                        <form onSubmit={handleChangeStage} className="space-y-4">
                            <div>
                                <Label htmlFor="change_lead_stage">
                                    New Stage <span className="text-red-500">*</span>
                                </Label>
                                <Select
                                    value={changeStageForm.data.lead_stage}
                                    onValueChange={(value) => changeStageForm.setData('lead_stage', value)}
                                >
                                    <SelectTrigger id="change_lead_stage">
                                        <SelectValue placeholder="Select stage..." />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stages.map(stage => (
                                            <SelectItem key={stage} value={stage}>
                                                {stage}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                {changeStageForm.errors.lead_stage && (
                                    <p className="text-sm text-red-500 mt-1">{changeStageForm.errors.lead_stage}</p>
                                )}
                            </div>

                            <div>
                                <Label htmlFor="change_stage_notes">Notes</Label>
                                <Textarea
                                    id="change_stage_notes"
                                    rows={4}
                                    value={changeStageForm.data.notes}
                                    onChange={(e) => changeStageForm.setData('notes', e.target.value)}
                                    placeholder="Add notes about this stage change (optional)..."
                                />
                                {changeStageForm.errors.notes && (
                                    <p className="text-sm text-red-500 mt-1">{changeStageForm.errors.notes}</p>
                                )}
                            </div>

                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setChangeStageDialogOpen(false);
                                        changeStageForm.reset();
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button type="submit" disabled={isSubmitting}>
                                    {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Change Stage
                                </Button>
                            </div>
                        </form>
                    </DialogContent>
                </Dialog>

                {/* Notes Dialog */}
                <Dialog open={notesDialogOpen} onOpenChange={setNotesDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Add Notes</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                            <Textarea
                                rows={6}
                                placeholder="Enter your notes here..."
                                value={updateForm.data.notes}
                                onChange={(e) => updateForm.setData('notes', e.target.value)}
                            />
                            <div className="flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setNotesDialogOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={() => {
                                    setNotesDialogOpen(false);
                                    // Notes will be saved when Update Details is submitted
                                }}>
                                    Save Notes
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>

                {/* File Upload Dialog */}
                <Dialog open={uploadDialogOpen} onOpenChange={(open) => {
                    setUploadDialogOpen(open);
                    if (!open) {
                        setSelectedFiles([]);
                        setFileNames({});
                    }
                }}>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>Upload Files - {uploadCategory.charAt(0).toUpperCase() + uploadCategory.slice(1)}</DialogTitle>
                        </DialogHeader>

                        <div className="space-y-4">
                            <div>
                                <Label htmlFor="file_upload_dialog">Select Files</Label>
                                <Input
                                    id="file_upload_dialog"
                                    type="file"
                                    multiple
                                    onChange={handleFileSelect}
                                    disabled={uploadingFiles}
                                />
                                <p className="text-sm text-gray-500 mt-1">
                                    You can select multiple files to upload
                                </p>
                            </div>

                            {selectedFiles.length > 0 && (
                                <div className="space-y-2">
                                    <Label>File Names (Edit before uploading)</Label>
                                    <div className="max-h-64 overflow-y-auto space-y-2">
                                        {selectedFiles.map((file, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <FileUp className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                                <Input
                                                    placeholder="Enter file name"
                                                    value={fileNames[index] || ''}
                                                    onChange={(e) => {
                                                        setFileNames(prev => ({
                                                            ...prev,
                                                            [index]: e.target.value
                                                        }));
                                                    }}
                                                    className="flex-1"
                                                />
                                                <span className="text-xs text-gray-500 flex-shrink-0">
                                                    {(file.size / 1024).toFixed(2)} KB
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-end gap-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => {
                                        setUploadDialogOpen(false);
                                        setSelectedFiles([]);
                                        setFileNames({});
                                    }}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleFileUpload}
                                    disabled={uploadingFiles || selectedFiles.length === 0}
                                >
                                    {uploadingFiles && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                    Upload {selectedFiles.length > 0 ? `${selectedFiles.length} File(s)` : 'Files'}
                                </Button>
                            </div>
                        </div>
                    </DialogContent>
                </Dialog>
            </div>
        </AppLayout>
    );
}
