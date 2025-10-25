<?php

namespace App\Http\Controllers;

use App\Models\Campaign;
use App\Models\User;
use App\Models\Company;
use App\Models\Lead;
use App\Models\Activity;
use App\Models\Contact;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\CampaignLeadsExport;
use App\Exports\AgentActivityAnalyticsExport;
use App\Exports\LeadContactActivityReportExport;

class CampaignsController extends Controller
{
    public function index()
    {
        // Only admins can view campaigns
        if (!auth()->user()->isAdmin()) {
            abort(403, 'Unauthorized action. Only admins can manage campaigns.');
        }

        $campaigns = Campaign::with(['creator', 'product', 'users'])
            ->withCount([
                'leads',
                'users',
                'leads as closed_won_count' => function ($query) {
                    $query->where('stage', 'Closed Won');
                },
                'leads as closed_leads_count' => function ($query) {
                    $query->whereIn('stage', ['Closed Won', 'Closed Lost', 'Disqualified']);
                }
            ])
            ->get()
            ->map(function ($campaign) {
                // Count contacts through the campaign's leads
                $contactsCount = \App\Models\Contact::whereIn('company_id', function($query) use ($campaign) {
                    $query->select('company_id')
                        ->from('leads')
                        ->where('campaign_id', $campaign->id);
                })->count();
                
                $campaign->contacts_count = $contactsCount;
                return $campaign;
            })
            ->sortByDesc('created_at')
            ->values();

        return Inertia::render('Campaigns/Index', [
            'campaigns' => $campaigns,
        ]);
    }

    public function create()
    {
        // Only admins can create campaigns
        if (!auth()->user()->isAdmin()) {
            abort(403, 'Unauthorized action. Only admins can create campaigns.');
        }

        $users = User::select('id', 'name', 'email', 'role')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        $products = \App\Models\Product::where('is_active', true)
            ->orderBy('name')
            ->get();

        return Inertia::render('Campaigns/Create', [
            'users' => $users,
            'products' => $products,
        ]);
    }

    public function store(Request $request)
    {
        // Only admins can create campaigns
        if (!auth()->user()->isAdmin()) {
            abort(403, 'Unauthorized action. Only admins can create campaigns.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:200',
            'product_id' => 'nullable|exists:products,id',
            'description' => 'nullable|string',
            'status' => 'required|in:active,paused,completed',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'user_ids' => 'nullable|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        $campaign = Campaign::create([
            'name' => $validated['name'],
            'product_id' => $validated['product_id'] ?? null,
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'],
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
            'created_by' => auth()->id(),
        ]);

        // Attach users to campaign
        if (!empty($validated['user_ids'])) {
            $campaign->users()->attach($validated['user_ids']);
        }

        return redirect()->route('campaigns.index')->with('success', 'Campaign created successfully');
    }

