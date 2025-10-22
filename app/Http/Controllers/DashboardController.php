<?php

namespace App\Http\Controllers;

use App\Models\Todo;
use App\Models\Lead;
use App\Models\Activity;
use App\Models\Contact;
use Carbon\Carbon;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        
        // Get count of open tasks for the current user
        $openTasksCount = Todo::where('user_id', $user->id)
            ->where('is_completed', false)
            ->count();
        
        // Get count of pending followups (contacts with future followup dates)
        // For admins, show all; for regular users, show only theirs
        $pendingFollowupsQuery = Contact::whereNotNull('next_followup_datetime')
            ->where('next_followup_datetime', '>=', Carbon::now())
            ->where('do_not_contact', false);
        
        if (!$user->isAdmin()) {
            // For regular users, filter by leads where they are the agent
            $pendingFollowupsQuery->whereHas('company', function($q) use ($user) {
                $q->whereHas('leads', function($leadQuery) use ($user) {
                    $leadQuery->where('agent_id', $user->id);
                });
            });
        }
        
        $pendingFollowupsCount = $pendingFollowupsQuery->count();
        
        // Get count of open leads (exclude Closed Won, Closed Lost, and Disqualified)
        $openLeadsQuery = Lead::whereNotIn('stage', ['Closed Won', 'Closed Lost', 'Disqualified']);
        
        if (!$user->isAdmin()) {
            $openLeadsQuery->where('agent_id', $user->id);
        }
        
        $openLeadsCount = $openLeadsQuery->count();
        
        // Get followups list - split into overdue and upcoming
        $now = Carbon::now();
        
        $followupsQuery = Contact::with(['company.leads.campaign', 'company.leads.agent'])
            ->whereNotNull('next_followup_datetime')
            ->where('do_not_contact', false)
            ->whereNotNull('company_id')
            ->whereHas('company')
            ->orderBy('next_followup_datetime', 'asc');
        
        if (!$user->isAdmin()) {
            // For regular users, filter by leads where they are the agent
            $followupsQuery->whereHas('company', function($q) use ($user) {
                $q->whereHas('leads', function($leadQuery) use ($user) {
                    $leadQuery->where('agent_id', $user->id);
                });
            });
        }
        
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
                'campaign_name' => $lead && $lead->campaign ? $lead->campaign->name : null,
                'next_followup_datetime' => $contact->next_followup_datetime,
                'interest_level' => $contact->interest_level,
            ];
        })->filter();
        
        // Split into overdue and upcoming with limits
        $overdueFollowups = $allFollowups->filter(function ($followup) use ($now) {
            return Carbon::parse($followup['next_followup_datetime']) < $now;
        })->take(50)->values();
        
        $upcomingFollowups = $allFollowups->filter(function ($followup) use ($now) {
            return Carbon::parse($followup['next_followup_datetime']) >= $now;
        })->take(20)->values();
        
        return Inertia::render('Dashboard', [
            'stats' => [
                'openTasks' => $openTasksCount,
                'pendingFollowups' => $pendingFollowupsCount,
                'openLeads' => $openLeadsCount,
            ],
            'followups' => [
                'overdue' => $overdueFollowups,
                'upcoming' => $upcomingFollowups,
            ],
        ]);
    }
}

