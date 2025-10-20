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
        $query = Activity::query()
            ->with(['company', 'agent', 'contact']);

        // Set default dates to today if not provided
        $fromDate = $request->filled('from_date') ? $request->from_date : Carbon::today()->format('Y-m-d');
        $toDate = $request->filled('to_date') ? $request->to_date : Carbon::today()->format('Y-m-d');

        // Apply date filters
        $query->whereDate('created_at', '>=', $fromDate)
              ->whereDate('created_at', '<=', $toDate);

        // Company filter
        if ($request->filled('company_id')) {
            $query->where('company_id', $request->company_id);
        }

        // Activity Type filter
        if ($request->filled('activity_type')) {
            $query->where('activity_type', $request->activity_type);
        }

        // Agent/User filter
        if ($request->filled('agent_id')) {
            $query->where('agent_id', $request->agent_id);
        }

        // Conversation Method filter
        if ($request->filled('conversation_method')) {
            $query->where('conversation_method', $request->conversation_method);
        }

        // Connection Status filter
        if ($request->filled('conversation_connected')) {
            $query->where('conversation_connected', $request->conversation_connected);
        }

        $query->orderBy('created_at', 'desc');

        // Paginate with 50 items per page for lazy loading
        $activities = $query->paginate(50)->withQueryString();

        // Get data for filters
        $companies = Company::select('id', 'name')->orderBy('name')->get();
        $agents = User::select('id', 'name')->orderBy('name')->get();

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
        $query = Activity::query()
            ->with(['company', 'agent', 'contact']);

        // Apply same filters as index
        $fromDate = $request->filled('from_date') ? $request->from_date : Carbon::today()->format('Y-m-d');
        $toDate = $request->filled('to_date') ? $request->to_date : Carbon::today()->format('Y-m-d');

        $query->whereDate('created_at', '>=', $fromDate)
              ->whereDate('created_at', '<=', $toDate);

        if ($request->filled('company_id')) {
            $query->where('company_id', $request->company_id);
        }

        if ($request->filled('activity_type')) {
            $query->where('activity_type', $request->activity_type);
        }

        if ($request->filled('agent_id')) {
            $query->where('agent_id', $request->agent_id);
        }

        if ($request->filled('conversation_method')) {
            $query->where('conversation_method', $request->conversation_method);
        }

        if ($request->filled('conversation_connected')) {
            $query->where('conversation_connected', $request->conversation_connected);
        }

        $query->orderBy('created_at', 'desc');

        return Excel::download(
            new ActivityLogsExport($query),
            'activity-logs-' . now()->format('Y-m-d-His') . '.xlsx'
        );
    }
}