    public function show(Campaign $campaign, Request $request)
    {
        // Only admins can view campaign details
        if (!auth()->user()->isAdmin()) {
            abort(403, 'Unauthorized action. Only admins can view campaign details.');
        }

        $campaign->load([
            'creator',
            'product',
            'users',
        ]);

        $campaign->loadCount([
            'leads',
            'leads as closed_leads_count' => function ($query) {
                $query->whereIn('stage', ['Closed Won', 'Closed Lost', 'Disqualified']);
            }
        ]);

        $tab = $request->get('tab', null);
        
        // If no tab specified, redirect to overview with tab parameter
        if (!$tab) {
            return redirect()->route('campaigns.show', ['campaign' => $campaign->id, 'tab' => 'overview']);
        }

        // Base analytics (always loaded)
        $analytics = [
            'total_leads' => $campaign->leads_count,
        ];

        // Load data based on active tab
        if ($tab === 'overview') {
            $analytics['by_stage'] = Lead::where('campaign_id', $campaign->id)
                ->select('stage', \DB::raw('count(*) as count'))
                ->groupBy('stage')
                ->get()
                ->mapWithKeys(fn($item) => [$item->stage => $item->count]);
                
            $analytics['by_agent'] = Lead::where('campaign_id', $campaign->id)
                ->with('agent')
                ->select('agent_id', \DB::raw('count(*) as count'))
                ->whereNotNull('agent_id')
                ->groupBy('agent_id')
                ->get()
                ->map(fn($item) => [
                    'name' => $item->agent->name ?? 'Unassigned',
                    'count' => $item->count
                ]);
                
            $analytics['stage_agent_breakdown'] = Lead::where('campaign_id', $campaign->id)
                ->with('agent')
                ->select('stage', 'agent_id', \DB::raw('count(*) as count'))
                ->groupBy('stage', 'agent_id')
                ->get()
                ->groupBy('stage')
                ->map(function($stageGroup) {
                    $result = ['stage' => $stageGroup->first()->stage];
                    foreach ($stageGroup as $item) {
                        $agentName = $item->agent ? $item->agent->name : 'Unassigned';
                        $result[$agentName] = $item->count;
                    }
                    return $result;
                })
                ->values();
        }

        // Load leads data for leads tab
        $leads = null;
        if ($tab === 'leads') {
            $leads = $campaign->leads()
                ->with(['company', 'agent', 'partner'])
                ->orderBy('created_at', 'desc')
                ->paginate(50);
        }

        // Load lead analysis data for lead-analysis tab
        if ($tab === 'lead-analysis') {
            $now = now();
            
            // Get all non-closed leads with their last activity
            $staleLead = Lead::where('campaign_id', $campaign->id)
                ->whereNotIn('stage', ['Closed Won', 'Closed Lost', 'Disqualified'])
                ->with(['company.contacts', 'agent'])
                ->get()
                ->map(function($lead) use ($now) {
                    // Get last activity for this lead
                    $lastActivity = Activity::where('lead_id', $lead->id)
                        ->orderBy('created_at', 'desc')
                        ->first();
                    
                    $lastActivityDate = $lastActivity ? $lastActivity->created_at : $lead->created_at;
                    // Calculate days as integer - always rounds down
                    $daysSinceActivity = (int) floor($now->diffInDays($lastActivityDate, false));
                    
                    // Get earliest next followup date from contacts
                    $nextFollowupContact = Contact::where('company_id', $lead->company_id)
                        ->whereNotNull('next_followup_datetime')
                        ->where('do_not_contact', false)
                        ->orderBy('next_followup_datetime', 'asc')
                        ->first();
                    
                    return [
                        'lead_id' => $lead->id,
                        'company_name' => $lead->company ? $lead->company->name : 'Unknown',
                        'company_id' => $lead->company_id,
                        'stage' => $lead->stage,
                        'agent_id' => $lead->agent_id,
                        'agent_name' => $lead->agent ? $lead->agent->name : 'Unassigned',
                        'last_activity_date' => $lastActivityDate,
                        'days_since_activity' => abs($daysSinceActivity),
                        'next_followup_date' => $nextFollowupContact ? $nextFollowupContact->next_followup_date : null,
                        'updated_at' => $lead->updated_at,
                    ];
                })
                ->sortByDesc('days_since_activity')
                ->values();
            
            // Get top 10 leads with oldest activity
            $oldestLeads = $staleLead->take(10);
            
            // Categorize by inactivity period
            $analytics['stale_leads'] = [
                'over_30_days' => $staleLead->filter(fn($l) => $l['days_since_activity'] >= 30)->values(),
                'over_14_days' => $staleLead->filter(fn($l) => $l['days_since_activity'] >= 14 && $l['days_since_activity'] < 30)->values(),
                'over_7_days' => $staleLead->filter(fn($l) => $l['days_since_activity'] >= 7 && $l['days_since_activity'] < 14)->values(),
                'all_stale' => $staleLead,
                'oldest_10' => $oldestLeads,
            ];
        }

        // Load performance data for performance tab
        if ($tab === 'performance') {
            $agentPerformance = User::whereIn('id', function($query) use ($campaign) {
                $query->select('agent_id')
                    ->from('leads')
                    ->where('campaign_id', $campaign->id)
                    ->whereNotNull('agent_id')
                    ->distinct();
            })
            ->get()
            ->map(function($agent) use ($campaign) {
                $leads = Lead::where('campaign_id', $campaign->id)
                    ->where('agent_id', $agent->id)
                    ->get();
                
                $totalLeads = $leads->count();
                $wonLeads = $leads->where('stage', 'Closed Won')->count();
                $lostLeads = $leads->where('stage', 'Closed Lost')->count();
                $disqualifiedLeads = $leads->where('stage', 'Disqualified')->count();
                $inProgressLeads = $totalLeads - $wonLeads - $lostLeads - $disqualifiedLeads;
                
                // Get last activity for this agent in this campaign
                $lastActivity = Activity::where('agent_id', $agent->id)
                    ->whereIn('lead_id', $leads->pluck('id'))
                    ->orderBy('created_at', 'desc')
                    ->first();
                
                // Get last update to any lead in this campaign
                $lastLeadUpdate = Lead::where('campaign_id', $campaign->id)
                    ->where('agent_id', $agent->id)
                    ->orderBy('updated_at', 'desc')
                    ->first();
                
                // Count activities in last 7 and 30 days
                $activitiesLast7Days = Activity::where('agent_id', $agent->id)
                    ->whereIn('lead_id', $leads->pluck('id'))
                    ->where('created_at', '>=', now()->subDays(7))
                    ->count();
                
                $activitiesLast30Days = Activity::where('agent_id', $agent->id)
                    ->whereIn('lead_id', $leads->pluck('id'))
                    ->where('created_at', '>=', now()->subDays(30))
                    ->count();
                
                return [
                    'agent_id' => $agent->id,
                    'agent_name' => $agent->name,
                    'total_leads' => $totalLeads,
                    'won_leads' => $wonLeads,
                    'lost_leads' => $lostLeads,
                    'disqualified_leads' => $disqualifiedLeads,
                    'in_progress_leads' => $inProgressLeads,
                    'conversion_rate' => $totalLeads > 0 ? round(($wonLeads / $totalLeads) * 100, 1) : 0,
                    'close_rate' => $totalLeads > 0 ? round((($wonLeads + $lostLeads + $disqualifiedLeads) / $totalLeads) * 100, 1) : 0,
                    'last_activity_date' => $lastActivity ? $lastActivity->created_at : null,
                    'last_update_date' => $lastLeadUpdate ? $lastLeadUpdate->updated_at : null,
                    'activities_last_7_days' => $activitiesLast7Days,
                    'activities_last_30_days' => $activitiesLast30Days,
                ];
            })
            ->sortByDesc('total_leads')
            ->values();

            $analytics['agent_performance'] = $agentPerformance;
        }

        // Load agent activity analytics data for agent-activity-analytics tab
        if ($tab === 'agent-activity-analytics') {
            $period = $request->get('period', 'daily');
            
            // Determine date range based on period
            $dateFrom = match($period) {
                'daily' => now()->startOfDay(),
                'weekly' => now()->startOfWeek(),
                'monthly' => now()->startOfMonth(),
                default => now()->startOfDay(),
            };
            
            // Get all agents in this campaign
            $agentAnalytics = User::whereIn('id', function($query) use ($campaign) {
                $query->select('agent_id')
                    ->from('leads')
                    ->where('campaign_id', $campaign->id)
                    ->whereNotNull('agent_id')
                    ->distinct();
            })
            ->get()
            ->map(function($agent) use ($campaign, $dateFrom) {
                // Get leads for this agent in this campaign
                $leadIds = Lead::where('campaign_id', $campaign->id)
                    ->where('agent_id', $agent->id)
                    ->pluck('id');
                
                // Count unique contacts for these leads
                $totalContacts = Contact::whereIn('company_id', function($query) use ($leadIds) {
                    $query->select('company_id')
                        ->from('leads')
                        ->whereIn('id', $leadIds);
                })->count();
                
                // Get activities for this period
                $activities = Activity::where('agent_id', $agent->id)
                    ->whereIn('lead_id', $leadIds)
                    ->where('created_at', '>=', $dateFrom)
                    ->get();
                
                // Count contacts attempted (unique contact_ids from activities)
                $contactsAttempted = $activities->whereNotNull('contact_id')->unique('contact_id')->count();
                
                // Count contacts connected (where conversation_connected = true)
                $contactsConnected = $activities
                    ->whereNotNull('contact_id')
                    ->where('conversation_connected', true)
                    ->unique('contact_id')
                    ->count();
                
                // Connection rate
                $connectionRate = $contactsAttempted > 0 
                    ? ($contactsConnected / $contactsAttempted) * 100 
                    : 0;
                
                // Group activities by conversation method
                $connectionMethods = $activities
                    ->whereNotNull('conversation_method')
                    ->groupBy('conversation_method')
                    ->map(function($group) {
                        return $group->count();
                    })
                    ->toArray();
                
                // Ensure all methods are present
                $allMethods = ['Call', 'WhatsApp', 'LinkedIn', 'Email', 'Teams Chat', 'Other'];
                foreach ($allMethods as $method) {
                    if (!isset($connectionMethods[$method])) {
                        $connectionMethods[$method] = 0;
                    }
                }
                
                // Track stage changes during this period
                // Get leads that had activities during this period
                $leadsWithActivities = $activities->pluck('lead_id')->unique();
                
                // Count how many of these leads had stage changes
                // We'll check if lead's updated_at is within the period and if it changed stage
                $leadsWithStageChanges = Lead::whereIn('id', $leadsWithActivities)
                    ->where('updated_at', '>=', $dateFrom)
                    ->count();
                
                $leadsWithoutStageChanges = $leadsWithActivities->count() - $leadsWithStageChanges;
                
                $stageChangeRate = $leadsWithActivities->count() > 0
                    ? ($leadsWithStageChanges / $leadsWithActivities->count()) * 100
                    : 0;
                
                return [
                    'agent_id' => $agent->id,
                    'agent_name' => $agent->name,
                    'total_contacts' => $totalContacts,
                    'contacts_attempted' => $contactsAttempted,
                    'contacts_connected' => $contactsConnected,
                    'connection_rate' => $connectionRate,
                    'total_activities' => $activities->count(),
                    'connection_methods' => $connectionMethods,
                    'total_leads' => $leadIds->count(),
                    'leads_with_activities' => $leadsWithActivities->count(),
                    'stage_changes' => $leadsWithStageChanges,
                    'no_stage_change' => $leadsWithoutStageChanges,
                    'stage_change_rate' => $stageChangeRate,
                ];
            })
            ->sortByDesc('total_activities')
            ->values();
            
            $analytics['agent_activity_analytics'] = $agentAnalytics;
            $analytics['current_period'] = $period;
        }

        // Get all company IDs already in this campaign
        $existingCompanyIds = Lead::where('campaign_id', $campaign->id)
            ->pluck('company_id')
            ->toArray();

        // Get companies not in this campaign
        $companies = Company::select('id', 'name')
            ->whereNotIn('id', $existingCompanyIds)
            ->orderBy('name')
            ->get();

        $users = User::select('id', 'name', 'email', 'role')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        return Inertia::render('Campaigns/Show', [
            'campaign' => $campaign,
            'leads' => $leads,
            'analytics' => $analytics,
            'companies' => $companies,
            'users' => $users,
        ]);
    }

