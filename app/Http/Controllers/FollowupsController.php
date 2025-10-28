<?php

namespace App\Http\Controllers;

use App\Models\Contact;
use App\Models\User;
use App\Models\Campaign;
use App\Models\Activity;
use App\Models\Lead;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class FollowupsController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        
        // Get filter parameters - support both single and array values
        $search = $request->input('search');
        
        $agentIds = $request->input('agent_id');
        if ($agentIds && !is_array($agentIds)) {
            $agentIds = [$agentIds];
        }
        
        $campaignIds = $request->input('campaign_id');
        if ($campaignIds && !is_array($campaignIds)) {
            $campaignIds = [$campaignIds];
        }
        
        $dateFrom = $request->input('date_from');
        $dateTo = $request->input('date_to');
        
        // Base query for followups
        $followupsQuery = Contact::with(['company.leads.campaign', 'company.leads.agent'])
            ->whereNotNull('next_followup_datetime')
            ->where('do_not_contact', false)
            ->whereNotNull('company_id')
            ->whereHas('company')
            ->orderBy('next_followup_datetime', 'asc');
        
        // Apply permission filters
        if (!$user->isAdmin()) {
            // For sales_user, filter by leads where they are the agent
            $followupsQuery->whereHas('company', function($q) use ($user) {
                $q->whereHas('leads', function($leadQuery) use ($user) {
                    $leadQuery->where('agent_id', $user->id);
                });
            });
        }
        
        // Apply filter: Search by company or contact name (case insensitive)
        if ($search) {
            $searchLower = strtolower($search);
            $followupsQuery->where(function($q) use ($searchLower) {
                $q->whereRaw('LOWER(name) LIKE ?', ['%' . $searchLower . '%'])
                  ->orWhereHas('company', function($companyQuery) use ($searchLower) {
                      $companyQuery->whereRaw('LOWER(name) LIKE ?', ['%' . $searchLower . '%']);
                  });
            });
        }
        
        // Apply filter: Agent
        if ($agentIds && count($agentIds) > 0) {
            $followupsQuery->whereHas('company', function($q) use ($agentIds) {
                $q->whereHas('leads', function($leadQuery) use ($agentIds) {
                    $leadQuery->whereIn('agent_id', $agentIds);
                });
            });
        }
        
        // Apply filter: Campaign
        if ($campaignIds && count($campaignIds) > 0) {
            $followupsQuery->whereHas('company', function($q) use ($campaignIds) {
                $q->whereHas('leads', function($leadQuery) use ($campaignIds) {
                    $leadQuery->whereIn('campaign_id', $campaignIds);
                });
            });
        }
        
        // Apply filter: Date range
        if ($dateFrom) {
            $followupsQuery->where('next_followup_datetime', '>=', Carbon::parse($dateFrom));
        }
        if ($dateTo) {
            $followupsQuery->where('next_followup_datetime', '<=', Carbon::parse($dateTo)->endOfDay());
        }
        
        // Get all followups
        $allFollowups = $followupsQuery->get()->map(function($contact) {
            // Skip if company is null
            if (!$contact->company) {
                return null;
            }
            
            // Get the lead for this contact's company
            $lead = $contact->company->leads->first();
            
            return [
                'id' => $contact->id,
                'contact_id' => $contact->id,
                'contact_name' => $contact->name,
                'company_id' => $contact->company->id,
                'company_name' => $contact->company->name,
                'lead_id' => $lead ? $lead->id : null,
                'agent_id' => $lead && $lead->agent ? $lead->agent->id : null,
                'agent_name' => $lead && $lead->agent ? $lead->agent->name : 'Unassigned',
                'campaign_id' => $lead && $lead->campaign ? $lead->campaign->id : null,
                'campaign_name' => $lead && $lead->campaign ? $lead->campaign->name : null,
                'next_followup_datetime' => $contact->next_followup_datetime,
                'interest_level' => $contact->interest_level,
            ];
        })->filter();
        
        // Split into overdue and upcoming
        $now = Carbon::now();
        $overdueFollowups = $allFollowups->filter(function ($followup) use ($now) {
            return Carbon::parse($followup['next_followup_datetime']) < $now;
        })->values();
        
        $upcomingFollowups = $allFollowups->filter(function ($followup) use ($now) {
            return Carbon::parse($followup['next_followup_datetime']) >= $now;
        })->values();
        
        // Get list of agents for filter dropdown
        $agentsQuery = User::where('is_active', true)
            ->whereIn('role', [User::ROLE_SALES_ADMIN, User::ROLE_SALES_USER])
            ->orderBy('name');
        
        // If user is sales_user, only show themselves
        if (!$user->isAdmin()) {
            $agentsQuery->where('id', $user->id);
        }
        
        $agents = $agentsQuery->get()->map(function($agent) {
            return [
                'id' => $agent->id,
                'name' => $agent->name,
            ];
        });
        
        // Get list of campaigns for filter dropdown
        $campaigns = Campaign::orderBy('name')->get()->map(function($campaign) {
            return [
                'id' => $campaign->id,
                'name' => $campaign->name,
            ];
        });
        
        // Get 5 most stale leads using efficient join with subquery
        $staleLeadsQuery = Lead::with(['company', 'agent', 'campaign'])
            ->leftJoin(
                DB::raw('(SELECT lead_id, MAX(created_at) as last_activity_at FROM activity WHERE lead_id IS NOT NULL GROUP BY lead_id) as last_activities'),
                'leads.id',
                '=',
                'last_activities.lead_id'
            )
            ->whereNotIn('leads.stage', ['Closed Won', 'Closed Lost', 'Disqualified'])
            ->select('leads.*', 'last_activities.last_activity_at');
        
        // Apply permission filters for stale leads
        if (!$user->isAdmin()) {
            $staleLeadsQuery->where('leads.agent_id', $user->id);
        }
        
        if ($agentIds && count($agentIds) > 0) {
            $staleLeadsQuery->whereIn('leads.agent_id', $agentIds);
        }
        
        if ($campaignIds && count($campaignIds) > 0) {
            $staleLeadsQuery->whereIn('leads.campaign_id', $campaignIds);
        }
        
        $staleLeads = $staleLeadsQuery
            ->orderByRaw('COALESCE(last_activities.last_activity_at, leads.created_at) ASC')
            ->limit(5)
            ->get()
            ->map(function($lead) {
                return [
                    'id' => $lead->id,
                    'company_name' => $lead->company->name ?? 'Unknown',
                    'agent_name' => $lead->agent->name ?? 'Unassigned',
                    'campaign_name' => $lead->campaign->name ?? null,
                    'last_activity_date' => $lead->last_activity_at ?? $lead->created_at,
                    'stage' => $lead->stage,
                ];
            });
        
        // Calculate progress metrics
        $today = Carbon::today();
        $todayEnd = Carbon::today()->endOfDay();
        $weekStart = Carbon::now()->startOfWeek();
        $weekEnd = Carbon::now()->endOfWeek();
        
        // Base query for activities (completed followups)
        $activitiesQuery = Activity::query();
        
        // Apply permission filters for activities
        if (!$user->isAdmin()) {
            $activitiesQuery->whereHas('lead', function($q) use ($user) {
                $q->where('agent_id', $user->id);
            });
        }
        
        // Apply filter: Agent
        if ($agentIds && count($agentIds) > 0) {
            $activitiesQuery->whereHas('lead', function($q) use ($agentIds) {
                $q->whereIn('agent_id', $agentIds);
            });
        }
        
        // Apply filter: Campaign
        if ($campaignIds && count($campaignIds) > 0) {
            $activitiesQuery->whereHas('lead', function($q) use ($campaignIds) {
                $q->whereIn('campaign_id', $campaignIds);
            });
        }
        
        // Daily Progress: 
        // Total = Pending followups for today + Activities logged today
        // This keeps the total constant throughout the day
        
        $dailyPending = $allFollowups->filter(function ($followup) use ($today, $todayEnd) {
            $date = Carbon::parse($followup['next_followup_datetime']);
            return $date->between($today, $todayEnd);
        })->count();
        
        // Get unique contacts that had activities logged today
        $dailyActivitiesQuery = Activity::whereBetween('created_at', [$today, $todayEnd]);
        
        // Apply permission filters
        if (!$user->isAdmin()) {
            $dailyActivitiesQuery->whereHas('lead', function($q) use ($user) {
                $q->where('agent_id', $user->id);
            });
        }
        
        if ($agentIds && count($agentIds) > 0) {
            $dailyActivitiesQuery->whereHas('lead', function($q) use ($agentIds) {
                $q->whereIn('agent_id', $agentIds);
            });
        }
        
        if ($campaignIds && count($campaignIds) > 0) {
            $dailyActivitiesQuery->whereHas('lead', function($q) use ($campaignIds) {
                $q->whereIn('campaign_id', $campaignIds);
            });
        }
        
        $dailyCompletedCount = $dailyActivitiesQuery->distinct('contact_id')->count('contact_id');
        
        $dailyTotal = $dailyPending + $dailyCompletedCount;
        $dailyCompleted = $dailyCompletedCount;
        
        // Weekly Progress: Same logic for the week
        $weeklyPending = $allFollowups->filter(function ($followup) use ($weekStart, $weekEnd) {
            $date = Carbon::parse($followup['next_followup_datetime']);
            return $date->between($weekStart, $weekEnd);
        })->count();
        
        // Get unique contacts that had activities logged this week
        $weeklyActivitiesQuery = Activity::whereBetween('created_at', [$weekStart, $weekEnd]);
        
        // Apply permission filters
        if (!$user->isAdmin()) {
            $weeklyActivitiesQuery->whereHas('lead', function($q) use ($user) {
                $q->where('agent_id', $user->id);
            });
        }
        
        if ($agentIds && count($agentIds) > 0) {
            $weeklyActivitiesQuery->whereHas('lead', function($q) use ($agentIds) {
                $q->whereIn('agent_id', $agentIds);
            });
        }
        
        if ($campaignIds && count($campaignIds) > 0) {
            $weeklyActivitiesQuery->whereHas('lead', function($q) use ($campaignIds) {
                $q->whereIn('campaign_id', $campaignIds);
            });
        }
        
        $weeklyCompletedCount = $weeklyActivitiesQuery->distinct('contact_id')->count('contact_id');
        
        $weeklyTotal = $weeklyPending + $weeklyCompletedCount;
        $weeklyCompleted = $weeklyCompletedCount;
        
        // Campaign wise progress: Top campaigns with followup counts
        $campaignProgress = $allFollowups->groupBy('campaign_id')->map(function ($followups, $campaignId) use ($now) {
            $campaign = $followups->first();
            $total = $followups->count();
            $pending = $followups->filter(function ($followup) use ($now) {
                return Carbon::parse($followup['next_followup_datetime']) >= $now;
            })->count();
            
            return [
                'campaign_id' => $campaignId,
                'campaign_name' => $campaign['campaign_name'] ?? 'Unknown',
                'total' => $total,
                'pending' => $pending,
                'overdue' => $total - $pending,
            ];
        })->sortByDesc('total')->take(5)->values();
        
        return Inertia::render('Followups', [
            'followups' => [
                'overdue' => $overdueFollowups,
                'upcoming' => $upcomingFollowups,
            ],
            'progress' => [
                'daily' => [
                    'total' => $dailyTotal,
                    'completed' => $dailyCompleted,
                    'percentage' => $dailyTotal > 0 ? round(($dailyCompleted / $dailyTotal) * 100) : 0,
                ],
                'weekly' => [
                    'total' => $weeklyTotal,
                    'completed' => $weeklyCompleted,
                    'percentage' => $weeklyTotal > 0 ? round(($weeklyCompleted / $weeklyTotal) * 100) : 0,
                ],
                'campaigns' => $campaignProgress,
            ],
            'staleLeads' => $staleLeads,
            'filters' => [
                'search' => $search,
                'agent_id' => $agentIds && count($agentIds) > 0 ? $agentIds : null,
                'campaign_id' => $campaignIds && count($campaignIds) > 0 ? $campaignIds : null,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
            'agents' => $agents,
            'campaigns' => $campaigns,
        ]);
    }
}

