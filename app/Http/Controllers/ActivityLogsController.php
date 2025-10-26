<?php

namespace App\Http\Controllers;

use App\Models\Activity;
use App\Models\Company;
use App\Models\User;
use App\Exports\ActivityLogsExport;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Maatwebsite\Excel\Facades\Excel;
use Carbon\Carbon;

class ActivityLogsController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $query = Activity::query()
            ->with(['company', 'agent', 'contact']);

        // If user is sales_user (not admin), restrict to their own activities
        if ($user->hasRole(User::ROLE_SALES_USER)) {
            $query->where('agent_id', $user->id);
        }

        // Set default dates to today if not provided
        $fromDate = $request->filled('from_date') ? $request->from_date : Carbon::today()->format('Y-m-d');
        $toDate = $request->filled('to_date') ? $request->to_date : Carbon::today()->format('Y-m-d');

        // Apply date filters
        $query->whereDate('created_at', '>=', $fromDate)
              ->whereDate('created_at', '<=', $toDate);

        // Company filter (supports single value or array)
        if ($request->filled('company_id')) {
            $companyIds = is_array($request->company_id) ? $request->company_id : [$request->company_id];
            $query->whereIn('company_id', $companyIds);
        }

        // Activity Type filter (supports single value or array)
        if ($request->filled('activity_type')) {
            $activityTypes = is_array($request->activity_type) ? $request->activity_type : [$request->activity_type];
            $query->whereIn('activity_type', $activityTypes);
        }

        // Agent/User filter - only apply for admins (supports single value or array)
        if ($request->filled('agent_id') && $user->isAdmin()) {
            $agentIds = is_array($request->agent_id) ? $request->agent_id : [$request->agent_id];
            $query->whereIn('agent_id', $agentIds);
        }

        // Conversation Method filter (supports single value or array)
        if ($request->filled('conversation_method')) {
            $methods = is_array($request->conversation_method) ? $request->conversation_method : [$request->conversation_method];
            $query->whereIn('conversation_method', $methods);
        }

        // Connection Status filter (supports single value or array)
        if ($request->filled('conversation_connected')) {
            $statuses = is_array($request->conversation_connected) ? $request->conversation_connected : [$request->conversation_connected];
            $query->whereIn('conversation_connected', $statuses);
        }

        $query->orderBy('created_at', 'desc');

        // Paginate with 50 items per page for lazy loading
        $activities = $query->paginate(50)->withQueryString();

        // Get data for filters
        $companies = Company::select('id', 'name')->orderBy('name')->get();
        // For sales_user, only show themselves in agents filter
        $agents = $user->isAdmin() 
            ? User::select('id', 'name')->orderBy('name')->get()
            : collect([$user->only(['id', 'name'])]);

        return Inertia::render('ActivityLogs/Index', [
            'activities' => $activities,
            'companies' => $companies,
            'agents' => $agents,
            'filters' => [
                'company_id' => $request->company_id,
                'activity_type' => $request->activity_type,
                'agent_id' => $request->agent_id,
                'conversation_method' => $request->conversation_method,
                'conversation_connected' => $request->conversation_connected,
                'from_date' => $fromDate,
                'to_date' => $toDate,
            ],
        ]);
    }

    public function export(Request $request)
    {
        $user = $request->user();
        $query = Activity::query()
            ->with(['company', 'agent', 'contact']);

        // If user is sales_user (not admin), restrict to their own activities
        if ($user->hasRole(User::ROLE_SALES_USER)) {
            $query->where('agent_id', $user->id);
        }

        // Apply same filters as index
        $fromDate = $request->filled('from_date') ? $request->from_date : Carbon::today()->format('Y-m-d');
        $toDate = $request->filled('to_date') ? $request->to_date : Carbon::today()->format('Y-m-d');

        $query->whereDate('created_at', '>=', $fromDate)
              ->whereDate('created_at', '<=', $toDate);

        // Company filter (supports single value or array)
        if ($request->filled('company_id')) {
            $companyIds = is_array($request->company_id) ? $request->company_id : [$request->company_id];
            $query->whereIn('company_id', $companyIds);
        }

        // Activity Type filter (supports single value or array)
        if ($request->filled('activity_type')) {
            $activityTypes = is_array($request->activity_type) ? $request->activity_type : [$request->activity_type];
            $query->whereIn('activity_type', $activityTypes);
        }

        // Agent/User filter - only apply for admins (supports single value or array)
        if ($request->filled('agent_id') && $user->isAdmin()) {
            $agentIds = is_array($request->agent_id) ? $request->agent_id : [$request->agent_id];
            $query->whereIn('agent_id', $agentIds);
        }

        // Conversation Method filter (supports single value or array)
        if ($request->filled('conversation_method')) {
            $methods = is_array($request->conversation_method) ? $request->conversation_method : [$request->conversation_method];
            $query->whereIn('conversation_method', $methods);
        }

        // Connection Status filter (supports single value or array)
        if ($request->filled('conversation_connected')) {
            $statuses = is_array($request->conversation_connected) ? $request->conversation_connected : [$request->conversation_connected];
            $query->whereIn('conversation_connected', $statuses);
        }

        $query->orderBy('created_at', 'desc');

        return Excel::download(
            new ActivityLogsExport($query),
            'activity-logs-' . now()->format('Y-m-d-His') . '.xlsx'
        );
    }
}