    public function edit(Campaign $campaign)
    {
        // Only admins can edit campaigns
        if (!auth()->user()->isAdmin()) {
            abort(403, 'Unauthorized action. Only admins can edit campaigns.');
        }

        $campaign->load(['users', 'product']);

        $users = User::select('id', 'name', 'email', 'role')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        $products = \App\Models\Product::where('is_active', true)
            ->orderBy('name')
            ->get();

        return Inertia::render('Campaigns/Edit', [
            'campaign' => $campaign,
            'users' => $users,
            'products' => $products,
        ]);
    }

    public function update(Request $request, Campaign $campaign)
    {
        // Only admins can update campaigns
        if (!auth()->user()->isAdmin()) {
            abort(403, 'Unauthorized action. Only admins can update campaigns.');
        }

        $validated = $request->validate([
            'name' => 'required|string|max:200',
            'product_id' => 'nullable|exists:products,id',
            'description' => 'nullable|string',
            'status' => 'required|in:active,paused,completed',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'user_ids' => 'nullable|array',
            'user_ids.*' => 'exists:users,id',
        ]);

        $campaign->update([
            'name' => $validated['name'],
            'product_id' => $validated['product_id'] ?? null,
            'description' => $validated['description'] ?? null,
            'status' => $validated['status'],
            'start_date' => $validated['start_date'] ?? null,
            'end_date' => $validated['end_date'] ?? null,
        ]);

        // Sync users
        if (isset($validated['user_ids'])) {
            $campaign->users()->sync($validated['user_ids']);
        }

        return redirect()->route('campaigns.index')->with('success', 'Campaign updated successfully');
    }

