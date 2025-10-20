<?php

namespace App\Http\Controllers;

use App\Models\Todo;
use App\Models\Lead;
use App\Models\Activity;
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
        
        // Get count of pending followups (activities with future followup dates)
        // For admins, show all; for regular users, show only theirs
        $pendingFollowupsQuery = Activity::whereNotNull('next_followup_datetime')
            ->where('next_followup_datetime', '>=', Carbon::now());
        
        if (!$user->isAdmin()) {
            $pendingFollowupsQuery->where('agent_id', $user->id);
        }
        
        $pendingFollowupsCount = $pendingFollowupsQuery->count();
        
        // Get count of open leads (exclude Closed Win and Closed Lost)
        $openLeadsQuery = Lead::whereNotIn('stage', ['Closed Win', 'Closed Lost']);
        
        if (!$user->isAdmin()) {
            $openLeadsQuery->where('agent_id', $user->id);
        }
        
        $openLeadsCount = $openLeadsQuery->count();
        
        // Get followups list - split into overdue and upcoming
        $now = Carbon::now();
        
        $followupsQuery = Activity::with(['company', 'lead.campaign', 'agent', 'contact'])
            ->whereNotNull('next_followup_datetime')
            ->orderBy('next_followup_datetime', 'asc');
        
        if (!$user->isAdmin()) {
            $followupsQuery->where('agent_id', $user->id);
        }
        
        $allFollowups = $followupsQuery->get();
        
        // Split into overdue and upcoming
        $overdueFollowups = $allFollowups->filter(function ($activity) use ($now) {
            return $activity->next_followup_datetime < $now;
        })->values();
        
        $upcomingFollowups = $allFollowups->filter(function ($activity) use ($now) {
            return $activity->next_followup_datetime >= $now;
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

