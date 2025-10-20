<?php

namespace App\Http\Controllers;

use App\Models\Company;
use App\Models\Contact;
use App\Models\Partner;
use App\Models\User;
use App\Models\Activity;
use App\Models\CompanyFile;
use App\Models\Campaign;
use App\Models\Lead;
use App\Models\CompanyProposal;
use App\Models\Project;
use App\Models\Contract;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class LeadsController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        
        // Get campaigns user has access to
        if ($user->isAdmin()) {
            $userCampaigns = Campaign::with('leads')->get();
        } else {
            $userCampaigns = $user->campaigns()->with('leads')->get();
        }

        // Build query for leads
        $query = Lead::with(['campaign', 'company.contacts', 'agent', 'partner', 'files']);

        // Filter by user's accessible campaigns
        if (!$user->isAdmin()) {
            $campaignIds = $userCampaigns->pluck('id');
            $query->whereIn('campaign_id', $campaignIds);
            // Also filter by agent if user is not admin
            $query->where('agent_id', $user->id);
        }

        // Filter by campaign if specified
        if ($request->filled('campaign_id')) {
            $query->where('campaign_id', $request->campaign_id);
        }

        // Filter by stage if specified
        if ($request->filled('stage')) {
            $query->where('stage', $request->stage);
        }

        // Filter by agent if specified
        if ($request->filled('agent_id')) {
            $query->where('agent_id', $request->agent_id);
        }

        // Search by company name (case insensitive)
        if ($request->filled('search')) {
            $query->whereHas('company', function ($q) use ($request) {
                $q->whereRaw('LOWER(name) LIKE ?', ['%' . strtolower($request->search) . '%']);
            });
        }

        $leads = $query->orderBy('updated_at', 'desc')->paginate(50);

        // Transform leads to match expected structure
        $leadsData = $leads->through(function ($lead) {
            // Get last activity date for this lead
            $lastActivity = Activity::where('lead_id', $lead->id)
                ->orderBy('created_at', 'desc')
                ->first();
            
            return [
                'id' => $lead->id,
                'campaign_id' => $lead->campaign_id,
                'campaign' => $lead->campaign,
                'company_id' => $lead->company_id,
                'company' => $lead->company,
                'contacts_count' => $lead->company->contacts ? $lead->company->contacts->count() : 0,
                'stage' => $lead->stage,
                'agent_id' => $lead->agent_id,
                'agent' => $lead->agent,
                'partner_id' => $lead->partner_id,
                'partner' => $lead->partner,
                'next_followup_date' => $lead->next_followup_date,
                'last_activity_date' => $lastActivity ? $lastActivity->created_at : null,
                'files' => $lead->files,
                'proposal_currency' => $lead->proposal_currency,
                'proposal_one_time_fees' => $lead->proposal_one_time_fees,
                'proposal_annual_subscription' => $lead->proposal_annual_subscription,
                'proposal_other_info' => $lead->proposal_other_info,
                'lockin_date' => $lead->lockin_date,
                'created_at' => $lead->created_at,
                'updated_at' => $lead->updated_at,
            ];
        });

        // Get agents list
        if (!$user->isAdmin()) {
            $agents = User::where('id', $user->id)->select('id', 'name')->get();
        } else {
            $agents = User::select('id', 'name')->orderBy('name')->get();
        }
        
        $partners = Partner::orderBy('name')->get(['id', 'name']);

        $stages = [
            'PIC Not Identified',
            'PIC Identified',
            'Contacted',
            'Demo Requested',
            'Demo Completed',
            'Questionnaire Sent',
            'Questionnaire Replied',
            'Proposal',
            'Closed Won',
            'Closed Lost'
        ];

        $conversationMethods = [
            'Call',
            'WhatsApp',
            'LinkedIn',
            'Email',
            'Teams Chat',
            'Other'
        ];

        $interestLevels = [
            'Cold',
            'Warm',
            'Hot'
        ];

        $remarkOptions = [
            'Follow up required',
            'Awaiting response',
            'Need more information',
            'Budget constraints',
            'Decision maker not available',
            'Competitor comparison',
            'Timeline delayed',
            'Positive feedback',
            'Ready to proceed',
            'Not interested at this time'
        ];

        return Inertia::render('Leads/Index', [
            'leads' => $leadsData,
            'campaigns' => $userCampaigns,
            'agents' => $agents,
            'stages' => $stages,
            'filters' => [
                'search' => $request->search,
                'campaign_id' => $request->campaign_id,
                'stage' => $request->stage,
                'agent_id' => $request->agent_id,
            ],
        ]);
    }

    public function show(Lead $lead)
    {
        $user = auth()->user();
        
        // Check access
        if (!$user->isAdmin() && $lead->agent_id !== $user->id) {
            abort(403, 'Unauthorized action. You can only view leads where you are the agent.');
        }

        // Load lead with relationships
        $lead->load(['campaign', 'company.contacts', 'agent', 'partner', 'files']);

        // Get agents list
        if (!$user->isAdmin()) {
            $agents = User::where('id', $user->id)->select('id', 'name')->get();
        } else {
            $agents = User::select('id', 'name')->orderBy('name')->get();
        }
        
        $partners = Partner::orderBy('name')->get(['id', 'name']);
        
        $stages = [
            'PIC Not Identified',
            'PIC Identified',
            'Contacted',
            'Demo Requested',
            'Demo Completed',
            'Questionnaire Sent',
            'Questionnaire Replied',
            'Proposal',
            'Closed Won',
            'Closed Lost'
        ];

        $conversationMethods = [
            'Call',
            'WhatsApp',
            'LinkedIn',
            'Email',
            'Teams Chat',
            'Other'
        ];

        $interestLevels = [
            'Cold',
            'Warm',
            'Hot'
        ];

        $remarkOptions = [
            'Follow up required',
            'Awaiting response',
            'Need more information',
            'Budget constraints',
            'Decision maker not available',
            'Competitor comparison',
            'Timeline delayed',
            'Positive feedback',
            'Ready to proceed',
            'Not interested at this time'
        ];

        return Inertia::render('Leads/Show', [
            'lead' => $lead,
            'agents' => $agents,
            'partners' => $partners,
            'stages' => $stages,
            'conversationMethods' => $conversationMethods,
            'interestLevels' => $interestLevels,
            'remarkOptions' => $remarkOptions,
        ]);
    }

    public function getLeadActivities(Lead $lead, Request $request)
    {
        $user = auth()->user();
        
        // Check access
        if (!$user->isAdmin() && $lead->agent_id !== $user->id) {
            abort(403, 'Unauthorized action. You can only view leads where you are the agent.');
        }

        $activities = Activity::where('lead_id', $lead->id)
            ->with(['agent', 'contact'])
            ->orderBy('created_at', 'desc')
            ->paginate(20);

        return response()->json([
            'leadActivities' => $activities,
        ]);
    }

    public function getLeadProposals(Lead $lead)
    {
        $user = auth()->user();
        
        // Check access
        if (!$user->isAdmin() && $lead->agent_id !== $user->id) {
            abort(403, 'Unauthorized action. You can only view leads where you are the agent.');
        }

        $proposals = CompanyProposal::where('company_id', $lead->company_id)
            ->where('campaign_id', $lead->campaign_id)
            ->with('creator')
            ->orderBy('created_at', 'desc')
            ->get();

        $currentProposal = $proposals->first();

        return response()->json([
            'proposals' => $proposals,
            'currentProposal' => $currentProposal,
        ]);
    }

    public function update(Request $request, Lead $lead)
    {
        $user = auth()->user();
        
        // Check access
        if (!$user->isAdmin() && $lead->agent_id !== $user->id) {
            abort(403, 'Unauthorized action. You can only update leads where you are the agent.');
        }

        $validated = $request->validate([
            'conversation_method' => 'required|string',
            'conversation_connected' => 'nullable|string',
            'next_followup_date' => 'nullable|date',
            'followup_time' => 'nullable|string',
            'lead_stage' => 'required|string',
            'interest_level' => 'required|string',
            'remarks' => 'nullable|string',
            'notes' => 'nullable|string',
            'selected_file_ids' => 'nullable|array',
            'selected_file_ids.*' => 'nullable|integer',
        ]);

        DB::transaction(function () use ($lead, $validated, $user) {
            $oldStage = $lead->stage;
            $newStage = $validated['lead_stage'];

            // Update lead
            $lead->update([
                'stage' => $newStage,
                'next_followup_date' => $validated['next_followup_date'] ?? null,
            ]);

            // If stage changed to Closed Win, create Project and Contract
            if ($newStage === 'Closed Win' && $oldStage !== 'Closed Win') {
                $this->createProjectAndContract($lead, $validated['selected_file_ids'] ?? []);
            }

            // Log activity
            $maxId = Activity::max('id') ?? 0;
            Activity::create([
                'id' => $maxId + 1,
                'company_id' => $lead->company_id,
                'lead_id' => $lead->id,
                'agent_id' => auth()->id(),
                'activity_type' => 'update',
                'conversation_method' => $validated['conversation_method'],
                'conversation_connected' => $validated['conversation_connected'] ?? null,
                'next_followup_date' => $validated['next_followup_date'] ?? null,
                'remarks' => $validated['remarks'] ?? null,
                'notes' => $validated['notes'] ?? null,
                'created_at' => now()->utc(),
            ]);
        });

        return redirect()->back()->with('success', 'Details updated successfully');
    }

    private function createProjectAndContract(Lead $lead, array $selectedFileIds)
    {
        // Load lead with necessary relationships
        $lead->load(['company', 'campaign', 'agent', 'partner']);

        // Get the latest proposal
        $latestProposal = CompanyProposal::where('company_id', $lead->company_id)
            ->where('campaign_id', $lead->campaign_id)
            ->orderBy('created_at', 'desc')
            ->first();

        // Get product_id from campaign
        $productId = $lead->campaign->product_id;

        // Create Project
        $project = Project::create([
            'lead_id' => $lead->id,
            'company_id' => $lead->company_id,
            'campaign_id' => $lead->campaign_id,
            'product_id' => $productId,
            'name' => $lead->company->name . ' - ' . $lead->campaign->name,
            'description' => 'Project created from closed won deal',
            'status' => 'active',
            'agent_id' => $lead->agent_id,
            'partner_id' => $lead->partner_id,
            'start_date' => now()->toDateString(),
        ]);

        // Create Contract
        $contract = Contract::create([
            'lead_id' => $lead->id,
            'company_id' => $lead->company_id,
            'campaign_id' => $lead->campaign_id,
            'product_id' => $productId,
            'project_id' => $project->id,
            'contract_number' => 'CNT-' . now()->format('Y') . '-' . str_pad($lead->company_id, 5, '0', STR_PAD_LEFT),
            'status' => 'active',
            'agent_id' => $lead->agent_id,
            'partner_id' => $lead->partner_id,
            'currency' => $latestProposal->currency ?? 'AED',
            'one_time_fees' => $latestProposal->one_time_fees ?? null,
            'annual_subscription' => $latestProposal->annual_subscription ?? null,
            'other_info' => $latestProposal->other_info ?? null,
            'contract_start_date' => now()->toDateString(),
            'notes' => 'Contract created from closed won deal',
        ]);

        // Get all contacts from the company
        $contacts = Contact::where('company_id', $lead->company_id)->get();
        
        // Attach contacts to project and contract
        foreach ($contacts as $contact) {
            $project->contacts()->attach($contact->id);
            $contract->contacts()->attach($contact->id);
        }

        // Associate selected files with project and contract
        if (!empty($selectedFileIds)) {
            CompanyFile::whereIn('id', $selectedFileIds)
                ->where('company_id', $lead->company_id)
                ->update([
                    'project_id' => $project->id,
                    'contract_id' => $contract->id,
                ]);
        }

        // Log activities for project and contract creation
        $maxId = Activity::max('id') ?? 0;
        Activity::create([
            'id' => $maxId + 1,
            'company_id' => $lead->company_id,
            'lead_id' => $lead->id,
            'agent_id' => auth()->id(),
            'activity_type' => 'project_created',
            'notes' => "Project created: {$project->name} (ID: {$project->id})",
            'created_at' => now()->utc(),
        ]);

        Activity::create([
            'id' => $maxId + 2,
            'company_id' => $lead->company_id,
            'lead_id' => $lead->id,
            'agent_id' => auth()->id(),
            'activity_type' => 'contract_created',
            'notes' => "Contract created: {$contract->contract_number} (ID: {$contract->id})",
            'created_at' => now()->utc(),
        ]);
    }

    public function updateProposal(Request $request, Lead $lead)
    {
        $user = auth()->user();
        
        // Check access
        if (!$user->isAdmin() && $lead->agent_id !== $user->id) {
            abort(403, 'Unauthorized action. You can only update leads where you are the agent.');
        }

        $validated = $request->validate([
            'currency' => 'required|string|in:AED,USD,EUR,GBP',
            'one_time_fees' => 'nullable|numeric|min:0',
            'subscription' => 'nullable|numeric|min:0',
            'subscription_frequency' => 'nullable|string|in:Monthly,Quarterly,Half-Yearly,Yearly',
            'other_info' => 'nullable|string',
        ]);

        // Calculate annual subscription based on frequency
        $subscription = isset($validated['subscription']) && $validated['subscription'] !== '' ? (float)$validated['subscription'] : null;
        $annualSubscription = null;
        
        if ($subscription !== null && !empty($validated['subscription_frequency'])) {
            $multiplier = [
                'Monthly' => 12,
                'Quarterly' => 4,
                'Half-Yearly' => 2,
                'Yearly' => 1,
            ];
            $annualSubscription = $subscription * ($multiplier[$validated['subscription_frequency']] ?? 1);
        }

        // Create a new proposal record (not update, to maintain history)
        $maxId = CompanyProposal::max('id') ?? 0;
        CompanyProposal::create([
            'id' => $maxId + 1,
            'company_id' => $lead->company_id,
            'campaign_id' => $lead->campaign_id,
            'currency' => $validated['currency'],
            'one_time_fees' => isset($validated['one_time_fees']) && $validated['one_time_fees'] !== '' ? (float)$validated['one_time_fees'] : null,
            'subscription' => $subscription,
            'annual_subscription' => $annualSubscription,
            'subscription_frequency' => $validated['subscription_frequency'] ?? null,
            'other_info' => $validated['other_info'] ?? null,
            'created_by' => auth()->id(),
        ]);

        // Log activity
        $maxActivityId = Activity::max('id') ?? 0;
        Activity::create([
            'id' => $maxActivityId + 1,
            'company_id' => $lead->company_id,
            'lead_id' => $lead->id,
            'agent_id' => auth()->id(),
            'activity_type' => 'proposal_updated',
            'notes' => "Proposal updated: {$validated['currency']} - One-time: " . ($validated['one_time_fees'] ?? '0') . ", Annual: " . ($validated['annual_subscription'] ?? '0'),
            'created_at' => now()->utc(),
        ]);

        return redirect()->back()->with('success', 'Proposal saved successfully');
    }

    public function updatePartner(Request $request, Lead $lead)
    {
        $user = auth()->user();
        
        // Check access
        if (!$user->isAdmin() && $lead->agent_id !== $user->id) {
            abort(403, 'Unauthorized action. You can only update leads where you are the agent.');
        }

        $validated = $request->validate([
            'partner_id' => 'required|string',
            'lockin_date' => 'nullable|date',
        ]);

        $partnerId = $validated['partner_id'] === 'none' ? null : (int) $validated['partner_id'];
        $oldPartnerId = $lead->partner_id;

        $lead->update([
            'partner_id' => $partnerId,
            'lockin_date' => $validated['lockin_date'] ?? null,
        ]);

        // Log activity
        $maxId = Activity::max('id') ?? 0;
        $partnerName = $partnerId ? Partner::find($partnerId)?->name : 'None';
        Activity::create([
            'id' => $maxId + 1,
            'company_id' => $lead->company_id,
            'lead_id' => $lead->id,
            'agent_id' => auth()->id(),
            'activity_type' => 'partner_updated',
            'notes' => "Partner changed to: {$partnerName}" . ($validated['lockin_date'] ? " (Lock-in: {$validated['lockin_date']})" : ''),
            'created_at' => now()->utc(),
        ]);

        return redirect()->back()->with('success', 'Partner assignment updated successfully');
    }

    public function updateAgent(Request $request, Lead $lead)
    {
        $user = auth()->user();
        
        // Check access - only admins or current agent can reassign
        if (!$user->isAdmin() && $lead->agent_id !== $user->id) {
            abort(403, 'Unauthorized action. You can only update leads where you are the agent.');
        }

        $validated = $request->validate([
            'new_agent_id' => 'required|exists:users,id',
        ]);

        $oldAgentId = $lead->agent_id;
        $newAgentId = $validated['new_agent_id'];

        if ($oldAgentId == $newAgentId) {
            return redirect()->back()->with('error', 'New agent is the same as current agent');
        }

        $lead->update([
            'agent_id' => $newAgentId,
        ]);

        // Log activity
        $maxId = Activity::max('id') ?? 0;
        Activity::create([
            'id' => $maxId + 1,
            'company_id' => $lead->company_id,
            'lead_id' => $lead->id,
            'agent_id' => auth()->id(),
            'activity_type' => 'agent_change',
            'notes' => "Agent changed from User ID {$oldAgentId} to User ID {$newAgentId}",
            'created_at' => now()->utc(),
        ]);

        return redirect()->back()->with('success', 'Agent updated successfully');
    }

    public function uploadFiles(Request $request, Lead $lead)
    {
        $user = auth()->user();
        
        // Check access
        if (!$user->isAdmin() && $lead->agent_id !== $user->id) {
            abort(403, 'Unauthorized action. You can only upload files to leads where you are the agent.');
        }

        $request->validate([
            'files' => 'required|array',
            'files.*' => 'file|max:10240', // 10MB max per file
            'file_names' => 'nullable|array',
            'file_names.*' => 'nullable|string|max:255',
            'file_category' => 'required|string|in:questionnaire,proposal,sla,other',
        ]);

        $uploadedFiles = [];
        $fileNames = $request->input('file_names', []);
        
        foreach ($request->file('files') as $index => $file) {
            $originalName = $file->getClientOriginalName();
            $customName = isset($fileNames[$index]) && !empty($fileNames[$index]) ? $fileNames[$index] : $originalName;
            $filename = time() . '_' . uniqid() . '_' . $originalName;
            $path = $file->storeAs('company_files/' . $lead->company_id, $filename, 'public');

            CompanyFile::create([
                'company_id' => $lead->company_id,
                'lead_id' => $lead->id,
                'file_category' => $request->input('file_category'),
                'filename' => $filename,
                'original_filename' => $customName,
                'file_path' => Storage::url($path),
                'file_size' => $file->getSize(),
                'uploaded_at' => now()->utc(),
            ]);
            
            $uploadedFiles[] = $customName;
        }

        // Log activity
        $maxId = Activity::max('id') ?? 0;
        Activity::create([
            'id' => $maxId + 1,
            'company_id' => $lead->company_id,
            'lead_id' => $lead->id,
            'agent_id' => auth()->id(),
            'activity_type' => 'files_uploaded',
            'notes' => "Uploaded " . count($uploadedFiles) . " " . $request->input('file_category') . " file(s): " . implode(', ', $uploadedFiles),
            'created_at' => now()->utc(),
        ]);

        return redirect()->back()->with('success', 'Files uploaded successfully');
    }

    public function addContact(Request $request, Lead $lead)
    {
        $user = auth()->user();
        
        // Check access
        if (!$user->isAdmin() && $lead->agent_id !== $user->id) {
            abort(403, 'Unauthorized action. You can only add contacts to leads where you are the agent.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'title' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone1' => 'nullable|string|max:50',
            'phone2' => 'nullable|string|max:50',
            'linkedin_url' => 'nullable|url|max:500',
            'interest_level' => 'required|in:Cold,Warm,Hot',
        ]);

        $maxId = Contact::max('id') ?? 0;
        
        $contact = Contact::create([
            'id' => $maxId + 1,
            'company_id' => $lead->company_id,
            'name' => $validated['name'],
            'title' => $validated['title'] ?? null,
            'email' => $validated['email'] ?? null,
            'phone1' => $validated['phone1'] ?? null,
            'phone2' => $validated['phone2'] ?? null,
            'linkedin_url' => $validated['linkedin_url'] ?? null,
            'interest_level' => $validated['interest_level'],
            'is_pic' => false,
            'created_at' => now()->utc(),
        ]);

        // Log activity
        $activityMaxId = Activity::max('id') ?? 0;
        Activity::create([
            'id' => $activityMaxId + 1,
            'company_id' => $lead->company_id,
            'lead_id' => $lead->id,
            'contact_id' => $contact->id,
            'agent_id' => auth()->id(),
            'activity_type' => 'contact_added',
            'notes' => "Added contact: {$validated['name']}" . ($validated['title'] ? " ({$validated['title']})" : ''),
            'created_at' => now()->utc(),
        ]);

        return redirect()->back()->with('success', 'Contact added successfully');
    }

    public function updateContact(Request $request, Lead $lead, Contact $contact)
    {
        $user = auth()->user();
        
        // Check access
        if (!$user->isAdmin() && $lead->agent_id !== $user->id) {
            abort(403, 'Unauthorized action. You can only update contacts from leads where you are the agent.');
        }

        // Verify contact belongs to lead's company
        if ($contact->company_id !== $lead->company_id) {
            abort(404);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'title' => 'nullable|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone1' => 'nullable|string|max:50',
            'phone2' => 'nullable|string|max:50',
            'linkedin_url' => 'nullable|url|max:500',
            'interest_level' => 'required|in:Cold,Warm,Hot',
        ]);

        $oldName = $contact->name;
        $contact->update($validated);

        // Log activity
        $maxId = Activity::max('id') ?? 0;
        Activity::create([
            'id' => $maxId + 1,
            'company_id' => $lead->company_id,
            'lead_id' => $lead->id,
            'contact_id' => $contact->id,
            'agent_id' => auth()->id(),
            'activity_type' => 'contact_updated',
            'notes' => "Updated contact: {$oldName}" . ($oldName !== $validated['name'] ? " → {$validated['name']}" : ''),
            'created_at' => now()->utc(),
        ]);

        return redirect()->back()->with('success', 'Contact updated successfully');
    }

    public function updateContactPIC(Request $request, Lead $lead, Contact $contact)
    {
        $user = auth()->user();
        
        // Check access
        if (!$user->isAdmin() && $lead->agent_id !== $user->id) {
            abort(403, 'Unauthorized action. You can only update contacts from leads where you are the agent.');
        }

        // Verify contact belongs to lead's company
        if ($contact->company_id !== $lead->company_id) {
            abort(404);
        }

        $validated = $request->validate([
            'is_pic' => 'required|boolean',
        ]);

        $wasPIC = $contact->is_pic;
        
        if ($validated['is_pic']) {
            // Set all other contacts of this company to not PIC
            Contact::where('company_id', $lead->company_id)
                ->where('id', '!=', $contact->id)
                ->update(['is_pic' => false]);
        }

        $contact->update(['is_pic' => $validated['is_pic']]);

        // Log activity
        $maxId = Activity::max('id') ?? 0;
        Activity::create([
            'id' => $maxId + 1,
            'company_id' => $lead->company_id,
            'lead_id' => $lead->id,
            'contact_id' => $contact->id,
            'agent_id' => auth()->id(),
            'activity_type' => 'contact_pic_updated',
            'notes' => $validated['is_pic'] ? "Marked {$contact->name} as PIC" : "Removed PIC status from {$contact->name}",
            'created_at' => now()->utc(),
        ]);

        return redirect()->back()->with('success', 'PIC status updated successfully');
    }

    public function invalidateContact(Lead $lead, Contact $contact)
    {
        $user = auth()->user();
        
        // Check access
        if (!$user->isAdmin() && $lead->agent_id !== $user->id) {
            abort(403, 'Unauthorized action. You can only invalidate contacts from leads where you are the agent.');
        }

        // Verify contact belongs to lead's company
        if ($contact->company_id !== $lead->company_id) {
            abort(404);
        }

        $contactName = $contact->name;
        $contactId = $contact->id;
        $contact->delete();

        // Log activity
        $maxId = Activity::max('id') ?? 0;
        Activity::create([
            'id' => $maxId + 1,
            'company_id' => $lead->company_id,
            'lead_id' => $lead->id,
            'contact_id' => $contactId,
            'agent_id' => auth()->id(),
            'activity_type' => 'contact_invalidated',
            'notes' => "Invalidated and removed contact: {$contactName}",
            'created_at' => now()->utc(),
        ]);

        return redirect()->back()->with('success', 'Contact marked as invalid and removed');
    }

    public function changeStage(Request $request, Lead $lead)
    {
        $user = auth()->user();
        
        // Check access
        if (!$user->isAdmin() && $lead->agent_id !== $user->id) {
            abort(403, 'Unauthorized action. You can only change stage for leads where you are the agent.');
        }

        $validated = $request->validate([
            'lead_stage' => 'required|string',
            'notes' => 'nullable|string',
        ]);

        $oldStage = $lead->stage;
        $newStage = $validated['lead_stage'];

        // Update lead stage
        $lead->update([
            'stage' => $newStage,
        ]);

        // Log activity
        $maxId = Activity::max('id') ?? 0;
        $activityDescription = "Stage changed from '{$oldStage}' to '{$newStage}'";

        Activity::create([
            'id' => $maxId + 1,
            'company_id' => $lead->company_id,
            'lead_id' => $lead->id,
            'agent_id' => auth()->id(),
            'activity_type' => 'stage_changed',
            'remarks' => $activityDescription,
            'notes' => $validated['notes'] ?? null,
            'created_at' => now()->utc(),
        ]);

        return redirect()->back()->with('success', 'Lead stage updated successfully');
    }
}