    public function destroy(Campaign $campaign)
    {
        // Only admins can delete campaigns
        if (!auth()->user()->isAdmin()) {
            abort(403, 'Unauthorized action. Only admins can delete campaigns.');
        }

        $campaign->delete();

        return redirect()->route('campaigns.index')->with('success', 'Campaign deleted successfully');
    }

    public function addCompany(Request $request, Campaign $campaign)
    {
        // Only admins can add companies to campaigns
        if (!auth()->user()->isAdmin()) {
            abort(403, 'Unauthorized action. Only admins can add companies to campaigns.');
        }

        $validated = $request->validate([
            'company_id' => 'required|exists:company,id',
            'agent_id' => 'nullable|exists:users,id',
            'stage' => 'required|string',
        ]);

        // Check if company is already in this campaign
        $existingLead = Lead::where('campaign_id', $campaign->id)
            ->where('company_id', $validated['company_id'])
            ->first();

        if ($existingLead) {
            return redirect()->back()->with('error', 'Company is already part of this campaign');
        }

        // Create lead
        $lead = Lead::create([
            'campaign_id' => $campaign->id,
            'company_id' => $validated['company_id'],
            'agent_id' => $validated['agent_id'] ?? null,
            'stage' => $validated['stage'],
        ]);

        // Log activity
        $maxId = Activity::max('id') ?? 0;
        Activity::create([
            'id' => $maxId + 1,
            'agent_id' => auth()->id(),
            'company_id' => $validated['company_id'],
            'lead_id' => $lead->id,
            'activity_type' => 'lead_created',
            'notes' => "Company added to campaign: {$campaign->name}",
            'created_at' => now()->utc(),
        ]);

        return redirect()->back()->with('success', 'Company added to campaign successfully');
    }

