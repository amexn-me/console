<?php

namespace App\Http\Controllers;

use App\Models\Todo;
use App\Models\Lead;
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
        // For admins, show all; for regular users, show only contacts from their leads
        $now = Carbon::now();
        
        $pendingFollowupsQuery = Contact::whereNotNull('next_followup_datetime')
            ->where('next_followup_datetime', '>=', $now)
            ->where('followup_completed', false)
            ->where('do_not_contact', false);
        
        if (!$user->isAdmin()) {
            // Get company IDs from user's leads
            $companyIds = Lead::where('agent_id', $user->id)
                ->whereNotIn('stage', ['Closed Won', 'Closed Lost', 'Disqualified'])
                ->pluck('company_id');
            
            $pendingFollowupsQuery->whereIn('company_id', $companyIds);
        }
        
        $pendingFollowupsCount = $pendingFollowupsQuery->count();
        
        // Get count of open leads (exclude Closed Won, Closed Lost, and Disqualified)
        $openLeadsQuery = Lead::whereNotIn('stage', ['Closed Won', 'Closed Lost', 'Disqualified']);
        
        if (!$user->isAdmin()) {
            $openLeadsQuery->where('agent_id', $user->id);
        }
        
        $openLeadsCount = $openLeadsQuery->count();
        
        // Get followups list from contacts - split into overdue and upcoming
        $followupsQuery = Contact::with(['company'])
            ->whereNotNull('next_followup_datetime')
            ->where('followup_completed', false)
            ->where('do_not_contact', false)
            ->orderBy('next_followup_datetime', 'asc');
        
        if (!$user->isAdmin()) {
            // Get company IDs from user's leads
            $companyIds = Lead::where('agent_id', $user->id)
                ->whereNotIn('stage', ['Closed Won', 'Closed Lost', 'Disqualified'])
                ->pluck('company_id');
            
            $followupsQuery->whereIn('company_id', $companyIds);
        }
        
        $allFollowups = $followupsQuery->get();
        
        // For each contact, get the associated lead and campaign info
        $allFollowups = $allFollowups->map(function ($contact) {
            $lead = Lead::where('company_id', $contact->company_id)
                ->whereNotIn('stage', ['Closed Won', 'Closed Lost', 'Disqualified'])
                ->with(['campaign', 'agent'])
                ->first();
            
            return (object) [
                'id' => $contact->id,
                'contact_id' => $contact->id,
                'contact_name' => $contact->name,
                'contact_title' => $contact->title,
                'contact_interest_level' => $contact->interest_level,
                'company' => $contact->company,
                'lead' => $lead,
                'agent' => $lead ? $lead->agent : null,
                'next_followup_datetime' => $contact->next_followup_datetime,
                'next_followup_date' => $contact->next_followup_date,
            ];
        });
        
        // Split into overdue and upcoming
        $overdueFollowups = $allFollowups->filter(function ($followup) use ($now) {
            return $followup->next_followup_datetime < $now;
        })->values();
        
        $upcomingFollowups = $allFollowups->filter(function ($followup) use ($now) {
            return $followup->next_followup_datetime >= $now;
        })->take(10)->values();
        
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