    public function bulkAddCompanies(Request $request, Campaign $campaign)
    {
        // Only admins can add companies to campaigns
        if (!auth()->user()->isAdmin()) {
            abort(403, 'Unauthorized action. Only admins can add companies to campaigns.');
        }

        $validated = $request->validate([
            'company_ids' => 'required|array|min:1',
            'company_ids.*' => 'exists:company,id',
            'agent_id' => 'nullable|exists:users,id',
            'stage' => 'required|string',
        ]);

        $addedCount = 0;
        $skippedCount = 0;

        foreach ($validated['company_ids'] as $companyId) {
            // Check if company is already in this campaign
            $existingLead = Lead::where('campaign_id', $campaign->id)
                ->where('company_id', $companyId)
                ->first();

            if ($existingLead) {
                $skippedCount++;
                continue;
            }

            // Create lead
            $lead = Lead::create([
                'campaign_id' => $campaign->id,
                'company_id' => $companyId,
                'agent_id' => $validated['agent_id'] ?? null,
                'stage' => $validated['stage'],
            ]);

            // Log activity
            $maxId = Activity::max('id') ?? 0;
            Activity::create([
                'id' => $maxId + 1,
                'agent_id' => auth()->id(),
                'company_id' => $companyId,
                'lead_id' => $lead->id,
                'activity_type' => 'lead_created',
                'notes' => "Company added to campaign: {$campaign->name} (Bulk add)",
                'created_at' => now()->utc(),
            ]);

            $addedCount++;
        }

        $message = "Successfully added {$addedCount} " . ($addedCount === 1 ? 'company' : 'companies') . " to campaign";
        if ($skippedCount > 0) {
            $message .= ". {$skippedCount} " . ($skippedCount === 1 ? 'company was' : 'companies were') . " already in the campaign";
        }

        return redirect()->back()->with('success', $message);
    }

    public function removeCompany(Campaign $campaign, Lead $lead)
    {
        // Only admins can remove companies from campaigns
        if (!auth()->user()->isAdmin()) {
            abort(403, 'Unauthorized action. Only admins can remove companies from campaigns.');
        }

        // Verify lead belongs to this campaign
        if ($lead->campaign_id !== $campaign->id) {
            abort(404);
        }

        $companyId = $lead->company_id;
        $lead->delete();

        // Log activity
        $maxId = Activity::max('id') ?? 0;
        Activity::create([
            'id' => $maxId + 1,
            'agent_id' => auth()->id(),
            'company_id' => $companyId,
            'activity_type' => 'lead_removed',
            'notes' => "Company removed from campaign: {$campaign->name}",
            'created_at' => now()->utc(),
        ]);

        return redirect()->back()->with('success', 'Company removed from campaign successfully');
    }

    public function bulkChanges(Campaign $campaign, Request $request)
    {
        // Only admins can access bulk changes
        if (!auth()->user()->isAdmin()) {
            abort(403, 'Unauthorized action. Only admins can access bulk changes.');
        }

        $campaign->load(['creator', 'product', 'users']);

        // Build query for leads with filters
        $query = $campaign->leads()
            ->with(['company', 'agent', 'partner']);

        // Apply filters
        if ($request->filled('search')) {
            $query->whereHas('company', function ($q) use ($request) {
                $q->whereRaw('LOWER(name) LIKE ?', ['%' . strtolower($request->search) . '%']);
            });
        }

        if ($request->filled('stage')) {
            $query->where('stage', $request->stage);
        }

        if ($request->filled('agent_id')) {
            $query->where('agent_id', $request->agent_id);
        }

        // Get total count for "select all" functionality
        $totalCount = $query->count();

        // Paginate leads for infinite scroll
        $leads = $query->orderBy('created_at', 'desc')->paginate(50);

        // Get users for agent assignment
        $users = User::select('id', 'name', 'email')
            ->where('is_active', true)
            ->orderBy('name')
            ->get();

        // Get available stages
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
            'Closed Lost',
            'Disqualified'
        ];

        return Inertia::render('Campaigns/BulkChanges', [
            'campaign' => $campaign,
            'leads' => $leads,
            'users' => $users,
            'stages' => $stages,
            'totalLeadsCount' => $totalCount,
            'filters' => [
                'search' => $request->search,
                'stage' => $request->stage,
                'agent_id' => $request->agent_id,
            ],
        ]);
    }

    public function bulkUpdate(Request $request, Campaign $campaign)
    {
        // Only admins can perform bulk updates
        if (!auth()->user()->isAdmin()) {
            abort(403, 'Unauthorized action. Only admins can perform bulk updates.');
        }

        $validated = $request->validate([
            'lead_ids' => 'sometimes|array|min:1',
            'lead_ids.*' => 'exists:leads,id',
            'select_all' => 'sometimes|boolean',
            'filters' => 'sometimes|array',
            'action' => 'required|in:agent,stage',
            'value' => 'required|string',
        ]);

        // Handle "select all" functionality
        if (!empty($validated['select_all'])) {
            // Build query with same filters
            $query = Lead::where('campaign_id', $campaign->id);

            if (!empty($validated['filters']['search'])) {
                $query->whereHas('company', function ($q) use ($validated) {
                    $q->whereRaw('LOWER(name) LIKE ?', ['%' . strtolower($validated['filters']['search']) . '%']);
                });
            }

            if (!empty($validated['filters']['stage'])) {
                $query->where('stage', $validated['filters']['stage']);
            }

            if (!empty($validated['filters']['agent_id'])) {
                $query->where('agent_id', $validated['filters']['agent_id']);
            }

            $leads = $query->get();
        } else {
            // Use specific lead IDs
            $leads = Lead::whereIn('id', $validated['lead_ids'])
                ->where('campaign_id', $campaign->id)
                ->get();

            if ($leads->count() !== count($validated['lead_ids'])) {
                return redirect()->back()->with('error', 'Some leads do not belong to this campaign');
            }
        }

        if ($leads->isEmpty()) {
            return redirect()->back()->with('error', 'No leads selected for update');
        }

        // Perform bulk update
        $updateData = [];
        $activityType = '';
        $activityNotes = '';

        if ($validated['action'] === 'agent') {
            // Validate agent exists
            $agent = User::find($validated['value']);
            if (!$agent) {
                return redirect()->back()->with('error', 'Invalid agent selected');
            }

            $updateData['agent_id'] = $validated['value'];
            $activityType = 'bulk_agent_change';
            $activityNotes = "Agent changed to {$agent->name} (Bulk update)";
        } elseif ($validated['action'] === 'stage') {
            $updateData['stage'] = $validated['value'];
            $activityType = 'bulk_stage_change';
            $activityNotes = "Stage changed to {$validated['value']} (Bulk update)";
        }

        // Update all selected leads
        Lead::whereIn('id', $leads->pluck('id'))->update($updateData);

        // Log activities separately for each lead (not in a batch - for proper timestamps)
        foreach ($leads as $lead) {
            $maxId = Activity::max('id') ?? 0;
            Activity::create([
                'id' => $maxId + 1,
                'agent_id' => auth()->id(),
                'company_id' => $lead->company_id,
                'lead_id' => $lead->id,
                'activity_type' => $activityType,
                'notes' => $activityNotes,
                'created_at' => now()->utc(),
            ]);
        }

        $count = $leads->count();
        $actionName = $validated['action'] === 'agent' ? 'agent assignment' : 'stage';
        
        return redirect()->back()->with('success', "Successfully updated {$actionName} for {$count} lead(s)");
    }

    public function exportLeads(Campaign $campaign)
    {
        // Only admins can export campaign leads
        if (!auth()->user()->isAdmin()) {
            abort(403, 'Unauthorized action. Only admins can export campaign leads.');
        }

        $fileName = 'campaign_' . $campaign->id . '_leads_' . now()->format('Y-m-d_His') . '.xlsx';
        
        return Excel::download(new CampaignLeadsExport($campaign->id), $fileName);
    }

    public function exportAgentActivityAnalytics(Campaign $campaign, Request $request)
    {
        // Only admins can export agent activity analytics
        if (!auth()->user()->isAdmin()) {
            abort(403, 'Unauthorized action. Only admins can export agent activity analytics.');
        }

        $period = $request->get('period', 'daily');
        
        // Determine date range based on period
        $dateFrom = match($period) {
            'daily' => now()->startOfDay(),
            'weekly' => now()->startOfWeek(),
            'monthly' => now()->startOfMonth(),
            default => now()->startOfDay(),
        };
        
        // Get agent analytics data (same logic as in show method)
        $agentAnalytics = User::whereIn('id', function($query) use ($campaign) {
            $query->select('agent_id')
                ->from('leads')
                ->where('campaign_id', $campaign->id)
                ->whereNotNull('agent_id')
                ->distinct();
        })
        ->get()
        ->map(function($agent) use ($campaign, $dateFrom) {
            // Get leads for this agent in this campaign
            $leadIds = Lead::where('campaign_id', $campaign->id)
                ->where('agent_id', $agent->id)
                ->pluck('id');
            
            // Count unique contacts for these leads
            $totalContacts = Contact::whereIn('company_id', function($query) use ($leadIds) {
                $query->select('company_id')
                    ->from('leads')
                    ->whereIn('id', $leadIds);
            })->count();
            
            // Get activities for this period
            $activities = Activity::where('agent_id', $agent->id)
                ->whereIn('lead_id', $leadIds)
                ->where('created_at', '>=', $dateFrom)
                ->get();
            
            // Count contacts attempted (unique contact_ids from activities)
            $contactsAttempted = $activities->whereNotNull('contact_id')->unique('contact_id')->count();
            
            // Count contacts connected (where conversation_connected = true)
            $contactsConnected = $activities
                ->whereNotNull('contact_id')
                ->where('conversation_connected', true)
                ->unique('contact_id')
                ->count();
            
            // Connection rate
            $connectionRate = $contactsAttempted > 0 
                ? ($contactsConnected / $contactsAttempted) * 100 
                : 0;
            
            // Group activities by conversation method
            $connectionMethods = $activities
                ->whereNotNull('conversation_method')
                ->groupBy('conversation_method')
                ->map(function($group) {
                    return $group->count();
                })
                ->toArray();
            
            // Ensure all methods are present
            $allMethods = ['Call', 'WhatsApp', 'LinkedIn', 'Email', 'Teams Chat', 'Other'];
            foreach ($allMethods as $method) {
                if (!isset($connectionMethods[$method])) {
                    $connectionMethods[$method] = 0;
                }
            }
            
            // Track stage changes during this period
            $leadsWithActivities = $activities->pluck('lead_id')->unique();
            
            $leadsWithStageChanges = Lead::whereIn('id', $leadsWithActivities)
                ->where('updated_at', '>=', $dateFrom)
                ->count();
            
            $leadsWithoutStageChanges = $leadsWithActivities->count() - $leadsWithStageChanges;
            
            $stageChangeRate = $leadsWithActivities->count() > 0
                ? ($leadsWithStageChanges / $leadsWithActivities->count()) * 100
                : 0;
            
            return [
                'agent_id' => $agent->id,
                'agent_name' => $agent->name,
                'total_contacts' => $totalContacts,
                'contacts_attempted' => $contactsAttempted,
                'contacts_connected' => $contactsConnected,
                'connection_rate' => $connectionRate,
                'total_activities' => $activities->count(),
                'connection_methods' => $connectionMethods,
                'total_leads' => $leadIds->count(),
                'leads_with_activities' => $leadsWithActivities->count(),
                'stage_changes' => $leadsWithStageChanges,
                'no_stage_change' => $leadsWithoutStageChanges,
                'stage_change_rate' => $stageChangeRate,
            ];
        })
        ->sortByDesc('total_activities')
        ->values()
        ->toArray();

        // Prepare date range info
        $dateRange = [
            'from' => $dateFrom->format('Y-m-d H:i:s'),
            'to' => now()->format('Y-m-d H:i:s'),
        ];
        
        $fileName = 'campaign_' . $campaign->id . '_agent_activity_' . $period . '_' . now()->format('Y-m-d_His') . '.xlsx';
        
        return Excel::download(
            new AgentActivityAnalyticsExport($agentAnalytics, $period, $campaign->name, $dateRange), 
            $fileName
        );
    }

    public function exportLeadContactActivityReport(Campaign $campaign, Request $request)
    {
        // Only admins can export advance reports
        if (!auth()->user()->isAdmin()) {
            abort(403, 'Unauthorized action. Only admins can export advance reports.');
        }

        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $startDate = $validated['start_date'];
        $endDate = $validated['end_date'];
        
        $fileName = 'campaign_' . $campaign->id . '_lead_contact_activity_' . $startDate . '_to_' . $endDate . '_' . now()->format('YmdHis') . '.xlsx';
        
        return Excel::download(
            new LeadContactActivityReportExport($campaign->id, $startDate, $endDate, $campaign->name), 
            $fileName
        );
    }
}

